import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { WifiOff } from 'lucide-react'
import { announce } from '@/components/live-announcer'

const subscribeOnline = (callback: () => void) => {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

/** Aviso quando o navegador fica offline (o TanStack Query pausa as consultas até voltar). */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  )
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    announce(online ? 'Conexão restabelecida.' : 'Você está offline.', 'assertive')
  }, [online])

  if (online) return null
  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber px-4 py-2 text-sm font-medium text-ink"
    >
      <WifiOff className="size-4" aria-hidden="true" />
      Você está offline. Mostrando a última versão carregada; as ações serão retomadas quando a conexão
      voltar.
    </div>
  )
}

/**
 * Acessibilidade em SPA: ao trocar de página, anuncia o novo título e move o foco para o conteúdo
 * principal (mudanças só de parâmetros de busca não movem o foco).
 */
export function RouteAnnouncer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const previous = useRef(pathname)

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    const timer = setTimeout(() => {
      announce(`Página: ${document.title}`)
      const main = document.getElementById('conteudo')
      if (main && !main.contains(document.activeElement)) main.focus({ preventScroll: true })
    }, 120)
    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
