import type { ApiErrorCode } from '@/contracts'

/**
 * Configuração do backend simulado. Cada cenário nomeado é um preset reprodutível desta configuração.
 * Seleção: `?scenario=<id>` na URL, Chaos Lab, `window.__KURIO_MOCK__.setScenario()` ou localStorage
 * (`kurio:mock-config`), que é como os testes Playwright preparam o estado antes do carregamento.
 */

export type LatencyProfile = 'instant' | 'realistic' | 'slow' | 'chaotic'
export type FailureStatus = number | 'network' | 'timeout'

export interface FailureRule {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | '*'
  /** Caminho relativo à API, com curinga `*` (ex.: `/nfts*`). */
  path: string
  status: FailureStatus
  code?: ApiErrorCode
  /** Quantas vezes falhar (-1 = sempre). */
  remaining: number
}

export interface MockConfig {
  scenario: ScenarioId
  seed: number
  latency: LatencyProfile
  offline: boolean
  failures: FailureRule[]
  sessionTtlSeconds: number
  payment: { outcome: 'approve' | 'decline'; delayMs: number }
  /** Primeira tentativa de criar pedido: cria e "trava" a resposta até o cliente estourar o timeout. */
  orderTimeoutOnce: boolean
  walletConnection: 'approve' | 'reject'
  /** Mudança de mercado disparada pouco depois de entrar no checkout. */
  checkoutTwist: 'none' | 'price-change' | 'sold-out'
  realtime: { available: boolean; marketPulse: boolean; pulseIntervalMs: number }
  emptyCatalog: boolean
}

export const SCENARIO_IDS = [
  'default',
  'slow-network',
  'flaky-network',
  'offline',
  'server-errors',
  'empty-catalog',
  'session-expiring',
  'payment-declined',
  'order-timeout',
  'checkout-price-change',
  'checkout-sold-out',
  'wallet-rejected',
  'favorites-failure',
  'realtime-down',
  'live-market',
] as const
export type ScenarioId = (typeof SCENARIO_IDS)[number]

export const DEFAULT_CONFIG: MockConfig = {
  scenario: 'default',
  seed: 42,
  latency: 'realistic',
  offline: false,
  failures: [],
  sessionTtlSeconds: 60 * 60,
  payment: { outcome: 'approve', delayMs: 2500 },
  orderTimeoutOnce: false,
  walletConnection: 'approve',
  checkoutTwist: 'none',
  realtime: { available: true, marketPulse: false, pulseIntervalMs: 8000 },
  emptyCatalog: false,
}

export const SCENARIOS: Record<
  ScenarioId,
  { label: string; description: string; config: Partial<MockConfig> }
