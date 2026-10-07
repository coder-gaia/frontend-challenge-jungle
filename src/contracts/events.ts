import { z } from 'zod'
import { ethAmountSchema, isoDateSchema } from './common'
import { orderStatusSchema } from './commerce'

/**
 * Envelope comum dos eventos Socket.IO.
 * - `id`: identidade estável (deduplicação);
 * - `resource`: recurso afetado;
 * - `version`: versão monotônica do recurso (descarta eventos antigos sem regredir estado).
 */
const envelope = {
  id: z.string(),
  resource: z.object({ type: z.enum(['nft', 'order']), id: z.string() }),
  version: z.number().int().min(1),
  occurredAt: isoDateSchema,
}

export const nftUpdatedEventSchema = z.object({
  ...envelope,
  type: z.literal('nft.updated'),
  data: z.object({
    nftId: z.string(),
    name: z.string(),
    reason: z.enum(['price_change', 'availability_change']),
    price: ethAmountSchema,
    compareAtPrice: ethAmountSchema.nullable(),
    available: z.number().int().min(0),
    editions: z.array(
      z.object({
        id: z.string(),
        price: ethAmountSchema,
        previousPrice: ethAmountSchema,
        available: z.number().int().min(0),
      }),
    ),
  }),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = z.object({
  ...envelope,
  type: z.literal('order.updated'),
  /** Dono do pedido: o cliente ignora eventos de outro usuário. */
  userId: z.string(),
  data: z.object({
    orderId: z.string(),
    status: orderStatusSchema,
    failureReason: z.string().nullable(),
    updatedAt: isoDateSchema,
  }),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const realtimeEventSchema = z.discriminatedUnion('type', [
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
])
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>
export type RealtimeEventType = RealtimeEvent['type']

/** Nomes dos eventos Socket.IO emitidos pelo servidor. */
export const SOCKET_EVENTS = ['nft.updated', 'order.updated'] as const
