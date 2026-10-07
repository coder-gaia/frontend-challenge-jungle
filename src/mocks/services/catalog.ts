import type {
  Category,
  Edition,
  Network,
  NftDetail,
  NftListQuery,
  NftListResponse,
  NftSummary,
} from '@/contracts'
import { categorySchema, networkSchema } from '@/contracts'
import { compareEth, normalizeEth } from '@/lib/eth'
import { getConfig } from '../config'
import { getDb } from '../db/store'
import {
  CATALOG,
  CATALOG_BY_ID,
  CATALOG_REFERENCE_DATE,
  FEATURED_NFT_ID,
  NEW_RELEASE_WINDOW_DAYS,
  type CatalogItemFixture,
} from '../fixtures/catalog'

export const DEFAULT_PAGE_SIZE = 9
const TRENDING_THRESHOLD = 600

export function getEditions(item: CatalogItemFixture): Edition[] {
  const state = getDb().nfts[item.id]
  return item.editions.map((edition) => {
    const live = state?.editions[edition.id]
    return {
      ...edition,
      price: live?.price ?? edition.price,
      available: live?.available ?? edition.available,
    }
  })
}

export function toSummary(item: CatalogItemFixture): NftSummary {
  const state = getDb().nfts[item.id]
  const editions = getEditions(item)
  const defaultEdition = editions.find((e) => e.id === item.defaultEditionId) ?? editions[0]!
  return {
    id: item.id,
    name: item.name,
    tokenId: item.tokenId,
    collection: item.collection,
    image: item.image,
    category: item.category,
    network: item.network,
    rarity: item.rarity,
    price: defaultEdition.price,
    compareAtPrice: state?.compareAtPrice ?? item.compareAtPrice,
    available: editions.reduce((sum, e) => sum + e.available, 0),
    defaultEditionId: item.defaultEditionId,
    listedAt: item.listedAt,
    version: state?.version ?? 1,
  }
}

export function toDetail(item: CatalogItemFixture): NftDetail {
  const reviews = item.reviews
  const average = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
  return {
    ...toSummary(item),
    description: item.description,
    story: item.story,
    creator: { name: item.creator, royaltyPercent: item.royaltyPercent },
    attributes: item.attributes,
    gallery: item.gallery,
    editions: getEditions(item),
    rating: { average: Math.round(average * 10) / 10, count: reviews.length },
    reviews,
    contract: item.contract,
  }
}

const normalizeText = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function matchesSearch(item: CatalogItemFixture, q: string) {
  const haystack = normalizeText(
    [item.name, item.tokenId, item.collection, item.creator, ...item.attributes].join(' '),
  )
  return normalizeText(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

const isNewRelease = (item: CatalogItemFixture) =>
  Date.parse(item.listedAt) >= CATALOG_REFERENCE_DATE - NEW_RELEASE_WINDOW_DAYS * 86_400_000

type Filter = 'category' | 'network' | 'price'

function applyFilters(items: CatalogItemFixture[], query: NftListQuery, skip?: Filter) {
  return items.filter((item) => {
    if (query.q && !matchesSearch(item, query.q)) return false
    if (query.tab === 'new' && !isNewRelease(item)) return false
    if (query.tab === 'trending' && item.trendingScore < TRENDING_THRESHOLD) return false
    if (skip !== 'category' && query.category?.length && !query.category.includes(item.category)) return false
    if (skip !== 'network' && query.network?.length && !query.network.includes(item.network)) return false
    if (skip !== 'price') {
      const price = toSummary(item).price
      if (query.minPrice && compareEth(price, query.minPrice) < 0) return false
      if (query.maxPrice && compareEth(price, query.maxPrice) > 0) return false
    }
    return true
  })
}

export function listNfts(query: NftListQuery): NftListResponse {
  const source = getConfig().emptyCatalog ? [] : CATALOG
  const filtered = applyFilters(source, query)
  const summaries = filtered.map(toSummary)

  switch (query.sort ?? 'recent') {
    case 'price-asc':
      summaries.sort((a, b) => compareEth(a.price, b.price) || a.name.localeCompare(b.name))
      break
    case 'price-desc':
      summaries.sort((a, b) => compareEth(b.price, a.price) || a.name.localeCompare(b.name))
      break
    case 'name':
      summaries.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      break
    default:
      summaries.sort((a, b) => b.listedAt.localeCompare(a.listedAt))
  }

  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE
  const total = summaries.length
  const totalPages = Math.ceil(total / pageSize)
  const page = Math.max(1, query.page ?? 1)
  const items = summaries.slice((page - 1) * pageSize, page * pageSize)

  // Facetas: cada contagem ignora o próprio filtro para permitir combinações.
  const categories = Object.fromEntries(categorySchema.options.map((c) => [c, 0])) as Record<Category, number>
  for (const item of applyFilters(source, query, 'category')) categories[item.category] += 1
  const networks = Object.fromEntries(networkSchema.options.map((n) => [n, 0])) as Record<Network, number>
  for (const item of applyFilters(source, query, 'network')) networks[item.network] += 1
  const prices = applyFilters(source, query, 'price').map((item) => toSummary(item).price)
  const sortedPrices = [...prices].sort(compareEth)

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    facets: {
      categories,
      networks,
      price: {
        min: normalizeEth(sortedPrices[0] ?? '0'),
        max: normalizeEth(sortedPrices[sortedPrices.length - 1] ?? '0'),
      },
    },
  }
}

export function getHighlights() {
  if (getConfig().emptyCatalog) return { featured: null, trending: [] }
  const featured = CATALOG_BY_ID.get(FEATURED_NFT_ID)
  const trending = [...CATALOG].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 6)
  return { featured: featured ? toSummary(featured) : null, trending: trending.map(toSummary) }
}

export function getRelated(id: string, limit = 10): NftSummary[] {
  const item = CATALOG_BY_ID.get(id)
  if (!item) return []
  const sameCollection = CATALOG.filter((c) => c.id !== id && c.collection === item.collection)
  const others = CATALOG.filter((c) => c.id !== id && c.collection !== item.collection)
  return [...sameCollection, ...others].slice(0, limit).map(toSummary)
}

export function findCatalogItem(id: string) {
  return CATALOG_BY_ID.get(id) ?? null
}

export function findEdition(nftId: string, editionId: string) {
  const item = CATALOG_BY_ID.get(nftId)
  if (!item) return null
  const edition = getEditions(item).find((e) => e.id === editionId)
  return edition ? { item, edition } : null
}
