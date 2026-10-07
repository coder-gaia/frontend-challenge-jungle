import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { z } from 'zod'
import {
  NETWORK_LABEL,
  networkSchema,
  WALLET_PROVIDER_LABEL,
  walletInputSchema,
  walletProviderSchema,
  type Profile,
  type Wallet,
  type WalletSlot,
} from '@/contracts'
import { EnsSuffix } from '@/components/ens-suffix'
import { FormAlert, TextField } from '@/components/form-field'
import { announce } from '@/components/live-announcer'
import { ErrorState } from '@/components/page-states'
import { SelectField } from '@/components/select-field'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { applyServerErrors } from '@/lib/form-errors'
import { useProfile, useSaveWallet, useWallets } from './queries'

type WalletFormInput = z.input<typeof walletInputSchema>
type WalletFormValues = z.output<typeof walletInputSchema>

const networkOptions = networkSchema.options.map((value) => ({ value, label: NETWORK_LABEL[value] }))
const providerOptions = walletProviderSchema.options.map((value) => ({
  value,
  label: WALLET_PROVIDER_LABEL[value],
}))
const stripEth = (value: string | null | undefined) => (value ?? '').replace(/\.eth$/i, '')

function emptyWallet(slot: WalletSlot, profile: Profile): WalletFormInput {
  return {
    slot,
    displayName: profile.displayName,
    nickname: slot === 'primary' ? 'Principal' : 'Reserva',
    profileName: profile.username,
    network: '' as WalletFormInput['network'],
    address: '',
    secondaryAddress: '',
    provider: '' as WalletFormInput['provider'],
    referralCode: '',
    email: profile.email,
    ensName: stripEth(profile.ensName),
  }
}

function fromWallet(wallet: Wallet): WalletFormInput {
  return {
    slot: wallet.slot,
    displayName: wallet.displayName,
    nickname: wallet.nickname,
    profileName: wallet.profileName,
    network: wallet.network,
    address: wallet.address,
    secondaryAddress: wallet.secondaryAddress ?? '',
    provider: wallet.provider,
    referralCode: wallet.referralCode,
    email: wallet.email,
    ensName: stripEth(wallet.ensName),
  }
}

/** Formulário de carteira com os campos do layout "Carteiras" do Figma. */
function WalletForm({
  slot,
  wallet,
  defaults,
  onSaved,
}: {
  slot: WalletSlot
  wallet?: Wallet
  defaults: WalletFormInput
  onSaved?: () => void
}) {
  const save = useSaveWallet()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<WalletFormInput, unknown, WalletFormValues>({
    resolver: zodResolver(walletInputSchema),
    defaultValues: defaults,
    mode: 'onTouched',
  })
  const { errors, isSubmitting } = form.formState
  const id = (name: string) => `${slot}-${name}`

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const saved = await save.mutateAsync({ id: wallet?.id, input: values })
      form.reset(fromWallet(saved))
      const label = slot === 'primary' ? 'Carteira principal' : 'Carteira secundária'
      toast.success(`${label} salva`)
      announce(`${label} salva.`)
      onSaved?.()
    } catch (error) {
      const message = applyServerErrors(error, form.setError)
      setFormError(message)
      announce(message ?? 'Revise os campos destacados.', 'assertive')
    }
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6" data-testid={`wallet-form-${slot}`}>
      <FormAlert>{formError}</FormAlert>
      <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
        <TextField
          id={id('displayName')}
          label="Nome de exibição"
          requiredMark
          error={errors.displayName?.message}
          {...form.register('displayName')}
        />
        <TextField
          id={id('nickname')}
          label="Apelido da carteira"
          requiredMark
          error={errors.nickname?.message}
          {...form.register('nickname')}
        />
        <SelectField
          id={id('network')}
          label="Rede"
          requiredMark
          placeholder="Selecione uma rede"
          options={networkOptions}
          error={errors.network?.message}
          {...form.register('network')}
        />
        <TextField
          id={id('profileName')}
          label="Nome do perfil"
          requiredMark
          error={errors.profileName?.message}
          {...form.register('profileName')}
        />
        <TextField
          id={id('address')}
          label="Endereço da carteira"
          requiredMark
          placeholder="Endereço 0x da carteira"
          spellCheck={false}
          error={errors.address?.message}
          {...form.register('address')}
        />
        <TextField
          id={id('secondaryAddress')}
          label="ENS ou carteira secundária (opcional)"
          hideLabel
          containerClassName="md:pt-[23px]"
          placeholder="ENS ou carteira secundária (opcional)"
          spellCheck={false}
          error={errors.secondaryAddress?.message}
          {...form.register('secondaryAddress')}
        />
        <SelectField
          id={id('provider')}
          label="Tipo de carteira"
          requiredMark
          placeholder="Selecione uma carteira"
          options={providerOptions}
          error={errors.provider?.message}
          {...form.register('provider')}
        />
        <TextField
          id={id('referralCode')}
          label="Código de indicação"
          requiredMark
          error={errors.referralCode?.message}
          {...form.register('referralCode')}
        />
        <TextField
          id={id('email')}
          label="E-mail"
          requiredMark
          type="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          id={id('ensName')}
          label="Nome ENS"
          requiredMark
          className="flex gap-2.5"
          error={errors.ensName?.message}
          startAdornment={<EnsSuffix />}
          {...form.register('ensName')}
        />
      </div>
      <Button
        type="submit"
        className="h-10 w-fit px-1"
        disabled={isSubmitting}
        data-testid={`wallet-save-${slot}`}
      >
        {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Salvar carteira
      </Button>
    </form>
  )
}

