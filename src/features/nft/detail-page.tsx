import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Heart, Star } from 'lucide-react'
import { BackButton } from '@/components/layout/mobile-nav'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { StarRating } from '@/components/star-rating'
import { RarityBadge } from '@/features/catalog/components/nft-card'
import { nftDetailQueryOptions } from '@/features/catalog/queries'
import { useIsFavorite, useToggleFavorite } from '@/features/favorites/queries'
import { formatEth } from '@/lib/eth'
import { usePriceFlash } from '@/lib/use-price-flash'
import { cn } from '@/lib/utils'
import { DetailTabs, RelatedCarousel, ShareLinks, TokenInfo } from './components/detail-sections'
import { Gallery } from './components/gallery'
import {
  AddToCartIconButton,
  BuyButton,
  EditionPicker,
  FavoriteButton,
  LimitHint,
  QuantityStepper,
  usePurchase,
} from './components/purchase'
import { editionFromParam } from './edition'

const route = getRouteApi('/nft/$nftId')

function Breadcrumb({ name }: { name: string }) {
  return (
    <nav aria-label="Trilha de navegação" className="hidden md:block">
      <ol className="flex flex-wrap items-center gap-1 text-15 leading-4 font-bold">
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
        <li aria-hidden="true" className="sr-only">
          /
        </li>
        <li className="sr-only" aria-current="page">
          {name}
        </li>
      </ol>
    </nav>
  )
}

