import { setupWorker } from 'msw/browser'
import { loadConfig, SCENARIO_IDS, type LatencyProfile, type ScenarioId } from './config'
import {
  controlHandlers,
  mockControl,
  setMockTransport,
  type MockControl,
  type MockTransport,
} from './control'
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
    __KURIO_MOCK__?: MockControl & { ready: true; transport: MockTransport }
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

/** Iframe de outra origem (simuladores mobile, previews de editor): o Service Worker fica particionado ou bloqueado. */
function isCrossOriginFrame() {
  if (window.self === window.top) return false
  try {
    return window.top?.location.origin !== window.location.origin
  } catch {
    return true
  }
}

/**
 * Sem controlar a página, o worker não vê as requisições e elas vão direto para a rede.
 * Na primeira visita o controle chega logo após a ativação (`clients.claim()`); se não chegar, desiste.
 */
function waitForControl(timeoutMs: number) {
  if (navigator.serviceWorker.controller) return Promise.resolve(true)
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(Boolean(navigator.serviceWorker.controller)), timeoutMs)
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        clearTimeout(timer)
        resolve(Boolean(navigator.serviceWorker.controller))
      },
      { once: true },
    )
  })
}

/** Modo preferido: as requisições aparecem no painel de rede como chamadas reais. */
async function startServiceWorker() {
  const worker = setupWorker(...handlers)
  try {
    await worker.start({
      quiet: true,
      serviceWorker: { url: '/mockServiceWorker.js' },
      onUnhandledRequest(request, print) {
        // Só alerta sobre chamadas de API sem handler; assets estáticos seguem para a rede.
        if (new URL(request.url).pathname.startsWith(API_BASE)) print.warning()
      },
    })
  } catch {
    return false
  }
  if (await waitForControl(1000)) return true
  worker.stop()
  return false
}

/**
 * Sobe o backend simulado. Usa o Service Worker quando ele realmente intercepta a página; caso
 * contrário (iframe de outra origem, API ausente ou bloqueada, página fora do controle do worker),
 * cai para o modo em página, que intercepta XHR, fetch e WebSocket no próprio documento.
 */
export async function startMockServer() {
  loadConfig()
  loadDb()
  applyUrlOverrides()
  syncAcrossTabs()

  let transport: MockTransport = 'service-worker'
  const serviceWorkerUsable = 'serviceWorker' in navigator && !isCrossOriginFrame()
  if (!serviceWorkerUsable || !(await startServiceWorker())) {
    const { startInPageNetwork } = await import('./in-page')
    await startInPageNetwork(handlers)
    transport = 'in-page'
    console.info(
      '[KURIO] Backend simulado no modo em página: o Service Worker não intercepta este contexto (ex.: iframe de um simulador mobile).',
    )
  }
  setMockTransport(transport)

  recoverPendingOrders()
  startMarketPulse()
  window.__KURIO_MOCK__ = Object.assign(mockControl, { ready: true as const, transport })
}

export { resetDb }
