/**
 * Acesso seguro ao localStorage/sessionStorage: em modo privado, cota estourada ou bloqueio
 * de cookies o acesso pode lançar exceção — a aplicação deve continuar funcionando.
 */
type Area = 'local' | 'session'

const area = (kind: Area): Storage | null => {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function readStorage<T>(key: string, kind: Area = 'local'): T | null {
  try {
    const raw = area(kind)?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: unknown, kind: Area = 'local'): void {
  try {
    area(kind)?.setItem(key, JSON.stringify(value))
  } catch {
    /* indisponível */
  }
}

export function removeStorage(key: string, kind: Area = 'local'): void {
  try {
    area(kind)?.removeItem(key)
  } catch {
    /* indisponível */
  }
}

export const STORAGE_KEYS = {
  session: 'kurio:session',
  guestCart: 'kurio:guest-cart',
  checkoutDraft: 'kurio:checkout-draft',
  checkoutAttempt: 'kurio:checkout-attempt',
  pendingOrder: 'kurio:pending-order',
} as const
