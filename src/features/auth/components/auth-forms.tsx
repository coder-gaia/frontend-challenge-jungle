import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { loginRequestSchema, passwordRules, registerRequestSchema } from '@/contracts'
import { FormAlert, PasswordField, TextField } from '@/components/form-field'
import { announce } from '@/components/live-announcer'
import { Button } from '@/components/ui/button'
import { applyServerErrors } from '@/lib/form-errors'
import { cn } from '@/lib/utils'
import { useLogin, useRegister } from '../session'

type Variant = 'dialog' | 'page'

const inputClass = (variant: Variant) =>
  variant === 'page' ? 'h-[50px] rounded-xl px-4 text-sm' : 'h-10 rounded-[5px] px-4 text-sm'

export function LoginForm({ variant, onSuccess }: { variant: Variant; onSuccess: () => void }) {
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<z.infer<typeof loginRequestSchema>>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  })
  const { errors } = form.formState

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const auth = await login.mutateAsync(values)
      announce(`Bem-vindo de volta, ${auth.session.user.displayName}.`)
      onSuccess()
    } catch (error) {
      const message = applyServerErrors(error, form.setError)
      setFormError(message)
      if (message) announce(message, 'assertive')
    }
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3" aria-label="Entrar">
      <FormAlert>{formError}</FormAlert>
      <TextField
        label="E-mail"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="contato@email.com"
        inputClassName={inputClass(variant)}
        error={errors.email?.message}
        {...form.register('email')}
      />
      <PasswordField
        label="Senha"
        hideLabel
        autoComplete="current-password"
        placeholder="Senha"
        inputClassName={inputClass(variant)}
        error={errors.password?.message}
        {...form.register('password')}
      />
      <button
        type="button"
        className="ml-auto cursor-pointer text-sm leading-4 text-text-accent hover:underline"
        onClick={() =>
          toast.info('Recuperação de senha indisponível', {
            description: 'Esta demonstração não envia e-mails. Use uma conta de teste ou crie uma nova.',
          })
        }
      >
        Esqueceu a senha?
      </button>
      <Button
        type="submit"
        disabled={login.isPending}
        aria-busy={login.isPending}
        className={cn('mt-3 text-base font-bold', variant === 'page' ? 'h-[60px] rounded-xl' : 'h-[45px]')}
        data-testid="login-submit"
      >
        {login.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Entrar
      </Button>
    </form>
  )
}

const registerFormSchema = registerRequestSchema
  .extend({ password: passwordRules, confirmPassword: z.string().min(1, 'Confirme a senha') })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })

export function RegisterForm({ variant, onSuccess }: { variant: Variant; onSuccess: () => void }) {
  const register = useRegister()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<z.input<typeof registerFormSchema>, unknown, z.output<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  })
  const { errors } = form.formState

  const submit = form.handleSubmit(async ({ confirmPassword: _confirm, ...values }) => {
    setFormError(null)
    try {
      await register.mutateAsync(values)
      announce('Conta criada com sucesso. Você já está conectado.')
      toast.success('Conta criada!', { description: 'Seu perfil de colecionador está pronto.' })
      onSuccess()
    } catch (error) {
      const message = applyServerErrors(error, form.setError)
      setFormError(message)
      if (message) announce(message, 'assertive')
    }
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3" aria-label="Criar conta">
      <FormAlert>{formError}</FormAlert>
      <TextField
        label="Nome de usuário"
        hideLabel
        autoComplete="username"
        placeholder="Nome de usuário"
        inputClassName={inputClass(variant)}
        hint="Letras minúsculas, números, ponto ou _"
        error={errors.username?.message}
        {...form.register('username')}
      />
      <TextField
        label="E-mail"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="Digite seu e-mail"
        inputClassName={inputClass(variant)}
        error={errors.email?.message}
        {...form.register('email')}
      />
      <PasswordField
        label="Senha"
        hideLabel
        autoComplete="new-password"
        placeholder="Senha"
        inputClassName={inputClass(variant)}
        hint="Mínimo de 8 caracteres, com letras e números"
        error={errors.password?.message}
        {...form.register('password')}
      />
      <PasswordField
        label="Confirmar senha"
        hideLabel
        autoComplete="new-password"
        placeholder="Confirmar senha"
        inputClassName={inputClass(variant)}
        error={errors.confirmPassword?.message}
        {...form.register('confirmPassword')}
      />
      <Button
        type="submit"
        disabled={register.isPending}
        aria-busy={register.isPending}
        className={cn('mt-3 text-base font-bold', variant === 'page' ? 'h-[60px] rounded-xl' : 'h-[45px]')}
        data-testid="register-submit"
      >
        {register.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {variant === 'page' ? 'Criar perfil' : 'Criar conta'}
      </Button>
    </form>
  )
}
