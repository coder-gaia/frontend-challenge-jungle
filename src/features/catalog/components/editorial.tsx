import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { NftImage } from '@/components/nft-image'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'
import { highlightsQueryOptions } from '../queries'

/** Banner "NFT em destaque / Oferta limitada" da barra lateral (dados da API de destaques). */
export function FeaturedBanner() {
  const { data, isPending, isError } = useQuery(highlightsQueryOptions())
  if (isError || (data && !data.featured)) return null
  const featured = data?.featured

  return (
    <aside
      aria-labelledby="featured-title"
      className="relative overflow-hidden bg-linear-to-b from-primary/10 to-primary/[0.03] pt-6 pb-1"
    >
      <div className="flex flex-col items-center gap-4 px-5">
        <h2 id="featured-title" className="w-full text-2xl leading-8 font-bold text-text-accent">
          NFT EM DESTAQUE
        </h2>
        <p className="text-22 leading-4 font-bold">OFERTA LIMITADA</p>
      </div>
      {isPending || !featured ? (
        <Skeleton className="mt-4 aspect-[310/368] w-full rounded-[22px]" />
      ) : (
        <Link
          to="/nft/$nftId"
          params={{ nftId: featured.id }}
          className="group relative mt-4 block overflow-hidden rounded-[22px]"
        >
          <NftImage image={featured.image} sizes="310px" className="aspect-[310/368] w-full" alt="" />
          <span className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-lg bg-ink/80 px-3 py-2 text-sm backdrop-blur-sm">
            <span className="truncate font-bold">{featured.name}</span>
            <span className="font-bold text-text-accent">{formatEth(featured.price)}</span>
          </span>
        </Link>
      )}
    </aside>
  )
}

const PROMOS = [
  {
    title: ['Lançamentos gênesis', 'de edição limitada'],
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    art: 'emerald-ape',
    search: { tab: 'new' as const },
  },
  {
    title: ['Arte digital selecionada', 'e muito mais'],
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    art: 'ivory-baron',
    search: { category: ['digital-art' as const] },
  },
]

export function Promos() {
  return (
    <section
      aria-label="Coleções em destaque"
      className="defer-render container-kurio grid gap-7 lg:grid-cols-2"
    >
      {PROMOS.map((promo) => (
        <article
          key={promo.art}
          className="relative flex min-h-[250px] overflow-hidden rounded-lg bg-surface max-sm:flex-col"
        >
          <NftImage
            image={{ key: promo.art, alt: '' }}
            alt=""
            sizes="(min-width: 640px) 292px, 100vw"
            className="aspect-auto h-[220px] shrink-0 rounded-[18px] sm:h-auto sm:w-[49%]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-36 -left-48 size-64 rounded-full border-2 border-primary/70"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-56 size-64 rounded-full border border-primary/50"
          />
          <div className="flex flex-1 flex-col items-end justify-center gap-3 p-6 text-right sm:py-9 sm:pr-7 sm:pl-0">
            <h2 className="text-lg leading-6 font-bold xl:whitespace-nowrap">
              {promo.title[0]}
              <br />
              {promo.title[1]}
            </h2>
            <p className="max-w-[263px] text-sm leading-6 text-text-secondary">{promo.text}</p>
            <Button asChild className="mt-1 h-10 w-[140px] font-medium">
              <Link to="/" search={promo.search} hash="mercado">
                Explorar <ArrowRight className="size-[18px]" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}

const POSTS = [
  {
    date: '12 de setembro',
    read: 6,
    title: 'Como funciona a propriedade de NFTs',
    excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    art: 'ivory-baron',
  },
  {
    date: '13 de setembro',
    read: 2,
    title: '10 artistas digitais para acompanhar',
    excerpt: 'Conheça criadores que moldam a cultura digital.',
    art: 'emerald-ape',
  },
  {
    date: '15 de setembro',
    read: 3,
    title: 'Raridade, atributos e procedência',
    excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    art: 'sage-nomad',
  },
  {
    date: '15 de setembro',
    read: 2,
    title: 'Como proteger sua carteira',
    excerpt: 'Proteja sua carteira, seus ativos e sua identidade.',
    art: 'golden-beat',
  },
]

/** "Diário da Cunhagem": conteúdo editorial (as matérias completas estão fora do escopo). */
export function Journal() {
  return (
    <section
      aria-labelledby="journal-title"
      className="defer-render container-kurio flex flex-col items-center gap-10"
    >
      <header className="flex flex-col items-center gap-3 text-center">
        <h2 id="journal-title" className="text-h1 font-bold">
          Diário da Cunhagem
        </h2>
        <p className="text-sm leading-[18px] text-text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <ul className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:pr-14">
        {POSTS.map((post) => (
          <li key={post.title}>
            <article className="group relative flex h-full flex-col overflow-hidden rounded-lg bg-surface">
              <NftImage
                image={{ key: post.art, alt: '' }}
                alt=""
                sizes="(min-width: 1024px) 268px, (min-width: 640px) 50vw, 100vw"
                className="aspect-auto h-[195px] w-full"
              />
              <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
                <p className="text-xs leading-4 font-medium text-text-secondary">
                  {post.date}&nbsp;&nbsp;|&nbsp;&nbsp;Leitura de {post.read} min
                </p>
                <h3 className="text-base leading-[21px] font-bold">{post.title}</h3>
                <p className="text-xs leading-4 font-medium text-text-secondary">{post.excerpt}</p>
                <Link
                  to="/em-breve/$secao"
                  params={{ secao: 'aprenda' }}
                  className="mt-auto inline-flex items-center gap-1 text-xs leading-[14px] font-bold text-text-accent after:absolute after:inset-0"
                  aria-label={`Ler mais: ${post.title}`}
                >
                  Ler mais <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
