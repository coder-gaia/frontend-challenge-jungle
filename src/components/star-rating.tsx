import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarRating({
  value,
  className,
  size = 15,
}: {
  value: number
  className?: string
  size?: number
}) {
  const rounded = Math.round(value)
  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      role="img"
      aria-label={`Nota ${value.toFixed(1).replace('.', ',')} de 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          style={{ width: size, height: size }}
          className={i < rounded ? 'fill-primary text-primary' : 'fill-text-secondary text-text-secondary'}
        />
      ))}
    </span>
  )
}
