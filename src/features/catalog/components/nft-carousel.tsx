import { useId, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/contracts'
import { NftImage } from '@/components/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { PriceTag } from './nft-card'

/** Carrossel horizontal de NFTs com scroll-snap e indicadores de página ("Mais desta coleção", recomendações). */
export function NftCarousel({
  title,
  items: source,
  loading,
}: {
  title: string
  items?: NftSummary[]
  loading?: boolean
}) {
  const titleId = useId()
  const scroller = useRef<HTMLUListElement>(null)
  const [pageIndex, setPageIndex] = useState(0)
  if (!loading && (!source || source.length === 0)) return null
  const items = source ?? []
  const pages = Math.max(1, Math.ceil(items.length / 5))

  const goTo = (index: number) => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ left: (el.scrollWidth / pages) * index, behavior: 'smooth' })
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 border-b border-primary/30 pb-3">
        <h2 id={titleId} className="text-17 leading-4 font-bold text-text-accent">
          {title}
        </h2>
      </div>
      {loading ? (
        <div className="flex gap-7 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex w-[219px] shrink-0 flex-col gap-3">
              <Skeleton className="h-[255px] w-full rounded-none" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <ul
            ref={scroller}
            onScroll={(e) => {
              const el = e.currentTarget
              setPageIndex(
                Math.round((el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth)) * (pages - 1)),
              )
            }}
            className="relative flex snap-x snap-mandatory scrollbar-none gap-4 overflow-x-auto md:gap-[26px]"
          >
            {items.map((nft) => (
              <li key={nft.id} className="w-[160px] shrink-0 snap-start md:w-[219px]">
                <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="group flex flex-col gap-3">
                  <span className="flex h-[200px] items-center justify-center bg-surface px-1 md:h-[255px]">
                    <NftImage image={nft.image} alt="" sizes="219px" className="w-full rounded-[13px]" />
                  </span>
                  <span className="flex flex-col">
                    <span className="truncate text-15 leading-5 group-hover:text-text-accent">
                      {nft.name}
                    </span>
                    <PriceTag nft={nft} className="text-base" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="flex justify-center gap-2" role="group" aria-label="Páginas do carrossel">
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Ir para a página ${i + 1} do carrossel`}
                  aria-pressed={i === pageIndex}
                  className="flex size-6 cursor-pointer items-center justify-center"
                >
                  <span
                    className={cn(
                      'size-3 rounded-full border border-primary',
                      i === pageIndex && 'bg-primary',
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
