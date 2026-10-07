import { lazy, Suspense, useEffect, useState } from 'react'

const SearchDialog = lazy(() => import('./search-dialog'))

type Listener = () => void
const listeners = new Set<Listener>()

/** Abre a busca rápida (também por Ctrl/⌘+K). O diálogo (cmdk) é carregado sob demanda. */
export function openSearch() {
  listeners.forEach((listener) => listener())
}

export function SearchHost() {
  const [state, setState] = useState({ mounted: false, open: false })

  useEffect(() => {
    const open: Listener = () => setState({ mounted: true, open: true })
    listeners.add(open)
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setState((s) => ({ mounted: true, open: !s.open }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      listeners.delete(open)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  if (!state.mounted) return null
  return (
    <Suspense fallback={null}>
      <SearchDialog open={state.open} onOpenChange={(open) => setState((s) => ({ ...s, open }))} />
    </Suspense>
  )
}
