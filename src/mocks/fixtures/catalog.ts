import type { Category, Edition, EditionType, Network, NftImage, Rarity, Review } from '@/contracts'
import { normalizeEth, scaleEth } from '@/lib/eth'
import { createRng, hashString } from '../lib/rng'

/**
 * Catálogo determinístico gerado a partir de uma seed fixa.
 * Os 9 primeiros itens reproduzem os NFTs desenhados no Figma; os demais variam arte, categoria,
 * rede e preço para exercitar busca, filtros, ordenação e paginação.
 */

export const CATALOG_SEED = 2026
/** Data de referência fixa do catálogo (evita depender do relógio em "Novos lançamentos"). */
export const CATALOG_REFERENCE_DATE = Date.UTC(2026, 8, 30, 12, 0, 0)
export const NEW_RELEASE_WINDOW_DAYS = 12

export interface CatalogItemFixture {
  id: string
  name: string
  tokenId: string
  collection: string
  creator: string
  royaltyPercent: number
  image: NftImage
  gallery: NftImage[]
  category: Category
  network: Network
  rarity: Rarity
  basePrice: string
  compareAtPrice: string | null
  editions: Edition[]
  defaultEditionId: string
  attributes: string[]
  description: string
  story: string[]
  reviews: Review[]
  contract: { address: string; standard: 'ERC-721' | 'ERC-1155' | 'SPL'; storage: string }
  listedAt: string
  trendingScore: number
}

type ArtFamily = 'emerald-ape' | 'sage-nomad' | 'ivory-baron' | 'golden-beat'

const FAMILIES: Record<
  ArtFamily,
  {
    collection: string
    creator: string
    subject: string
    traits: string[]
    nouns: string[]
    variants: Record<string, { color: string; adjectives: string[] }>
  }
> = {
  'emerald-ape': {
    collection: 'Kurio Apes',
    creator: 'Nova Sato',
    subject: 'um primata de óculos redondos e jaqueta college',
    traits: ['Óculos', 'Jaqueta college', 'Corrente'],
    nouns: ['Ape', 'Monarch', 'Drifter', 'Captain', 'Scholar', 'Rebel'],
    variants: {
      base: { color: 'Esmeralda', adjectives: ['Emerald', 'Verdant', 'Forest'] },
      jade: { color: 'Jade', adjectives: ['Jade', 'Teal', 'Lagoon'] },
      cobalt: { color: 'Cobalto', adjectives: ['Cobalt', 'Azure', 'Midnight'] },
      rose: { color: 'Rosa', adjectives: ['Rose', 'Coral', 'Blossom'] },
    },
  },
  'sage-nomad': {
    collection: 'Nomad Society',
    creator: 'Leo Okafor',
    subject: 'um gorila grisalho de chapéu bucket e moletom',
    traits: ['Chapéu bucket', 'Moletom', 'Barba grisalha'],
    nouns: ['Nomad', 'Wanderer', 'Pilgrim', 'Sage', 'Hermit', 'Voyager'],
    variants: {
      base: { color: 'Violeta', adjectives: ['Violet', 'Cosmic', 'Amethyst'] },
      berry: { color: 'Amora', adjectives: ['Berry', 'Magenta', 'Plum'] },
      copper: { color: 'Cobre', adjectives: ['Copper', 'Rust', 'Ember'] },
      moss: { color: 'Musgo', adjectives: ['Moss', 'Fern', 'Olive'] },
      ocean: { color: 'Oceano', adjectives: ['Ocean', 'Tidal', 'Cerulean'] },
    },
  },
  'ivory-baron': {
    collection: 'Baron Club',
    creator: 'Marina Costa',
    subject: 'um gorila elegante de blazer e gola alta',
    traits: ['Blazer', 'Gola alta', 'Brinco'],
    nouns: ['Baron', 'Duke', 'Count', 'Regent', 'Vessel', 'Envoy'],
    variants: {
      base: { color: 'Marfim', adjectives: ['Ivory', 'Neon', 'Pearl'] },
      lavender: { color: 'Lavanda', adjectives: ['Lavender', 'Lilac', 'Orchid'] },
      blush: { color: 'Blush', adjectives: ['Blush', 'Peach', 'Velvet'] },
      sand: { color: 'Areia', adjectives: ['Sand', 'Dune', 'Amber'] },
    },
  },
  'golden-beat': {
    collection: 'Golden Frequencies',
    creator: 'Kai Tanaka',
    subject: 'um orangotango dourado com fones de ouvido',
    traits: ['Fones', 'Jaqueta bomber', 'Pelagem dourada'],
    nouns: ['Beat', 'Signal', 'Frequency', 'Rhythm', 'Tempo', 'Bass'],
    variants: {
      base: { color: 'Dourado', adjectives: ['Golden', 'Solar', 'Honey'] },
      lime: { color: 'Lima', adjectives: ['Lime', 'Acid', 'Citrus'] },
      glacier: { color: 'Glacial', adjectives: ['Glacier', 'Frost', 'Arctic'] },
      bubblegum: { color: 'Chiclete', adjectives: ['Bubblegum', 'Candy', 'Neon'] },
    },
  },
}

