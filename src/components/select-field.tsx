import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hideLabel?: boolean
  requiredMark?: boolean
  error?: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
  containerClassName?: string
}

/** Select nativo estilizado como no Figma (acessível por padrão e robusto em formulários). */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  {
    label,
    hideLabel,
    requiredMark,
    error,
    options,
    placeholder,
    containerClassName,
    className,
    id: idProp,
    ...props
  },
  ref,
) {
  const generated = useId()
  const id = idProp ?? generated
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
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-required={requiredMark || undefined}
          className={cn(
            'h-10 w-full cursor-pointer appearance-none rounded-[3px] border border-input bg-background pr-10 pl-3 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
            error && 'border-destructive-foreground',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-[18px] -translate-y-1/2 text-foreground"
          aria-hidden="true"
        />
      </div>
      {error && (
        <p
          id={`${id}-error`}
          className="mt-1.5 text-xs text-destructive-foreground"
          data-testid="field-error"
        >
          {error}
        </p>
      )}
    </div>
  )
})
