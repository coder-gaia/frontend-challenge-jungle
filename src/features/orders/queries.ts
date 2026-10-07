import { queryOptions, useQuery } from '@tanstack/react-query'
import type { Order } from '@/contracts'
import { queryKeys } from '@/api/query-keys'
import { ordersApi } from '@/features/account/api'
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'

export const orderQueryOptions = (userId: string, orderId: string) =>
  queryOptions({
    queryKey: queryKeys.user.order(userId, orderId),
    queryFn: ({ signal }) => ordersApi.get(orderId, signal),
    // Enquanto pendente, consulta periodicamente como fallback do tempo real (ex.: socket fora do ar).
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 4_000 : false),
    staleTime: (query) => (query.state.data?.status === 'pending' ? 0 : Infinity),
  })

export function useOrder(userId: string, orderId: string) {
  return useQuery(orderQueryOptions(userId, orderId))
}

export const isTerminal = (order: Pick<Order, 'status'>) => order.status !== 'pending'

/**
 * Pedido pendente lembrado localmente (por usuário) para retomada após refresh/reconexão.
 * A fonte de verdade continua sendo `GET /orders/:id`.
 */
interface PendingOrderRef {
  userId: string
  orderId: string
  number: string
}

export const pendingOrderStore = {
  get(userId: string | null): PendingOrderRef | null {
    const ref = readStorage<PendingOrderRef>(STORAGE_KEYS.pendingOrder)
    return ref && ref.userId === userId ? ref : null
  },
  set(ref: PendingOrderRef) {
    writeStorage(STORAGE_KEYS.pendingOrder, ref)
  },
  clear(orderId?: string) {
    const ref = readStorage<PendingOrderRef>(STORAGE_KEYS.pendingOrder)
    if (!orderId || ref?.orderId === orderId) removeStorage(STORAGE_KEYS.pendingOrder)
  },
}