interface Seed {
  name: string
  family: ArtFamily
  variant: string
  price: string
  compareAtPrice?: string
  category?: Category
  network?: Network
  rarity?: Rarity
  reviews?: number
  rating?: number
}

/** NFTs desenhados no Figma (nome, arte e preço exatos). */
const FIGMA_ITEMS: Seed[] = [
  {
    name: 'Emerald Ape #042',
    family: 'emerald-ape',
    variant: 'base',
    price: '1.19',
    category: 'digital-art',
    network: 'ethereum',
    rarity: 'rare',
    reviews: 19,
    rating: 4.6,
  },
  {
    name: 'Sage Nomad #009',
    family: 'sage-nomad',
    variant: 'base',
    price: '1.69',
    category: 'digital-art',
    network: 'ethereum',
  },
  {
    name: 'Neon Vessel #552',
    family: 'ivory-baron',
    variant: 'base',
    price: '1.99',
    compareAtPrice: '2.29',
    category: 'collectibles',
    network: 'polygon',
  },
  {
    name: 'Cosmic Bloom #118',
    family: 'sage-nomad',
    variant: 'base',
    price: '1.29',
    category: 'generative',
    network: 'ethereum',
  },
  {
    name: 'Violet Nomad #314',
    family: 'sage-nomad',
    variant: 'base',
    price: '1.39',
    category: 'digital-art',
    network: 'polygon',
  },
  {
    name: 'Ivory Baron #088',
    family: 'ivory-baron',
    variant: 'base',
    price: '1.79',
    category: 'collectibles',
    network: 'ethereum',
    rarity: 'rare',
  },
  {
    name: 'Golden Beat #207',
    family: 'golden-beat',
    variant: 'base',
    price: '0.99',
    category: 'music',
    network: 'solana',
  },
  {
    name: 'Golden Frequency #071',
    family: 'golden-beat',
    variant: 'base',
    price: '0.89',
    category: 'music',
    network: 'ethereum',
  },
  {
    name: 'Golden Signal #160',
    family: 'golden-beat',
    variant: 'base',
    price: '0.39',
    category: 'music',
    network: 'polygon',
  },
]

const TOTAL_ITEMS = 60

const CATEGORY_WEIGHTS: Array<[Category, number]> = [
  ['digital-art', 22],
  ['photography', 8],
  ['music', 12],
  ['3d-art', 10],
  ['collectibles', 12],
  ['generative', 10],
  ['gaming', 10],
  ['memberships', 8],
  ['utility', 8],
]

const NETWORK_WEIGHTS: Array<[Network, number]> = [
  ['ethereum', 45],
  ['polygon', 30],
  ['solana', 25],
]

const REVIEW_AUTHORS = [
  'Ana Souza',
  'Bruno Lima',
  'Carla Mendes',
  'Diego Rocha',
  'Elisa Prado',
  'Felipe Nunes',
  'Gabi Torres',
  'Heitor Alves',
  'Isabela Reis',
  'João Pedro',
  'Karen Duarte',
  'Lucas Brandão',
  'Mia Fontes',
  'Nina Castro',
  'Otávio Melo',
  'Paula Viana',
  'Rafa Lopes',
  'Sofia Ramos',
  'Tiago Freire',
  'Vera Lins',
]

