import { readStorage, STORAGE_KEYS, writeStorage } from './storage'

/**
 * Identificador do carrinho de visitante. Persistido para manter o carrinho após refresh;
 * após o login os itens são mesclados no carrinho do usuário e um novo id é gerado.
 */
let guestCartId = readStorage<string>(STORAGE_KEYS.guestCart)

function createId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

export function getGuestCartId(): string {
  if (!guestCartId) {
    guestCartId = createId()
    writeStorage(STORAGE_KEYS.guestCart, guestCartId)
  }
  return guestCartId
}

export function rotateGuestCartId(): string {
  guestCartId = createId()
  writeStorage(STORAGE_KEYS.guestCart, guestCartId)
  return guestCartId
}
