import type { Coupon, Wallet } from '@/contracts'

/**
 * Usuários fictícios. As senhas NÃO ficam em claro: guardamos apenas o hash PBKDF2-SHA256
 * (60k iterações, salt por usuário). Credencial de demonstração de ambos: `Kurio@2026`.
 */
export interface UserFixture {
  id: string
  username: string
  displayName: string
  email: string
  passwordHash: string
  ensName: string | null
  walletNickname: string
  avatarUrl: string | null
  favorites: string[]
  wallets: Wallet[]
}

const createdAt = '2026-08-01T12:00:00.000Z'

export const DEMO_PASSWORD_HINT = 'Kurio@2026'

export const USERS: UserFixture[] = [
  {
    id: 'usr_ana',
    username: 'anasouza',
    displayName: 'Ana Souza',
    email: 'ana@kurio.dev',
    passwordHash:
      'pbkdf2-sha256$60000$6b7572696f2d616e612d73616c742d31$cb5a9f1feec412220eec0511e4d001066f73ffc06fef8b69c557c5b8df61de36',
    ensName: 'ana.kurio',
    walletNickname: 'Cofre da Ana',
    avatarUrl: null,
    favorites: ['emerald-ape-042', 'golden-signal-160'],
    wallets: [
      {
        id: 'wal_ana_primary',
        slot: 'primary',
        displayName: 'Ana Souza',
        nickname: 'Principal',
        profileName: 'anasouza',
        network: 'ethereum',
        address: '0xA91F3c2B7d4E5f60718293a4B5c6D7e8F9a0E82C',
        secondaryAddress: null,
        provider: 'metamask',
        referralCode: 'KURIO-ANA',
        email: 'ana@kurio.dev',
        ensName: 'ana.kurio',
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 'wal_ana_secondary',
        slot: 'secondary',
        displayName: 'Ana Souza',
        nickname: 'Reserva',
        profileName: 'anasouza',
        network: 'polygon',
        address: '0x5E1d9A0b4C3f2e8D7a6B5c4D3e2F1a0B9c8D7e6F',
        secondaryAddress: 'nova.kurio.eth',
        provider: 'coinbase',
        referralCode: 'KURIO-ANA',
        email: 'ana@kurio.dev',
        ensName: 'nova.kurio',
        createdAt,
        updatedAt: createdAt,
      },
    ],
  },
  {
    id: 'usr_bruno',
    username: 'brunolima',
    displayName: 'Bruno Lima',
    email: 'bruno@kurio.dev',
    passwordHash:
      'pbkdf2-sha256$60000$6b7572696f2d6272756e6f2d73616c74$1d3f322881c5d4d518e32c6a32ee6b874b3c047c9d6bfa8ca026f75512d83913',
    ensName: 'bruno',
    walletNickname: 'Carteira do Bruno',
    avatarUrl: null,
    favorites: ['sage-nomad-009'],
    wallets: [
      {
        id: 'wal_bruno_primary',
        slot: 'primary',
        displayName: 'Bruno Lima',
        nickname: 'Principal',
        profileName: 'brunolima',
        network: 'ethereum',
        address: '0x3b7C9e2A1d0F4e5B6a7C8d9E0f1A2b3C4d5E6f7A',
        secondaryAddress: null,
        provider: 'walletconnect',
        referralCode: 'KURIO-BRUNO',
        email: 'bruno@kurio.dev',
        ensName: 'bruno',
        createdAt,
        updatedAt: createdAt,
      },
    ],
  },
]

export interface CouponFixture extends Coupon {
  /** ISO; cupons vencidos retornam COUPON_EXPIRED. */
  expiresAt: string
  minSubtotal?: string
}

export const COUPONS: CouponFixture[] = [
  {
    code: 'KURIO10',
    description: '10% de desconto no lançamento',
    type: 'percent',
    value: '10',
    expiresAt: '2099-12-31T23:59:59.000Z',
  },
  {
    code: 'GENESIS',
    description: '0.05 ETH de desconto em pedidos acima de 0.5 ETH',
    type: 'fixed',
    value: '0.05',
    minSubtotal: '0.5',
    expiresAt: '2099-12-31T23:59:59.000Z',
  },
  {
    code: 'VERAO2025',
    description: '15% de desconto (campanha encerrada)',
    type: 'percent',
    value: '15',
    expiresAt: '2025-03-20T23:59:59.000Z',
  },
]

/** Taxa de rede estimada por pedido (o layout usa 0.016 ETH na Ethereum). */
export const NETWORK_FEES = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
} as const