const REVIEW_COMMENTS = [
  'Acabamento impecável, a arte em alta resolução é ainda melhor ao vivo.',
  'Compra tranquila e a procedência registrada passa muita confiança.',
  'Uma das peças mais bonitas da coleção. Valeu cada ETH.',
  'Adoro os detalhes do traje — dá para ver o cuidado do criador.',
  'Entrega na carteira foi imediata após a confirmação.',
  'Os atributos raros fazem diferença. Peça de destaque no meu portfólio.',
  'Paleta de cores incrível, combina demais com o restante da coleção.',
  'Recebi acesso aos lançamentos exclusivos logo depois da compra.',
  'Preço justo para a tiragem. Recomendo para quem está começando.',
  'Comunidade ativa e o criador sempre responde. Experiência ótima.',
]

function weighted<T>(rng: ReturnType<typeof createRng>, entries: Array<[T, number]>): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let roll = rng.next() * total
  for (const [value, weight] of entries) {
    roll -= weight
    if (roll <= 0) return value
  }
  return entries[0]![0]
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace('#', '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const imageKey = (family: ArtFamily, variant: string) =>
  variant === 'base' ? family : `${family}-${variant}`

const EDITION_SPECS: Array<{
  type: EditionType
  label: string
  factor: string
  supply: number | null
  max: number
}> = [
  { type: '1/1', label: '1/1', factor: '3.2', supply: 1, max: 1 },
  { type: '1/10', label: '1/10', factor: '1.6', supply: 10, max: 2 },
  { type: '1/50', label: '1/50', factor: '1', supply: 50, max: 10 },
  { type: 'open', label: 'Aberta', factor: '0.6', supply: null, max: 20 },
]

function buildItem(seed: Seed, index: number): CatalogItemFixture {
  const rng = createRng(hashString(seed.name) ^ CATALOG_SEED)
  const family = FAMILIES[seed.family]
  const variant = family.variants[seed.variant]!
  const id = slugify(seed.name)
  const number = seed.name.split('#')[1] ?? '000'
  const tokenId = `#${number.padStart(4, '0')}`
  const category = seed.category ?? weighted(rng, CATEGORY_WEIGHTS)
  const network = seed.network ?? weighted(rng, NETWORK_WEIGHTS)
  const rarity: Rarity =
    seed.rarity ?? (rng.chance(0.08) ? 'legendary' : rng.chance(0.22) ? 'rare' : 'common')
  const key = imageKey(seed.family, seed.variant)

  const editions: Edition[] = EDITION_SPECS.map((spec) => {
    const price = spec.type === '1/50' ? seed.price : scaleEth(seed.price, spec.factor, 2)
    let available: number
    if (spec.supply === null) available = 999
    else if (spec.type === '1/1') available = rng.chance(0.7) ? 1 : 0
    else if (spec.type === '1/10') available = rng.chance(0.2) ? 0 : rng.int(1, 10)
    else available = rng.int(12, 50)
    return {
      id: `${id}--${spec.type === 'open' ? 'open' : spec.type.replace('/', '-')}`,
      type: spec.type,
      label: spec.label,
      price: normalizeEth(price === '0' ? '0.01' : price),
      supply: spec.supply,
      available,
      maxPerOrder: spec.max,
    }
  })

  const editionsText = '1/50'
  const reviewCount = seed.reviews ?? rng.int(2, 24)
  const targetRating = seed.rating ?? rng.float(3.8, 4.9)
  const reviews: Review[] = Array.from({ length: reviewCount }, (_, i) => ({
    id: `${id}-review-${i + 1}`,
    author: REVIEW_AUTHORS[(i + rng.int(0, REVIEW_AUTHORS.length - 1)) % REVIEW_AUTHORS.length]!,
    rating: Math.max(1, Math.min(5, Math.round(targetRating + rng.float(-0.9, 0.6)))),
    comment: rng.pick(REVIEW_COMMENTS),
    createdAt: new Date(CATALOG_REFERENCE_DATE - (i + 1) * 86_400_000 * rng.int(1, 3)).toISOString(),
  }))

  const networkLabel = network === 'ethereum' ? 'Ethereum' : network === 'polygon' ? 'Polygon' : 'Solana'
  const listedAt = new Date(
    CATALOG_REFERENCE_DATE - index * 19 * 3_600_000 - rng.int(0, 600) * 60_000,
  ).toISOString()
  const rarityTrait = rarity === 'legendary' ? 'Lendário' : rarity === 'rare' ? 'Raro' : 'Comum'
  const hex = (n: number) =>
    Array.from({ length: n }, () => rng.int(0, 15).toString(16))
      .join('')
      .toUpperCase()

  return {
    id,
    name: seed.name,
    tokenId,
    collection: family.collection,
    creator: family.creator,
    royaltyPercent: 5,
    image: { key, alt: `${seed.name}: ${family.subject}, variação ${variant.color.toLowerCase()}.` },
    gallery: [
      { key, alt: `${seed.name}, arte completa.` },
      { key, alt: `${seed.name}, detalhe do rosto.`, focus: { x: 50, y: 34, zoom: 1.9 } },
      { key, alt: `${seed.name}, detalhe do traje.`, focus: { x: 50, y: 82, zoom: 1.7 } },
      { key, alt: `${seed.name}, detalhe dos acessórios.`, focus: { x: 66, y: 50, zoom: 2.3 } },
    ],
    category,
    network,
    rarity,
    basePrice: seed.price,
    compareAtPrice: seed.compareAtPrice ?? (rng.chance(0.1) ? scaleEth(seed.price, '1.15', 2) : null),
    editions,
    defaultEditionId: editions[2]!.id,
    attributes: [family.traits[rng.int(0, family.traits.length - 1)]!, variant.color, rarityTrait],
    description: `Um colecionável digital ${editionsText} finalizado à mão da coleção ${family.collection}, verificado na ${networkLabel}, com arte desbloqueável e acesso para colecionadores.`,
    story: [
      `${seed.name} é uma obra digital ${editionsText} finalizada à mão da coleção ${family.collection}. Cada atributo fica armazenado nos metadados do token e verificado na ${networkLabel}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${family.creator} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    ],
    reviews,
    contract: {
      address: `0x${hex(4)}...${hex(4)}`,
      standard: network === 'solana' ? 'SPL' : rng.chance(0.3) ? 'ERC-1155' : 'ERC-721',
      storage: network === 'solana' ? 'Arweave' : 'IPFS',
    },
    listedAt,
    trendingScore: rng.int(0, 1000),
  }
}

function generateSeeds(): Seed[] {
  const rng = createRng(CATALOG_SEED)
  const seeds = [...FIGMA_ITEMS]
  const usedNames = new Set(seeds.map((s) => s.name.split(' #')[0]))
  const usedNumbers = new Set(seeds.map((s) => s.name.split('#')[1]))
  const combos: Array<{ family: ArtFamily; variant: string }> = []
  for (const [family, def] of Object.entries(FAMILIES) as Array<[ArtFamily, (typeof FAMILIES)[ArtFamily]]>) {
    for (const variant of Object.keys(def.variants)) combos.push({ family, variant })
  }
  let cursor = 0
  while (seeds.length < TOTAL_ITEMS) {
    const combo = combos[cursor++ % combos.length]!
    const def = FAMILIES[combo.family]
    const adjective = rng.pick(def.variants[combo.variant]!.adjectives)
    const noun = rng.pick(def.nouns)
    const base = `${adjective} ${noun}`
    if (usedNames.has(base)) continue
    let number = String(rng.int(1, 999)).padStart(3, '0')
    while (usedNumbers.has(number)) number = String(rng.int(1, 999)).padStart(3, '0')
    usedNames.add(base)
    usedNumbers.add(number)
    const tier = rng.next()
    const price = tier < 0.6 ? rng.float(0.05, 1.5) : tier < 0.9 ? rng.float(1.5, 4) : rng.float(4, 12.3)
    seeds.push({
      name: `${base} #${number}`,
      family: combo.family,
      variant: combo.variant,
      price: price.toFixed(2),
    })
  }
  // Garante os extremos da faixa de preço do layout (0.02 – 12.30 ETH).
  seeds[TOTAL_ITEMS - 1] = { ...seeds[TOTAL_ITEMS - 1]!, price: '12.30', rarity: 'legendary' }
  seeds[TOTAL_ITEMS - 2] = { ...seeds[TOTAL_ITEMS - 2]!, price: '0.02' }
  return seeds
}

export const CATALOG: CatalogItemFixture[] = generateSeeds().map(buildItem)

export const CATALOG_BY_ID = new Map(CATALOG.map((item) => [item.id, item]))

/** NFT exibido no banner "NFT em destaque / Oferta limitada". */
export const FEATURED_NFT_ID = 'sage-nomad-009'
