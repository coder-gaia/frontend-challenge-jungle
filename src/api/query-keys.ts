import type { Network, NftListQuery } from '@/contracts'

/**
 * Fábrica de chaves do TanStack Query.
 * Dados privados ficam sob `['user', userId, ...]` e o carrinho sob `['cart', dono]`:
 * nunca há colisão entre usuários e o logout remove tudo por prefixo.
 */
export const queryKeys = {
  session: ['session'] as const,
  nfts: {
    all: ['nfts'] as const,
    lists: ['nfts', 'list'] as const,
    list: (query: NftListQuery) => ['nfts', 'list', query] as const,
    highlights: ['nfts', 'highlights'] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
    related: (id: string) => ['nfts', 'related', id] as const,
    search: (q: string) => ['nfts', 'search', q] as const,
  },
  cart: {
    all: ['cart'] as const,
    byOwner: (owner: string) => ['cart', owner] as const,
  },
  quote: {
    all: ['quote'] as const,
    byCart: (
      owner: string,
      params: { cartVersion: number; network: Network; context: 'cart' | 'checkout' },
    ) => ['quote', owner, params] as const,
  },
  user: {
    all: ['user'] as const,
    scope: (userId: string) => ['user', userId] as const,
    favorites: (userId: string) => ['user', userId, 'favorites'] as const,
    profile: (userId: string) => ['user', userId, 'profile'] as const,
    wallets: (userId: string) => ['user', userId, 'wallets'] as const,
    orders: (userId: string) => ['user', userId, 'orders'] as const,
    order: (userId: string, orderId: string) => ['user', userId, 'orders', orderId] as const,
    transaction: (userId: string, hash: string) => ['user', userId, 'transaction', hash] as const,
  },
}
