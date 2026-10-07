import { Link } from '@tanstack/react-router'
import { ArrowDown, ArrowUp, Heart, ZoomIn } from 'lucide-react'
import type { NftSummary } from '@/contracts'
import { NftImage } from '@/components/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsFavorite, useToggleFavorite } from '@/features/favorites/queries'
import { formatEth } from '@/lib/eth'
import { usePriceFlash } from '@/lib/use-price-flash'
import { cn } from '@/lib/utils'

export const RARITY_LABEL = { common: null, rare: 'RARO', legendary: 'LENDÁRIO' } as const

export function RarityBadge({ rarity, className }: { rarity: NftSummary['rarity']; className?: string }) {
  const label = RARITY_LABEL[rarity]
  if (!label) return null
  return (
    <span
      className={cn(
        'pointer-events-none absolute top-0 left-0 z-10 bg-primary px-2 py-1.5 text-[13px] leading-4 font-medium text-ink',
        className,
      )}
    >
      {label}
    </span>
  )
}

export function PriceTag({
  nft,
  className,
}: {
  nft: Pick<NftSummary, 'price' | 'compareAtPrice'>
  className?: string
}) {
  const flash = usePriceFlash(nft.price)
  return (
    <p className={cn('flex flex-wrap items-center gap-x-3 leading-4', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded font-bold text-text-accent',
          flash === 'up' && 'animate-flash-up',
          flash === 'down' && 'animate-flash-down',
        )}
        data-testid="nft-price"
      >
        {formatEth(nft.price)}
        {flash === 'up' && <ArrowUp className="size-3.5 text-success" aria-label="preço subiu" />}
        {flash === 'down' && <ArrowDown className="size-3.5 text-coral" aria-label="preço caiu" />}
      </span>
      {nft.compareAtPrice && (
        <span className="font-normal text-text-muted line-through">
          <span className="sr-only">Preço anterior: </span>
          {formatEth(nft.compareAtPrice)}
        </span>
      )}
    </p>
  )
}

function FavoriteButton({ nft, className }: { nft: NftSummary; className?: string }) {
  const favorite = useIsFavorite(nft.id)
  const { toggle } = useToggleFavorite()
  return (
    <button
      type="button"
      onClick={() => toggle(nft, favorite)}
      aria-pressed={favorite}
      aria-label={favorite ? `Remover ${nft.name} da lista de interesse` : `Favoritar ${nft.name}`}
      className={cn(
        'relative z-20 flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-raised text-text-accent transition hover:bg-surface-dark',
        className,
      )}
      data-testid="favorite-toggle"
    >
      <Heart className="size-4" fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}

/**
 * Card do catálogo. Desktop: moldura 258×300 do Figma com ações no hover/foco.
 * Mobile: cartão arredondado com gradiente e botão de favorito sobre a arte.
 * O nome é um "stretched link" (o card inteiro navega) e os botões ficam acima dele.
 */
export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col gap-2 md:gap-3" data-testid="nft-card">
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden',
          'rounded-[20px] bg-linear-to-b from-surface to-surface-raised px-1 pt-3 pb-5',
          'md:h-[300px] md:rounded-none md:bg-surface md:bg-none md:px-1 md:py-0',
        )}
      >
        <NftImage
          image={nft.image}
          sizes="(min-width: 1024px) 250px, (min-width: 768px) 30vw, 45vw"
          className="w-full rounded-2xl md:rounded-[15px]"
          priority={priority}
          imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <RarityBadge rarity={nft.rarity} className="md:top-0 md:left-0" />
        <FavoriteButton nft={nft} className="absolute top-5 right-3 md:hidden" />
        <div className="absolute inset-x-0 bottom-3 z-20 hidden justify-center gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:flex">
          <FavoriteButton nft={nft} className="rounded-md bg-ink/85" />
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            aria-label={`Ver detalhes de ${nft.name}`}
            tabIndex={-1}
            className="flex size-8 items-center justify-center rounded-md border border-border bg-ink/85 text-text-accent hover:bg-surface-dark"
          >
            <ZoomIn className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-1 pl-2 md:gap-3 md:pl-0">
        <h3 className="truncate text-15 leading-5 md:text-base md:leading-4">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="outline-none after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-primary"
          >
            {nft.name}
          </Link>
        </h3>
        <PriceTag nft={nft} className="text-base md:text-lg" />
      </div>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 md:gap-3" aria-hidden="true">
      <div className="rounded-[20px] bg-surface px-1 pt-3 pb-5 md:flex md:h-[300px] md:items-center md:rounded-none md:py-0">
        <Skeleton className="aspect-square w-full rounded-2xl md:rounded-[15px]" />
      </div>
      <div className="flex flex-col gap-2 pl-2 md:gap-3 md:pl-0">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  )
}
