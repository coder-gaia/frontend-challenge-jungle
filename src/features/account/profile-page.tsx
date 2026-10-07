import { useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { passwordRules, updateProfileRequestSchema, type Profile } from '@/contracts'
import { errorMessage } from '@/api/errors'
import { EnsSuffix } from '@/components/ens-suffix'
import { FormAlert, PasswordField, TextField } from '@/components/form-field'
import { announce } from '@/components/live-announcer'
import { ErrorState } from '@/components/page-states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { applyServerErrors } from '@/lib/form-errors'
import { resizeAvatar } from '@/lib/image-resize'
import { useChangePassword, useProfile, useRemoveAvatar, useUpdateAvatar, useUpdateProfile } from './queries'

/** Senha é opcional no formulário: só valida (e envia) quando algum campo foi preenchido. */
const profileFormSchema = updateProfileRequestSchema
  .extend({
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    const wantsChange = Boolean(values.currentPassword || values.newPassword || values.confirmPassword)
    if (!wantsChange) return
    if (!values.currentPassword)
      ctx.addIssue({ code: 'custom', path: ['currentPassword'], message: 'Informe a senha atual' })
    const rules = passwordRules.safeParse(values.newPassword)
    if (!rules.success)
      ctx.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: rules.error.issues[0]?.message ?? 'Senha inválida',
      })
    if (values.newPassword !== values.confirmPassword)
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'As senhas não conferem' })
  })
type ProfileFormInput = z.input<typeof profileFormSchema>
type ProfileFormValues = z.output<typeof profileFormSchema>

function AvatarEditor({ profile }: { profile: Profile }) {
  const input = useRef<HTMLInputElement>(null)
  const update = useUpdateAvatar()
  const remove = useRemoveAvatar()
  const [error, setError] = useState<string | null>(null)

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    try {
      const dataUrl = await resizeAvatar(file)
      await update.mutateAsync(dataUrl)
      toast.success('Avatar atualizado')
      announce('Avatar atualizado.')
    } catch (err) {
      const message = err instanceof Error && !('code' in err) ? err.message : errorMessage(err)
      setError(message)
      announce(message, 'assertive')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-15 leading-[15px]" id="avatar-label">
        Avatar
      </span>
      <div className="flex items-center gap-5" role="group" aria-labelledby="avatar-label">
        <Avatar className="size-[50px] border border-border bg-surface-raised">
          {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="Seu avatar atual" />}
          <AvatarFallback className="bg-surface-raised text-text-accent">
            <ImageIcon className="size-6" aria-hidden="true" />
            <span className="sr-only">Sem avatar</span>
          </AvatarFallback>
        </Avatar>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => void onFile(e)}
          aria-label="Escolher imagem do avatar"
          aria-describedby={error ? 'avatar-error' : undefined}
          data-testid="avatar-input"
        />
        <Button
          type="button"
          className="h-10 w-[98px]"
          onClick={() => input.current?.click()}
          disabled={update.isPending}
        >
          {update.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Alterar
        </Button>
        {profile.avatarUrl && (
          <button
            type="button"
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => {
                  toast('Avatar removido')
                  announce('Avatar removido.')
                },
              })
            }
            disabled={remove.isPending}
            className="cursor-pointer text-sm hover:text-text-accent"
          >
            Remover
          </button>
        )}
      </div>
      {error && (
        <p id="avatar-error" role="alert" className="text-xs text-destructive-foreground">
          {error}
        </p>
      )}
    </div>
  )
}

function ProfileForm({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: profile.displayName,
      username: profile.username,
      email: profile.email,
      ensName: (profile.ensName ?? '').replace(/\.eth$/, ''),
      walletNickname: profile.walletNickname,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(
    async ({ currentPassword, newPassword, confirmPassword: _c, ...profileValues }) => {
      setFormError(null)
      const messages: string[] = []
      try {
        const dirtyProfile = Object.keys(profileValues).some((key) => key in form.formState.dirtyFields)
        if (dirtyProfile) {
          const saved = await updateProfile.mutateAsync(profileValues)
          form.reset({ ...form.getValues(), ...saved, ensName: (saved.ensName ?? '').replace(/\.eth$/, '') })
          messages.push('Dados do perfil salvos')
        }
        if (currentPassword && newPassword) {
          await changePassword.mutateAsync({ currentPassword, newPassword })
          form.resetField('currentPassword', { defaultValue: '' })
          form.resetField('newPassword', { defaultValue: '' })
          form.resetField('confirmPassword', { defaultValue: '' })
          messages.push('Senha alterada')
        }
        if (messages.length === 0) messages.push('Nada para salvar')
        toast.success(messages.join(' · '))
        announce(`${messages.join('. ')}.`)
      } catch (error) {
        const message = applyServerErrors(error, form.setError)
        setFormError(message)
        announce(message ?? 'Revise os campos destacados.', 'assertive')
      }
    },
  )

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6" aria-labelledby="profile-title">
      <h1 id="profile-title" className="text-17 leading-4 font-bold">
        Perfil do colecionador
      </h1>
      <FormAlert>{formError}</FormAlert>
      <div className="grid gap-x-7 gap-y-8 md:grid-cols-2">
        <TextField
          label="Nome de exibição"
          requiredMark
          autoComplete="name"
          error={errors.displayName?.message}
          {...form.register('displayName')}
        />
        <TextField
          label="Nome de usuário"
          requiredMark
          autoComplete="username"
          error={errors.username?.message}
          {...form.register('username')}
        />
        <TextField
          label="E-mail"
          requiredMark
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Nome ENS"
          requiredMark
          className="flex gap-2.5"
          error={errors.ensName?.message}
          startAdornment={<EnsSuffix />}
          {...form.register('ensName')}
        />
        <TextField
          label="Apelido da carteira"
          requiredMark
          error={errors.walletNickname?.message}
          {...form.register('walletNickname')}
        />
        <AvatarEditor profile={profile} />
      </div>

      <fieldset className="mt-2 flex max-w-[417px] flex-col gap-6">
        <legend className="mb-6 text-17 leading-4 font-bold">Alterar senha</legend>
        <PasswordField
          label="Senha atual"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...form.register('currentPassword')}
        />
        <PasswordField
          label="Nova senha"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres, com letras e números"
          error={errors.newPassword?.message}
          {...form.register('newPassword')}
        />
        <PasswordField
          label="Confirmar nova senha"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
      </fieldset>

      <Button type="submit" className="h-10 w-[131px]" disabled={isSubmitting} data-testid="profile-save">
        {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Salvar
      </Button>
    </form>
  )
}

export function ProfilePage() {
  const query = useProfile()
  if (query.isError && !query.data)
    return (
      <ErrorState
        error={query.error}
        title="Não foi possível carregar o perfil"
        onRetry={() => void query.refetch()}
      />
    )
  if (!query.data)
    return (
      <div className="grid gap-8 md:grid-cols-2" aria-busy="true" aria-label="Carregando perfil">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[63px]" />
        ))}
      </div>
    )
  return <ProfileForm profile={query.data} />
}
