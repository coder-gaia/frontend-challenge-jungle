import { http, HttpResponse } from 'msw'
import {
  addCartItemRequestSchema,
  applyCouponRequestSchema,
  mergeCartRequestSchema,
  quoteRequestSchema,
  updateCartItemRequestSchema,
} from '@/contracts'
import { getDb } from '../db/store'
import { api, apiError, readJson, requireAuth, withNetwork } from '../lib/http'
import {
  acknowledgePrices,
  addItem,
  getOrCreateCart,
  guestCartKey,
  mergeCarts,
  removeLine,
  resolveCartOwner,
  serializeCart,
  setCoupon,
  updateQuantity,
  userCartId,
  validateCoupon,
} from '../services/cart'
import { buildQuote, toQuote } from '../services/quote'

export const cartHandlers = [
  http.get(
    api('/cart'),
    withNetwork(({ request }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      return HttpResponse.json(serializeCart(getOrCreateCart(owner)))
    }),
  ),

  http.post(
    api('/cart/items'),
    withNetwork(async ({ request }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      const body = await readJson(request, addCartItemRequestSchema)
      if (body instanceof Response) return body
      const cart = getOrCreateCart(owner)
      const error = addItem(cart, body.nftId, body.editionId, body.quantity)
      return error ?? HttpResponse.json(serializeCart(cart), { status: 201 })
    }),
  ),

  http.patch(
    api('/cart/items/:lineId'),
    withNetwork(async ({ request, params }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      const body = await readJson(request, updateCartItemRequestSchema)
      if (body instanceof Response) return body
      const cart = getOrCreateCart(owner)
      const error = updateQuantity(cart, String(params.lineId), body.quantity)
      return error ?? HttpResponse.json(serializeCart(cart))
    }),
  ),

  http.delete(
    api('/cart/items/:lineId'),
    withNetwork(({ request, params }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      const cart = getOrCreateCart(owner)
      const error = removeLine(cart, String(params.lineId))
      return error ?? HttpResponse.json(serializeCart(cart))
    }),
  ),

  http.put(
    api('/cart/coupon'),
    withNetwork(async ({ request }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      const body = await readJson(request, applyCouponRequestSchema)
      if (body instanceof Response) return body
      const cart = getOrCreateCart(owner)
      if (cart.lines.length === 0)
        return apiError(409, 'CART_EMPTY', 'Adicione itens antes de aplicar um cupom.')
      const result = validateCoupon(body.code)
      if ('error' in result)
        return result.error === 'COUPON_EXPIRED'
          ? apiError(422, 'COUPON_EXPIRED', 'Este cupom expirou.', { fields: { code: 'Cupom expirado' } })
          : apiError(422, 'COUPON_INVALID', 'Cupom inválido.', { fields: { code: 'Cupom inválido' } })
      setCoupon(cart, result.coupon.code)
      return HttpResponse.json(serializeCart(cart))
    }),
  ),

  http.delete(
    api('/cart/coupon'),
    withNetwork(({ request }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      const cart = getOrCreateCart(owner)
      setCoupon(cart, null)
      return HttpResponse.json(serializeCart(cart))
    }),
  ),

  http.post(
    api('/cart/acknowledge'),
    withNetwork(({ request }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      const cart = getOrCreateCart(owner)
      acknowledgePrices(cart)
      return HttpResponse.json(serializeCart(cart))
    }),
  ),

  http.post(
    api('/cart/merge'),
    withNetwork(async ({ request }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const body = await readJson(request, mergeCartRequestSchema)
      if (body instanceof Response) return body
      const userCart = getOrCreateCart({
        cartId: userCartId(auth.user.id),
        ownerType: 'user',
        ownerId: auth.user.id,
      })
      const guestCart = getDb().carts[guestCartKey(body.guestCartId)]
      const adjustments = guestCart ? mergeCarts(userCart, guestCart) : []
      return HttpResponse.json({ cart: serializeCart(userCart), adjustments })
    }),
  ),

  http.post(
    api('/quotes'),
    withNetwork(async ({ request }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      const body = await readJson(request, quoteRequestSchema)
      if (body instanceof Response) return body
      const cart = getOrCreateCart(owner)
      const quote = buildQuote(cart, body.network, body.context, owner.ownerId)
      return HttpResponse.json(toQuote(quote), { status: 201 })
    }),
  ),
]
