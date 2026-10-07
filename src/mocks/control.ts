import { http, HttpResponse } from 'msw'
import {
  getConfig,
  scenarioConfig,
  SCENARIO_IDS,
  SCENARIOS,
  setScenario,
  updateConfig,
  type MockConfig,
  type ScenarioId,
} from './config'
import { getDb, mutate, resetDb } from './db/store'
import { DEMO_PASSWORD_HINT, USERS } from './fixtures/accounts'
import { CATALOG } from './fixtures/catalog'
import { resetNetworkSequence } from './lib/http'
import { dropConnections, emitStaleNftEvent, getRealtimeStats, replayLastEvent } from './realtime/server'
import { changePrice, setAvailability } from './services/market'
import { resetCheckoutTwists } from './services/quote'
import { resetOrderTimers, resolveOrder } from './services/orders'

/**
 * Painel de controle do backend simulado.
 * Exposto como endpoints HTTP `/__mock/*` (usados pelo Chaos Lab — a UI só conversa com a "rede")
 * e como `window.__KURIO_MOCK__` (usado pelos testes Playwright via `page.evaluate`).
 * Nenhuma dessas operações altera o cache do cliente diretamente: tudo passa por REST ou Socket.IO.
 */

function applyScenario(id: ScenarioId) {
  const config = setScenario(id)
  resetNetworkSequence(config.seed)
  resetCheckoutTwists()
  if (!config.realtime.available || config.offline) dropConnections(0)
  return config
}

function resetAll(options: { scenario?: ScenarioId } = {}) {
  resetOrderTimers()
  resetCheckoutTwists()
  resetDb()
  return applyScenario(options.scenario ?? 'default')
}

/** Resolve a edição alvo: a informada ou a padrão do NFT. */
function editionOf(nftId: string, editionId?: string) {
  const item = CATALOG.find((c) => c.id === nftId)
  return item ? (editionId ?? item.defaultEditionId) : null
}

function expireSessions(token?: string | null) {
  const expired: string[] = []
  mutate((db) => {
    for (const session of Object.values(db.sessions)) {
      if (token && session.token !== token) continue
      session.expiresAt = new Date(Date.now() - 1000).toISOString()
      expired.push(session.userId)
    }
  })
  return expired.length
}

/** Como o MSW intercepta a rede nesta página (ver `startMockServer`). */
export type MockTransport = 'service-worker' | 'in-page'
let transport: MockTransport = 'service-worker'

export function setMockTransport(value: MockTransport) {
  transport = value
}

export function getMockState() {
  const db = getDb()
  return {
    transport,
    config: getConfig(),
    scenarios: SCENARIO_IDS.map((id) => ({ id, ...SCENARIOS[id], config: undefined })),
    realtime: getRealtimeStats(),
    sessions: Object.values(db.sessions).map((s) => ({
      userId: s.userId,
      expiresAt: s.expiresAt,
      tokenPreview: `${s.token.slice(0, 6)}…`,
    })),
    pendingOrders: Object.values(db.orders)
      .filter((o) => o.status === 'pending')
      .map((o) => ({ id: o.id, number: o.number, resolvesAt: o.resolvesAt, outcome: o.outcome })),
    demoAccounts: USERS.map((u) => ({ email: u.email, password: DEMO_PASSWORD_HINT, name: u.displayName })),
  }
}

export const mockControl = {
  getState: getMockState,
  reset: resetAll,
  setScenario: applyScenario,
  configure: (patch: Partial<MockConfig>) => updateConfig(patch),
  scenarioConfig,
  market: {
    changePrice: (nftId: string, percent: number, editionId?: string) => {
      const edition = editionOf(nftId, editionId)
      return edition ? changePrice(nftId, edition, percent) : null
    },
    setAvailability: (nftId: string, available: number, editionId?: string) => {
      const edition = editionOf(nftId, editionId)
      return edition ? setAvailability(nftId, edition, available) : null
    },
  },
  realtime: {
    drop: (refuseForMs = 0) => dropConnections(refuseForMs),
    replayLast: replayLastEvent,
    emitStale: emitStaleNftEvent,
    stats: getRealtimeStats,
  },
  sessions: { expire: expireSessions },
  orders: { resolveNow: resolveOrder },
}

export type MockControl = typeof mockControl

const json = (data: unknown, status = 200) => HttpResponse.json(data as Record<string, unknown>, { status })

export const controlHandlers = [
  http.get('/__mock/state', () => json(getMockState())),

  http.put('/__mock/scenario', async ({ request }) => {
    const { id } = (await request.json()) as { id: ScenarioId }
    if (!SCENARIO_IDS.includes(id)) return json({ error: 'Cenário desconhecido' }, 400)
    return json({ config: applyScenario(id) })
  }),

  http.patch('/__mock/config', async ({ request }) => {
    const patch = (await request.json()) as Partial<MockConfig>
    const config = updateConfig(patch)
    if (!config.realtime.available || config.offline) dropConnections(0)
    return json({ config })
  }),

  http.post('/__mock/reset', () => json({ config: resetAll() })),

  http.post('/__mock/realtime/drop', async ({ request }) => {
    const { refuseForMs = 0 } = (await request.json().catch(() => ({}))) as { refuseForMs?: number }
    dropConnections(refuseForMs)
    return json({ ok: true })
  }),

  http.post('/__mock/realtime/replay', () => json({ event: replayLastEvent() })),
  http.post('/__mock/realtime/stale', () => json({ event: emitStaleNftEvent() })),

  http.post('/__mock/market/price', async ({ request }) => {
    const { nftId, percent, editionId } = (await request.json()) as {
      nftId: string
      percent: number
      editionId?: string
    }
    const event = mockControl.market.changePrice(nftId, percent, editionId)
    return event ? json({ event }) : json({ error: 'NFT não encontrado' }, 404)
  }),

  http.post('/__mock/market/availability', async ({ request }) => {
    const { nftId, available, editionId } = (await request.json()) as {
      nftId: string
      available: number
      editionId?: string
    }
    const event = mockControl.market.setAvailability(nftId, available, editionId)
    return event ? json({ event }) : json({ error: 'NFT não encontrado' }, 404)
  }),

  http.post('/__mock/sessions/expire', ({ request }) => {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? null
    return json({ expired: expireSessions(token) })
  }),

  http.post('/__mock/orders/:id/resolve', ({ params }) => {
    const order = resolveOrder(String(params.id))
    return order ? json({ status: order.status }) : json({ error: 'Pedido não encontrado' }, 404)
  }),
]
