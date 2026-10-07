import * as React from 'react'
import { cn } from '@/lib/utils'

/** Placeholder com efeito shimmer; respeita `prefers-reduced-motion` (ver `.shimmer` em index.css). */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="skeleton" aria-hidden="true" className={cn('shimmer rounded-md', className)} {...props} />
  )
}

export { Skeleton }
