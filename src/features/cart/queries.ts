import { useSyncExternalStore } from 'react'
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AddCartItemRequest, Cart, CartLine, Network } from '@/contracts'
import { errorMessage } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { announce } from '@/components/live-announcer'
import { sessionStore } from '@/features/auth/session-store'
import { addEth, mulEth } from '@/lib/eth'
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

/** Cotação do servidor para o carrinho atual: é a referência de subtotal, desconto, taxa e total. */
export function useCartQuote(
  cart: Cart | undefined,
  network: Network = 'ethereum',
  context: 'cart' | 'checkout' = 'cart',
) {
  const owner = useCartOwner()
  return useQuery({
    queryKey: queryKeys.quote.byCart(owner, { cartVersion: cart?.version ?? 0, network, context }),
    queryFn: ({ signal }) => cartApi.quote({ network, context }, signal),
    enabled: Boolean(cart && cart.lines.length > 0),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

const CART_MUTATION_KEY = ['cart-mutation'] as const

function recompute(cart: Cart, lines: CartLine[]): Cart {
  return {
    ...cart,
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: addEth(...lines.map((line) => line.lineTotal)),
  }
}

/** Ao terminar a última mutation em voo, sincroniza com o servidor (evita "piscar" estados intermediários). */
function settle(queryClient: QueryClient, owner: string) {
  if (queryClient.isMutating({ mutationKey: CART_MUTATION_KEY }) <= 1) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart.byOwner(owner) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.quote.all })
  }
}

/**
 * Mutations simples do carrinho: o servidor devolve o carrinho recalculado, que vai direto ao cache.
 */
function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    mutationFn,
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart.byOwner(owner), cart)
      void queryClient.invalidateQueries({ queryKey: queryKeys.quote.all })
    },
  })
}

export const useAddToCart = () => useCartMutation((body: AddCartItemRequest) => cartApi.add(body))
export const useApplyCoupon = () => useCartMutation((code: string) => cartApi.applyCoupon(code))
export const useRemoveCoupon = () => useCartMutation(() => cartApi.removeCoupon())
export const useAcknowledgePrices = () => useCartMutation(() => cartApi.acknowledge())

/**
 * Alteração de quantidade otimista. As requisições de um mesmo carrinho são serializadas
 * (`scope`), então cliques rápidos não chegam fora de ordem; falhas revertem o cache.
 */
export function useUpdateCartLine() {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  const key = queryKeys.cart.byOwner(owner)
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    scope: { id: `cart:${owner}` },
    mutationFn: ({ line, quantity }: { line: CartLine; quantity: number }) =>
      cartApi.update(line.id, quantity),
    onMutate: async ({ line, quantity }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      queryClient.setQueryData<Cart>(key, (cart) =>
        cart
          ? recompute(
              cart,
              cart.lines.map((l) =>
                l.id === line.id ? { ...l, quantity, lineTotal: mulEth(l.unitPrice, quantity) } : l,
              ),
            )
          : cart,
      )
      announce(`Quantidade de ${line.name} alterada para ${quantity}.`)
      return { previous }
    },
    onError: (error, { line }, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toast.error(`Não foi possível alterar ${line.name}`, { description: errorMessage(error) })
      announce(`Não foi possível alterar a quantidade de ${line.name}. ${errorMessage(error)}`, 'assertive')
    },
    onSettled: () => settle(queryClient, owner),
  })
}

/** Remoção otimista com opção de desfazer (readiciona o item com a mesma quantidade). */
export function useRemoveCartLine() {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  const key = queryKeys.cart.byOwner(owner)
  const add = useAddToCart()
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    scope: { id: `cart:${owner}` },
    mutationFn: (line: CartLine) => cartApi.remove(line.id),
    onMutate: async (line) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      queryClient.setQueryData<Cart>(key, (cart) =>
        cart
          ? recompute(
              cart,
              cart.lines.filter((l) => l.id !== line.id),
            )
          : cart,
      )
      return { previous }
    },
    onSuccess: (_cart, line) => {
      announce(`${line.name} removido do carrinho.`)
      toast(`${line.name} removido do carrinho`, {
        id: `removed-${line.id}`,
        action: {
          label: 'Desfazer',
          onClick: () =>
            add.mutate(
              { nftId: line.nftId, editionId: line.editionId, quantity: line.quantity },
              {
                onError: (error) =>
                  toast.error('Não foi possível desfazer', { description: errorMessage(error) }),
              },
            ),
        },
      })
    },
    onError: (error, line, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toast.error(`Não foi possível remover ${line.name}`, { description: errorMessage(error) })
    },
    onSettled: () => settle(queryClient, owner),
  })
}