export function WalletsPage() {
  const walletsQuery = useWallets()
  const profileQuery = useProfile()
  const [adding, setAdding] = useState<WalletSlot | null>(null)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)

  const failed = [walletsQuery, profileQuery].find((q) => q.isError && !q.data)
  if (failed)
    return (
      <ErrorState
        error={failed.error}
        title="Não foi possível carregar as carteiras"
        onRetry={() => void failed.refetch()}
      />
    )
  if (!walletsQuery.data || !profileQuery.data)
    return (
      <div className="grid gap-6 md:grid-cols-2" aria-busy="true" aria-label="Carregando carteiras">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[63px]" />
        ))}
      </div>
    )

  const profile = profileQuery.data
  const primary = walletsQuery.data.wallets.find((w) => w.slot === 'primary')
  const secondary = walletsQuery.data.wallets.find((w) => w.slot === 'secondary')
  const secondaryDefaults =
    sameAsPrimary && primary
      ? {
          ...fromWallet(primary),
          slot: 'secondary' as const,
          nickname: 'Reserva',
          address: '',
          secondaryAddress: '',
        }
      : emptyWallet('secondary', profile)

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="primary-title" className="flex flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 id="primary-title" className="text-17 leading-4 font-bold">
              Carteira principal
            </h1>
            <p className="mt-2 text-13 leading-4 text-text-secondary">
              Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
            </p>
          </div>
          {!primary && adding !== 'primary' && (
            <button
              type="button"
              onClick={() => setAdding('primary')}
              className="cursor-pointer text-17 font-bold text-text-accent hover:underline"
            >
              Adicionar
            </button>
          )}
        </header>
        {primary ? (
          <WalletForm key={primary.id} slot="primary" wallet={primary} defaults={fromWallet(primary)} />
        ) : adding === 'primary' ? (
          <WalletForm
            slot="primary"
            defaults={emptyWallet('primary', profile)}
            onSaved={() => setAdding(null)}
          />
        ) : (
          <p className="text-13 text-text-secondary">Você ainda não adicionou uma carteira principal.</p>
        )}
      </section>

      <section aria-labelledby="secondary-title" className="flex flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="secondary-title" className="text-17 leading-4 font-bold">
              Carteira secundária
            </h2>
            {!secondary && adding !== 'secondary' && (
              <p className="mt-2 text-13 leading-4 text-text-secondary">
                Você ainda não adicionou uma carteira secundária.
              </p>
            )}
          </div>
          {!secondary && (
            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={sameAsPrimary}
                  disabled={!primary}
                  onChange={(e) => {
                    setSameAsPrimary(e.target.checked)
                    setAdding('secondary')
                  }}
                />
                Igual à carteira principal
              </label>
              {adding !== 'secondary' && (
                <button
                  type="button"
                  onClick={() => setAdding('secondary')}
                  disabled={!primary}
                  className="cursor-pointer text-17 font-bold text-text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Adicionar
                </button>
              )}
            </div>
          )}
        </header>
        {secondary ? (
          <WalletForm
            key={secondary.id}
            slot="secondary"
            wallet={secondary}
            defaults={fromWallet(secondary)}
          />
        ) : adding === 'secondary' ? (
          <WalletForm
            key={sameAsPrimary ? 'copy' : 'blank'}
            slot="secondary"
            defaults={secondaryDefaults}
            onSaved={() => setAdding(null)}
          />
        ) : null}
      </section>
    </div>
  )
}
