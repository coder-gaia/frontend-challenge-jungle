/**
 * Contratos tipados compartilhados entre o cliente (Axios/Query/UI) e o backend simulado (MSW).
 * Os schemas Zod validam as respostas na borda do cliente e geram os tipos usados no restante do app.
 * A documentação dos endpoints está em ARCHITECTURE.md (seção "Contratos REST").
 */
export * from './common'
export * from './nft'
export * from './account'
export * from './commerce'
export * from './events'

/** Rotas REST relativas a `VITE_API_URL`. */
export const API = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    session: '/auth/session',
    logout: '/auth/logout',
  },
  nfts: {
    list: '/nfts',
    highlights: '/nfts/highlights',
    detail: (id: string) => `/nfts/${encodeURIComponent(id)}`,
    related: (id: string) => `/nfts/${encodeURIComponent(id)}/related`,
  },
  favorites: {
    list: '/me/favorites',
    item: (nftId: string) => `/me/favorites/${encodeURIComponent(nftId)}`,
  },
  cart: {
    get: '/cart',
    items: '/cart/items',
    item: (lineId: string) => `/cart/items/${encodeURIComponent(lineId)}`,
    coupon: '/cart/coupon',
    acknowledge: '/cart/acknowledge',
    merge: '/cart/merge',
  },
  quotes: '/quotes',
  orders: {
    create: '/orders',
    list: '/orders',
    detail: (id: string) => `/orders/${encodeURIComponent(id)}`,
    byTransaction: (hash: string) => `/orders/by-transaction/${encodeURIComponent(hash)}`,
  },
  profile: {
    get: '/me/profile',
    avatar: '/me/avatar',
    password: '/me/password',
  },
  wallets: {
    list: '/me/wallets',
    item: (id: string) => `/me/wallets/${encodeURIComponent(id)}`,
    connection: (id: string) => `/me/wallets/${encodeURIComponent(id)}/connection`,
  },
} as const

/** Cabeçalhos do protocolo. */
export const HEADERS = {
  idempotencyKey: 'Idempotency-Key',
  guestCart: 'X-Cart-Id',
  idempotentReplay: 'Idempotent-Replayed',
  requestId: 'X-Request-Id',
} as const
