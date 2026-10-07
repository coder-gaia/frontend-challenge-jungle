import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateOrderRequest, Order } from '@/contracts'
import { toApiError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { ordersApi } from '@/features/account/api'
import { pendingOrderStore } from '@/features/orders/queries'
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'

interface Attempt {
  key: string
  fingerprint: string
}

/** Serialização estável do payload: mesma tentativa ⇒ mesma chave de idempotência. */
function fingerprint(payload: CreateOrderRequest) {
  const sort = (value: unknown): unknown =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(
          Object.keys(value as Record<string, unknown>)
            .sort()
            .map((k) => [k, sort((value as Record<string, unknown>)[k])]),
        )
      : value
  return JSON.stringify(sort(payload))
}

/**
 * A chave fica no sessionStorage: cliques repetidos, retries após timeout e até um refresh
 * reutilizam a mesma chave — o servidor devolve o mesmo pedido em vez de criar outro.
 * Payload diferente (ex.: nova cotação) gera uma nova tentativa.
 */
function attemptFor(payload: CreateOrderRequest): Attempt {
  const fp = fingerprint(payload)
  const stored = readStorage<Attempt>(STORAGE_KEYS.checkoutAttempt, 'session')
  if (stored && stored.fingerprint === fp) return stored
  const attempt = { key: crypto.randomUUID(), fingerprint: fp }
  writeStorage(STORAGE_KEYS.checkoutAttempt, attempt, 'session')
  return attempt
}

const MAX_RETRIES = 2
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function usePlaceOrder(userId: string) {
  const queryClient = useQueryClient()
  const [retrying, setRetrying] = useState(0)

  const mutation = useMutation({
    mutationKey: ['place-order'],
    mutationFn: async (payload: CreateOrderRequest): Promise<Order> => {
      const attempt = attemptFor(payload)
      for (let retry = 0; ; retry++) {
        try {
          return await ordersApi.create(payload, attempt.key)
        } catch (error) {
          const apiError = toApiError(error)
          const transient =
            apiError.code === 'TIMEOUT' || apiError.code === 'NETWORK_ERROR' || apiError.status >= 500
          if (!transient || retry >= MAX_RETRIES) throw apiError
          // Retry seguro: mesma chave de idempotência.
          setRetrying(retry + 1)
          await sleep(700 * (retry + 1))
        }
      }
    },
    onSuccess: (order) => {
      removeStorage(STORAGE_KEYS.checkoutAttempt, 'session')
      removeStorage(STORAGE_KEYS.checkoutDraft, 'session')
      queryClient.setQueryData(queryKeys.user.order(userId, order.id), order)
      if (order.status === 'pending')
        pendingOrderStore.set({ userId, orderId: order.id, number: order.number })
    },
    onSettled: () => setRetrying(0),
  })

  return { ...mutation, retrying }
}
