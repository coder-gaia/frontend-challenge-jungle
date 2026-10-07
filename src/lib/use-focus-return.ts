import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * Diálogos/gavetas abertos por código (sem `DialogTrigger`) perdem o retorno de foco do Radix.
 * Este hook guarda o elemento focado na abertura e o devolve no fechamento (`onCloseAutoFocus`).
 */
export function useFocusReturn(open: boolean) {
  const opener = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    // Efeitos de layout rodam antes do Radix mover o foco para dentro do diálogo.
    if (open && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      opener.current = document.activeElement
    }
  }, [open])

  return useCallback((event: Event) => {
    const element = opener.current
    if (element && document.contains(element)) {
      event.preventDefault()
      element.focus()
    }
  }, [])
}
