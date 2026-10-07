/* Controle do backend simulado exposto pelo MSW no navegador (ver src/mocks/control.ts). */
interface KurioMockControl {
  ready: true
  getState: () => {
    config: Record<string, unknown>
    realtime: { connections: number; authenticated: number; accepting: boolean }
    pendingOrders: Array<{ id: string }>
  }
  setScenario: (id: string) => unknown
  configure: (patch: Record<string, unknown>) => unknown
  reset: () => unknown
  market: {
    changePrice: (nftId: string, percent: number, editionId?: string) => unknown
    setAvailability: (nftId: string, available: number, editionId?: string) => unknown
  }
  realtime: {
    drop: (ms?: number) => void
    replayLast: () => unknown
    emitStale: () => unknown
    stats: () => unknown
  }
  sessions: { expire: (token?: string | null) => number }
  orders: { resolveNow: (id: string) => unknown }
}

interface Window {
  __KURIO_MOCK__?: KurioMockControl
}
