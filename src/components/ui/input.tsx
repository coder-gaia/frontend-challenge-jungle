import * as React from 'react'
import { cn } from '@/lib/utils'

// Campo do Figma: 40px de altura, borda #3F2319, raio 5px, foco em laranja.
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-[5px] border border-input bg-transparent px-4 py-2 text-sm text-foreground transition-[color,border-color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-text-muted read-only:bg-surface-raised/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
        'aria-invalid:border-destructive-foreground aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
