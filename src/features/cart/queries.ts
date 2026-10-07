import { useSyncExternalStore } from 'react'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { sessionStore } from '@/features/auth/session-store'
import { getGuestCartId } from '@/lib/guest-cart'
import { cartApi } from './api'

/** Dono do carrinho no cache: o usuário autenticado ou o carrinho de visitante. */
export function useCartOwner() {
  const userId = useSyncExternalStore(sessionStore.subscribe, sessionStore.getUserId, () => null)
  return userId ? `user:${userId}` : `guest:${getGuestCartId()}`
}

export const cartQueryOptions = (owner: string) =>
  queryOptions({
    queryKey: queryKeys.cart.byOwner(owner),
    queryFn: ({ signal }) => cartApi.get(signal),
    staleTime: 10_000,
  })

export function useCart() {
  const owner = useCartOwner()
  return useQuery(cartQueryOptions(owner))
}
