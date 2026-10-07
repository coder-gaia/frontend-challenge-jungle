import type { AuthResponse, User } from '@/contracts'
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'

/**
 * Token da sessão persistido para recuperação após refresh.
 * A sessão "verdadeira" (usuário, expiração) é sempre confirmada no servidor via `GET /auth/session`.
 */
export interface StoredSession {
  token: string
  userId: string
  expiresAt: string
}

type Listener = (session: StoredSession | null, reason: SessionChangeReason) => void
export type SessionChangeReason = 'login' | 'logout' | 'expired' | 'external'

let current: StoredSession | null = readStorage<StoredSession>(STORAGE_KEYS.session)
const listeners = new Set<Listener>()

function emit(reason: SessionChangeReason) {
  listeners.forEach((listener) => listener(current, reason))
}

export const sessionStore = {
  get: () => current,
  getToken: () => current?.token ?? null,
  getUserId: () => current?.userId ?? null,

  start(auth: AuthResponse) {
    current = { token: auth.token, userId: auth.session.user.id, expiresAt: auth.session.expiresAt }
    writeStorage(STORAGE_KEYS.session, current)
    emit('login')
  },

  refresh(user: User, expiresAt: string) {
    if (!current || current.userId !== user.id) return
    current = { ...current, expiresAt }
    writeStorage(STORAGE_KEYS.session, current)
  },

  end(reason: Exclude<SessionChangeReason, 'login' | 'external'>) {
    if (!current) return
    current = null
    removeStorage(STORAGE_KEYS.session)
    emit(reason)
  },

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

// Logout/login em outra aba: sincroniza para não misturar dados de usuários diferentes.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEYS.session) return
    const next = readStorage<StoredSession>(STORAGE_KEYS.session)
    if (next?.token === current?.token) return
    current = next
    emit('external')
  })
}
