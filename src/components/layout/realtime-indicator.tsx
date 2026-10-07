import { useRealtimeStatus } from '@/features/realtime/realtime-provider'
import { cn } from '@/lib/utils'

const LABEL = {
  idle: 'Tempo real inativo',
  connecting: 'Conectando ao tempo real',
  connected: 'Preços ao vivo',
  reconnecting: 'Reconectando…',
  offline: 'Tempo real offline',
} as const

/** Indicador discreto do status do Socket.IO (texto + cor, não depende só da cor). */
export function RealtimeIndicator({ className }: { className?: string }) {
  const { status } = useRealtimeStatus()
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs text-text-secondary', className)}
      data-testid="realtime-status"
      data-status={status}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-2 rounded-full',
          status === 'connected' && 'bg-success shadow-[0_0_0_3px_rgb(0_166_108/0.2)]',
          (status === 'connecting' || status === 'reconnecting') && 'animate-pulse bg-amber',
          (status === 'offline' || status === 'idle') && 'bg-text-muted',
        )}
      />
      <span className="whitespace-nowrap">{LABEL[status]}</span>
    </span>
  )
}

/** No header, o status só aparece quando há problema (mantém a composição do Figma no estado normal). */
export function RealtimeAlert() {
  const { status } = useRealtimeStatus()
  if (status !== 'reconnecting' && status !== 'offline') return null
  return <RealtimeIndicator className="hidden md:inline-flex" />
}
