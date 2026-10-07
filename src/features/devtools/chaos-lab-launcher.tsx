import { lazy, Suspense, useEffect, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { useRealtimeStatus } from '@/features/realtime/realtime-provider'
import { cn } from '@/lib/utils'

const ChaosLabPanel = lazy(() => import('./chaos-lab-panel'))

const ENABLED =
  import.meta.env.VITE_ENABLE_MOCKS === 'true' && import.meta.env.VITE_ENABLE_CHAOS_LAB !== 'false'

/**
 * Chaos Lab: painel de cenários e inspeção de tempo real da demonstração.
 * Só existe com os mocks ativos; o painel é carregado sob demanda (Alt+Shift+C ou botão flutuante).
 */
export function ChaosLabLauncher() {
  const [open, setOpen] = useState(false)
  const [requested, setRequested] = useState(false)
  const { status, events } = useRealtimeStatus()

  useEffect(() => {
    if (!ENABLED) return
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        setRequested(true)
        setOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!ENABLED) return null
  const unseen = events.filter((e) => e.outcome !== 'applied').length

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setRequested(true)
          setOpen(true)
        }}
        aria-label="Abrir Chaos Lab (Alt+Shift+C)"
        aria-keyshortcuts="Alt+Shift+C"
        className={cn(
          'fixed z-40 flex cursor-pointer items-center gap-2 border border-primary/60 bg-surface/95 text-xs font-bold text-text-accent shadow-glow backdrop-blur transition hover:bg-surface-raised',
          // Mobile: aba presa à borda esquerda (não cobre barras fixas). Desktop: pílula no canto inferior.
          'top-1/2 left-0 h-12 -translate-y-1/2 rounded-r-full border-l-0 px-2',
          'md:top-auto md:bottom-6 md:left-4 md:h-10 md:translate-y-0 md:rounded-full md:border-l md:px-3',
        )}
        data-testid="chaos-lab-launcher"
      >
        <FlaskConical className="size-4" aria-hidden="true" />
        <span className="hidden md:inline">Chaos Lab</span>
        <span
          aria-hidden="true"
          className={cn(
            'size-2 rounded-full',
            status === 'connected'
              ? 'bg-success'
              : status === 'reconnecting' || status === 'connecting'
                ? 'animate-pulse bg-amber'
                : 'bg-text-muted',
          )}
        />
        {unseen > 0 && (
          <span className="rounded-full bg-coral px-1.5 text-[10px] text-ink" aria-hidden="true">
            {unseen}
          </span>
        )}
      </button>
      {requested && (
        <Suspense fallback={null}>
          <ChaosLabPanel open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  )
}
