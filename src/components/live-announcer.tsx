import { useEffect, useState } from 'react'

/**
 * Região viva global para leitores de tela. `announce()` comunica mudanças assíncronas
 * (mutations, atualizações em tempo real) sem depender apenas de toasts visuais.
 */
type Politeness = 'polite' | 'assertive'
type Listener = (message: string, politeness: Politeness) => void
const listeners = new Set<Listener>()

export function announce(message: string, politeness: Politeness = 'polite') {
  listeners.forEach((listener) => listener(message, politeness))
}

export function LiveAnnouncer() {
  const [polite, setPolite] = useState('')
  const [assertive, setAssertive] = useState('')

  useEffect(() => {
    const listener: Listener = (message, politeness) => {
      const set = politeness === 'assertive' ? setAssertive : setPolite
      // Limpa antes para que mensagens repetidas sejam anunciadas de novo.
      set('')
      requestAnimationFrame(() => set(message))
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="live-region">
        {polite}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </>
  )
}
