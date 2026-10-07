import {
  API,
  highlightsResponseSchema,
  nftDetailSchema,
  nftListResponseSchema,
  relatedResponseSchema,
  type NftListQuery,
} from '@/contracts'
import { apiRequest } from '@/api/http'

export const catalogApi = {
  list: (query: NftListQuery, signal?: AbortSignal) =>
    apiRequest(nftListResponseSchema, { url: API.nfts.list, params: query, signal }),
  highlights: (signal?: AbortSignal) =>
    apiRequest(highlightsResponseSchema, { url: API.nfts.highlights, signal }),
  detail: (id: string, signal?: AbortSignal) =>
    apiRequest(nftDetailSchema, { url: API.nfts.detail(id), signal }),
  related: (id: string, signal?: AbortSignal) =>
    apiRequest(relatedResponseSchema, { url: API.nfts.related(id), signal }),
}
