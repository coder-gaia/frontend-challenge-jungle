import { useState, type CSSProperties } from 'react'
import type { NftImage as NftImageData } from '@/contracts'
import { cn } from '@/lib/utils'

const WIDTHS = [160, 320, 640, 960] as const

export function nftImageSrc(key: string, width: (typeof WIDTHS)[number] = 640) {
  return `/nfts/${key}-${width}.webp`
}

export function nftImageSrcSet(key: string) {
  return WIDTHS.map((w) => `${nftImageSrc(key, w)} ${w}w`).join(', ')
}

interface NftImageProps {
  image: NftImageData
  /** Valor do atributo `sizes` (largura exibida). */
  sizes: string
  className?: string
  imgClassName?: string
  /** Imagem principal da página (LCP): carrega com prioridade alta e sem lazy-loading. */
  priority?: boolean
  /** Sobrescreve o texto alternativo (use "" para imagens decorativas). */
  alt?: string
}

/**
 * Arte do NFT com `srcset` responsivo (WebP), proporção fixa (evita CLS) e placeholder com shimmer.
 * O enquadramento opcional (`focus`) gera os "detalhes" da galeria a partir da mesma arte.
 */
export function NftImage({ image, sizes, className, imgClassName, priority, alt }: NftImageProps) {
  const [loaded, setLoaded] = useState(false)
  const focus = image.focus
  const style: CSSProperties | undefined = focus
    ? {
        objectPosition: `${focus.x}% ${focus.y}%`,
        transform: `scale(${focus.zoom})`,
        transformOrigin: `${focus.x}% ${focus.y}%`,
      }
    : undefined

  return (
    <div
      className={cn(
        'relative aspect-square overflow-hidden bg-surface-raised',
        !loaded && 'shimmer',
        className,
      )}
    >
      <img
        src={nftImageSrc(image.key, 640)}
        srcSet={nftImageSrcSet(image.key)}
        sizes={sizes}
        alt={alt ?? image.alt}
        width={640}
        height={640}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        className={cn(
          'size-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
        style={style}
        draggable={false}
      />
    </div>
  )
}
