import type { QueryClient } from '@tanstack/react-query'
import {
  realtimeEventSchema,
  type Cart,
  type FavoritesResponse,
  type HighlightsResponse,
  type NftDetail,
  type NftListResponse,
  type NftSummary,
  type NftUpdatedEvent,
  type Order,
  type OrderUpdatedEvent,
  type RealtimeEvent,
  type RelatedResponse,
} from '@/contracts'
import { queryKeys } from '@/api/query-keys'
import type { EventOutcome, ProcessedEvent } from './event-log'

const SEEN_LIMIT = 500

/**
 * Processa eventos do Socket.IO de forma idempotente:
 * 1. valida o contrato; 2. descarta duplicatas (`id` já visto);
 * 3. ignora pedidos de outro usuário; 4. descarta versões ≤ à conhecida (evento antigo nunca regride estado);
 * 5. aplica ao cache do TanStack Query. A versão conhecida considera também o que veio do REST.
 */
export function createEventProcessor(deps: {
  queryClient: QueryClient
  getUserId: () => string | null
  onApplied: (event: RealtimeEvent, context: { inCart: boolean }) => void
}) {
  const { queryClient } = deps
  const seen = new Set<string>()
  const versions = new Map<string, number>()

  const remember = (id: string) => {
    seen.add(id)
    if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value as string)
  }

  const resourceKey = (event: RealtimeEvent) => `${event.resource.type}:${event.resource.id}`

  function knownVersion(event: RealtimeEvent): number {
    let version = versions.get(resourceKey(event)) ?? 0
    if (event.type === 'nft.updated') {
      const detail = queryClient.getQueryData<NftDetail>(queryKeys.nfts.detail(event.data.nftId))
      if (detail) version = Math.max(version, detail.version)
    } else {
      const userId = deps.getUserId()
      const order = userId
        ? queryClient.getQueryData<Order>(queryKeys.user.order(userId, event.data.orderId))
        : null
      if (order) version = Math.max(version, order.version)
    }
    return version
  }

  function patchSummary<T extends NftSummary>(item: T, event: NftUpdatedEvent): T {
    if (item.id !== event.data.nftId || item.version >= event.version) return item
    const edition = event.data.editions.find((e) => e.id === item.defaultEditionId)
    return {
      ...item,
      price: edition?.price ?? event.data.price,
      compareAtPrice: event.data.compareAtPrice,
      available: event.data.available,
      version: event.version,
    }
  }

  function applyNft(event: NftUpdatedEvent) {
    const { nftId } = event.data
    queryClient.setQueryData<NftDetail>(queryKeys.nfts.detail(nftId), (detail) => {
      if (!detail || detail.version >= event.version) return detail
      return {
        ...patchSummary(detail, event),
        editions: detail.editions.map((edition) => {
          const update = event.data.editions.find((e) => e.id === edition.id)
          return update ? { ...edition, price: update.price, available: update.available } : edition
        }),
      }
    })
    queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.nfts.lists }, (data) =>
      data ? { ...data, items: data.items.map((item) => patchSummary(item, event)) } : data,
    )
    queryClient.setQueryData<HighlightsResponse>(queryKeys.nfts.highlights, (data) =>
      data
        ? {
            featured: data.featured ? patchSummary(data.featured, event) : null,
            trending: data.trending.map((item) => patchSummary(item, event)),
          }
        : data,
    )
    queryClient.setQueriesData<RelatedResponse>({ queryKey: ['nfts', 'related'] }, (data) =>
      data ? { items: data.items.map((item) => patchSummary(item, event)) } : data,
    )
    queryClient.setQueriesData<FavoritesResponse>(
      { queryKey: queryKeys.user.all, predicate: (q) => q.queryKey[2] === 'favorites' },
      (data) => (data ? { ...data, items: data.items.map((item) => patchSummary(item, event)) } : data),
    )
    // Ordenações por preço podem mudar: marca listas como desatualizadas sem refazer agora.
    void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.lists, refetchType: 'none' })

    // Carrinho/cotação: o servidor recalcula totais e sinaliza a mudança de preço/estoque.
    const cartLines = queryClient
      .getQueriesData<Cart>({ queryKey: queryKeys.cart.all })
      .flatMap(([, cart]) => cart?.lines.filter((line) => line.nftId === nftId) ?? [])
    const inCart = cartLines.length > 0
    if (inCart) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.quote.all })
    }
    // Só alerta quando a mudança afeta o carrinho: preço novo ou estoque abaixo da quantidade escolhida.
    if (event.data.reason === 'price_change') return inCart
    return cartLines.some((line) => {
      const edition = event.data.editions.find((e) => e.id === line.editionId)
      return edition ? edition.available < line.quantity : false
    })
  }

  function applyOrder(event: OrderUpdatedEvent, userId: string) {
    const key = queryKeys.user.order(userId, event.data.orderId)
    queryClient.setQueryData<Order>(key, (order) =>
      order && order.version < event.version
        ? {
            ...order,
            status: event.data.status,
            failureReason: event.data.failureReason,
            updatedAt: event.data.updatedAt,
            resolvedAt: event.data.updatedAt,
            version: event.version,
          }
        : order,
    )
    // Busca o recibo completo e atualiza listas/carrinho afetados pela confirmação.
    void queryClient.invalidateQueries({ queryKey: key })
    void queryClient.invalidateQueries({ queryKey: queryKeys.user.orders(userId), exact: true })
    if (event.data.status === 'confirmed') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.quote.all })
    }
  }

  function describe(event: RealtimeEvent): string {
    if (event.type === 'nft.updated') {
      const edition = event.data.editions.find((e) => e.price !== e.previousPrice)
      return event.data.reason === 'price_change' && edition
        ? `${event.data.name}: ${edition.previousPrice} → ${edition.price} ETH`
        : `${event.data.name}: disponibilidade ${event.data.available}`
    }
    return `Pedido ${event.data.orderId}: ${event.data.status}`
  }

  return {
    process(payload: unknown): ProcessedEvent {
      const parsed = realtimeEventSchema.safeParse(payload)
      const receivedAt = Date.now()
      if (!parsed.success)
        return {
          id: 'invalid',
          type: 'unknown',
          resource: '-',
          version: 0,
          outcome: 'invalid',
          summary: 'Payload inválido',
          receivedAt,
        }
      const event = parsed.data
      const base = {
        id: event.id,
        type: event.type,
        resource: `${event.resource.type}:${event.resource.id}`,
        version: event.version,
        summary: describe(event),
        receivedAt,
      }
      const result = (outcome: EventOutcome): ProcessedEvent => ({ ...base, outcome })

      if (seen.has(event.id)) return result('duplicate')
      remember(event.id)

      const userId = deps.getUserId()
      if (event.type === 'order.updated' && event.userId !== userId) return result('foreign')
      if (event.version <= knownVersion(event)) return result('stale')
      versions.set(resourceKey(event), event.version)

      if (event.type === 'nft.updated') {
        const inCart = applyNft(event)
        deps.onApplied(event, { inCart })
      } else {
        applyOrder(event, userId!)
        deps.onApplied(event, { inCart: false })
      }
      return result('applied')
    },
    /** Na troca de usuário, esquece versões de pedidos (os de outro usuário não importam mais). */
    resetPrivate() {
      for (const key of versions.keys()) if (key.startsWith('order:')) versions.delete(key)
    },
  }
}

export type EventProcessor = ReturnType<typeof createEventProcessor>
