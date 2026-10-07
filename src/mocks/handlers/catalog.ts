import { http, HttpResponse } from 'msw'
import { nftListQuerySchema, type FavoritesResponse } from '@/contracts'
import { getDb, mutate } from '../db/store'
import { api, apiError, notFound, requireAuth, withNetwork } from '../lib/http'
import {
  findCatalogItem,
  getHighlights,
  getRelated,
  listNfts,
  toDetail,
  toSummary,
} from '../services/catalog'

export const catalogHandlers = [
  http.get(
    api('/nfts'),
    withNetwork(({ request }) => {
      const params = new URL(request.url).searchParams
      const raw = {
        q: params.get('q') || undefined,
        category: params.getAll('category').length ? params.getAll('category') : undefined,
        network: params.getAll('network').length ? params.getAll('network') : undefined,
        minPrice: params.get('minPrice') || undefined,
        maxPrice: params.get('maxPrice') || undefined,
        tab: params.get('tab') || undefined,
        sort: params.get('sort') || undefined,
        page: params.get('page') ? Number(params.get('page')) : undefined,
        pageSize: params.get('pageSize') ? Number(params.get('pageSize')) : undefined,
      }
      const parsed = nftListQuerySchema.safeParse(raw)
      if (!parsed.success) {
        const fields = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]))
        return apiError(422, 'VALIDATION_ERROR', 'Parâmetros de busca inválidos.', { fields })
      }
      return HttpResponse.json(listNfts(parsed.data))
    }),
  ),

  http.get(
    api('/nfts/highlights'),
    withNetwork(() => HttpResponse.json(getHighlights())),
  ),

  http.get(
    api('/nfts/:id'),
    withNetwork(({ params }) => {
      const item = findCatalogItem(String(params.id))
      if (!item) return notFound('Este NFT não existe ou foi removido do catálogo.')
      return HttpResponse.json(toDetail(item))
    }),
  ),

  http.get(
    api('/nfts/:id/related'),
    withNetwork(({ params }) => {
      if (!findCatalogItem(String(params.id)))
        return notFound('Este NFT não existe ou foi removido do catálogo.')
      return HttpResponse.json({ items: getRelated(String(params.id)) })
    }),
  ),
]

function favoritesOf(userId: string): FavoritesResponse {
  const ids = getDb().favorites[userId] ?? []
  const items = ids
    .map((id) => findCatalogItem(id))
    .filter((i) => i !== null)
    .map(toSummary)
  return { ids, items }
}

export const favoritesHandlers = [
  http.get(
    api('/me/favorites'),
    withNetwork(({ request }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      return HttpResponse.json(favoritesOf(auth.user.id))
    }),
  ),

  http.put(
    api('/me/favorites/:nftId'),
    withNetwork(({ request, params }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const nftId = String(params.nftId)
      if (!findCatalogItem(nftId)) return notFound('NFT não encontrado.')
      mutate((db) => {
        const list = (db.favorites[auth.user.id] ??= [])
        if (!list.includes(nftId)) list.unshift(nftId)
      })
      return HttpResponse.json({ nftId, favorited: true })
    }),
  ),

  http.delete(
    api('/me/favorites/:nftId'),
    withNetwork(({ request, params }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const nftId = String(params.nftId)
      mutate((db) => {
        db.favorites[auth.user.id] = (db.favorites[auth.user.id] ?? []).filter((id) => id !== nftId)
      })
      return HttpResponse.json({ nftId, favorited: false })
    }),
  ),
]
