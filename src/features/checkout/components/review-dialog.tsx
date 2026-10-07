import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react'
import { NETWORK_LABEL, WALLET_PROVIDER_LABEL, type Quote, type WalletProvider } from '@/contracts'
import { NftImage } from '@/components/nft-image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OrderSummary } from '@/features/cart/components/order-summary'
import { formatEth } from '@/lib/eth'
import { useFocusReturn } from '@/lib/use-focus-return'

/**
 * Revisão antes do envio. Se a cotação mudar enquanto o diálogo está aberto (tempo real) ou o
 * servidor recusar uma cotação desatualizada, os novos valores precisam ser confirmados de novo.
 */
export function ReviewDialog({
  open,
  onOpenChange,
  quote,
  changed,
  reasons,
  walletLabel,
  destination,
  provider,
  submitting,
  retrying,
  refreshing,
  error,
  onAcceptChanges,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: Quote | undefined
  changed: boolean
  reasons: string[]
  walletLabel: string
  destination: string
  provider: WalletProvider
  submitting: boolean
  retrying: number
  refreshing: boolean
  error: string | null
  onAcceptChanges: () => void
  onConfirm: () => void
}) {
  const returnFocus = useFocusReturn(open)
  return (
    <Dialog open={open} onOpenChange={(value) => !submitting && onOpenChange(value)}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-border-soft bg-surface sm:max-w-[520px]"
        data-testid="review-dialog"
        onCloseAutoFocus={returnFocus}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Revise seu pedido</DialogTitle>
          <DialogDescription>
            Confira os valores calculados pelo servidor antes de assinar a transação.
          </DialogDescription>
        </DialogHeader>

        {changed && (
          <div
            role="alert"
            className="flex gap-3 rounded-md border border-amber/50 bg-amber/10 p-3 text-sm"
            data-testid="quote-changed"
          >
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber" aria-hidden="true" />
            <div>
              <p className="font-bold text-amber">Os valores do pedido mudaram</p>
              {reasons.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-text-secondary">
                  {reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-text-secondary">
                Revise o novo total e confirme novamente para continuar.
              </p>
            </div>
          </div>
        )}

        {!quote || refreshing ? (
          <p className="flex items-center gap-2 py-6 text-sm text-text-secondary" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Revalidando preço, disponibilidade
            e taxas…
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {quote.lines.map((line) => (
                <li key={line.lineId} className="flex items-center gap-3 rounded-md bg-surface-raised p-2">
                  <NftImage image={line.image} alt="" sizes="48px" className="size-12 rounded-md" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-bold">{line.name}</span>
                    <span className="text-xs text-text-secondary">
                      Edição {line.editionLabel} · (x {line.quantity}) · {formatEth(line.unitPrice)} cada
                    </span>
                  </span>
                  <span className="text-sm font-bold text-text-accent">{formatEth(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <OrderSummary quote={quote} variant="compact" />
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border border-border p-3 text-sm">
              <dt className="text-text-secondary">Carteira</dt>
              <dd>
                {walletLabel} · {WALLET_PROVIDER_LABEL[provider]}
              </dd>
              <dt className="text-text-secondary">Rede</dt>
              <dd>{NETWORK_LABEL[quote.network]}</dd>
              <dt className="text-text-secondary">Destino</dt>
              <dd className="break-all">{destination}</dd>
            </dl>
          </>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
            data-testid="order-error"
          >
            {error}
          </p>
        )}
        {submitting && retrying > 0 && (
          <p role="status" className="text-sm text-amber" data-testid="order-retrying">
            O servidor demorou a responder. Verificando o pedido com a mesma chave (tentativa {retrying + 1})…
          </p>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Voltar
          </Button>
          {changed ? (
            <Button
              type="button"
              onClick={onAcceptChanges}
              disabled={!quote || refreshing}
              data-testid="accept-changes"
            >
              Revisei os novos valores
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onConfirm}
              disabled={!quote || refreshing || submitting || !quote.purchasable}
              aria-busy={submitting}
              data-testid="confirm-order"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="size-4" aria-hidden="true" />
              )}
              {submitting ? 'Enviando pedido…' : `Confirmar e pagar ${quote ? formatEth(quote.total) : ''}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
