import { delay, http, HttpResponse } from 'msw'
import { createOrderRequestSchema, HEADERS } from '@/contracts'
import { getDb } from '../db/store'
import { api, apiError, readJson, requireAuth, withNetwork } from '../lib/http'
import { createOrder, maybeResolve, toOrder } from '../services/orders'

/** O cliente aborta a criação do pedido após 8 s; o cenário de timeout segura a resposta por mais tempo. */
const SIMULATED_HANG_MS = 11_000

export const orderHandlers = [
  http.post(
    api('/orders'),
    withNetwork(async ({ request }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const key = request.headers.get(HEADERS.idempotencyKey)
      if (!key || key.length < 16 || key.length > 128)
        return apiError(
          400,
          'IDEMPOTENCY_KEY_REQUIRED',
          'Envie o cabeçalho Idempotency-Key (16 a 128 caracteres).',
        )
      const body = await readJson(request, createOrderRequestSchema)
      if (body instanceof Response) return body

      const result = await createOrder(auth, key, body)
      if (result.kind === 'error') return result.response
      if (result.kind === 'replayed')
        return HttpResponse.json(toOrder(result.order), {
          status: 200,
          headers: { [HEADERS.idempotentReplay]: 'true' },
        })
      if (result.simulateTimeout) {
        // O pedido já existe; a resposta "se perde" e o cliente precisa recuperar via retry idempotente.
        await delay(SIMULATED_HANG_MS)
      }
      return HttpResponse.json(toOrder(getDb().orders[result.order.id] ?? result.order), { status: 201 })
    }),
  ),

  http.get(
    api('/orders'),
    withNetwork(({ request }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const status = new URL(request.url).searchParams.get('status')
      const items = Object.values(getDb().orders)
        .filter((o) => o.userId === auth.user.id)
        .map(maybeResolve)
        .filter((o) => !status || o.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(toOrder)
      return HttpResponse.json({ items })
    }),
  ),

  http.get(
    api('/orders/by-transaction/:hash'),
    withNetwork(({ request, params }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const order = Object.values(getDb().orders).find((o) => o.transaction.hash === params.hash)
      if (!order) return apiError(404, 'NOT_FOUND', 'Transação não encontrada.')
      if (order.userId !== auth.user.id)
        return apiError(403, 'FORBIDDEN', 'Esta transação pertence a outra conta.')
      return HttpResponse.json(toOrder(maybeResolve(order)))
    }),
  ),

  http.get(
    api('/orders/:id'),
    withNetwork(({ request, params }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const order = getDb().orders[String(params.id)]
      if (!order) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
      if (order.userId !== auth.user.id)
        return apiError(403, 'FORBIDDEN', 'Este pedido pertence a outra conta.')
      return HttpResponse.json(toOrder(maybeResolve(order)))
    }),
  ),
]
