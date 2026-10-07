import { z } from 'zod'
import { isoDateSchema, networkSchema } from './common'

// ---------------------------------------------------------------- sessão e conta

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  user: userSchema,
  expiresAt: isoDateSchema,
})
export type Session = z.infer<typeof sessionSchema>

export const authResponseSchema = z.object({
  token: z.string(),
  session: sessionSchema,
})
export type AuthResponse = z.infer<typeof authResponseSchema>

export const passwordRules = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres')
  .max(64, 'A senha pode ter no máximo 64 caracteres')
  .regex(/[A-Za-z]/, 'Inclua ao menos uma letra')
  .regex(/\d/, 'Inclua ao menos um número')

export const usernameRules = z
  .string()
  .trim()
  .min(3, 'Use ao menos 3 caracteres')
  .max(24, 'Use no máximo 24 caracteres')
  .regex(/^[a-z0-9._]+$/, 'Use apenas letras minúsculas, números, ponto ou _')

export const emailRules = z.string().trim().toLowerCase().email('Informe um e-mail válido')

export const loginRequestSchema = z.object({
  email: emailRules,
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const registerRequestSchema = z.object({
  username: usernameRules,
  email: emailRules,
  password: passwordRules,
})
export type RegisterRequest = z.infer<typeof registerRequestSchema>

// ---------------------------------------------------------------- perfil

export const ensNameRules = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{3,32}(\.[a-z0-9-]{2,32})?$/, 'Use de 3 a 32 letras, números ou hífen')

export const profileSchema = userSchema.extend({
  ensName: z.string().nullable(),
  walletNickname: z.string(),
  updatedAt: isoDateSchema,
})
export type Profile = z.infer<typeof profileSchema>

export const updateProfileRequestSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(40, 'Use no máximo 40 caracteres'),
  username: usernameRules,
  email: emailRules,
  ensName: ensNameRules,
  walletNickname: z
    .string()
    .trim()
    .min(2, 'Informe o apelido da carteira')
    .max(32, 'Use no máximo 32 caracteres'),
})
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: passwordRules,
})
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>

/** Avatar enviado como data URL (PNG/JPEG/WebP já redimensionado no cliente, até 200 KB). */
export const updateAvatarRequestSchema = z.object({
  dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, 'Formato de imagem não suportado'),
})
export type UpdateAvatarRequest = z.infer<typeof updateAvatarRequestSchema>

// ---------------------------------------------------------------- carteiras

export const walletProviderSchema = z.enum(['metamask', 'walletconnect', 'coinbase'])
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const WALLET_PROVIDER_LABEL: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const walletSlotSchema = z.enum(['primary', 'secondary'])
export type WalletSlot = z.infer<typeof walletSlotSchema>

export const evmAddressRules = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais')

export const walletSchema = z.object({
  id: z.string(),
  slot: walletSlotSchema,
  displayName: z.string(),
  nickname: z.string(),
  profileName: z.string(),
  network: networkSchema,
  address: z.string(),
  secondaryAddress: z.string().nullable(),
  provider: walletProviderSchema,
  referralCode: z.string(),
  email: z.string(),
  ensName: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})
export type Wallet = z.infer<typeof walletSchema>

export const walletInputSchema = z.object({
  slot: walletSlotSchema,
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(40, 'Use no máximo 40 caracteres'),
  nickname: z.string().trim().min(2, 'Informe o apelido da carteira').max(32, 'Use no máximo 32 caracteres'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(32, 'Use no máximo 32 caracteres'),
  network: networkSchema,
  address: evmAddressRules,
  secondaryAddress: z
    .string()
    .trim()
    .regex(
      /^(0x[a-fA-F0-9]{40}|[a-z0-9-]{3,32}(\.[a-z0-9-]{2,32})*\.eth)$/,
      'Use um endereço 0x ou um nome .eth',
    )
    .or(z.literal(''))
    .optional(),
  provider: walletProviderSchema,
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{4,16}$/, 'Código com 4 a 16 letras, números ou hífen'),
  email: emailRules,
  ensName: ensNameRules,
})
export type WalletInput = z.infer<typeof walletInputSchema>

export const walletsResponseSchema = z.object({ wallets: z.array(walletSchema) })
export type WalletsResponse = z.infer<typeof walletsResponseSchema>

export const walletConnectionSchema = z.object({
  walletId: z.string(),
  status: z.literal('connected'),
  provider: walletProviderSchema,
  network: networkSchema,
  address: z.string(),
  connectedAt: isoDateSchema,
})
export type WalletConnection = z.infer<typeof walletConnectionSchema>

export const connectWalletRequestSchema = z.object({
  provider: walletProviderSchema,
  network: networkSchema,
})
export type ConnectWalletRequest = z.infer<typeof connectWalletRequestSchema>
