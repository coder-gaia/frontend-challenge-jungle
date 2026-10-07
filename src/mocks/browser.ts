import { setupWorker } from 'msw/browser'
import { loadConfig, SCENARIO_IDS, type LatencyProfile, type ScenarioId } from './config'
import { controlHandlers, mockControl, type MockControl } from './control'
import { loadDb, resetDb, syncAcrossTabs } from './db/store'
import { accountHandlers } from './handlers/account'
import { authHandlers } from './handlers/auth'
import { cartHandlers } from './handlers/cart'
import { catalogHandlers, favoritesHandlers } from './handlers/catalog'
import { orderHandlers } from './handlers/orders'
import { API_BASE } from './lib/http'
import { realtimeHandlers } from './realtime/server'
import { startMarketPulse } from './services/market'
import { recoverPendingOrders } from './services/orders'

declare global {
  interface Window {
    __KURIO_MOCK__?: MockControl & { ready: true }
  }
}

export const handlers = [
  ...controlHandlers,
  ...authHandlers,
  ...catalogHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...accountHandlers,
  ...realtimeHandlers,
]

const LATENCIES: LatencyProfile[] = ['instant', 'realistic', 'slow', 'chaotic']

/**
 * Parâmetros de URL para demonstração/QA (removidos da barra após a leitura):
 * `?scenario=<id>` · `?mockLatency=<perfil>` · `?mockReset=1`
 */
function applyUrlOverrides() {
  const url = new URL(window.location.href)
  const scenario = url.searchParams.get('scenario')
  const latency = url.searchParams.get('mockLatency')
  const reset = url.searchParams.get('mockReset')
  if (reset === '1') mockControl.reset()
  if (scenario && SCENARIO_IDS.includes(scenario as ScenarioId))
    mockControl.setScenario(scenario as ScenarioId)
  if (latency && LATENCIES.includes(latency as LatencyProfile))
    mockControl.configure({ latency: latency as LatencyProfile })
  if (scenario || latency || reset) {
    ;['scenario', 'mockLatency', 'mockReset'].forEach((key) => url.searchParams.delete(key))
    window.history.replaceState(window.history.state, '', url)
  }
}

export async function startMockServer() {
  loadConfig()
  loadDb()
  applyUrlOverrides()
  syncAcrossTabs()

  const worker = setupWorker(...handlers)
  await worker.start({
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
    onUnhandledRequest(request, print) {
      // Só alerta sobre chamadas de API sem handler; assets estáticos seguem para a rede.
      if (new URL(request.url).pathname.startsWith(API_BASE)) print.warning()
    },
  })

  recoverPendingOrders()
  startMarketPulse()
  window.__KURIO_MOCK__ = Object.assign(mockControl, { ready: true as const })
}

export { resetDb }
