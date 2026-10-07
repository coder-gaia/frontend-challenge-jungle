import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Rótulo visualmente oculto (layouts do Figma que usam só placeholder). Continua acessível. */
  hideLabel?: boolean
  error?: string
  hint?: ReactNode
  /** Exibe o asterisco coral do Figma para campos obrigatórios. */
  requiredMark?: boolean
  endAdornment?: ReactNode
  startAdornment?: ReactNode
  containerClassName?: string
  inputClassName?: string
}

/**
 * Campo de texto com rótulo associado, mensagem de erro ligada por `aria-describedby`
 * e `aria-invalid` — o erro não depende só de cor (texto + borda).
 */
export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField(
  {
    label,
    hideLabel,
    error,
    hint,
    requiredMark,
    endAdornment,
    startAdornment,
    containerClassName,
    inputClassName,
    id: idProp,
    className,
    ...props
  },
  ref,
) {
  const generated = useId()
  const id = idProp ?? generated
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col', containerClassName)}>
      <label
        htmlFor={id}
        className={cn('mb-2 flex items-start gap-0.5 text-15 leading-[15px]', hideLabel && 'sr-only')}
      >
        {label}
        {requiredMark && (
          <span aria-hidden="true" className="-mt-1.5 text-[22px] leading-[29px] text-coral">
            *
          </span>
        )}
      </label>
      <div className={cn('relative', className)}>
        {startAdornment}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={requiredMark || props.required || undefined}
          className={cn(
            'h-10 w-full rounded-[3px] border border-input bg-transparent px-4 text-sm text-foreground transition-[border-color,box-shadow] outline-none placeholder:text-text-muted read-only:bg-surface-raised/40 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60',
            error && 'border-destructive-foreground focus-visible:border-destructive-foreground',
            endAdornment ? 'pr-11' : null,
            inputClassName,
          )}
          {...props}
        />
        {endAdornment}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs leading-4 text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="mt-1.5 text-xs leading-4 text-destructive-foreground"
          data-testid="field-error"
        >
          {error}
        </p>
      )}
    </div>
  )
})

/** Campo de senha com alternância de visibilidade acessível. */
export const PasswordField = forwardRef<HTMLInputElement, Omit<FieldProps, 'type' | 'endAdornment'>>(
  function PasswordField(props, ref) {
    const [visible, setVisible] = useState(false)
    return (
      <TextField
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        endAdornment={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-text-muted hover:text-text-accent"
          >
            {visible ? (
              <Eye className="size-[18px]" aria-hidden="true" />
            ) : (
              <EyeOff className="size-[18px]" aria-hidden="true" />
            )}
          </button>
        }
      />
    )
  },
)

/** Mensagem de erro geral do formulário (anunciada imediatamente). */
export function FormAlert({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null
  return (
    <div
      role="alert"
      className={cn(
        'rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground',
        className,
      )}
      data-testid="form-alert"
    >
      {children}
    </div>
  )
}
