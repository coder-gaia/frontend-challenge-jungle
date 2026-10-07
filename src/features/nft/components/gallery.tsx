import { lazy, Suspense, useState } from 'react'
import { ZoomIn } from 'lucide-react'
import type { NftImage as NftImageData } from '@/contracts'
import { NftImage } from '@/components/nft-image'
import { cn } from '@/lib/utils'

const ZoomDialog = lazy(() => import('./zoom-dialog'))

/**
 * Galeria do detalhe: miniaturas (desktop) + imagem principal com zoom (diálogo acessível).
 * No mobile, as vistas são navegadas pelos indicadores abaixo da arte.
 */
export function Gallery({ images, name }: { images: NftImageData[]; name: string }) {
  const [index, setIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const current = images[index] ?? images[0]!

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-7">
      <ul className="hidden flex-col gap-4 md:flex" aria-label="Vistas da obra">
        {images.map((image, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Mostrar ${image.alt}`}
              aria-pressed={i === index}
              className={cn(
                'block size-[100px] cursor-pointer overflow-hidden rounded-lg border bg-surface transition',
                i === index ? 'border-primary' : 'border-transparent opacity-80 hover:opacity-100',
              )}
            >
              <NftImage image={image} alt="" sizes="100px" className="size-full" priority={i === 0} />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative w-full md:w-auto">
        <div className="mx-auto w-full max-w-[444px] rounded-md bg-transparent md:size-[444px] md:bg-surface md:p-4">
          <NftImage
            key={index}
            image={current}
            sizes="(min-width: 768px) 404px, 92vw"
            priority
            className="w-full rounded-3xl"
          />
        </div>
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label={`Ampliar imagem de ${name}`}
          className="absolute top-3 right-3 flex size-[30px] cursor-pointer items-center justify-center rounded-full border border-border bg-surface-raised text-foreground hover:text-text-accent md:top-3 md:right-3"
        >
          <ZoomIn className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex justify-center gap-2 md:hidden" role="group" aria-label="Vistas da obra">
        {images.map((image, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Mostrar ${image.alt}`}
            aria-pressed={i === index}
            className="flex h-6 cursor-pointer items-center"
          >
            <span
              className={cn(
                'h-[7px] rounded-full bg-primary transition-all',
                i === index ? 'w-7' : 'w-[7px] opacity-70',
              )}
            />
          </button>
        ))}
      </div>

      {zoomOpen && (
        <Suspense fallback={null}>
          <ZoomDialog image={current} name={name} open={zoomOpen} onOpenChange={setZoomOpen} />
        </Suspense>
      )}
    </div>
  )
}
