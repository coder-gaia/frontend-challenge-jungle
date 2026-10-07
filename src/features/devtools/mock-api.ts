import { http } from '@/api/http'

/**
 * Cliente do painel de controle do backend simulado. Assim como o resto do app, o Chaos Lab só
 * conversa com a "rede" (endpoints `/__mock/*` interceptados pelo MSW): nada aqui altera o cache
 * do TanStack Query ou emite eventos diretamente — os efeitos chegam via REST e Socket.IO.
 */
export interface MockState {
  config: {
    scenario: string
    seed: number
    latency: 'instant' | 'realistic' | 'slow' | 'chaotic'
    offline: boolean
    sessionTtlSeconds: number
    payment: { outcome: 'approve' | 'decline'; delayMs: number }
    orderTimeoutOnce: boolean
    walletConnection: 'approve' | 'reject'
    checkoutTwist: 'none' | 'price-change' | 'sold-out'
    realtime: { available: boolean; marketPulse: boolean; pulseIntervalMs: number }
    emptyCatalog: boolean
  }
  scenarios: Array<{ id: string; label: string; description: string }>
  realtime: { accepting: boolean; connections: number; authenticated: number }
  sessions: Array<{ userId: string; expiresAt: string; tokenPreview: string }>
  pendingOrders: Array<{ id: string; number: string; resolvesAt: string; outcome: string }>
  demoAccounts: Array<{ email: string; password: string; name: string }>
}

const control = (path: string) => ({ url: `/__mock${path}`, baseURL: '/' })

export const mockApi = {
  state: async () => (await http.request<MockState>({ ...control('/state') })).data,
  setScenario: (id: string) => http.request({ ...control('/scenario'), method: 'PUT', data: { id } }),
  configure: (patch: Partial<MockState['config']>) =>
    http.request({ ...control('/config'), method: 'PATCH', data: patch }),
  reset: () => http.request({ ...control('/reset'), method: 'POST' }),
  dropRealtime: (refuseForMs: number) =>
    http.request({ ...control('/realtime/drop'), method: 'POST', data: { refuseForMs } }),
  replayLastEvent: () => http.request({ ...control('/realtime/replay'), method: 'POST' }),
  emitStaleEvent: () => http.request({ ...control('/realtime/stale'), method: 'POST' }),
  changePrice: (nftId: string, percent: number, editionId?: string) =>
    http.request({ ...control('/market/price'), method: 'POST', data: { nftId, percent, editionId } }),
  setAvailability: (nftId: string, available: number, editionId?: string) =>
    http.request({
      ...control('/market/availability'),
      method: 'POST',
      data: { nftId, available, editionId },
    }),
  expireSession: () => http.request({ ...control('/sessions/expire'), method: 'POST' }),
  resolveOrder: (orderId: string) =>
    http.request({ ...control(`/orders/${orderId}/resolve`), method: 'POST' }),
}
