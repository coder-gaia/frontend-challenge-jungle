import { z } from 'zod'
import {
  buyerSchema,
  networkSchema,
  walletProviderSchema,
  type Profile,
  type Quote,
  type Wallet,
} from '@/contracts'

/** Campos do layout "Perfil do colecionador" + escolhas de carteira/rede do pagamento. */
export const checkoutFormSchema = buyerSchema.extend({
  walletId: z.string().min(1, 'Selecione uma carteira cadastrada'),
  provider: walletProviderSchema,
  network: networkSchema,
  useOtherWallet: z.boolean(),
})
export type CheckoutFormInput = z.input<typeof checkoutFormSchema>
export type CheckoutFormValues = z.output<typeof checkoutFormSchema>

const stripEth = (value: string | null | undefined) => (value ?? '').replace(/\.eth$/i, '')

export function walletDefaults(wallet: Wallet) {
  return {
    walletId: wallet.id,
    provider: wallet.provider,
    network: wallet.network,
    profileName: wallet.profileName,
    walletAddress: wallet.address,
    secondaryAddress: wallet.secondaryAddress ?? '',
    referralCode: wallet.referralCode,
    ensName: stripEth(wallet.ensName),
    useOtherWallet: false,
  } satisfies Partial<CheckoutFormInput>
}

export function checkoutDefaults(profile: Profile, wallet: Wallet | undefined): CheckoutFormInput {
  return {
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    note: '',
    profileName: profile.username,
    walletAddress: '',
    secondaryAddress: '',
    referralCode: '',
    ensName: stripEth(profile.ensName),
    walletId: '',
    provider: 'metamask',
    network: 'ethereum',
    useOtherWallet: false,
    ...(wallet ? walletDefaults(wallet) : {}),
  }
}

/** Assinatura dos valores da cotação: mudou ⇒ o usuário precisa confirmar de novo. */
export function quoteSignature(quote: Quote) {
  return [
    quote.network,
    quote.subtotal,
    quote.discount,
    quote.networkFee,
    quote.total,
    ...quote.lines.map((l) => `${l.lineId}:${l.unitPrice}:${l.quantity}`),
  ].join('|')
}
