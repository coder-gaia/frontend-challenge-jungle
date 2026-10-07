import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { NftUpdatedEvent, RealtimeEvent } from '@/contracts'
import { getConfig } from '../config'
import { randomToken } from '../lib/crypto'
import { resolveSession } from '../lib/http'

/**
 * Servidor Socket.IO simulado. O MSW intercepta o WebSocket aberto pelo `socket.io-client`
 * e o `@mswjs/socket.io-binding` codifica/decodifica os pacotes Engine.IO/Socket.IO.
 *
 * Limitações do transporte (documentadas no ARCHITECTURE.md):
 * - apenas transporte `websocket` (sem long-polling);
 * - o binding não implementa heartbeat: enviamos o PING do Engine.IO manualmente;
 * - sem namespaces/rooms: o roteamento por usuário é feito aqui, a partir do token do handshake;
 * - o "servidor" vive na própria aba: cada aba tem sua instância (o estado é sincronizado via localStorage).
 */

export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.kurio.mock').replace(/\/$/, '')
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// O WebSocketHandler do MSW remove o prefixo `/socket.io/` da URL do cliente antes de casar o padrão,
// então o link aponta para a origem do servidor (`<SOCKET_URL>/?EIO=4&transport=websocket`).
const link = ws.link(new RegExp(`^${escapeRegExp(SOCKET_URL)}/`))

const HEARTBEAT_MS = 20_000
const RECENT_LIMIT = 50

interface Connection {
  id: string
  io: ReturnType<typeof toSocketIo>
  /** Envia um pacote Engine.IO cru (usado para o PING). */
  sendRaw: (data: string) => void
  close: () => void
  userId: string | null
  connectedAt: number
}

const connections = new Map<string, Connection>()
const recentEvents: RealtimeEvent[] = []
const listeners = new Set<() => void>()
let heartbeat: ReturnType<typeof setInterval> | null = null
let refuseUntil = 0
let eventSeq = 0

function notify() {
  listeners.forEach((listener) => listener())
}

export function onRealtimeChange(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function ensureHeartbeat() {
  if (heartbeat) return
  heartbeat = setInterval(() => {
    // Pacote PING do Engine.IO ("2"); o cliente responde PONG ("3").
    for (const connection of connections.values()) {
      try {
        connection.sendRaw('2')
      } catch {
        connections.delete(connection.id)
      }
    }
  }, HEARTBEAT_MS)
}

export function isAcceptingConnections() {
  const config = getConfig()
  return !config.offline && config.realtime.available && Date.now() >= refuseUntil
}

export const realtimeHandlers = [
  link.addEventListener('connection', (connection) => {
    const { client } = connection

    if (!isAcceptingConnections()) {
      // Recusa a conexão antes do handshake: o socket.io-client tentará reconectar com backoff.
      queueMicrotask(() => client.close(4503, 'Servidor de tempo real indisponível'))
      return
    }

    const io = toSocketIo(connection)
    const entry: Connection = {
      id: client.id,
      io,
      sendRaw: (data) => client.send(data),
      close: () => client.close(4000, 'Conexão encerrada pelo servidor'),
      userId: null,
      connectedAt: Date.now(),
    }
    connections.set(client.id, entry)

    client.addEventListener('message', (event) => {
      const data = event.data
      // Pacote CONNECT do Socket.IO com o payload `auth` (ex.: 40{"token":"..."}).
      if (typeof data === 'string' && data.startsWith('40')) {
        try {
          const auth = JSON.parse(data.slice(2) || '{}') as { token?: string }
          const session = resolveSession(auth.token ?? null)
          entry.userId = session && session !== 'expired' ? session.user.id : null
        } catch {
          entry.userId = null
        }
        notify()
      }
    })

    client.addEventListener('close', () => {
      connections.delete(client.id)
      notify()
    })

    ensureHeartbeat()
    notify()
  }),
]

function remember(event: RealtimeEvent) {
  recentEvents.unshift(event)
  if (recentEvents.length > RECENT_LIMIT) recentEvents.pop()
}

/**
 * Publica um evento. Eventos de pedido vão apenas para conexões autenticadas como o dono.
 * Eventos de catálogo são públicos.
 */
export function publish(event: RealtimeEvent, options: { remember?: boolean } = {}) {
  if (options.remember !== false) remember(event)
  for (const connection of connections.values()) {
    if (event.type === 'order.updated' && connection.userId !== event.userId) continue
    connection.io.client.emit(event.type, event)
  }
  notify()
}

export function nextEventId(prefix: string) {
  eventSeq += 1
  return `evt_${prefix}_${eventSeq}_${randomToken(4)}`
}

/** Encerra todas as conexões e recusa novas durante `refuseForMs`. */
export function dropConnections(refuseForMs = 0) {
  refuseUntil = Date.now() + refuseForMs
  for (const connection of connections.values()) connection.close()
  connections.clear()
  notify()
}

/** Reenvia o último evento exatamente igual (mesmo id e versão): o cliente deve ignorá-lo. */
export function replayLastEvent(): RealtimeEvent | null {
  const last = recentEvents[0]
  if (!last) return null
  publish(last, { remember: false })
  return last
}

/** Emite uma cópia antiga (versão anterior, id novo) do último `nft.updated`: o cliente não deve regredir. */
export function emitStaleNftEvent(): NftUpdatedEvent | null {
  const last = recentEvents.find((e): e is NftUpdatedEvent => e.type === 'nft.updated')
  if (!last || last.version < 2) return null
  const stale: NftUpdatedEvent = {
    ...last,
    id: nextEventId('stale'),
    version: last.version - 1,
    data: {
      ...last.data,
      price: last.data.editions[0]?.previousPrice ?? last.data.price,
      editions: last.data.editions.map((e) => ({ ...e, price: e.previousPrice, previousPrice: e.price })),
    },
  }
  publish(stale, { remember: false })
  return stale
}

export function getRealtimeStats() {
  return {
    accepting: isAcceptingConnections(),
    connections: connections.size,
    authenticated: [...connections.values()].filter((c) => c.userId).length,
    recentEvents: [...recentEvents],
  }
}