function MobileFavorite({ nft }: { nft: Parameters<typeof FavoriteButton>[0]['nft'] }) {
  const favorite = useIsFavorite(nft.id)
  const { toggle } = useToggleFavorite()
  return (
    <button
      type="button"
      onClick={() => toggle(nft, favorite)}
      aria-pressed={favorite}
      aria-label={favorite ? `Remover ${nft.name} da lista de interesse` : `Favoritar ${nft.name}`}
      className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-raised text-text-accent"
      data-testid="detail-favorite"
    >
      <Heart className="size-5" fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}

export function NftDetailPage() {
  const { nftId } = route.useParams()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data: nft } = useSuspenseQuery(nftDetailQueryOptions(nftId))
  const edition = editionFromParam(nft, search.edicao)
  const purchase = usePurchase(nft, edition)
  const flash = usePriceFlash(edition.price)
  const tab = search.aba ?? 'detalhes'

  const setTab = (aba: 'detalhes' | 'avaliacoes') =>
    void navigate({
      search: (prev) => ({ ...prev, aba: aba === 'detalhes' ? undefined : aba }),
      replace: true,
      resetScroll: false,
    })

  const priceNode = (
    <span
      className={cn(
        'inline-flex items-center rounded font-bold text-text-accent',
        flash === 'up' && 'animate-flash-up',
        flash === 'down' && 'animate-flash-down',
      )}
      data-testid="detail-price"
    >
      {formatEth(edition.price)}
      {flash && <span className="sr-only">{flash === 'up' ? ' (preço subiu)' : ' (preço caiu)'}</span>}
    </span>
  )

  const unavailableAlert =
    edition.available === 0 ? (
      <Alert
        variant="destructive"
        className="border-coral/50 bg-coral/10 text-coral"
        data-testid="edition-unavailable"
      >
        <AlertDescription className="text-coral">
          A edição {edition.label} está esgotada. Escolha outra edição para comprar.
        </AlertDescription>
      </Alert>
    ) : null

  return (
    <article className="pb-40 md:pb-0" data-testid="nft-detail">
      {/* ----- Mobile: arte em destaque + folha de detalhes (frame "Mobile / Detalhes do NFT") ----- */}
      <div className="md:hidden">
        <div className="bg-linear-to-b from-surface to-surface-raised px-7 pt-6 pb-32">
          <div className="mb-2 flex items-center justify-between">
            <BackButton />
            <MobileFavorite nft={nft} />
          </div>
          <div className="relative">
            <Gallery images={nft.gallery} name={nft.name} />
            <RarityBadge rarity={nft.rarity} className="rounded-tl-3xl" />
          </div>
        </div>
        <div className="-mt-28 flex flex-col gap-3 rounded-t-[31px] bg-surface px-6 pt-8 pb-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl leading-6 font-bold">{nft.name}</h1>
            <a
              href="#abas"
              onClick={() => setTab('avaliacoes')}
              className="flex h-7 shrink-0 items-center gap-1 rounded-full border border-primary px-2 text-sm"
              aria-label={`Nota ${nft.rating.average.toFixed(1)} com ${nft.rating.count} avaliações`}
            >
              <Star className="size-3.5 fill-amber text-amber" aria-hidden="true" />
              <span className="font-medium">{nft.rating.average.toFixed(1)}</span>
              <span className="text-text-secondary">({nft.rating.count})</span>
            </a>
          </div>
          <p className="text-sm leading-6 text-text-secondary">{nft.description}</p>
          <EditionPicker
            nft={nft}
            selected={edition}
            onSelect={(edicao) =>
              void navigate({ search: (prev) => ({ ...prev, edicao }), replace: true, resetScroll: false })
            }
          />
          {unavailableAlert}
          <TokenInfo nft={nft} />
        </div>
      </div>

      {/* ----- Desktop/tablet ----- */}
      <div className="container-kurio hidden flex-col gap-3 pt-8 md:flex">
        <Breadcrumb name={nft.name} />
        <div className="grid gap-8 lg:grid-cols-[573px_1fr]">
          <div className="relative">
            <Gallery images={nft.gallery} name={nft.name} />
          </div>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 border-b border-primary/30 pb-3">
              <div className="flex items-center gap-3">
                <h1 className="text-h1 font-bold">{nft.name}</h1>
                {nft.rarity !== 'common' && (
                  <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-ink">
                    {nft.rarity === 'rare' ? 'RARO' : 'LENDÁRIO'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-22 leading-4">{priceNode}</p>
                <a
                  href="#abas"
                  onClick={() => setTab('avaliacoes')}
                  className="flex items-center gap-1 text-15 leading-5 hover:text-text-accent"
                >
                  <StarRating value={nft.rating.average} />
                  {nft.rating.count} avaliações de colecionadores
                </a>
              </div>
            </div>
            <section aria-labelledby="about-title" className="flex flex-col gap-3">
              <h2 id="about-title" className="text-15 leading-4 font-bold">
                Sobre este NFT:
              </h2>
              <p className="text-sm leading-6 text-text-secondary">{nft.description}</p>
            </section>
            <EditionPicker
              nft={nft}
              selected={edition}
              onSelect={(edicao) =>
                void navigate({ search: (prev) => ({ ...prev, edicao }), replace: true, resetScroll: false })
              }
            />
            {unavailableAlert}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <QuantityStepper
                  size="lg"
                  label={nft.name}
                  value={purchase.quantity}
                  onChange={purchase.setQuantity}
                  max={Math.max(1, purchase.maxQuantity)}
                  disabled={!purchase.canBuy}
                />
                <div className="flex gap-2">
                  <BuyButton
                    onClick={() => void purchase.buy(true)}
                    disabled={!purchase.canBuy}
                    pending={purchase.isPending}
                  />
                  <FavoriteButton nft={nft} />
                </div>
              </div>
              <LimitHint edition={edition} inCart={purchase.inCart} maxQuantity={purchase.maxQuantity} />
            </div>
            <div className="flex flex-col gap-3">
              <TokenInfo nft={nft} />
              <ShareLinks nft={nft} />
            </div>
          </div>
        </div>
      </div>

      <div className="container-kurio mt-10 flex flex-col gap-16 md:mt-24 md:gap-24">
        <DetailTabs nft={nft} tab={tab} onTabChange={setTab} />
        <RelatedCarousel nftId={nft.id} />
      </div>

      {/* Barra de compra fixa (mobile) */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-4 rounded-t-[40px] bg-surface px-6 pt-5 pb-6 shadow-glow md:hidden"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-15 font-medium text-text-secondary">Qtd.</span>
            <QuantityStepper
              size="sm"
              label={nft.name}
              value={purchase.quantity}
              onChange={purchase.setQuantity}
              max={Math.max(1, purchase.maxQuantity)}
              disabled={!purchase.canBuy}
            />
          </div>
          <p className="text-xl">{priceNode}</p>
        </div>
        <LimitHint edition={edition} inCart={purchase.inCart} maxQuantity={purchase.maxQuantity} />
        <div className="flex items-center gap-3">
          <BuyButton
            onClick={() => void purchase.buy(true)}
            disabled={!purchase.canBuy}
            pending={purchase.isPending}
            className="h-[60px] flex-1 rounded-full bg-linear-to-r from-primary to-primary/80 text-base"
          >
            Comprar NFT
          </BuyButton>
          <AddToCartIconButton
            onClick={() => void purchase.buy(false)}
            disabled={!purchase.canBuy || purchase.isPending}
          />
        </div>
      </div>
    </article>
  )
}

export function NftDetailSkeleton() {
  return (
    <div
      className="container-kurio pt-8"
      aria-busy="true"
      aria-label="Carregando NFT"
      data-testid="detail-skeleton"
    >
      <Skeleton className="mb-3 hidden h-4 w-40 md:block" />
      <div className="grid gap-8 lg:grid-cols-[573px_1fr]">
        <div className="flex gap-7">
          <div className="hidden flex-col gap-4 md:flex">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="size-[100px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="aspect-square w-full max-w-[444px] rounded-3xl md:size-[444px]" />
        </div>
        <div className="flex flex-col gap-5">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-2/3" />
        </div>
      </div>
    </div>
  )
}
