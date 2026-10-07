import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react'
import type { Cart } from '@/contracts'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/eth'
import { useAcknowledgePrices } from '../queries'

/**
 * Avisos de alterações vindas do mercado (geralmente via `nft.updated`):
 * preço alterado (informativo, exige ciência) e falta de estoque (bloqueia o checkout).
 */
export function CartIssues({ cart }: { cart: Cart }) {
  const acknowledge = useAcknowledgePrices()
  const priceChanges = cart.lines.filter((line) => line.issues.includes('PRICE_CHANGED'))
  const stock = cart.lines.filter((line) =>
    line.issues.some((i) => i === 'SOLD_OUT' || i === 'INSUFFICIENT_AVAILABILITY'),
  )
  if (!priceChanges.length && !stock.length) return null

  return (
    <div className="flex flex-col gap-3" data-testid="cart-issues">
      {priceChanges.length > 0 && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-md border border-amber/50 bg-amber/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-bold text-amber">
                {priceChanges.length === 1
                  ? 'O preço de um item mudou'
                  : `O preço de ${priceChanges.length} itens mudou`}
              </p>
              <ul className="mt-1 flex flex-col gap-0.5 text-text-secondary">
                {priceChanges.map((line) => (
                  <li key={line.id} className="flex flex-wrap items-center gap-1">
                    {line.name}: <span className="line-through">{formatEth(line.acknowledgedUnitPrice)}</span>
                    <ArrowRight className="size-3" aria-label="para" />
                    <strong className="text-foreground">{formatEth(line.unitPrice)}</strong>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-text-secondary">O resumo já considera os novos valores.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => acknowledge.mutate()}
            disabled={acknowledge.isPending}
            data-testid="acknowledge-prices"
          >
            {acknowledge.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Entendi
          </Button>
        </div>
      )}
      {stock.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-md border border-coral/50 bg-coral/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-coral" aria-hidden="true" />
          <div>
            <p className="font-bold text-coral">Disponibilidade alterada</p>
            <p className="text-text-secondary">
              Ajuste ou remova os itens destacados para continuar. Não reservamos unidades no carrinho.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
