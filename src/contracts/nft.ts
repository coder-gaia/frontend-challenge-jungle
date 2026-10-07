import { z } from 'zod'
import { ethAmountSchema, imageSchema, isoDateSchema, networkSchema, paginationSchema } from './common'

export const categorySchema = z.enum([
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'gaming',
  'memberships',
  'utility',
])
export type Category = z.infer<typeof categorySchema>

export const CATEGORY_LABEL: Record<Category, string> = {
  'digital-art': 'Arte digital',
  photography: 'Fotografia',
  music: 'Música',
  '3d-art': 'Arte 3D',
  collectibles: 'Colecionáveis',
  generative: 'Generativa',
  gaming: 'Jogos',
  memberships: 'Assinaturas',
  utility: 'Utilidade',
}

export const editionTypeSchema = z.enum(['1/1', '1/10', '1/50', 'open'])
export type EditionType = z.infer<typeof editionTypeSchema>

export const editionSchema = z.object({
  id: z.string(),
  type: editionTypeSchema,
  /** Rótulo exibido ("1/1", "1/10", "1/50", "Aberta"). */
  label: z.string(),
  price: ethAmountSchema,
  /** Tiragem total; `null` para edição aberta. */
  supply: z.number().int().positive().nullable(),
  available: z.number().int().min(0),
  /** Limite de unidades por pedido. */
  maxPerOrder: z.number().int().min(1),
})
export type Edition = z.infer<typeof editionSchema>

export const raritySchema = z.enum(['common', 'rare', 'legendary'])
export type Rarity = z.infer<typeof raritySchema>

export const nftSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenId: z.string(),
  collection: z.string(),
  image: imageSchema,
  category: categorySchema,
  network: networkSchema,
  rarity: raritySchema,
  /** Preço da edição padrão (exibido nos cards). */
  price: ethAmountSchema,
  /** Preço anterior, quando há promoção. */
  compareAtPrice: ethAmountSchema.nullable(),
  /** Soma das unidades disponíveis em todas as edições. */
  available: z.number().int().min(0),
  defaultEditionId: z.string(),
  listedAt: isoDateSchema,
  /** Versão monotônica do recurso; usada para reconciliar REST e eventos em tempo real. */
  version: z.number().int().min(1),
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const reviewSchema = z.object({
  id: z.string(),
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: isoDateSchema,
})
export type Review = z.infer<typeof reviewSchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  story: z.array(z.string()),
  creator: z.object({ name: z.string(), royaltyPercent: z.number() }),
  attributes: z.array(z.string()),
  gallery: z.array(imageSchema).min(1),
  editions: z.array(editionSchema).min(1),
  rating: z.object({ average: z.number(), count: z.number().int() }),
  reviews: z.array(reviewSchema),
  contract: z.object({
    address: z.string(),
    standard: z.enum(['ERC-721', 'ERC-1155', 'SPL']),
    storage: z.string(),
  }),
})
export type NftDetail = z.infer<typeof nftDetailSchema>

export const nftSortSchema = z.enum(['recent', 'price-asc', 'price-desc', 'name'])
export type NftSort = z.infer<typeof nftSortSchema>

export const NFT_SORT_LABEL: Record<NftSort, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  name: 'Nome (A–Z)',
}

export const nftTabSchema = z.enum(['all', 'new', 'trending'])
export type NftTab = z.infer<typeof nftTabSchema>

export const NFT_TAB_LABEL: Record<NftTab, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

/** Parâmetros aceitos por `GET /nfts` (arrays em chaves repetidas: `category=a&category=b`). */
export const nftListQuerySchema = z.object({
  q: z.string().max(80).optional(),
  category: z.array(categorySchema).optional(),
  network: z.array(networkSchema).optional(),
  minPrice: ethAmountSchema.optional(),
  maxPrice: ethAmountSchema.optional(),
  tab: nftTabSchema.optional(),
  sort: nftSortSchema.optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
})
export type NftListQuery = z.infer<typeof nftListQuerySchema>

export const nftListResponseSchema = paginationSchema.extend({
  items: z.array(nftSummarySchema),
  facets: z.object({
    categories: z.record(categorySchema, z.number().int()),
    networks: z.record(networkSchema, z.number().int()),
    price: z.object({ min: ethAmountSchema, max: ethAmountSchema }),
  }),
})
export type NftListResponse = z.infer<typeof nftListResponseSchema>

export const highlightsResponseSchema = z.object({
  featured: nftSummarySchema.nullable(),
  trending: z.array(nftSummarySchema),
})
export type HighlightsResponse = z.infer<typeof highlightsResponseSchema>

export const relatedResponseSchema = z.object({ items: z.array(nftSummarySchema) })
export type RelatedResponse = z.infer<typeof relatedResponseSchema>
