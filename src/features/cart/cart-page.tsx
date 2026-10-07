import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/page-states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'
import { NftCarousel } from '@/features/catalog/components/nft-carousel'
import { highlightsQueryOptions, relatedQueryOptions } from '@/features/catalog/queries'
import { cn } from '@/lib/utils'
import { CartCard, CartRow } from './components/cart-line'
import { CartIssues } from './components/cart-issues'
import { CouponForm } from './components/coupon-form'
import { OrderSummary, OrderSummarySkeleton } from './components/order-summary'
import { useCart, useCartQuote } from './queries'

function Recommendations({ nftId }: { nftId?: string }) {
  const related = useQuery({ ...relatedQueryOptions(nftId ?? ''), enabled: Boolean(nftId) })
  const highlights = useQuery({ ...highlightsQueryOptions(), enabled: !nftId })
  const items = nftId ? related.data?.items : highlights.data?.trending
  return (
    <NftCarousel
      title="Colecionadores também viram"
      items={items}
      loading={nftId ? related.isPending : highlights.isPending}
    />
  )
}

function CheckoutButton({ disabled, className }: { disabled: boolean; className?: string }) {
  const { user } = useSession()
  const navigate = useNavigate()
  return (
    <Button
      type="button"
      disabled={disabled}
      onClick={() =>
        user
          ? void navigate({ to: '/pagamento' })
          : void navigate({ to: '/entrar', search: { redirect: '/pagamento' } })
      }
      className={cn('h-10 w-full text-base', className)}
      data-testid="checkout-button"
    >
      Conectar e finalizar
    </Button>
  )
}

function CartSkeleton() {
  return (
    <div
      className="flex flex-col gap-3"
      aria-busy="true"
      aria-label="Carregando carrinho"
      data-testid="cart-skeleton"
    >
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-[70px] w-full rounded-none md:h-[70px]" />
      ))}
    </div>
  )
}

export function CartPage() {
  const cartQuery = useCart()
  const cart = cartQuery.data
  const quoteQuery = useCartQuote(cart)
  const quote = quoteQuery.data
  const empty = cart && cart.lines.length === 0
  const blocked = Boolean(cart?.hasIssues) || (quote ? !quote.purchasable : false)
  const updating = quoteQuery.isFetching || (quote ? quote.cartVersion !== cart?.version : false)

  const summaryFor = (compact: boolean) =>
    !cart || cartQuery.isPending || (quoteQuery.isPending && !empty) ? (
      <OrderSummarySkeleton />
    ) : quoteQuery.isError && !quote ? (
      <ErrorState
        error={quoteQuery.error}
        title="Não foi possível calcular o resumo"
        onRetry={() => void quoteQuery.refetch()}
        className="py-6"
      />
    ) : quote ? (
      <OrderSummary quote={quote} updating={updating} variant={compact ? 'compact' : 'default'} />
    ) : null

  return (
    <div className="container-kurio pt-2 pb-[380px] md:pt-8 md:pb-0">
      <nav aria-label="Trilha de navegação" className="hidden md:block">
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
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>
      <h1 className="sr-only">Carrinho de NFTs</h1>

      {cartQuery.isError && !cart ? (
        <ErrorState
          error={cartQuery.error}
          title="Não foi possível carregar o carrinho"
          onRetry={() => void cartQuery.refetch()}
          className="mt-6"
        />
      ) : empty ? (
        <EmptyState
          className="mt-6"
          icon={<ShoppingCart className="size-6" />}
          title="Seu carrinho está vazio"
          description="Explore o mercado e adicione NFTs para vê-los aqui."
          action={
            <Button asChild>
              <Link to="/" hash="mercado">
                Explorar o mercado
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-10">
          <section
            aria-labelledby="cart-items-title"
            className="flex min-w-0 flex-1 flex-col gap-3 md:max-w-[782px]"
          >
            <h2 id="cart-items-title" className="sr-only">
              Itens
            </h2>
            {cart && <CartIssues cart={cart} />}
            {/* Cabeçalho da tabela (desktop) */}
            <div
              aria-hidden="true"
              className="hidden grid-cols-[minmax(0,250px)_1fr_auto_1fr_24px] gap-x-6 border-b border-primary/30 pr-6 pb-3 text-base leading-4 md:grid"
            >
              <span className="font-bold">NFTs</span>
              <span className="font-medium">Preço</span>
              <span className="w-[76px] font-bold">Edições</span>
              <span className="font-medium">Total</span>
              <span />
            </div>
            {!cart ? (
              <CartSkeleton />
            ) : (
              <>
                <ul className="hidden flex-col gap-3 md:flex" aria-label="Itens do carrinho">
                  {cart.lines.map((line) => (
                    <CartRow key={line.id} line={line} />
                  ))}
                </ul>
                <ul className="flex flex-col gap-5 md:hidden" aria-label="Itens do carrinho">
                  {cart.lines.map((line) => (
                    <CartCard key={line.id} line={line} />
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Resumo (desktop) */}
          <aside aria-labelledby="summary-title" className="hidden w-[332px] shrink-0 flex-col gap-6 md:flex">
            <h2 id="summary-title" className="border-b border-primary/30 pb-3 text-lg leading-4 font-bold">
              Resumo da carteira
            </h2>
            <CouponForm coupon={cart?.coupon ?? null} disabled={!cart} />
            <div aria-live="polite">{summaryFor(false)}</div>
            <div className="flex flex-col gap-3">
              <CheckoutButton disabled={!cart || !quote || blocked || updating} />
              {blocked && (
                <p className="text-center text-xs text-coral">Resolva os itens destacados para continuar.</p>
              )}
              <Link to="/" hash="mercado" className="text-center text-base text-text-accent hover:underline">
                Continuar explorando
              </Link>
            </div>
          </aside>
        </div>
      )}

      {!empty && (
        <div className="mt-24 hidden md:block">
          <Recommendations nftId={cart?.lines[0]?.nftId} />
        </div>
      )}
      {empty && (
        <div className="mt-16">
          <Recommendations />
        </div>
      )}

      {/* Resumo fixo (mobile) */}
      {!empty && (
        <aside
          aria-label="Resumo do pedido"
          className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-4 rounded-t-[40px] bg-surface px-6 pt-6 shadow-glow md:hidden"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          <CouponForm coupon={cart?.coupon ?? null} disabled={!cart} variant="pill" />
          <div aria-live="polite">{summaryFor(true)}</div>
          <CheckoutButton
            className="h-[60px] rounded-full bg-linear-to-r from-primary to-brand-dark"
            disabled={!cart || !quote || blocked || updating}
          />
        </aside>
      )}
    </div>
  )
}
