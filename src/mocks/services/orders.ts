import type { CreateOrderRequest, Order, OrderUpdatedEvent } from '@/contracts'
import { getConfig } from '../config'
import { getDb, mutate } from '../db/store'
import type { OrderRecord } from '../db/types'
import { randomToken, sha256, stableStringify } from '../lib/crypto'
import { apiError, type AuthContext } from '../lib/http'
import { nextEventId, publish } from '../realtime/server'
import { userCartId } from './cart'
import { adjustAvailability } from './market'
import { buildQuote, diffQuote, getQuoteRecord, toQuote } from './quote'

const timers = new Map<string, ReturnType<typeof setTimeout>>()
/** Chaves cuja primeira tentativa já "travou" no cenário de timeout. */
const timedOutKeys = new Set<string>()

export function toOrder(record: OrderRecord): Order {
  const { idempotencyKey: _k, payloadHash: _h, resolvesAt: _r, outcome: _o, ...order } = record
  return order
}

type CreateResult =
  | { kind: 'created'; order: OrderRecord; simulateTimeout: boolean }
  | { kind: 'replayed'; order: OrderRecord }
  | { kind: 'error'; response: Response }

/**
 * Criação idempotente do pedido.
 * - Mesma chave + mesmo payload → devolve o mesmo pedido (replay), inclusive após timeout.
 * - Mesma chave + payload diferente → 409 IDEMPOTENCY_CONFLICT.
 * - Cotação desatualizada → 409 QUOTE_STALE com a nova cotação (exige nova confirmação).
 */
export async function createOrder(
  auth: AuthContext,
  key: string,
  payload: CreateOrderRequest,
): Promise<CreateResult> {
  const db = getDb()
  const payloadHash = await sha256(stableStringify(payload))
  const idemKey = `${auth.user.id}:${key}`
  const previous = db.idempotency[idemKey]
  if (previous) {
    if (previous.payloadHash !== payloadHash)
      return {
        kind: 'error',
        response: apiError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'Esta chave de idempotência já foi usada com outro conteúdo.',
        ),
      }
    const order = db.orders[previous.orderId]
    if (order) return { kind: 'replayed', order: maybeResolve(order) }
  }

  const cart = db.carts[userCartId(auth.user.id)]
  if (!cart || cart.lines.length === 0)
    return { kind: 'error', response: apiError(409, 'CART_EMPTY', 'Seu carrinho está vazio.') }

  const quote = getQuoteRecord(payload.quoteId)
  if (!quote || quote.ownerKey !== auth.user.id)
    return {
      kind: 'error',
      response: apiError(404, 'NOT_FOUND', 'Cotação não encontrada. Atualize o resumo do pedido.'),
    }

  const freshQuote = () => toQuote(buildQuote(cart, payload.network, 'checkout', auth.user.id))
  if (Date.parse(quote.expiresAt) <= Date.now())
    return {
      kind: 'error',
      response: apiError(409, 'QUOTE_EXPIRED', 'A cotação expirou. Revise os valores atualizados.', {
        details: { quote: freshQuote(), reasons: ['A cotação expirou.'] },
      }),
    }
  if (quote.network !== payload.network)
    return {
      kind: 'error',
      response: apiError(409, 'QUOTE_STALE', 'A rede mudou desde a cotação. Revise os valores.', {
        details: { quote: freshQuote(), reasons: ['A rede selecionada mudou.'] },
      }),
    }
  const diff = diffQuote(quote, cart)
  if (diff.stale) {
    const fresh = freshQuote()
    const code = fresh.purchasable ? 'QUOTE_STALE' : 'OUT_OF_STOCK'
    return {
      kind: 'error',
      response: apiError(409, code, 'Os valores do pedido mudaram. Revise e confirme novamente.', {
        details: { quote: fresh, reasons: diff.reasons },
      }),
    }
  }
  if (!quote.purchasable)
    return {
      kind: 'error',
      response: apiError(409, 'OUT_OF_STOCK', 'Há itens sem disponibilidade no pedido.'),
    }

  const wallet = db.wallets[auth.user.id]?.find((w) => w.id === payload.walletId)
  if (!wallet) return { kind: 'error', response: apiError(404, 'NOT_FOUND', 'Carteira não encontrada.') }
  const connection = db.walletConnections[wallet.id]
  if (!connection || connection.userId !== auth.user.id)
    return {
      kind: 'error',
      response: apiError(409, 'WALLET_NOT_CONNECTED', 'Conecte a carteira antes de confirmar a compra.'),
    }

  const now = Date.now()
  const config = getConfig()
  const hash = `0x${randomToken(32)}`
  const order: OrderRecord = mutate((state) => {
    state.orderSeq += 1
    const record: OrderRecord = {
      id: `ord_${randomToken(6)}`,
      number: `KR-${state.orderSeq}`,
      status: 'pending',
      userId: auth.user.id,
      quoteId: quote.id,
      network: payload.network,
      wallet: {
        id: wallet.id,
        nickname: wallet.nickname,
        address: wallet.address,
        provider: payload.provider,
      },
      buyer: payload.buyer,
      receipt: {
        lines: quote.lines.map((line) => ({ ...line, image: { ...line.image } })),
        coupon: quote.coupon,
        subtotal: quote.subtotal,
        discount: quote.discount,
        networkFee: quote.networkFee,
        total: quote.total,
      },
      transaction: { hash, explorerUrl: `/transacao/${hash}` },
      failureReason: null,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      resolvedAt: null,
      version: 1,
      idempotencyKey: key,
      payloadHash,
      resolvesAt: new Date(now + config.payment.delayMs).toISOString(),
      outcome: config.payment.outcome,
    }
    state.orders[record.id] = record
    state.idempotency[idemKey] = {
      key,
      userId: auth.user.id,
      payloadHash,
      orderId: record.id,
      createdAt: record.createdAt,
    }
    return record
  })

  // Reserva as unidades enquanto o pagamento é processado (evita venda acima do disponível).
  adjustAvailability(
    order.receipt.lines.map((l) => ({ nftId: l.nftId, editionId: l.editionId, delta: -l.quantity })),
  )
  scheduleResolution(order)

  const simulateTimeout = config.orderTimeoutOnce && !timedOutKeys.has(idemKey)
  if (simulateTimeout) timedOutKeys.add(idemKey)
  return { kind: 'created', order, simulateTimeout }
}

