import { useId, useState, type FormEvent } from 'react'
import { Loader2, TicketPercent, X } from 'lucide-react'
import type { Coupon } from '@/contracts'
import { errorMessage } from '@/api/errors'
import { announce } from '@/components/live-announcer'
import { cn } from '@/lib/utils'
import { useApplyCoupon, useRemoveCoupon } from '../queries'

/** Cupom: aplicar/remover pela API; código inválido ou expirado aparece associado ao campo. */
export function CouponForm({
  coupon,
  disabled,
  variant = 'default',
  className,
}: {
  coupon: Coupon | null
  disabled?: boolean
  variant?: 'default' | 'pill'
  className?: string
}) {
  const id = useId()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = code.trim().toUpperCase()
    if (value.length < 3) {
      setError('Informe o código promocional')
      return
    }
    setError(null)
    try {
      await apply.mutateAsync(value)
      setCode('')
      announce(`Cupom ${value} aplicado.`)
    } catch (err) {
      const message = errorMessage(err)
      setError(message)
      announce(message, 'assertive')
    }
  }

  if (coupon) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-md border border-success/40 bg-success/10 px-3 py-2',
          className,
        )}
        data-testid="applied-coupon"
      >
        <span className="flex items-center gap-2 text-sm">
          <TicketPercent className="size-4 text-success" aria-hidden="true" />
          <span>
            <strong>{coupon.code}</strong> aplicado
            <span className="block text-xs text-text-secondary">{coupon.description}</span>
          </span>
        </span>
        <button
          type="button"
          onClick={() =>
            remove.mutate(undefined, {
              onSuccess: () => announce(`Cupom ${coupon.code} removido.`),
            })
          }
          disabled={remove.isPending}
          className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs text-text-accent hover:bg-surface-raised"
          aria-label={`Remover cupom ${coupon.code}`}
        >
          {remove.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <X className="size-3.5" aria-hidden="true" />
          )}
          Remover
        </button>
      </div>
    )
  }

  const pill = variant === 'pill'
  return (
    <form onSubmit={submit} noValidate className={cn('flex flex-col gap-2', className)}>
      {!pill && (
        <label htmlFor={id} className="text-sm font-bold">
          Código promocional
        </label>
      )}
      <div
        className={cn(
          'flex overflow-hidden',
          pill ? 'h-[50px] rounded-full border border-border' : 'h-10 rounded-[3px] border border-primary',
        )}
      >
        <input
          id={id}
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          aria-label={pill ? 'Código promocional' : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={disabled}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-xs uppercase outline-none placeholder:text-text-muted placeholder:normal-case focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
            pill ? 'px-4 text-sm' : 'px-2',
          )}
          data-testid="coupon-input"
        />
        <button
          type="submit"
          disabled={disabled || apply.isPending}
          className={cn(
            'flex cursor-pointer items-center gap-1 bg-primary font-bold text-ink transition-colors hover:bg-brand-light disabled:opacity-50',
            pill
              ? 'm-0 rounded-full bg-linear-to-r from-primary to-brand-dark px-4 text-base'
              : 'w-[102px] justify-center text-base',
          )}
        >
          {apply.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Aplicar
        </button>
      </div>
      {error && (
        <p
          id={`${id}-error`}
          className="text-xs text-destructive-foreground"
          role="alert"
          data-testid="coupon-error"
        >
          {error}
        </p>
      )}
    </form>
  )
}
