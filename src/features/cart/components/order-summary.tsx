import type { Quote } from '@/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth, isZeroEth } from '@/lib/eth'
import { cn } from '@/lib/utils'

/** Resumo de valores — sempre exibe o que a API calculou na cotação (fonte de verdade). */
export function OrderSummary({
  quote,
  updating,
  className,
  variant = 'default',
}: {
  quote: Pick<Quote, 'subtotal' | 'discount' | 'networkFee' | 'total' | 'coupon'>
  updating?: boolean
  className?: string
  variant?: 'default' | 'compact'
}) {
  return (
    <dl
      className={cn(
        'flex flex-col transition-opacity',
        variant === 'compact' ? 'gap-2 text-sm' : 'gap-4',
        updating && 'opacity-60',
        className,
      )}
      aria-busy={updating}
      data-testid="order-summary"
    >
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-base">Subtotal</dt>
        <dd
          className={cn('whitespace-nowrap', variant === 'default' ? 'text-lg' : 'text-base')}
          data-testid="summary-subtotal"
        >
          {formatEth(quote.subtotal)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-base">
          Desconto do lançamento
          {quote.coupon && (
            <span className="block text-xs text-text-secondary">Cupom {quote.coupon.code}</span>
          )}
        </dt>
        <dd
          className={cn('whitespace-nowrap', 'text-base', !isZeroEth(quote.discount) && 'text-success')}
          data-testid="summary-discount"
        >
          (-) {formatEth(quote.discount)}
        </dd>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-base">Taxa de rede</dt>
          <dd
            className={cn('whitespace-nowrap', variant === 'default' ? 'text-lg' : 'text-base')}
            data-testid="summary-fee"
          >
            {formatEth(quote.networkFee)}
          </dd>
        </div>
        <p className="text-right text-xs text-text-accent">Taxa estimada</p>
      </div>
      <div
        className={cn(
          'flex items-baseline justify-between gap-4 border-t border-primary/30',
          variant === 'compact' ? 'pt-2' : 'pt-4',
        )}
      >
        <dt className="text-base font-bold">Total</dt>
        <dd className="text-lg font-bold text-text-accent" data-testid="summary-total">
          {formatEth(quote.total)}
        </dd>
      </div>
    </dl>
  )
}

export function OrderSummarySkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true" data-testid="summary-skeleton">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex justify-between gap-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-primary/30 pt-4">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  )
}
