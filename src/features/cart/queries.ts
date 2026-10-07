import { useSyncExternalStore } from 'react'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AddCartItemRequest, Cart } from '@/contracts'
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

/**
 * As mutations do carrinho devolvem o carrinho recalculado pelo servidor:
 * o cache é atualizado com a resposta e as cotações são invalidadas.
 */
function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  return useMutation({
    mutationFn,
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart.byOwner(owner), cart)
      void queryClient.invalidateQueries({ queryKey: queryKeys.quote.all })
    },
  })
}

export const useAddToCart = () => useCartMutation((body: AddCartItemRequest) => cartApi.add(body))
