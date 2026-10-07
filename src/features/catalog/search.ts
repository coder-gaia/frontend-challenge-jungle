import { z } from 'zod'
import {
  categorySchema,
  ethAmountSchema,
  networkSchema,
  nftSortSchema,
  nftTabSchema,
  type NftListQuery,
} from '@/contracts'
import { DEFAULT_PAGE_SIZE } from './constants'

/**
 * Estado do catálogo na URL (sobrevive a refresh, compartilhamento e histórico).
 * Valores inválidos são descartados com `.catch(undefined)` em vez de quebrar a página.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: z.array(categorySchema).optional().catch(undefined),
  network: z.array(networkSchema).optional().catch(undefined),
  minPrice: ethAmountSchema.optional().catch(undefined),
  maxPrice: ethAmountSchema.optional().catch(undefined),
  tab: nftTabSchema.optional().catch(undefined),
  sort: nftSortSchema.optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

/** Converte o estado da URL nos parâmetros enviados à API (chave da query = parâmetros). */
export function toListQuery(search: CatalogSearch): NftListQuery {
  return {
    q: search.q || undefined,
    category: search.category?.length ? [...search.category].sort() : undefined,
    network: search.network?.length ? [...search.network].sort() : undefined,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    tab: search.tab && search.tab !== 'all' ? search.tab : undefined,
    sort: search.sort && search.sort !== 'recent' ? search.sort : undefined,
    page: search.page && search.page > 1 ? search.page : 1,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

export function hasActiveFilters(search: CatalogSearch) {
  return Boolean(
    search.q || search.category?.length || search.network?.length || search.minPrice || search.maxPrice,
  )
}
