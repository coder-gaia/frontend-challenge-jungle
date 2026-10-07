import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { NftListQuery } from '@/contracts'
import { queryKeys } from '@/api/query-keys'
import { catalogApi } from './api'

/**
 * A chave inclui todos os parâmetros enviados à API: cada combinação tem seu cache.
 * Respostas obsoletas não afetam a UI (a query ativa é sempre a dos parâmetros atuais) e
 * as requisições em voo são canceladas via AbortSignal quando os parâmetros mudam.
 */
export const nftListQueryOptions = (query: NftListQuery) =>
  queryOptions({
    queryKey: queryKeys.nfts.list(query),
    queryFn: ({ signal }) => catalogApi.list(query, signal),
    placeholderData: keepPreviousData,
  })

export const highlightsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.nfts.highlights,
    queryFn: ({ signal }) => catalogApi.highlights(signal),
    staleTime: 60_000,
  })

export const nftDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.detail(id),
    queryFn: ({ signal }) => catalogApi.detail(id, signal),
  })

export const relatedQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.related(id),
    queryFn: ({ signal }) => catalogApi.related(id, signal),
    staleTime: 60_000,
  })