> = {
  default: {
    label: 'Padrão',
    description: 'Latência realista (60–220 ms) e todas as operações com sucesso.',
    config: {},
  },
  'slow-network': {
    label: 'Rede lenta',
    description: 'Respostas entre 1,6 e 2,6 s para observar skeletons e estados de carregamento.',
    config: { latency: 'slow' },
  },
  'flaky-network': {
    label: 'Latência variável',
    description: 'Latência bimodal (40 ms a 2,2 s) com seed fixa: respostas chegam fora de ordem.',
    config: { latency: 'chaotic' },
  },
  offline: {
    label: 'Sem conexão',
    description: 'Toda requisição falha na camada de rede e o Socket.IO não conecta.',
    config: { offline: true },
  },
  'server-errors': {
    label: 'Falhas 5xx',
    description:
      'O catálogo responde 503 nas 4 primeiras tentativas (esgota os retries) e se recupera depois.',
    config: {
      failures: [
        {
          id: 'catalog-503',
          method: 'GET',
          path: '/nfts',
          status: 503,
          code: 'SERVICE_UNAVAILABLE',
          remaining: 4,
        },
      ],
    },
  },
  'empty-catalog': {
    label: 'Catálogo vazio',
    description: 'A listagem não retorna resultados.',
    config: { emptyCatalog: true },
  },
  'session-expiring': {
    label: 'Sessão expira em 45 s',
    description:
      'Novas sessões expiram após 45 segundos para testar expiração durante a navegação e o checkout.',
    config: { sessionTtlSeconds: 45 },
  },
  'payment-declined': {
    label: 'Pagamento recusado',
    description: 'O pedido é criado como pendente e a simulação o recusa.',
    config: { payment: { outcome: 'decline', delayMs: 2500 } },
  },
  'order-timeout': {
    label: 'Timeout no pedido',
    description:
      'A primeira tentativa cria o pedido mas não responde a tempo; o retry com a mesma chave recupera o mesmo pedido.',
    config: { orderTimeoutOnce: true },
  },
  'checkout-price-change': {
    label: 'Preço muda no checkout',
    description: 'Poucos segundos após abrir o checkout, o preço do primeiro item sobe 8% (evento + REST).',
    config: { checkoutTwist: 'price-change' },
  },
  'checkout-sold-out': {
    label: 'Edição esgota no checkout',
    description: 'Poucos segundos após abrir o checkout, a edição do primeiro item esgota.',
    config: { checkoutTwist: 'sold-out' },
  },
  'wallet-rejected': {
    label: 'Carteira recusa conexão',
    description: 'A simulação de conexão da carteira é recusada pelo usuário.',
    config: { walletConnection: 'reject' },
  },
  'favorites-failure': {
    label: 'Falha em favoritos',
    description: 'Incluir/remover favoritos responde 503 (rollback da atualização otimista).',
    config: {
      failures: [
        {
          id: 'favorites-503',
          method: 'PUT',
          path: '/me/favorites/*',
          status: 503,
          code: 'SERVICE_UNAVAILABLE',
          remaining: -1,
        },
        {
          id: 'favorites-503-del',
          method: 'DELETE',
          path: '/me/favorites/*',
          status: 503,
          code: 'SERVICE_UNAVAILABLE',
          remaining: -1,
        },
      ],
    },
  },
  'realtime-down': {
    label: 'Tempo real indisponível',
    description: 'O servidor Socket.IO recusa conexões; a UI mostra reconexão e segue via REST.',
    config: { realtime: { available: false, marketPulse: false, pulseIntervalMs: 8000 } },
  },
  'live-market': {
    label: 'Mercado ao vivo',
    description: 'Preços oscilam a cada 8 s via `nft.updated` (catálogo, detalhe e carrinho reagem).',
    config: { realtime: { available: true, marketPulse: true, pulseIntervalMs: 8000 } },
  },
}

export const CONFIG_STORAGE_KEY = 'kurio:mock-config'

let config: MockConfig = structuredClone(DEFAULT_CONFIG)
const listeners = new Set<(config: MockConfig) => void>()

export function scenarioConfig(id: ScenarioId): MockConfig {
  return { ...structuredClone(DEFAULT_CONFIG), ...structuredClone(SCENARIOS[id].config), scenario: id }
}

function save() {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch {
    /* sem persistência disponível */
  }
  listeners.forEach((listener) => listener(config))
}

export function loadConfig(): MockConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw) as Partial<MockConfig>
      const base =
        stored.scenario && stored.scenario in SCENARIOS ? scenarioConfig(stored.scenario) : DEFAULT_CONFIG
      config = { ...structuredClone(base), ...stored }
    }
  } catch {
    config = structuredClone(DEFAULT_CONFIG)
  }
  return config
}

export function getConfig(): MockConfig {
  return config
}

export function setScenario(id: ScenarioId): MockConfig {
  config = scenarioConfig(id)
  save()
  return config
}

export function updateConfig(patch: Partial<MockConfig>): MockConfig {
  config = { ...config, ...structuredClone(patch) }
  save()
  return config
}

export function onConfigChange(listener: (config: MockConfig) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
