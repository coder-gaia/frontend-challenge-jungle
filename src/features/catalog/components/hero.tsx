import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { NftTab } from '@/contracts'
import { NftImage } from '@/components/nft-image'
import { Button } from '@/components/ui/button'
import { useIsDesktop } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

/**
 * Banner institucional do topo. O conteúdo é editorial (não depende da API), o que permite
 * pintar o maior elemento da página (arte do hero) sem esperar dados — bom para o LCP.
 * Os destaques dinâmicos ficam no banner "NFT em destaque" e nas abas "Em alta"/"Novos".
 */
const SLIDES: Array<{
  eyebrow: string
  title: [string, string]
  mobileTitle: [string, string]
  description: string
  mobileDescription: string
  art: string
  secondaryArt: string
  tab?: NftTab
}> = [
  {
    eyebrow: 'Bem-vindo à Kurio',
    title: ['SEJA DONO DO FUTURO', 'DA ARTE DIGITAL'],
    mobileTitle: ['SEJA DONO DA', 'CULTURA DIGITAL'],
    description:
      'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    mobileDescription: 'Descubra NFTs selecionados de criadores do mundo todo.',
    art: 'emerald-ape',
    secondaryArt: 'sage-nomad',
  },
  {
    eyebrow: 'Lançamentos gênesis',
    title: ['EDIÇÕES LIMITADAS', 'DIRETO DO CRIADOR'],
    mobileTitle: ['EDIÇÕES', 'LIMITADAS'],
    description:
      'Garanta edições escassas antes da revelação pública, com procedência registrada e direitos autorais para quem cria.',
    mobileDescription: 'Edições escassas antes da revelação pública.',
    art: 'ivory-baron',
    secondaryArt: 'golden-beat',
    tab: 'new',
  },
  {
    eyebrow: 'Em alta na Kurio',
    title: ['AS OBRAS QUE', 'MOVEM O MERCADO'],
    mobileTitle: ['AS OBRAS QUE', 'MOVEM O MERCADO'],
    description: 'Acompanhe as coleções mais procuradas da semana com preços atualizados em tempo real.',
    mobileDescription: 'As coleções mais procuradas, com preços ao vivo.',
    art: 'golden-beat',
    secondaryArt: 'emerald-ape-cobalt',
    tab: 'trending',
  },
]

function Dots({
  index,
  onSelect,
  className,
}: {
  index: number
  onSelect: (i: number) => void
  className?: string
}) {
  return (
    <div className={cn('flex gap-2', className)} role="group" aria-label="Destaques do banner">
      {SLIDES.map((slide, i) => (
        <button
          key={slide.art}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Mostrar destaque ${i + 1}: ${slide.eyebrow}`}
          aria-pressed={i === index}
          className="flex size-6 cursor-pointer items-center justify-center"
        >
          <span
            className={cn(
              'size-2 rounded-full bg-primary transition-opacity',
              i === index ? 'opacity-100' : 'opacity-40',
            )}
          />
        </button>
      ))}
    </div>
  )
}

export function Hero() {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]!
  const exploreSearch = slide.tab ? { tab: slide.tab } : {}
  // Renderiza só a variante do breakpoint atual (evita baixar a arte das duas versões).
  const desktop = useIsDesktop()

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques" className="container-kurio">
      {desktop ? (
        <div className="flex min-h-[450px] items-center justify-between gap-10 lg:pl-10">
          <div className="flex max-w-[600px] flex-1 flex-col gap-11" aria-live="polite">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-1">
                <p className="text-sm leading-4 font-medium tracking-[0.1em]">{slide.eyebrow}</p>
                <h1 className="mt-2 text-[34px] leading-[56px] font-bold lg:text-display lg:leading-[70px]">
                  {slide.title[0]}
                  <br />
                  {slide.title[1]}
                </h1>
                <p className="max-w-[557px] text-sm leading-6 text-text-secondary">{slide.description}</p>
              </div>
              <Button asChild className="h-10 w-[140px] text-base">
                <Link to="/" search={exploreSearch} hash="mercado">
                  EXPLORAR
                </Link>
              </Button>
            </div>
            <Dots index={index} onSelect={setIndex} className="self-end" />
          </div>
          <NftImage
            key={slide.art}
            image={{ key: slide.art, alt: '' }}
            alt=""
            sizes="(min-width: 1024px) 450px, 340px"
            priority={index === 0}
            className="size-[340px] shrink-0 rounded-3xl lg:size-[450px]"
          />
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-primary/20 to-primary/10 p-4">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 -left-20 size-[248px] rounded-full bg-linear-to-br from-brand-light/40 to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-2 left-20 size-[248px] rounded-full bg-linear-to-br from-brand-light/30 to-transparent"
          />
          <div className="relative flex items-center gap-2" aria-live="polite">
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-xs leading-4 font-medium">{slide.eyebrow}</p>
              <h1 className="mt-1.5 text-lg leading-[29px] font-bold">
                {slide.mobileTitle[0]}
                <br />
                {slide.mobileTitle[1]}
              </h1>
              <p className="mt-1.5 line-clamp-3 text-xs leading-[18px] text-text-secondary">
                {slide.mobileDescription}
              </p>
              <Link
                to="/"
                search={exploreSearch}
                hash="mercado"
                className="mt-2 inline-flex w-fit items-center gap-2 text-xs leading-[14px] font-bold text-text-accent"
              >
                EXPLORAR <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="relative w-[138px] shrink-0 pb-2">
              <NftImage
                key={slide.art}
                image={{ key: slide.art, alt: '' }}
                alt=""
                sizes="138px"
                priority={index === 0}
                className="size-[138px] rounded-2xl"
              />
              <NftImage
                image={{ key: slide.secondaryArt, alt: '' }}
                alt=""
                sizes="58px"
                className="absolute bottom-0 left-3.5 size-[58px] rounded-2xl ring-2 ring-surface"
              />
            </div>
          </div>
          <Dots index={index} onSelect={setIndex} className="relative mt-1 justify-center" />
        </div>
      )}
    </section>
  )
}
