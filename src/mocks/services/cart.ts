import type { Cart, CartLine, CartLineIssue, Coupon } from '@/contracts'
import { addEth, compareEth, mulEth } from '@/lib/eth'
import { getDb, mutate } from '../db/store'
import type { CartRecord } from '../db/types'
import { COUPONS } from '../fixtures/accounts'
import { randomId } from '../lib/crypto'
import { apiError, guestCartIdFrom, optionalAuth } from '../lib/http'
import { findCatalogItem, findEdition, getEditions } from './catalog'

export const userCartId = (userId: string) => `cart_user_${userId}`
export const guestCartKey = (guestId: string) => `cart_guest_${guestId}`

/** Resolve o carrinho da requisição: usuário autenticado ou visitante (`X-Cart-Id`). */
export function resolveCartOwner(
  request: Request,
): { cartId: string; ownerType: 'guest' | 'user'; ownerId: string } | Response {
  const auth = optionalAuth(request)
  if (auth instanceof Response) return auth
  if (auth) return { cartId: userCartId(auth.user.id), ownerType: 'user', ownerId: auth.user.id }
  const guestId = guestCartIdFrom(request)
  if (!guestId) return apiError(400, 'BAD_REQUEST', 'Identificador do carrinho ausente.')
  return { cartId: guestCartKey(guestId), ownerType: 'guest', ownerId: guestId }
}

export function getOrCreateCart(owner: {
  cartId: string
  ownerType: 'guest' | 'user'
  ownerId: string
}): CartRecord {
  const existing = getDb().carts[owner.cartId]
  if (existing) return existing
  return mutate((db) => {
    const cart: CartRecord = {
      id: owner.cartId,
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      lines: [],
      couponCode: null,
      version: 1,
      updatedAt: new Date().toISOString(),
    }
    db.carts[owner.cartId] = cart
    return cart
  })
}

export function findCoupon(code: string): Coupon | null {
  const coupon = COUPONS.find((c) => c.code === code.trim().toUpperCase())
  if (!coupon) return null
  return { code: coupon.code, description: coupon.description, type: coupon.type, value: coupon.value }
}

export function validateCoupon(
  code: string,
): { coupon: Coupon } | { error: 'COUPON_INVALID' | 'COUPON_EXPIRED' } {
  const fixture = COUPONS.find((c) => c.code === code.trim().toUpperCase())
  if (!fixture) return { error: 'COUPON_INVALID' }
  if (Date.parse(fixture.expiresAt) < Date.now()) return { error: 'COUPON_EXPIRED' }
  return { coupon: findCoupon(code)! }
}

export function serializeCart(cart: CartRecord): Cart {
  const lines: CartLine[] = []
  for (const line of cart.lines) {
    const found = findEdition(line.nftId, line.editionId)
    if (!found) continue
    const { item, edition } = found
    const issues: CartLineIssue[] = []
    if (edition.available === 0) issues.push('SOLD_OUT')
    else if (line.quantity > edition.available) issues.push('INSUFFICIENT_AVAILABILITY')
    if (compareEth(line.acknowledgedUnitPrice, edition.price) !== 0) issues.push('PRICE_CHANGED')
    lines.push({
      id: line.id,
      nftId: item.id,
      editionId: edition.id,
      name: item.name,
      tokenId: item.tokenId,
      image: item.image,
      editionLabel: edition.label,
      network: item.network,
      quantity: line.quantity,
      unitPrice: edition.price,
      acknowledgedUnitPrice: line.acknowledgedUnitPrice,
      lineTotal: mulEth(edition.price, line.quantity),
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
      issues,
      nftVersion: getDb().nfts[item.id]?.version ?? 1,
    })
  }
  return {
    id: cart.id,
    ownerType: cart.ownerType,
    lines,
    coupon: cart.couponCode ? findCoupon(cart.couponCode) : null,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotal: addEth(...lines.map((l) => l.lineTotal)),
    hasIssues: lines.some((l) => l.issues.some((i) => i !== 'PRICE_CHANGED')),
    version: cart.version,
    updatedAt: cart.updatedAt,
  }
}

function touch(cart: CartRecord) {
  cart.version += 1
  cart.updatedAt = new Date().toISOString()
}

