import type { Network, Quote, QuoteIssue, QuoteLine } from '@/contracts'
import { addEth, compareEth, isZeroEth, minEth, percentOfEth, subEth } from '@/lib/eth'
import { getConfig } from '../config'
import { getDb, mutate } from '../db/store'
import type { CartRecord, QuoteRecord } from '../db/types'
import { COUPONS, NETWORK_FEES } from '../fixtures/accounts'
import { randomId } from '../lib/crypto'
import { changePrice, setAvailability } from './market'
import { serializeCart, validateCoupon } from './cart'

const QUOTE_TTL_MS = 10 * 60_000
const MAX_STORED_QUOTES = 40

/** Calcula a cotação a partir do estado atual do carrinho e do catálogo (fonte de verdade para o pedido). */
export function buildQuote(
  cart: CartRecord,
  network: Network,
  context: 'cart' | 'checkout',
  ownerKey: string,
): QuoteRecord {
  const serialized = serializeCart(cart)
  const issues: QuoteIssue[] = []
  const lines: QuoteLine[] = serialized.lines.map((line) => {
    if (line.issues.includes('SOLD_OUT'))
      issues.push({
        lineId: line.id,
        nftId: line.nftId,
        code: 'SOLD_OUT',
        message: `${line.name} (${line.editionLabel}) esgotou.`,
        available: 0,
      })
    else if (line.issues.includes('INSUFFICIENT_AVAILABILITY'))
      issues.push({
        lineId: line.id,
        nftId: line.nftId,
        code: 'INSUFFICIENT_AVAILABILITY',
        message: `Restam apenas ${line.available} unidade(s) de ${line.name} (${line.editionLabel}).`,
        available: line.available,
      })
    if (line.issues.includes('PRICE_CHANGED'))
      issues.push({
        lineId: line.id,
        nftId: line.nftId,
        code: 'PRICE_CHANGED',
        message: `O preço de ${line.name} mudou.`,
        previousUnitPrice: line.acknowledgedUnitPrice,
        currentUnitPrice: line.unitPrice,
      })
    return {
      lineId: line.id,
      nftId: line.nftId,
      editionId: line.editionId,
      name: line.name,
      tokenId: line.tokenId,
      image: line.image,
      editionLabel: line.editionLabel,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    }
  })

  const subtotal = serialized.subtotal
  let discount = '0'
  let coupon = serialized.coupon
  if (cart.couponCode) {
    const validation = validateCoupon(cart.couponCode)
    if ('error' in validation) {
      coupon = null
    } else {
      const fixture = COUPONS.find((c) => c.code === validation.coupon.code)!
      const eligible = !fixture.minSubtotal || compareEth(subtotal, fixture.minSubtotal) >= 0
      if (eligible) {
        discount =
          fixture.type === 'percent'
            ? percentOfEth(subtotal, Number(fixture.value))
            : minEth(fixture.value, subtotal)
      }
    }
  }
  const networkFee = lines.length ? NETWORK_FEES[network] : '0'
  const total = addEth(subEth(subtotal, discount), networkFee)
  const now = Date.now()

  const quote: QuoteRecord = {
    id: randomId('quo'),
    cartId: cart.id,
    cartVersion: cart.version,
    network,
    lines,
    coupon,
    subtotal,
    discount,
    networkFee,
    total,
    issues,
    purchasable: lines.length > 0 && !issues.some((i) => i.code !== 'PRICE_CHANGED'),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
    ownerKey,
    context,
  }

  mutate((db) => {
    db.quotes[quote.id] = quote
    const ids = Object.keys(db.quotes)
    if (ids.length > MAX_STORED_QUOTES) {
      ids
        .sort((a, b) => db.quotes[a]!.createdAt.localeCompare(db.quotes[b]!.createdAt))
        .slice(0, ids.length - MAX_STORED_QUOTES)
        .forEach((id) => delete db.quotes[id])
    }
  })

  if (context === 'checkout') scheduleCheckoutTwist(cart.id)
  return quote
}

