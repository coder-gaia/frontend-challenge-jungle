import { z } from 'zod'
import { API, cartSchema, quoteSchema, type AddCartItemRequest, type QuoteRequest } from '@/contracts'
import { apiRequest } from '@/api/http'

const mergeResponseSchema = z.object({
  cart: cartSchema,
  adjustments: z.array(z.object({ nftId: z.string(), requested: z.number(), kept: z.number() })),
})

export const cartApi = {
  get: (signal?: AbortSignal) => apiRequest(cartSchema, { url: API.cart.get, signal }),
  add: (body: AddCartItemRequest) =>
    apiRequest(cartSchema, { method: 'POST', url: API.cart.items, data: body }),
  update: (lineId: string, quantity: number) =>
    apiRequest(cartSchema, { method: 'PATCH', url: API.cart.item(lineId), data: { quantity } }),
  remove: (lineId: string) => apiRequest(cartSchema, { method: 'DELETE', url: API.cart.item(lineId) }),
  applyCoupon: (code: string) =>
    apiRequest(cartSchema, { method: 'PUT', url: API.cart.coupon, data: { code } }),
  removeCoupon: () => apiRequest(cartSchema, { method: 'DELETE', url: API.cart.coupon }),
  acknowledge: () => apiRequest(cartSchema, { method: 'POST', url: API.cart.acknowledge }),
  merge: (guestCartId: string) =>
    apiRequest(mergeResponseSchema, { method: 'POST', url: API.cart.merge, data: { guestCartId } }),
  quote: (body: QuoteRequest, signal?: AbortSignal) =>
    apiRequest(quoteSchema, { method: 'POST', url: API.quotes, data: body, signal }),
}
