/**
 * Gera as variações responsivas (WebP) das artes de NFT exportadas do Figma.
 *
 * Fonte: assets/nfts/*.webp (artes originais do arquivo Figma, 1254x1254).
 * Saída: public/nfts/<arte>[-<variação>]-<largura>.webp
 *
 * As variações de cor ("traits") são derivadas das artes originais com rotação de matiz,
 * para dar variedade ao catálogo sem introduzir imagens de terceiros.
 *
 * Uso: npm run images
 */
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SOURCE_DIR = path.resolve('assets/nfts')
const OUTPUT_DIR = path.resolve('public/nfts')
const WIDTHS = [160, 320, 640, 960]

/** @type {Record<string, Record<string, number>>} arte -> { variação: matiz em graus } */
const VARIANTS = {
  'emerald-ape': { base: 0, jade: 40, cobalt: 210, rose: 280 },
  'sage-nomad': { base: 0, berry: 40, copper: 90, moss: 210, ocean: 280 },
  'ivory-baron': { base: 0, lavender: 150, blush: 210, sand: 280 },
  'golden-beat': { base: 0, lime: 90, glacier: 150, bubblegum: 280 },
}

await rm(OUTPUT_DIR, { recursive: true, force: true })
await mkdir(OUTPUT_DIR, { recursive: true })

let count = 0
for (const [art, variants] of Object.entries(VARIANTS)) {
  for (const [variant, hue] of Object.entries(variants)) {
    const key = variant === 'base' ? art : `${art}-${variant}`
    for (const width of WIDTHS) {
      await sharp(path.join(SOURCE_DIR, `${art}.webp`))
        .resize(width, width)
        .modulate({ hue })
        .webp({ quality: width <= 320 ? 74 : 78, effort: 6 })
        .toFile(path.join(OUTPUT_DIR, `${key}-${width}.webp`))
      count++
    }
  }
}

console.log(`Geradas ${count} imagens em ${path.relative(process.cwd(), OUTPUT_DIR)}`)
