import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, RotateCw, SearchX } from 'lucide-react'
import { toApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Estado vazio no padrão visual do Figma (cartão marrom, ícone laranja). */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface/60 px-6 py-12 text-center',
        className,
      )}
    >
      <span
        className="flex size-14 items-center justify-center rounded-full bg-surface-dark text-text-accent"
        aria-hidden="true"
      >
        {icon ?? <SearchX className="size-6" />}
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="max-w-md text-sm leading-6 text-text-secondary">{description}</p>}
      {action}
    </div>
  )
}

/** Estado de erro com mensagem amigável e ação de nova tentativa. */
export function ErrorState({
  error,
  onRetry,
  title = 'Não foi possível carregar',
  className,
  retrying,
}: {
  error: unknown
  onRetry?: () => void
  title?: string
  className?: string
  retrying?: boolean
}) {
  const apiError = toApiError(error)
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-surface/60 px-6 py-12 text-center',
        className,
      )}
    >
      <span
        className="flex size-14 items-center justify-center rounded-full bg-surface-dark text-destructive-foreground"
        aria-hidden="true"
      >
        <AlertTriangle className="size-6" />
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-text-secondary">{apiError.message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} disabled={retrying} data-testid="retry">
          <RotateCw className={cn('size-4', retrying && 'animate-spin')} aria-hidden="true" />
          {retrying ? 'Tentando novamente…' : 'Tentar novamente'}
        </Button>
      )}
    </div>
  )
}

export function NotFoundState({
  title = 'Página não encontrada',
  description = 'O endereço acessado não existe ou foi removido.',
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="container-kurio flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-display font-bold text-text-accent" aria-hidden="true">
        404
      </p>
      <h1 className="text-h1 font-bold">{title}</h1>
      <p className="max-w-md text-text-secondary">{description}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/" hash="mercado">
            Explorar o mercado
          </Link>
        </Button>
      </div>
    </div>
  )
}
