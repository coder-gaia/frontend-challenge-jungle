import { Link } from '@tanstack/react-router'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { CartLine as CartLineData } from '@/contracts'
import { NftImage } from '@/components/nft-image'
import { QuantityStepper } from '@/components/quantity-stepper'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/eth'
import { usePriceFlash } from '@/lib/use-price-flash'
import { cn } from '@/lib/utils'
import { useRemoveCartLine, useUpdateCartLine } from '../queries'

export const lineMax = (line: CartLineData) =>
  Math.max(1, Math.min(line.maxPerOrder, Math.max(line.available, 1)))

function LineIssue({ line, onFix }: { line: CartLineData; onFix: () => void }) {
  if (line.issues.includes('SOLD_OUT'))
    return (
      <p className="text-xs font-medium text-coral" data-testid="line-issue">
        Esgotado — remova o item para continuar
      </p>
    )
  if (line.issues.includes('INSUFFICIENT_AVAILABILITY'))
    return (
      <p
        className="flex flex-wrap items-center gap-2 text-xs font-medium text-coral"
        data-testid="line-issue"
      >
        Restam {line.available} unidade(s)
        <button type="button" onClick={onFix} className="cursor-pointer text-text-accent underline">
          Ajustar para {line.available}
        </button>
      </p>
    )
  if (line.issues.includes('PRICE_CHANGED'))
    return (
      <p className="text-xs font-medium text-amber" data-testid="line-issue">
        Preço alterado: era {formatEth(line.acknowledgedUnitPrice)}
      </p>
    )
  return null
}

function useLineActions(line: CartLineData) {
  const update = useUpdateCartLine()
  const remove = useRemoveCartLine()
  return {
    setQuantity: (quantity: number) => {
      if (quantity !== line.quantity) update.mutate({ line, quantity })
    },
    remove: () => remove.mutate(line),
  }
}

function UnitPrice({ line, className }: { line: CartLineData; className?: string }) {
  const flash = usePriceFlash(line.unitPrice)
  return (
    <span
      className={cn(
        'rounded font-bold',
        flash === 'up' && 'animate-flash-up',
        flash === 'down' && 'animate-flash-down',
        className,
      )}
      data-testid="line-unit-price"
    >
      {formatEth(line.unitPrice)}
    </span>
  )
}

/** Linha da tabela do carrinho (desktop/tablet). */
export function CartRow({ line }: { line: CartLineData }) {
  const actions = useLineActions(line)
  const blocked = line.issues.some((i) => i !== 'PRICE_CHANGED')
  return (
    <li
      className={cn(
        'grid min-h-[70px] grid-cols-[minmax(0,250px)_1fr_auto_1fr_24px] items-center gap-x-6 bg-surface pr-6',
        blocked && 'ring-1 ring-coral/60',
      )}
      data-testid="cart-line"
    >
      <div className="flex min-w-0 items-center gap-4">
        <Link
          to="/nft/$nftId"
          params={{ nftId: line.nftId }}
          tabIndex={-1}
          aria-hidden="true"
          className="shrink-0"
        >
          <NftImage image={line.image} alt="" sizes="70px" className="size-[70px] rounded-md" />
        </Link>
        <div className="flex min-w-0 flex-col gap-1.5 py-2">
          <Link
            to="/nft/$nftId"
            params={{ nftId: line.nftId }}
            className="truncate text-base leading-4 font-bold hover:text-text-accent"
          >
            {line.name}
          </Link>
          <p className="text-sm leading-4 text-text-muted">
            ID do token: {line.tokenId} · {line.editionLabel}
          </p>
          <LineIssue line={line} onFix={() => actions.setQuantity(line.available)} />
        </div>
      </div>
      <UnitPrice line={line} className="text-base text-text-secondary" />
      <QuantityStepper
        size="sm"
        label={line.name}
        value={line.quantity}
        onChange={actions.setQuantity}
        max={lineMax(line)}
        disabled={line.issues.includes('SOLD_OUT')}
      />
      <span className="text-base font-bold text-text-accent" data-testid="line-total">
        {formatEth(line.lineTotal)}
      </span>
      <button
        type="button"
        onClick={actions.remove}
        aria-label={`Remover ${line.name} do carrinho`}
        className="flex size-6 cursor-pointer items-center justify-center text-text-muted hover:text-coral"
        data-testid="remove-line"
      >
        <Trash2 className="size-5" aria-hidden="true" />
      </button>
    </li>
  )
}

/** Card do carrinho no mobile (frame "Mobile / Carrinho de NFTs"). */
export function CartCard({ line }: { line: CartLineData }) {
  const actions = useLineActions(line)
  const max = lineMax(line)
  return (
    <li
      className={cn(
        'flex overflow-hidden rounded-xl bg-surface',
        line.issues.some((i) => i !== 'PRICE_CHANGED') && 'ring-1 ring-coral/60',
      )}
      data-testid="cart-line"
    >
      <NftImage image={line.image} alt="" sizes="100px" className="size-[100px] shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-2.5 py-2">
        <Link
          to="/nft/$nftId"
          params={{ nftId: line.nftId }}
          className="truncate text-15 leading-5 font-bold"
        >
          {line.name}
        </Link>
        <p className="text-sm leading-4 text-text-muted">Edição: {line.editionLabel}</p>
        <LineIssue line={line} onFix={() => actions.setQuantity(line.available)} />
        <p className="mt-1 text-lg leading-5 font-bold text-text-accent" data-testid="line-total">
          {formatEth(line.lineTotal)}
        </p>
      </div>
      <div className="flex flex-col items-end justify-between py-2 pr-3">
        <button
          type="button"
          onClick={actions.remove}
          aria-label={`Remover ${line.name} do carrinho`}
          className="flex size-7 cursor-pointer items-center justify-center rounded-full text-text-accent hover:bg-surface-raised"
          data-testid="remove-line"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2" role="group" aria-label={`Quantidade de ${line.name}`}>
          <Button
            type="button"
            size="icon-xs"
            variant="secondary"
            className="rounded-full"
            onClick={() => actions.setQuantity(Math.max(1, line.quantity - 1))}
            disabled={line.quantity <= 1}
            aria-label={`Diminuir quantidade de ${line.name}`}
          >
            <Minus aria-hidden="true" />
          </Button>
          <output
            className="min-w-4 text-center text-base tabular-nums"
            aria-live="polite"
            data-testid="quantity-value"
          >
            {line.quantity}
          </output>
          <Button
            type="button"
            size="icon-xs"
            className="rounded-full bg-foreground text-ink hover:bg-foreground/90"
            onClick={() => actions.setQuantity(Math.min(max, line.quantity + 1))}
            disabled={line.quantity >= max || line.issues.includes('SOLD_OUT')}
            aria-label={`Aumentar quantidade de ${line.name}`}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </div>
    </li>
  )
}
