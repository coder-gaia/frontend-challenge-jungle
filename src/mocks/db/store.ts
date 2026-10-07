import { CATALOG } from '../fixtures/catalog'
import { USERS } from '../fixtures/accounts'
import type { MockDb } from './types'

/**
 * Banco em memória do backend simulado, persistido no localStorage para sobreviver a refresh.
 * Somente o estado mutável é persistido; os dados estáticos do catálogo vêm das fixtures.
 * `resetDb()` restaura integralmente o cenário conhecido (seed).
 */

export const DB_STORAGE_KEY = 'kurio:mock-db'
const SCHEMA_VERSION = 3

export function createSeedDb(): MockDb {
  const createdAt = '2026-08-01T12:00:00.000Z'
  return {
    schemaVersion: SCHEMA_VERSION,
    nfts: Object.fromEntries(
      CATALOG.map((item) => [
        item.id,
        {
          version: 1,
          compareAtPrice: item.compareAtPrice,
          editions: Object.fromEntries(
            item.editions.map((e) => [e.id, { price: e.price, available: e.available }]),
          ),
        },
      ]),
    ),
    users: Object.fromEntries(
      USERS.map((u) => [
        u.id,
        {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          email: u.email,
          passwordHash: u.passwordHash,
          ensName: u.ensName,
          walletNickname: u.walletNickname,
          avatarUrl: u.avatarUrl,
          createdAt,
          updatedAt: createdAt,
        },
      ]),
    ),
    sessions: {},
    favorites: Object.fromEntries(USERS.map((u) => [u.id, [...u.favorites]])),
    carts: {},
    quotes: {},
    orders: {},
    idempotency: {},
    wallets: Object.fromEntries(USERS.map((u) => [u.id, u.wallets.map((w) => ({ ...w }))])),
    walletConnections: {},
    orderSeq: 1040,
  }
}

let db: MockDb = createSeedDb()
let saveScheduled = false
const listeners = new Set<() => void>()

function readPersisted(): MockDb | null {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MockDb
    return parsed.schemaVersion === SCHEMA_VERSION ? parsed : null
  } catch {
    return null
  }
}

export function loadDb(): MockDb {
  db = readPersisted() ?? createSeedDb()
  return db
}

export function getDb(): MockDb {
  return db
}

function flush() {
  saveScheduled = false
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Armazenamento indisponível (modo privado/cota): o estado segue apenas em memória.
  }
  listeners.forEach((listener) => listener())
}

/** Agenda a persistência após mutações (agrupa várias alterações do mesmo tick). */
export function persist(): void {
  if (saveScheduled) return
  saveScheduled = true
  queueMicrotask(flush)
}

/** Executa uma mutação e persiste o resultado. */
export function mutate<T>(fn: (state: MockDb) => T): T {
  const result = fn(db)
  persist()
  return result
}

export function resetDb(): MockDb {
  db = createSeedDb()
  flush()
  return db
}

export function onDbChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Mantém abas abertas consistentes: outra aba alterou o banco → recarrega. */
export function syncAcrossTabs(): void {
  window.addEventListener('storage', (event) => {
    if (event.key !== DB_STORAGE_KEY) return
    db = readPersisted() ?? createSeedDb()
    listeners.forEach((listener) => listener())
  })
}
