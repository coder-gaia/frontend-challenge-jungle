import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ShieldCheck, ShoppingCart, Wallet as WalletIcon } from 'lucide-react'
import type { Cart, Profile, Wallet } from '@/contracts'
import { toApiError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { announce } from '@/components/live-announcer'
import { NftImage } from '@/components/nft-image'
import { EmptyState, ErrorState } from '@/components/page-states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useConnectWallet, useDisconnectWallet, useProfile, useWallets } from '@/features/account/queries'
import { useSession } from '@/features/auth/session'
import { CartIssues } from '@/features/cart/components/cart-issues'
import { CouponForm } from '@/features/cart/components/coupon-form'
import { OrderSummary, OrderSummarySkeleton } from '@/features/cart/components/order-summary'
import { useCart, useCartQuote } from '@/features/cart/queries'
import { formatEth } from '@/lib/eth'
import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'
import { CollectorForm } from './components/collector-form'
import { ReviewDialog } from './components/review-dialog'
import { connectionKey, WalletPanel, type ConnectionState } from './components/wallet-panel'
import { usePlaceOrder } from './place-order'
import {
  checkoutDefaults,
  checkoutFormSchema,
  quoteSignature,
  walletDefaults,
  type CheckoutFormInput,
  type CheckoutFormValues,
} from './schema'

interface Draft {
  userId: string
  values: CheckoutFormInput
}

function CheckoutSkeleton() {
  return (
    <div
      className="grid gap-8 md:grid-cols-[minmax(0,1fr)_405px]"
      aria-busy="true"
      aria-label="Carregando pagamento"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-[69px]" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[70px]" />
        <Skeleton className="h-[70px]" />
        <OrderSummarySkeleton />
      </div>
    </div>
  )
}

export function CheckoutPage() {
  const { user } = useSession()
  const cartQuery = useCart()
  const profileQuery = useProfile()
  const walletsQuery = useWallets()

  const failed = [cartQuery, profileQuery, walletsQuery].find((q) => q.isError && !q.data)
  let content: React.ReactNode
  if (failed) {
    content = (
      <ErrorState
        error={failed.error}
        title="Não foi possível carregar o pagamento"
        onRetry={() => void failed.refetch()}
      />
    )
  } else if (!user || !cartQuery.data || !profileQuery.data || !walletsQuery.data) {
    content = <CheckoutSkeleton />
  } else if (cartQuery.data.lines.length === 0) {
    content = (
      <EmptyState
        icon={<ShoppingCart className="size-6" />}
        title="Não há itens para pagar"
        description="Seu carrinho está vazio. Se você acabou de comprar, acompanhe o pedido pela notificação de pedido pendente."
        action={
          <Button asChild>
            <Link to="/" hash="mercado">
              Explorar o mercado
            </Link>
          </Button>
        }
      />
    )
  } else if (walletsQuery.data.wallets.length === 0) {
    content = (
      <EmptyState
        icon={<WalletIcon className="size-6" />}
        title="Cadastre uma carteira para pagar"
        description="As carteiras cadastradas ficam disponíveis no pagamento e recebem os NFTs comprados."
        action={
          <Button asChild>
            <Link to="/conta/carteiras">Cadastrar carteira</Link>
          </Button>
        }
      />
    )
  } else {
    content = (
      <CheckoutForm
        userId={user.id}
        cart={cartQuery.data}
        profile={profileQuery.data}
        wallets={walletsQuery.data.wallets}
      />
    )
  }

  return (
    <div className="container-kurio pt-2 pb-36 md:pt-8 md:pb-0">
      <nav aria-label="Trilha de navegação" className="mb-8 hidden md:block">
        <ol className="flex items-center gap-1 text-15 leading-4 font-bold">
          <li>
            <Link to="/" className="hover:text-text-accent">
              Início
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/" hash="mercado" className="hover:text-text-accent">
              Mercado
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      <h1 className="sr-only">Pagamento</h1>
      {content}
    </div>
  )
}

function CheckoutForm({
  userId,
  cart,
  profile,
  wallets,
}: {
  userId: string
  cart: Cart
  profile: Profile
  wallets: Wallet[]
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const draft = readStorage<Draft>(STORAGE_KEYS.checkoutDraft, 'session')
  const defaultWallet = wallets.find((w) => w.slot === 'primary') ?? wallets[0]
  const restored =
    draft?.userId === userId && wallets.some((w) => w.id === draft.values.walletId) ? draft.values : null

  const form = useForm<CheckoutFormInput, unknown, CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: restored ?? checkoutDefaults(profile, defaultWallet),
    mode: 'onTouched',
  })

  // Rascunho por usuário: sobrevive à expiração da sessão e ao refresh (retomada do checkout).
  useEffect(() => {
    const subscription = form.watch((values) =>
      writeStorage(
        STORAGE_KEYS.checkoutDraft,
        { userId, values: values as CheckoutFormInput } satisfies Draft,
        'session',
      ),
    )
    return () => subscription.unsubscribe()
  }, [form, userId])

  const walletId = form.watch('walletId')
  const provider = form.watch('provider')
  const network = form.watch('network')
  const destination = form.watch('walletAddress')
  const wallet = wallets.find((w) => w.id === walletId)

  const quoteQuery = useCartQuote(cart, network, 'checkout')
  const quote = quoteQuery.data
  const quoteUpdating = quoteQuery.isFetching

  const [connection, setConnection] = useState<ConnectionState>({ status: 'idle' })
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()
  const connected =
    connection.status === 'connected' && connection.key === connectionKey(walletId, provider, network)
  const connectRef = useRef<HTMLDivElement>(null)

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewedSignature, setReviewedSignature] = useState<string | null>(null)
  const [serverReasons, setServerReasons] = useState<string[]>([])
  const [orderError, setOrderError] = useState<string | null>(null)
  const placeOrder = usePlaceOrder(userId)
  const changed = Boolean(
    reviewOpen && quote && reviewedSignature && quoteSignature(quote) !== reviewedSignature,
  )

  const selectWallet = (next: Wallet) => {
    const defaults = walletDefaults(next)
    for (const [key, value] of Object.entries(defaults)) {
      form.setValue(key as keyof CheckoutFormInput, value as never, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      })
    }
  }

  const doConnect = async () => {
    setConnection({ status: 'connecting' })
    try {
      await connect.mutateAsync({ walletId, body: { provider, network } })
      setConnection({ status: 'connected', key: connectionKey(walletId, provider, network) })
      announce('Carteira conectada.')
    } catch (error) {
      const apiError = toApiError(error)
      setConnection(
        apiError.code === 'WALLET_REJECTED'
          ? { status: 'rejected', message: apiError.message }
          : { status: 'error', message: apiError.message },
      )
      announce(apiError.message, 'assertive')
    }
  }

  const doDisconnect = async () => {
    try {
      await disconnect.mutateAsync(walletId)
    } finally {
      setConnection({ status: 'idle' })
      announce('Carteira desconectada.')
    }
  }

  const openReview = form.handleSubmit(
    async () => {
      if (!connected) {
        setConnection({ status: 'error', message: 'Conecte a carteira para confirmar a compra.' })
        connectRef.current?.scrollIntoView({ block: 'center' })
        connectRef.current?.querySelector('button')?.focus()
        announce('Conecte a carteira para confirmar a compra.', 'assertive')
        return
      }
      setOrderError(null)
      setServerReasons([])
      setReviewedSignature(quote ? quoteSignature(quote) : null)
      setReviewOpen(true)
      // Revalida preço, disponibilidade, cupom e taxas antes de confirmar.
      const { data } = await quoteQuery.refetch()
      if (data && !quote) setReviewedSignature(quoteSignature(data))
    },
    () => announce('Revise os campos destacados no formulário.', 'assertive'),
  )

  const confirm = async () => {
    if (!quote) return
    const values = form.getValues()
    setOrderError(null)
    try {
      const order = await placeOrder.mutateAsync({
        quoteId: quote.id,
        walletId: values.walletId,
        provider: values.provider,
        network: values.network,
        buyer: {
          displayName: values.displayName,
          username: values.username,
          profileName: values.profileName,
          email: values.email,
          walletAddress: values.walletAddress,
          secondaryAddress: values.secondaryAddress || undefined,
          referralCode: values.referralCode,
          ensName: values.ensName,
          note: values.note || undefined,
        },
      })
      announce(`Pedido ${order.number} enviado. Aguardando confirmação.`)
      setReviewOpen(false)
      void navigate({ to: '/pedido/$orderId', params: { orderId: order.id } })
    } catch (error) {
      const apiError = toApiError(error)
      if (
        apiError.code === 'QUOTE_STALE' ||
        apiError.code === 'QUOTE_EXPIRED' ||
        apiError.code === 'OUT_OF_STOCK'
      ) {
        const reasons = Array.isArray(apiError.details?.reasons) ? (apiError.details.reasons as string[]) : []
        setServerReasons(reasons)
        // A cotação recusada vira a referência: a nova cotação (diferente) exige nova confirmação.
        setReviewedSignature(quoteSignature(quote))
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.quote.all }),
        ])
        announce('Os valores do pedido mudaram. Revise e confirme novamente.', 'assertive')
      } else if (apiError.code === 'WALLET_NOT_CONNECTED') {
        setReviewOpen(false)
        setConnection({ status: 'error', message: apiError.message })
        announce(apiError.message, 'assertive')
      } else {
        const message = apiError.retryable
          ? `${apiError.message} Você pode tentar de novo com segurança: o pedido não será duplicado.`
          : apiError.message
        setOrderError(message)
        announce(message, 'assertive')
      }
    }
  }

  const purchasable = Boolean(quote?.purchasable)

  return (
    <form onSubmit={openReview} noValidate>
      <CartIssues cart={cart} />
      <div className="mt-6 flex flex-col gap-10 md:grid md:grid-cols-[minmax(0,1fr)_405px] md:grid-rows-[auto_auto_1fr] md:gap-x-8 md:gap-y-8">
        <div className="order-3 md:col-start-1 md:row-span-3 md:row-start-1">
          <CollectorForm form={form} />
        </div>

        <section
          aria-labelledby="items-title"
          className="order-2 flex flex-col gap-3 md:col-start-2 md:row-start-1"
        >
          <h2 id="items-title" className="text-17 leading-4 font-bold">
            Seus NFTs
          </h2>
          <div className="flex justify-between border-b border-primary/30 pb-3 text-base leading-4">
            <span className="font-bold">NFTs</span>
            <span className="font-medium">Subtotal</span>
          </div>
          <ul className="flex flex-col gap-3">
            {(quote?.lines ?? cart.lines.map((l) => ({ ...l, lineId: l.id }))).map((line) => (
              <li key={line.lineId} className="flex items-center gap-2 bg-surface py-0 pr-4 pl-1">
                <NftImage
                  image={line.image}
                  alt=""
                  sizes="70px"
                  className="size-[66px] shrink-0 rounded-lg"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="truncate text-base leading-4 font-bold">{line.name}</span>
                  <span className="text-sm leading-4 text-text-muted">ID do token: {line.tokenId}</span>
                </span>
                <span className="text-sm text-text-secondary">(x {line.quantity})</span>
                <span className="w-24 text-right text-lg leading-4 font-bold text-text-accent">
                  {formatEth(line.lineTotal)}
                </span>
              </li>
            ))}
          </ul>
          {!cart.coupon && (
            <details className="group text-center text-sm">
              <summary className="cursor-pointer list-none py-1 hover:text-text-accent [&::-webkit-details-marker]:hidden">
                Tem um código promocional?{' '}
                <span className="text-text-accent underline-offset-2 group-hover:underline">
                  Aplique aqui
                </span>
              </summary>
              <CouponForm coupon={null} className="mt-2 text-left" />
            </details>
          )}
          {cart.coupon && <CouponForm coupon={cart.coupon} />}
          <div aria-live="polite">
            {quote ? (
              <OrderSummary quote={quote} updating={quoteUpdating} />
            ) : quoteQuery.isError ? (
              <ErrorState
                error={quoteQuery.error}
                title="Não foi possível calcular a cotação"
                onRetry={() => void quoteQuery.refetch()}
                className="py-6"
              />
            ) : (
              <OrderSummarySkeleton />
            )}
          </div>
        </section>

        <div ref={connectRef} className="order-1 md:col-start-2 md:row-start-2">
          <WalletPanel
            wallets={wallets}
            walletId={walletId}
            provider={provider}
            network={network}
            connection={connected || connection.status !== 'connected' ? connection : { status: 'idle' }}
            onSelectWallet={selectWallet}
            onSelectProvider={(value) => form.setValue('provider', value, { shouldDirty: true })}
            onConnect={() => void doConnect()}
            onDisconnect={() => void doDisconnect()}
            disconnecting={disconnect.isPending}
          />
          {form.formState.errors.walletId && (
            <p className="mt-2 text-xs text-destructive-foreground">
              {form.formState.errors.walletId.message}
            </p>
          )}
        </div>

        <div className="order-4 hidden flex-col gap-2 md:col-start-2 md:row-start-3 md:flex">
          <Button
            type="submit"
            className="h-12 w-full rounded-lg text-base"
            disabled={!purchasable}
            data-testid="open-review"
          >
            <ShieldCheck className="size-5" aria-hidden="true" /> Confirmar compra
          </Button>
          {!purchasable && quote && (
            <p className="text-center text-xs text-coral">Há itens indisponíveis no pedido.</p>
          )}
        </div>
      </div>

      {/* Barra fixa (mobile): total + confirmar */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-3 bg-background/95 px-6 pt-3 backdrop-blur md:hidden"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <p className="flex items-center justify-between text-xl font-bold">
          Total:
          <span className="text-text-accent">{quote ? formatEth(quote.total) : '—'}</span>
        </p>
        <Button
          type="submit"
          className="h-[60px] w-full rounded-full bg-linear-to-r from-primary to-brand-dark text-base"
          disabled={!purchasable}
        >
          Confirmar compra
        </Button>
      </div>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        quote={quote}
        changed={changed}
        reasons={serverReasons}
        walletLabel={wallet?.nickname ?? ''}
        destination={destination}
        provider={provider}
        submitting={placeOrder.isPending}
        retrying={placeOrder.retrying}
        refreshing={quoteQuery.isFetching && !changed}
        error={orderError}
        onAcceptChanges={() => {
          if (quote) setReviewedSignature(quoteSignature(quote))
          setServerReasons([])
          announce('Novos valores revisados. Confirme para continuar.')
        }}
        onConfirm={() => void confirm()}
      />
    </form>
  )
}