function scheduleResolution(order: OrderRecord) {
  const wait = Math.max(0, Date.parse(order.resolvesAt) - Date.now())
  clearTimeout(timers.get(order.id))
  timers.set(
    order.id,
    setTimeout(() => resolveOrder(order.id), wait),
  )
}

/** Resolve o pedido conforme o resultado simulado; estados confirmados/recusados são terminais. */
export function resolveOrder(orderId: string): OrderRecord | null {
  const order = getDb().orders[orderId]
  if (!order || order.status !== 'pending') return order ?? null
  timers.delete(orderId)
  const now = new Date().toISOString()
  const approved = order.outcome === 'approve'

  mutate((db) => {
    const record = db.orders[orderId]!
    record.status = approved ? 'confirmed' : 'declined'
    record.failureReason = approved
      ? null
      : 'A carteira recusou a assinatura da transação. Nenhum valor foi cobrado.'
    record.updatedAt = now
    record.resolvedAt = now
    record.version += 1

    if (approved) {
      // Remove do carrinho somente os itens e quantidades efetivamente comprados.
      const cart = db.carts[userCartId(record.userId)]
      if (cart) {
        for (const line of record.receipt.lines) {
          const cartLine = cart.lines.find((l) => l.nftId === line.nftId && l.editionId === line.editionId)
          if (!cartLine) continue
          cartLine.quantity -= line.quantity
        }
        cart.lines = cart.lines.filter((l) => l.quantity > 0)
        if (cart.lines.length === 0) cart.couponCode = null
        cart.version += 1
        cart.updatedAt = now
      }
    }
  })

  if (!approved) {
    adjustAvailability(
      order.receipt.lines.map((l) => ({ nftId: l.nftId, editionId: l.editionId, delta: l.quantity })),
    )
  }

  const resolved = getDb().orders[orderId]!
  const event: OrderUpdatedEvent = {
    id: nextEventId('order'),
    type: 'order.updated',
    resource: { type: 'order', id: orderId },
    version: resolved.version,
    occurredAt: now,
    userId: resolved.userId,
    data: {
      orderId,
      status: resolved.status,
      failureReason: resolved.failureReason,
      updatedAt: resolved.updatedAt,
    },
  }
  publish(event)
  return resolved
}

/** Se o prazo já passou (ex.: aba recarregada), resolve na hora. */
export function maybeResolve(order: OrderRecord): OrderRecord {
  if (order.status === 'pending' && Date.parse(order.resolvesAt) <= Date.now())
    return resolveOrder(order.id) ?? order
  return order
}

/** Retoma pedidos pendentes após refresh: agenda o restante do tempo ou resolve se já venceu. */
export function recoverPendingOrders() {
  for (const order of Object.values(getDb().orders)) {
    if (order.status !== 'pending') continue
    if (Date.parse(order.resolvesAt) <= Date.now()) resolveOrder(order.id)
    else scheduleResolution(order)
  }
}

export function resetOrderTimers() {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
  timedOutKeys.clear()
}
