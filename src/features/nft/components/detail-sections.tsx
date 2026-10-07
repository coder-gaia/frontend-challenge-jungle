import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Mail } from 'lucide-react'
import { NETWORK_LABEL, type NftDetail } from '@/contracts'
import { LinkedinIcon, TwitterIcon } from '@/components/brand-icons'
import { NftImage } from '@/components/nft-image'
import { StarRating } from '@/components/star-rating'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PriceTag } from '@/features/catalog/components/nft-card'
import { relatedQueryOptions } from '@/features/catalog/queries'
import { cn } from '@/lib/utils'

export function TokenInfo({ nft, className }: { nft: NftDetail; className?: string }) {
  return (
    <dl className={cn('flex flex-col gap-3 text-15 leading-5 text-text-muted', className)}>
      <div className="flex gap-1">
        <dt>ID do token:</dt>
        <dd>{nft.tokenId}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Coleção:</dt>
        <dd>{nft.collection}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Atributos:</dt>
        <dd>{nft.attributes.join(', ')}</dd>
      </div>
    </dl>
  )
}

/** Compartilhamento por links externos reais (abrem em nova aba). */
export function ShareLinks({ nft }: { nft: NftDetail }) {
  const url = typeof window !== 'undefined' ? window.location.href.split('?')[0]! : ''
  const text = `${nft.name} na KURIO`
  const links = [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      Icon: LinkedinIcon,
    },
    {
      label: 'e-mail',
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
      Icon: Mail,
    },
    {
      label: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      Icon: TwitterIcon,
    },
  ]
  return (
    <div className="flex items-center gap-2">
      <span className="text-15 leading-4 font-bold">Compartilhar este NFT:</span>
      <ul className="flex items-center gap-1">
        {links.map(({ label, href, Icon }) => (
          <li key={label}>
            <a
              href={href}
              target={href.startsWith('mailto') ? undefined : '_blank'}
              rel="noopener noreferrer"
              aria-label={`Compartilhar por ${label}${href.startsWith('mailto') ? '' : ' (abre em nova aba)'}`}
              className="flex size-7 items-center justify-center rounded text-foreground hover:text-text-accent"
            >
              <Icon className="size-4" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export function DetailTabs({
  nft,
  tab,
  onTabChange,
}: {
  nft: NftDetail
  tab: 'detalhes' | 'avaliacoes'
  onTabChange: (tab: 'detalhes' | 'avaliacoes') => void
}) {
  const network = NETWORK_LABEL[nft.network]
  return (
    <Tabs
      id="abas"
      value={tab}
      onValueChange={(value) => onTabChange(value as typeof tab)}
      className="scroll-mt-6 gap-3"
    >
      <TabsList className="h-auto w-full justify-start gap-8 rounded-none border-b border-primary/30 bg-transparent p-0">
        {(
          [
            ['detalhes', 'Detalhes do NFT'],
            ['avaliacoes', `Avaliações de colecionadores (${nft.rating.count})`],
          ] as const
        ).map(([value, label]) => (
          <TabsTrigger
            key={value}
            value={value}
            className="relative h-auto flex-none cursor-pointer rounded-none border-0 bg-transparent px-0 pb-3 text-15 font-normal text-foreground shadow-none after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-text-accent data-[state=active]:shadow-none data-[state=active]:after:bg-primary md:text-17 dark:data-[state=active]:bg-transparent"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="detalhes" className="flex flex-col gap-3 text-sm leading-6 text-text-secondary">
        {nft.story.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
        <dl className="mt-1 flex flex-col">
          <dt className="font-bold text-foreground">Rede:</dt>
          <dd className="mb-3">
            Cunhado na {network} com procedência imutável e metadados armazenados no {nft.contract.storage}.
          </dd>
          <dt className="font-bold text-foreground">Contrato:</dt>
          <dd className="mb-3">
            {nft.contract.address} • Contrato inteligente {nft.contract.standard} verificado.
          </dd>
          <dt className="font-bold text-foreground">Direitos autorais:</dt>
          <dd>
            Direitos autorais do criador ({nft.creator.name}): {nft.creator.royaltyPercent}% nas vendas
            secundárias, pagos automaticamente pelos mercados compatíveis.
          </dd>
        </dl>
      </TabsContent>
      <TabsContent value="avaliacoes">
        <div className="mb-4 flex items-center gap-3">
          <StarRating value={nft.rating.average} />
          <span className="text-sm text-text-secondary">
            {nft.rating.average.toFixed(1).replace('.', ',')} de 5 · {nft.rating.count} avaliações
          </span>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {nft.reviews.map((review) => (
            <li key={review.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{review.author}</span>
                <StarRating value={review.rating} size={12} />
              </div>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{review.comment}</p>
              <time dateTime={review.createdAt} className="mt-2 block text-xs text-text-muted">
                {dateFormatter.format(new Date(review.createdAt))}
              </time>
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  )
}

/** "Mais desta coleção": carrossel com scroll-snap e indicadores de página. */
export function RelatedCarousel({ nftId }: { nftId: string }) {
  const { data, isPending, isError } = useQuery(relatedQueryOptions(nftId))
  const scroller = useRef<HTMLUListElement>(null)
  const [pageIndex, setPageIndex] = useState(0)
  if (isError || (data && data.items.length === 0)) return null
  const items = data?.items ?? []
  const pages = Math.max(1, Math.ceil(items.length / 5))

  const goTo = (index: number) => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ left: (el.scrollWidth / pages) * index, behavior: 'smooth' })
  }

  return (
    <section aria-labelledby="related-title" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 border-b border-primary/30 pb-3">
        <h2 id="related-title" className="text-17 leading-4 font-bold text-text-accent">
          Mais desta coleção
        </h2>
      </div>
      {isPending ? (
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
            className="flex snap-x snap-mandatory scrollbar-none gap-4 overflow-x-auto md:gap-[26px]"
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
