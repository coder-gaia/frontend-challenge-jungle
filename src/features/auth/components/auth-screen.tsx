import { Link, useNavigate } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import facebookLogo from '@/assets/facebook.svg'
import googleLogo from '@/assets/google.svg'
import { KurioWordmark } from '@/components/layout/kurio-wordmark'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Hero } from '@/features/catalog/components/hero'
import { Promos } from '@/features/catalog/components/editorial'
import { safeRedirect } from '@/lib/safe-redirect'
import { useIsDesktop } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import type { AuthSearch } from '../search'
import { LoginForm, RegisterForm } from './auth-forms'

type Mode = 'login' | 'register'

const COPY = {
  login: {
    dialog: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
    pageTitle: 'Entrar',
  },
  register: {
    dialog: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
    pageTitle: 'Criar perfil de colecionador',
  },
}

function SocialButtons({ variant }: { variant: 'dialog' | 'page' }) {
  const unavailable = (provider: string) =>
    toast.info(`Login com ${provider} indisponível`, {
      description: 'Nesta demonstração a autenticação é feita apenas com e-mail e senha.',
    })
  const button =
    'flex h-10 w-full cursor-pointer items-center justify-center gap-2 border border-border text-13 leading-4 font-medium text-text-secondary transition-colors hover:border-border-soft hover:text-foreground'
  return (
    <div className="flex flex-col gap-3">
      <div className={cn('relative flex items-center justify-center', variant === 'dialog' && '-mx-20')}>
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden="true" />
        <span
          className={cn(
            'relative px-3 text-13 leading-4',
            variant === 'dialog' ? 'bg-surface' : 'bg-background',
          )}
        >
          Ou continue com
        </span>
      </div>
      <button
        type="button"
        className={cn(button, variant === 'page' ? 'rounded' : 'rounded-[3px]')}
        onClick={() => unavailable('Google')}
      >
        <img src={googleLogo} alt="" width={20} height={20} /> Continuar com Google
      </button>
      <button
        type="button"
        className={cn(button, variant === 'page' ? 'rounded' : 'rounded-[3px]')}
        onClick={() => unavailable('Facebook')}
      >
        <img src={facebookLogo} alt="" width={20} height={20} /> Continuar com Facebook
      </button>
    </div>
  )
}

function DemoHint() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return null
  return (
    <p className="flex items-start gap-2 rounded-md bg-surface-dark/70 px-3 py-2 text-xs leading-5 text-text-secondary">
      <Info className="mt-0.5 size-3.5 shrink-0 text-text-accent" aria-hidden="true" />
      <span>
        Demonstração: <strong className="text-foreground">ana@kurio.dev</strong> ou{' '}
        <strong className="text-foreground">bruno@kurio.dev</strong> com a senha{' '}
        <strong className="text-foreground">Kurio@2026</strong>.
      </span>
    </p>
  )
}

function ExpiredNotice({ search }: { search: AuthSearch }) {
  if (search.reason !== 'expired') return null
  return (
    <Alert className="border-amber/50 bg-amber/10" data-testid="session-expired-notice">
      <AlertDescription className="text-amber">
        Sua sessão expirou. Entre novamente para continuar de onde parou.
      </AlertDescription>
    </Alert>
  )
}

/**
 * Login/cadastro. Desktop: modal sobre a página inicial (como no Figma), com foco preso no diálogo.
 * Mobile: página cheia (frames "Mobile / Login" e "Mobile / Cadastro").
 * Após autenticar, retoma o fluxo anterior (`?redirect=`).
 */
export function AuthScreen({ mode, search }: { mode: Mode; search: AuthSearch }) {
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const destination = safeRedirect(search.redirect)
  const done = () => void navigate({ to: destination, replace: true })
  const close = () => void navigate({ to: search.redirect ? destination : '/' })
  const otherMode = mode === 'login' ? '/cadastro' : '/entrar'
  const form =
    mode === 'login' ? (
      <LoginForm variant={desktop ? 'dialog' : 'page'} onSuccess={done} />
    ) : (
      <RegisterForm variant={desktop ? 'dialog' : 'page'} onSuccess={done} />
    )

  if (desktop) {
    return (
      <>
        <div inert aria-hidden="true" className="pointer-events-none flex flex-col gap-24 pt-8 select-none">
          <Hero />
          <Promos />
        </div>
        <Dialog open onOpenChange={(open) => !open && close()}>
          <DialogContent
            className="max-h-[calc(100dvh-2rem)] max-w-[500px] gap-0 overflow-y-auto rounded-none border-0 bg-surface p-0 sm:max-w-[500px] [&>button]:text-text-accent"
            onOpenAutoFocus={(e) => {
              e.preventDefault()
              document.querySelector<HTMLInputElement>('[data-auth-dialog] input')?.focus()
            }}
            data-auth-dialog=""
          >
            <div className="flex flex-col gap-10 pt-12 text-center">
              <DialogTitle asChild>
                <h1 className="flex items-center justify-center gap-2 text-xl leading-4 font-medium">
                  <Link
                    to="/entrar"
                    search={search}
                    replace
                    aria-current={mode === 'login' ? 'page' : undefined}
                    className={cn(mode === 'login' ? 'text-text-accent' : 'hover:text-text-accent')}
                  >
                    Entrar
                  </Link>
                  <span aria-hidden="true" className="h-6 w-0.5 bg-primary" />
                  <Link
                    to="/cadastro"
                    search={search}
                    replace
                    aria-current={mode === 'register' ? 'page' : undefined}
                    className={cn(mode === 'register' ? 'text-text-accent' : 'hover:text-text-accent')}
                  >
                    Criar conta
                  </Link>
                </h1>
              </DialogTitle>
              <DialogDescription className="mx-auto max-w-[400px] text-13 leading-4 text-foreground">
                {COPY[mode].dialog}
              </DialogDescription>
            </div>
            <div className="mx-auto flex w-full max-w-[340px] flex-col gap-6 pt-6 pb-10">
              <ExpiredNotice search={search} />
              {form}
              <SocialButtons variant="dialog" />
              <DemoHint />
            </div>
            <div className="h-2.5 bg-primary" aria-hidden="true" />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background px-7 pt-[110px] pb-10">
      <Link to="/" aria-label="KURIO, página inicial" className="mx-auto">
        <KurioWordmark size="lg" />
      </Link>
      <h1 className="mt-[86px] text-center text-xl font-bold">{COPY[mode].pageTitle}</h1>
      <div className="mt-8 flex flex-col gap-6">
        <ExpiredNotice search={search} />
        {form}
        <SocialButtons variant="page" />
        <DemoHint />
        <p className="text-center text-15 text-text-secondary">
          {mode === 'login' ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
          <Link
            to={otherMode}
            search={search}
            replace
            className="text-text-accent underline-offset-4 hover:underline"
          >
            {mode === 'login' ? 'Crie uma conta' : 'Entre'}
          </Link>
        </p>
      </div>
    </div>
  )
}
