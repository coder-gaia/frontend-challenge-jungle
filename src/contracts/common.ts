import { z } from 'zod'

/** Valor em ETH como string decimal (até 18 casas). Ver `src/lib/eth.ts`. */
export const ethAmountSchema = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')
export type EthAmount = z.infer<typeof ethAmountSchema>

/** Datas ISO-8601 em UTC. */
export const isoDateSchema = z.string().min(10)

export const networkSchema = z.enum(['ethereum', 'polygon', 'solana'])
export type Network = z.infer<typeof networkSchema>

export const NETWORK_LABEL: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const imageSchema = z.object({
  /** Chave da arte em `/public/nfts/<key>-<largura>.webp`. */
  key: z.string(),
  alt: z.string(),
  /** Enquadramento opcional (galeria de detalhes): ponto focal em % e zoom. */
  focus: z.object({ x: z.number(), y: z.number(), zoom: z.number().min(1) }).optional(),
})
export type NftImage = z.infer<typeof imageSchema>

export const paginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
})

/**
 * Códigos de erro da API. O status HTTP acompanha a semântica:
 * 400 BAD_REQUEST · 401 UNAUTHENTICATED/SESSION_EXPIRED/INVALID_CREDENTIALS · 403 FORBIDDEN/WALLET_REJECTED ·
 * 404 NOT_FOUND · 409 conflitos (disponibilidade, cotação, idempotência, cadastro) · 422 validação ·
 * 429 RATE_LIMITED · 500 INTERNAL_ERROR · 503 SERVICE_UNAVAILABLE.
 */
export const apiErrorCodeSchema = z.enum([
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'NOT_FOUND',
  'EMAIL_TAKEN',
  'USERNAME_TAKEN',
  'OUT_OF_STOCK',
  'EDITION_UNAVAILABLE',
  'LIMIT_EXCEEDED',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'QUOTE_STALE',
  'QUOTE_EXPIRED',
  'CART_EMPTY',
  'IDEMPOTENCY_KEY_REQUIRED',
  'IDEMPOTENCY_CONFLICT',
  'WALLET_REJECTED',
  'WALLET_NOT_CONNECTED',
  'WALLET_SLOT_TAKEN',
  'WALLET_ADDRESS_TAKEN',
  'INVALID_PASSWORD',
  'RATE_LIMITED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
])
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    status: z.number().int(),
    /** Erros por campo (validação de formulários). */
    fields: z.record(z.string(), z.string()).optional(),
    /** Dados adicionais (ex.: nova cotação em QUOTE_STALE). */
    details: z.record(z.string(), z.unknown()).optional(),
    /** Indica se repetir a mesma requisição pode ter sucesso. */
    retryable: z.boolean(),
    requestId: z.string(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
