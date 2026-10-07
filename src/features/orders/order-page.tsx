import { useEffect } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, RotateCcw, ShoppingCart, X, XCircle } from 'lucide-react'
import { NETWORK_LABEL, WALLET_PROVIDER_LABEL, type Order } from '@/contracts'
import thankYou from '@/assets/thank-you.svg'
import { NftImage } from '@/components/nft-image'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth, isZeroEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { orderQueryOptions, pendingOrderStore } from './queries'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
/** Formato do layout: "29 Jul, 2026". */
const formatDate = (iso: string) => {
  const date = new Date(iso)
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`
}
const shortHash = (hash: string) => `${hash.slice(0, 6)}…${hash.slice(-4)}`.toUpperCase().replace('0X', '0x')

function ReceiptFrame({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[578px] overflow-hidden bg-surface" data-testid="order-card">
      <div className="relative flex flex-col items-center px-5 pt-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar e voltar ao início"
          className="absolute top-5 right-5 flex size-8 cursor-pointer items-center justify-center rounded text-text-accent hover:bg-surface-raised"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        {children}
      </div>
      <div className="h-2.5 bg-primary" aria-hidden="true" />
    </div>
  )
}

function InfoRow({ order }: { order: Order }) {
  const items = [
    { label: 'ID da transação', value: shortHash(order.transaction.hash), strong: true },
    { label: 'Data', value: formatDate(order.resolvedAt ?? order.createdAt) },
    { label: 'Total', value: formatEth(order.receipt.total) },
    { label: 'Carteira', value: WALLET_PROVIDER_LABEL[order.wallet.provider], strong: true },
  ]
  return (
    <dl className="mt-8 grid w-[calc(100%+40px)] grid-cols-2 gap-y-4 border-y border-primary px-5 py-4 sm:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn('flex flex-col gap-0.5 px-3 text-sm', i > 0 && 'sm:border-l sm:border-primary')}
        >
          <dt className={cn('leading-4 text-text-secondary', item.strong && 'font-bold')}>{item.label}</dt>
          <dd className="leading-5 break-all text-text-secondary">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ReceiptLines({ order }: { order: Order }) {
  return (
    <section aria-labelledby="receipt-title" className="mt-6 w-full max-w-[490px] text-left">
      <h2 id="receipt-title" className="text-15 font-bold">
        Detalhes da transação
      </h2>
      <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-6 border-b border-primary/40 pb-3 text-base">
        <span>NFTs</span>
        <span>Edições</span>
        <span>Subtotal</span>
      </div>
      <ul className="flex flex-col gap-3 py-3">
        {order.receipt.lines.map((line) => (
          <li key={line.lineId} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6">
            <span className="flex min-w-0 items-center gap-3">
              <NftImage image={line.image} alt="" sizes="70px" className="size-[66px] shrink-0 rounded-md" />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-base leading-5 font-bold">{line.name}</span>
                <span className="text-sm leading-4 text-text-muted">ID do token: {line.tokenId}</span>
              </span>
            </span>
            <span className="text-sm text-text-secondary">(x {line.quantity})</span>
            <span className="text-lg font-bold text-text-accent">{formatEth(line.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="ml-auto flex w-full max-w-[320px] flex-col gap-1 border-b border-primary/40 pb-3 text-base">
        {!isZeroEth(order.receipt.discount) && (
          <div className="flex justify-between">
            <dt>Desconto {order.receipt.coupon ? `(${order.receipt.coupon.code})` : ''}</dt>
            <dd className="text-success">(-) {formatEth(order.receipt.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>Taxa de rede</dt>
          <dd className="text-lg">{formatEth(order.receipt.networkFee)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="font-bold">Total</dt>
          <dd className="text-lg font-bold text-text-accent" data-testid="receipt-total">
            {formatEth(order.receipt.total)}
          </dd>
        </div>
      </dl>
    </section>
  )
}

export function OrderView({ userId, orderId }: { userId: string; orderId: string }) {
  const { data: order } = useSuspenseQuery(orderQueryOptions(userId, orderId))
  const navigate = useNavigate()
  const close = () => void navigate({ to: '/' })

  useEffect(() => {
    if (order.status !== 'pending') pendingOrderStore.clear(order.id)
  }, [order.status, order.id])

  return (
    <div className="container-kurio py-8 md:py-16" data-testid="order-page" data-status={order.status}>
      <h1 className="sr-only">Pedido {order.number}</h1>
      <div aria-live="polite">
        {order.status === 'confirmed' ? (
          <ReceiptFrame onClose={close}>
            <img src={thankYou} alt="" width={80} height={80} className="size-20" />
            <p className="mt-6 text-base font-bold text-text-secondary" data-testid="order-confirmed">
              Seus NFTs agora estão na sua carteira
            </p>
            <p className="mt-1 text-xs text-text-muted">Pedido {order.number}</p>
            <InfoRow order={order} />
            <ReceiptLines order={order} />
            <p className="mt-6 max-w-[470px] text-center text-sm leading-[22px] text-text-secondary">
              Transação confirmada na {NETWORK_LABEL[order.network]}. A propriedade foi transferida para sua
              carteira conectada e registrada na rede.
            </p>
            <Button asChild className="mt-6 mb-12 h-12 w-[186px] text-base font-medium">
              <Link to="/transacao/$hash" params={{ hash: order.transaction.hash }}>
                Ver no Etherscan
              </Link>
            </Button>
          </ReceiptFrame>
        ) : order.status === 'pending' ? (
          <ReceiptFrame onClose={close}>
            <span
              className="flex size-20 items-center justify-center rounded-full border-2 border-primary/40"
              aria-hidden="true"
            >
              <Loader2 className="size-10 animate-spin text-primary" />
            </span>
            <p className="mt-6 text-base font-bold" data-testid="order-pending">
              Aguardando confirmação na rede…
            </p>
            <p className="mt-2 max-w-[420px] text-center text-sm text-text-secondary">
              Assinatura enviada pela {WALLET_PROVIDER_LABEL[order.wallet.provider]}. Isso leva alguns
              segundos — você pode sair desta página; avisaremos quando o pagamento for confirmado.
            </p>
            <InfoRow order={order} />
            <ReceiptLines order={order} />
            <div className="mb-10" />
          </ReceiptFrame>
        ) : (
          <ReceiptFrame onClose={close}>
            <XCircle className="size-20 text-coral" aria-hidden="true" />
            <p className="mt-6 text-base font-bold text-coral" data-testid="order-declined">
              Pagamento recusado
            </p>
            <p className="mt-2 max-w-[420px] text-center text-sm text-text-secondary">
              {order.failureReason ?? 'A transação não foi concluída.'} Seus itens continuam no carrinho.
            </p>
            <ReceiptLines order={order} />
            <div className="mt-6 mb-10 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline">
                <Link to="/carrinho">
                  <ShoppingCart className="size-4" aria-hidden="true" /> Voltar ao carrinho
                </Link>
              </Button>
              <Button asChild>
                <Link to="/pagamento">
                  <RotateCcw className="size-4" aria-hidden="true" /> Tentar novamente
                </Link>
              </Button>
            </div>
          </ReceiptFrame>
        )}
      </div>
    </div>
  )
}

export function OrderSkeleton() {
  return (
    <div className="container-kurio py-16" aria-busy="true" aria-label="Carregando pedido">
      <div className="mx-auto flex max-w-[578px] flex-col items-center gap-4 bg-surface p-8">
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}
