import { lazy, Suspense, useEffect, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { useRouteMeta } from '@/app/route-meta'
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
  const meta = useRouteMeta()

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
          'fixed left-4 z-40 flex h-10 cursor-pointer items-center gap-2 rounded-full border border-primary/60 bg-surface/95 px-3 text-xs font-bold text-text-accent shadow-glow backdrop-blur transition hover:bg-surface-raised md:bottom-6',
          meta.hideTabBar ? 'bottom-44' : 'bottom-24',
        )}
        data-testid="chaos-lab-launcher"
      >
        <FlaskConical className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Chaos Lab</span>
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
