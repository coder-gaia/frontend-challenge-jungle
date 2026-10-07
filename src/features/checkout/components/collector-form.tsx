import { useWatch, type UseFormReturn } from 'react-hook-form'
import { NETWORK_LABEL, networkSchema, WALLET_PROVIDER_LABEL, walletProviderSchema } from '@/contracts'
import { EnsSuffix } from '@/components/ens-suffix'
import { TextField } from '@/components/form-field'
import { SelectField } from '@/components/select-field'
import type { CheckoutFormInput, CheckoutFormValues } from '../schema'

const networkOptions = networkSchema.options.map((value) => ({ value, label: NETWORK_LABEL[value] }))
const providerOptions = walletProviderSchema.options.map((value) => ({
  value,
  label: WALLET_PROVIDER_LABEL[value],
}))

/** "Perfil do colecionador" — campos do layout de pagamento, com validação e erros associados. */
export function CollectorForm({
  form,
}: {
  form: UseFormReturn<CheckoutFormInput, unknown, CheckoutFormValues>
}) {
  const { register, formState } = form
  const errors = formState.errors
  const useOtherWallet = useWatch({ control: form.control, name: 'useOtherWallet' })

  return (
    <section aria-labelledby="collector-title" className="flex flex-col gap-3">
      <h2 id="collector-title" className="text-17 leading-4 font-bold">
        Perfil do colecionador
      </h2>
      <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
        <TextField
          label="Nome de exibição"
          requiredMark
          autoComplete="name"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <TextField
          label="Nome de usuário"
          requiredMark
          autoComplete="username"
          error={errors.username?.message}
          {...register('username')}
        />
        <SelectField
          label="Rede"
          requiredMark
          placeholder="Selecione uma rede"
          options={networkOptions}
          error={errors.network?.message}
          {...register('network')}
        />
        <TextField
          label="Nome do perfil"
          requiredMark
          error={errors.profileName?.message}
          {...register('profileName')}
        />
        <TextField
          label="Endereço da carteira"
          requiredMark
          placeholder="Endereço 0x da carteira"
          readOnly={!useOtherWallet}
          spellCheck={false}
          hint={
            useOtherWallet
              ? 'Os NFTs serão enviados para este endereço.'
              : 'Endereço da carteira selecionada.'
          }
          error={errors.walletAddress?.message}
          {...register('walletAddress')}
        />
        <TextField
          label="ENS ou carteira secundária (opcional)"
          hideLabel
          containerClassName="md:pt-[23px]"
          placeholder="ENS ou carteira secundária (opcional)"
          spellCheck={false}
          error={errors.secondaryAddress?.message}
          {...register('secondaryAddress')}
        />
        <SelectField
          label="Tipo de carteira"
          requiredMark
          placeholder="Selecione uma carteira"
          options={providerOptions}
          error={errors.provider?.message}
          {...register('provider')}
        />
        <TextField
          label="Código de indicação"
          requiredMark
          error={errors.referralCode?.message}
          {...register('referralCode')}
        />
        <TextField
          label="E-mail"
          requiredMark
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="flex flex-col">
          <TextField
            label="Nome ENS"
            requiredMark
            error={errors.ensName?.message}
            className="flex gap-2.5"
            startAdornment={<EnsSuffix />}
            {...register('ensName')}
          />
        </div>
      </div>
      <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-15 leading-5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary">
        <input type="checkbox" className="size-4 accent-primary" {...register('useOtherWallet')} />
        Usar outra carteira?
      </label>
      <div className="mt-3 flex max-w-[350px] flex-col gap-3">
        <label htmlFor="checkout-note" className="text-15 leading-[15px]">
          Observação do colecionador (opcional)
        </label>
        <textarea
          id="checkout-note"
          rows={6}
          maxLength={280}
          aria-invalid={errors.note ? true : undefined}
          className="min-h-[152px] rounded-[3px] border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30"
          {...register('note')}
        />
        {errors.note && <p className="text-xs text-destructive-foreground">{errors.note.message}</p>}
      </div>
    </section>
  )
}