export function toQuote(record: QuoteRecord): Quote {
  const { ownerKey: _ownerKey, context: _context, ...quote } = record
  return quote
}

/**
 * Compara uma cotação com o estado atual. Retorna as diferenças que exigem nova confirmação.
 */
export function diffQuote(record: QuoteRecord, cart: CartRecord): { stale: boolean; reasons: string[] } {
  const fresh = buildQuoteSnapshot(cart, record.network)
  const reasons: string[] = []
  if (record.cartVersion !== cart.version) reasons.push('O carrinho foi alterado.')
  for (const line of record.lines) {
    const current = fresh.lines.find((l) => l.lineId === line.lineId)
    if (!current) reasons.push(`${line.name} não está mais no carrinho.`)
    else if (compareEth(current.unitPrice, line.unitPrice) !== 0)
      reasons.push(`O preço de ${line.name} mudou de ${line.unitPrice} para ${current.unitPrice} ETH.`)
  }
  for (const issue of fresh.issues) if (issue.code !== 'PRICE_CHANGED') reasons.push(issue.message)
  if (compareEth(fresh.total, record.total) !== 0 && reasons.length === 0)
    reasons.push('O total do pedido mudou.')
  if ((record.coupon?.code ?? null) !== (fresh.coupon?.code ?? null)) reasons.push('O cupom aplicado mudou.')
  return { stale: reasons.length > 0, reasons }
}

/** Cotação calculada sem persistir (usada para comparação). */
function buildQuoteSnapshot(cart: CartRecord, network: Network) {
  const serialized = serializeCart(cart)
  let discount = '0'
  if (cart.couponCode) {
    const validation = validateCoupon(cart.couponCode)
    if (!('error' in validation)) {
      const fixture = COUPONS.find((c) => c.code === validation.coupon.code)!
      if (!fixture.minSubtotal || compareEth(serialized.subtotal, fixture.minSubtotal) >= 0)
        discount =
          fixture.type === 'percent'
            ? percentOfEth(serialized.subtotal, Number(fixture.value))
            : minEth(fixture.value, serialized.subtotal)
    }
  }
  const fee = serialized.lines.length ? NETWORK_FEES[network] : '0'
  const issues: QuoteIssue[] = serialized.lines.flatMap((line) =>
    line.issues
      .filter((i) => i !== 'PRICE_CHANGED')
      .map((code) => ({
        lineId: line.id,
        nftId: line.nftId,
        code,
        message:
          code === 'SOLD_OUT'
            ? `${line.name} (${line.editionLabel}) esgotou.`
            : `Restam apenas ${line.available} unidade(s) de ${line.name} (${line.editionLabel}).`,
      })),
  )
  return {
    lines: serialized.lines.map((l) => ({ lineId: l.id, unitPrice: l.unitPrice, name: l.name })),
    coupon: serialized.coupon,
    total: addEth(subEth(serialized.subtotal, discount), fee),
    discountApplied: !isZeroEth(discount),
    issues,
  }
}

export function getQuoteRecord(id: string): QuoteRecord | null {
  return getDb().quotes[id] ?? null
}

// ------------------------------------------------------------------ cenários de checkout

const twistedCarts = new Set<string>()

export function resetCheckoutTwists() {
  twistedCarts.clear()
}

/** Cenários `checkout-price-change` / `checkout-sold-out`: o mercado muda logo após abrir o checkout. */
function scheduleCheckoutTwist(cartId: string) {
  const twist = getConfig().checkoutTwist
  if (twist === 'none' || twistedCarts.has(cartId)) return
  twistedCarts.add(cartId)
  setTimeout(() => {
    const cart = getDb().carts[cartId]
    const line = cart?.lines[0]
    if (!line) return
    if (twist === 'price-change') changePrice(line.nftId, line.editionId, 8)
    else setAvailability(line.nftId, line.editionId, 0)
  }, 3500)
}
