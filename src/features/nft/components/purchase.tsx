import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Heart, Loader2, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import type { Edition, NftDetail } from '@/contracts'
import { toApiError } from '@/api/errors'
import { announce } from '@/components/live-announcer'
import { QuantityStepper } from '@/components/quantity-stepper'
import { Button } from '@/components/ui/button'
import { useAddToCart, useCart } from '@/features/cart/queries'
import { useIsFavorite, useToggleFavorite } from '@/features/favorites/queries'
import { cn } from '@/lib/utils'
import { EDITION_PARAM, type EditionParam } from '../edition'

export function EditionPicker({
  nft,
  selected,
  onSelect,
}: {
  nft: NftDetail
  selected: Edition
  onSelect: (param: EditionParam) => void
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-15 leading-4 font-bold">Edição:</legend>
      <div className="flex flex-wrap gap-1.5">
        {nft.editions.map((edition) => {
          const checked = edition.id === selected.id
          const soldOut = edition.available === 0
          return (
            <label
              key={edition.id}
              className={cn(
                'relative flex h-7 min-w-9 cursor-pointer items-center justify-center rounded-full border px-2 text-sm leading-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                checked
                  ? 'border-primary font-medium text-text-accent'
                  : 'border-border text-text-secondary hover:border-border-soft',
                soldOut && 'cursor-not-allowed line-through opacity-50',
              )}
              title={soldOut ? 'Edição esgotada' : `${edition.available} disponível(is)`}
            >
              <input
                type="radio"
                name="edition"
                value={edition.id}
                checked={checked}
                disabled={soldOut && !checked}
                onChange={() => onSelect(EDITION_PARAM[edition.type] as EditionParam)}
                className="sr-only"
              />
              {edition.type === 'open' ? 'ABERTA' : edition.label}
              {soldOut && <span className="sr-only"> (esgotada)</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Quantidade máxima considerando limite por pedido, disponibilidade e o que já está no carrinho. */
export function useEditionLimits(edition: Edition) {
  const { data: cart } = useCart()
  const inCart = cart?.lines.find((line) => line.editionId === edition.id)?.quantity ?? 0
  const maxQuantity = Math.max(0, Math.min(edition.maxPerOrder - inCart, edition.available - inCart))
  return { inCart, maxQuantity }
}

export function usePurchase(nft: NftDetail, edition: Edition) {
  const navigate = useNavigate()
  const addToCart = useAddToCart()
  const { maxQuantity, inCart } = useEditionLimits(edition)
  const [requested, setRequested] = useState(1)
  // Se a disponibilidade cair (tempo real), a quantidade é limitada ao novo máximo.
  const quantity = Math.max(1, Math.min(requested, Math.max(1, maxQuantity)))
  const canBuy = edition.available > 0 && maxQuantity > 0

  const buy = async (goToCart: boolean) => {
    try {
      await addToCart.mutateAsync({ nftId: nft.id, editionId: edition.id, quantity })
      const message = `${quantity} × ${nft.name} (${edition.label}) adicionado ao carrinho.`
      announce(message)
      if (goToCart) void navigate({ to: '/carrinho' })
      else
        toast.success('Adicionado ao carrinho', {
          description: message,
          action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/carrinho' }) },
        })
      setRequested(1)
    } catch (error) {
      const apiError = toApiError(error)
      toast.error('Não foi possível adicionar ao carrinho', { description: apiError.message })
      announce(apiError.message, 'assertive')
    }
  }

  return {
    quantity,
    setQuantity: setRequested,
    maxQuantity,
    inCart,
    canBuy,
    buy,
    isPending: addToCart.isPending,
  }
}

export function LimitHint({
  edition,
  inCart,
  maxQuantity,
}: {
  edition: Edition
  inCart: number
  maxQuantity: number
}) {
  let text: string
  if (edition.available === 0) text = 'Edição esgotada. Escolha outra edição.'
  else if (maxQuantity === 0) text = `Você já tem o máximo desta edição no carrinho (${inCart}).`
  else
    text = `Máx. ${edition.maxPerOrder} por pedido · ${edition.supply === null ? 'edição aberta' : `${edition.available} disponíve${edition.available === 1 ? 'l' : 'is'}`}${inCart ? ` · ${inCart} no carrinho` : ''}`
  return (
    <p
      className={cn(
        'text-xs leading-4',
        edition.available === 0 || maxQuantity === 0 ? 'text-coral' : 'text-text-secondary',
      )}
      data-testid="limit-hint"
    >
      {text}
    </p>
  )
}

export function FavoriteButton({ nft, className }: { nft: NftDetail; className?: string }) {
  const favorite = useIsFavorite(nft.id)
  const { toggle } = useToggleFavorite()
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => toggle(nft, favorite)}
      aria-pressed={favorite}
      className={cn('h-10 w-[130px] gap-2 text-sm', className)}
      data-testid="detail-favorite"
    >
      <Heart className="size-5" fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
      {favorite ? 'Favoritado' : 'Favoritar'}
    </Button>
  )
}

export function BuyButton({
  onClick,
  disabled,
  pending,
  className,
  children = 'COMPRAR',
}: {
  onClick: () => void
  disabled?: boolean
  pending?: boolean
  className?: string
  children?: React.ReactNode
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn('h-10 w-[130px] text-sm', className)}
      data-testid="buy-button"
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  )
}

export function AddToCartIconButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Adicionar ao carrinho"
      className="flex size-[60px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-raised text-text-accent hover:bg-surface-dark disabled:opacity-40"
    >
      <ShoppingCart className="size-5" aria-hidden="true" />
    </button>
  )
}

export { QuantityStepper }