/** Valida quantidade desejada contra limite por pedido e disponibilidade da edição. */
export function validateQuantity(nftId: string, editionId: string, quantity: number): Response | null {
  const found = findEdition(nftId, editionId)
  if (!found) return apiError(404, 'NOT_FOUND', 'NFT ou edição não encontrada.')
  const { edition } = found
  if (edition.available === 0)
    return apiError(409, 'EDITION_UNAVAILABLE', `A edição ${edition.label} está esgotada.`, {
      details: { available: 0 },
    })
  if (quantity > edition.maxPerOrder)
    return apiError(
      422,
      'LIMIT_EXCEEDED',
      `Limite de ${edition.maxPerOrder} unidade(s) por pedido nesta edição.`,
      {
        details: { maxPerOrder: edition.maxPerOrder },
        fields: { quantity: `Máximo de ${edition.maxPerOrder} por pedido` },
      },
    )
  if (quantity > edition.available)
    return apiError(
      409,
      'OUT_OF_STOCK',
      `Apenas ${edition.available} unidade(s) disponível(is) nesta edição.`,
      {
        details: { available: edition.available },
      },
    )
  return null
}

export function addItem(
  cart: CartRecord,
  nftId: string,
  editionId: string,
  quantity: number,
): Response | null {
  const existing = cart.lines.find((l) => l.nftId === nftId && l.editionId === editionId)
  const error = validateQuantity(nftId, editionId, (existing?.quantity ?? 0) + quantity)
  if (error) return error
  const { edition } = findEdition(nftId, editionId)!
  mutate(() => {
    if (existing) {
      existing.quantity += quantity
      existing.acknowledgedUnitPrice = edition.price
    } else {
      cart.lines.push({
        id: randomId('line'),
        nftId,
        editionId,
        quantity,
        acknowledgedUnitPrice: edition.price,
        addedAt: new Date().toISOString(),
      })
    }
    touch(cart)
  })
  return null
}

export function updateQuantity(cart: CartRecord, lineId: string, quantity: number): Response | null {
  const line = cart.lines.find((l) => l.id === lineId)
  if (!line) return apiError(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
  // Diminuir sempre é permitido (ajuda a resolver falta de disponibilidade).
  if (quantity > line.quantity) {
    const error = validateQuantity(line.nftId, line.editionId, quantity)
    if (error) return error
  }
  mutate(() => {
    line.quantity = quantity
    touch(cart)
  })
  return null
}

export function removeLine(cart: CartRecord, lineId: string): Response | null {
  if (!cart.lines.some((l) => l.id === lineId))
    return apiError(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
  mutate(() => {
    cart.lines = cart.lines.filter((l) => l.id !== lineId)
    if (cart.lines.length === 0) cart.couponCode = null
    touch(cart)
  })
  return null
}

export function setCoupon(cart: CartRecord, code: string | null) {
  mutate(() => {
    cart.couponCode = code
    touch(cart)
  })
}

/** O usuário viu os novos preços: o aviso de alteração deixa de ser exibido. */
export function acknowledgePrices(cart: CartRecord) {
  mutate(() => {
    for (const line of cart.lines) {
      const found = findEdition(line.nftId, line.editionId)
      if (found) line.acknowledgedUnitPrice = found.edition.price
    }
    touch(cart)
  })
}

/**
 * Mescla o carrinho de visitante no carrinho do usuário ao autenticar.
 * Quantidades são somadas e limitadas à disponibilidade/limite por pedido.
 */
export function mergeCarts(userCart: CartRecord, guestCart: CartRecord) {
  const adjustments: Array<{ nftId: string; requested: number; kept: number }> = []
  mutate((db) => {
    for (const guestLine of guestCart.lines) {
      const item = findCatalogItem(guestLine.nftId)
      const edition = item && getEditions(item).find((e) => e.id === guestLine.editionId)
      if (!edition) continue
      const existing = userCart.lines.find(
        (l) => l.nftId === guestLine.nftId && l.editionId === guestLine.editionId,
      )
      const requested = (existing?.quantity ?? 0) + guestLine.quantity
      const kept = Math.min(
        requested,
        edition.maxPerOrder,
        Math.max(edition.available, existing?.quantity ?? 0),
      )
      if (kept < requested) adjustments.push({ nftId: guestLine.nftId, requested, kept })
      if (kept <= 0) continue
      if (existing) existing.quantity = kept
      else userCart.lines.push({ ...guestLine, id: randomId('line'), quantity: kept })
    }
    if (!userCart.couponCode && guestCart.couponCode) userCart.couponCode = guestCart.couponCode
    touch(userCart)
    delete db.carts[guestCart.id]
  })
  return adjustments
}
