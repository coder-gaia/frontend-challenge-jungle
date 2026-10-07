import { cn } from '@/lib/utils'

/** Logotipo textual do Figma: "KURIO" em Roboto Mono bold 14px com espaçamento de 10%. */
export function KurioWordmark({ className, size = 'sm' }: { className?: string; size?: 'sm' | 'lg' }) {
  return (
    <span
      className={cn(
        'font-bold tracking-[0.1em] text-foreground',
        size === 'sm' ? 'text-sm leading-[18.5px]' : 'text-[32px] leading-none',
        className,
      )}
    >
      KURIO
    </span>
  )
}
