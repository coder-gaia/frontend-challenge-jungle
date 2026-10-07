import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Seletor de quantidade do Figma (botões laranja arredondados).
 * Quantidades são inteiras e limitadas a [min, max]; os limites desabilitam os botões.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  size = 'md',
  label,
  disabled,
  className,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max: number
  size?: 'sm' | 'md' | 'lg'
  /** Nome acessível do item (ex.: "Emerald Ape #042"). */
  label: string
  disabled?: boolean
  className?: string
}) {
  const button = cn(
    'flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-ink bg-primary text-ink shadow-stepper transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40',
    size === 'lg' && 'h-[50px] w-[33px]',
    size === 'md' && 'size-8',
    size === 'sm' && 'h-[30px] w-5',
  )
  const icon = size === 'lg' ? 'size-6' : size === 'md' ? 'size-4' : 'size-3.5'

  return (
    <div
      className={cn('flex items-center', size === 'lg' ? 'gap-3' : 'gap-3', className)}
      role="group"
      aria-label={`Quantidade de ${label}`}
    >
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Diminuir quantidade de ${label}`}
      >
        <Minus className={icon} strokeWidth={2.5} aria-hidden="true" />
      </button>
      <output
        aria-live="polite"
        aria-label={`Quantidade: ${value}`}
        className={cn(
          'min-w-[2ch] text-center tabular-nums',
          size === 'lg' ? 'text-xl leading-7' : 'text-17 leading-6',
        )}
        data-testid="quantity-value"
      >
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Aumentar quantidade de ${label}`}
      >
        <Plus className={icon} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  )
}
