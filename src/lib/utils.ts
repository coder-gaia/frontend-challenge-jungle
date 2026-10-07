import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * O tema define tamanhos de fonte próprios (`text-15`, `text-display`…). Sem registrá-los,
 * o tailwind-merge os trataria como cor e descartaria ao combinar com `text-<cor>`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'h1', '13', '15', '17', '22'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
