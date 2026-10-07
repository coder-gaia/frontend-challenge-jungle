import { z } from 'zod'
import { walletProviderSchema } from './account'
import { ethAmountSchema, imageSchema, isoDateSchema, networkSchema } from './common'
import { nftSummarySchema } from './nft'

// ---------------------------------------------------------------- favoritos

export const favoritesResponseSchema = z.object({
  ids: z.array(z.string()),
  items: z.array(nftSummarySchema),
})
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>

export const favoriteMutationResponseSchema = z.object({
  nftId: z.string(),
  favorited: z.boolean(),
})

// ---------------------------------------------------------------- cupom

export const couponSchema = z.object({
  code: z.string(),
  description: z.string(),
  type: z.enum(['percent', 'fixed']),
  value: z.string(),
})
export type Coupon = z.infer<typeof couponSchema>

export const applyCouponRequestSchema = z.object({
  code: z.string().trim().toUpperCase().min(3, 'Informe o código promocional').max(24, 'Código muito longo'),
})

// ---------------------------------------------------------------- carrinho

export const cartLineIssueSchema = z.enum(['PRICE_CHANGED', 'INSUFFICIENT_AVAILABILITY', 'SOLD_OUT'])
export type CartLineIssue = z.infer<typeof cartLineIssueSchema>

export const cartLineSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: imageSchema,
  editionLabel: z.string(),
  network: networkSchema,
  quantity: z.number().int().min(1),
  /** Preço atual da edição. */
  unitPrice: ethAmountSchema,
  /** Último preço que o usuário viu/aceitou; difere de `unitPrice` quando o preço mudou. */
  acknowledgedUnitPrice: ethAmountSchema,
  lineTotal: ethAmountSchema,
  available: z.number().int().min(0),
  maxPerOrder: z.number().int().min(1),
  issues: z.array(cartLineIssueSchema),
  nftVersion: z.number().int(),
})
export type CartLine = z.infer<typeof cartLineSchema>

export const cartSchema = z.object({
  id: z.string(),
  ownerType: z.enum(['guest', 'user']),
  lines: z.array(cartLineSchema),
  coupon: couponSchema.nullable(),
  itemCount: z.number().int().min(0),
  subtotal: ethAmountSchema,
  hasIssues: z.boolean(),
  version: z.number().int(),
  updatedAt: isoDateSchema,
})
export type Cart = z.infer<typeof cartSchema>

export const addCartItemRequestSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().min(1),
})
export type AddCartItemRequest = z.infer<typeof addCartItemRequestSchema>

export const updateCartItemRequestSchema = z.object({ quantity: z.number().int().min(1) })

export const mergeCartRequestSchema = z.object({ guestCartId: z.string() })

// ---------------------------------------------------------------- cotação

export const quoteLineSchema = z.object({
  lineId: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: imageSchema,
  editionLabel: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: ethAmountSchema,
  lineTotal: ethAmountSchema,
})
export type QuoteLine = z.infer<typeof quoteLineSchema>

export const quoteIssueSchema = z.object({
  lineId: z.string(),
  nftId: z.string(),
  code: cartLineIssueSchema,
  message: z.string(),
  previousUnitPrice: ethAmountSchema.optional(),
  currentUnitPrice: ethAmountSchema.optional(),
  available: z.number().int().optional(),
})
export type QuoteIssue = z.infer<typeof quoteIssueSchema>

export const quoteRequestSchema = z.object({
  network: networkSchema,
  /** Contexto da cotação: o checkout pode disparar cenários específicos nos mocks. */
  context: z.enum(['cart', 'checkout']).default('cart'),
})
export type QuoteRequest = z.input<typeof quoteRequestSchema>

export const quoteSchema = z.object({
  id: z.string(),
  cartId: z.string(),
  cartVersion: z.number().int(),
  network: networkSchema,
  lines: z.array(quoteLineSchema),
  coupon: couponSchema.nullable(),
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  issues: z.array(quoteIssueSchema),
  /** Falso quando há itens esgotados/sem disponibilidade suficiente. */
  purchasable: z.boolean(),
  createdAt: isoDateSchema,
  expiresAt: isoDateSchema,
})
export type Quote = z.infer<typeof quoteSchema>

// ---------------------------------------------------------------- pedidos

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const buyerSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(40),
  username: z
    .string()
    .trim()
    .min(3, 'Informe o nome de usuário')
    .max(24)
    .regex(/^[a-z0-9._]+$/, 'Use apenas letras minúsculas, números, ponto ou _'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(32),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido'),
  walletAddress: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais'),
  secondaryAddress: z
    .string()
    .trim()
    .regex(
      /^(0x[a-fA-F0-9]{40}|[a-z0-9-]{3,32}(\.[a-z0-9-]{2,32})*\.eth)$/,
      'Use um endereço 0x ou um nome .eth',
    )
    .or(z.literal(''))
    .optional(),
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{4,16}$/, 'Código com 4 a 16 letras, números ou hífen'),
  ensName: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,32}(\.[a-z0-9-]{2,32})?$/, 'Use de 3 a 32 letras, números ou hífen'),
  note: z.string().trim().max(280, 'Use no máximo 280 caracteres').optional(),
})
export type Buyer = z.infer<typeof buyerSchema>

export const createOrderRequestSchema = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  provider: walletProviderSchema,
  network: networkSchema,
  buyer: buyerSchema,
})
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>

export const receiptSchema = z.object({
  lines: z.array(quoteLineSchema),
  coupon: couponSchema.nullable(),
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
})
export type Receipt = z.infer<typeof receiptSchema>

export const orderSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: orderStatusSchema,
  userId: z.string(),
  quoteId: z.string(),
  network: networkSchema,
  wallet: z.object({
    id: z.string(),
    nickname: z.string(),
    address: z.string(),
    provider: walletProviderSchema,
  }),
  buyer: buyerSchema,
  /** Snapshot imutável do pedido: alterações posteriores no catálogo não afetam o recibo. */
  receipt: receiptSchema,
  transaction: z.object({ hash: z.string(), explorerUrl: z.string() }),
  failureReason: z.string().nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  resolvedAt: isoDateSchema.nullable(),
  version: z.number().int().min(1),
})
export type Order = z.infer<typeof orderSchema>

export const ordersResponseSchema = z.object({ items: z.array(orderSchema) })
export type OrdersResponse = z.infer<typeof ordersResponseSchema>
