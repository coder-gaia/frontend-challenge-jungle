import { useEffect, useRef, useState } from 'react'
import { compareEth } from './eth'

/**
 * Destaca mudanças de preço vindas do tempo real: retorna 'up' ou 'down' por alguns instantes
 * após a mudança (a animação respeita `prefers-reduced-motion`).
 */
export function usePriceFlash(price: string | undefined, durationMs = 1600) {
  const previous = useRef(price)
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    const before = previous.current
    previous.current = price
    if (!before || !price || before === price) return
    setDirection(compareEth(price, before) > 0 ? 'up' : 'down')
    const timer = setTimeout(() => setDirection(null), durationMs)
    return () => clearTimeout(timer)
  }, [price, durationMs])

  return direction
}
