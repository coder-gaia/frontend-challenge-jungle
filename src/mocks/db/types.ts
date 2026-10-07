import type { Network, Order, Quote, Wallet, WalletProvider } from '@/contracts'

/** Estado mutável de um NFT (preço e disponibilidade por edição) + versão monotônica. */
export interface NftState {
  version: number
  compareAtPrice: string | null
  editions: Record<string, { price: string; available: number }>
}

export interface UserRecord {
  id: string
  username: string
  displayName: string
  email: string
  passwordHash: string
  ensName: string | null
  walletNickname: string
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionRecord {
  token: string
  userId: string
  createdAt: string
  expiresAt: string
}

export interface CartLineRecord {
  id: string
  nftId: string
  editionId: string
  quantity: number
  acknowledgedUnitPrice: string
  addedAt: string
}

export interface CartRecord {
  id: string
  ownerType: 'guest' | 'user'
  ownerId: string
  lines: CartLineRecord[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface QuoteRecord extends Quote {
  ownerKey: string
  context: 'cart' | 'checkout'
}

export interface OrderRecord extends Order {
  idempotencyKey: string
  payloadHash: string
  /** Momento em que a simulação de pagamento resolve o pedido. */
  resolvesAt: string
  outcome: 'approve' | 'decline'
}

export interface IdempotencyRecord {
  key: string
  userId: string
  payloadHash: string
  orderId: string
  createdAt: string
}

export interface WalletConnectionRecord {
  walletId: string
  userId: string
  provider: WalletProvider
  network: Network
  connectedAt: string
}

export interface MockDb {
  schemaVersion: number
  nfts: Record<string, NftState>
  users: Record<string, UserRecord>
  sessions: Record<string, SessionRecord>
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  quotes: Record<string, QuoteRecord>
  orders: Record<string, OrderRecord>
  idempotency: Record<string, IdempotencyRecord>
  wallets: Record<string, Wallet[]>
  walletConnections: Record<string, WalletConnectionRecord>
  orderSeq: number
}
