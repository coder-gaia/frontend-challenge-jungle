import { test as base, expect, type Locator, type Page } from '@playwright/test'

/** Cenários do backend simulado (ver src/mocks/config.ts). */
export type Scenario =
  | 'default'
  | 'slow-network'
  | 'flaky-network'
  | 'offline'
  | 'server-errors'
  | 'empty-catalog'
  | 'session-expiring'
  | 'payment-declined'
  | 'order-timeout'
  | 'checkout-price-change'
  | 'checkout-sold-out'
  | 'wallet-rejected'
  | 'favorites-failure'
  | 'realtime-down'
  | 'live-market'

export const ACCOUNTS = {
  ana: { email: 'ana@kurio.dev', password: 'Kurio@2026', name: 'Ana Souza' },
  bruno: { email: 'bruno@kurio.dev', password: 'Kurio@2026', name: 'Bruno Lima' },
} as const

interface MockOptions {
  scenario: Scenario
  latency: 'instant' | 'realistic' | 'slow' | 'chaotic'
}

/**
 * - `mockOptions`: cenário aplicado antes do carregamento (via localStorage, lido pelo MSW no boot).
 * - `mock`: controle do backend simulado na página (`window.__KURIO_MOCK__`). Eventos disparados por
 *   ele trafegam pelo servidor Socket.IO simulado e chegam ao app pelo `socket.io-client`.
 */
/** `E2E_IN_PAGE=1` roda a suíte com o backend simulado no modo em página (sem Service Worker). */
const FORCE_IN_PAGE = process.env.E2E_IN_PAGE === '1'

export const test = base.extend<{ mockOptions: MockOptions; mock: MockController }>({
  mockOptions: [{ scenario: 'default', latency: 'instant' }, { option: true }],
  page: async ({ page, mockOptions }, use) => {
    if (FORCE_IN_PAGE) {
      await page.addInitScript(() => {
        delete (Navigator.prototype as { serviceWorker?: unknown }).serviceWorker
      })
    }
    await page.addInitScript((options) => {
      // Só na primeira carga do contexto: recargas preservam o estado (persistência).
      if (!sessionStorage.getItem('__e2e_init')) {
        sessionStorage.setItem('__e2e_init', '1')
        localStorage.setItem('kurio:mock-config', JSON.stringify(options))
      }
    }, mockOptions)
    await use(page)
  },
  mock: async ({ page }, use) => {
    await use(new MockController(page))
  },
})

export { expect }

export class MockController {
  constructor(private readonly page: Page) {}

  async ready() {
    await this.page.waitForFunction(() => window.__KURIO_MOCK__?.ready === true)
  }

  /**
   * Eventos só chegam a clientes conectados: antes de disparar um, espera o socket da página se
   * registrar no servidor simulado (exceto quando o tempo real está desligado ou recusando conexões
   * de propósito). Sem isso, numa máquina carregada o evento sai antes da conexão e se perde.
   */
  private async realtimeReady() {
    await this.ready()
    await this.page.waitForFunction(() => {
      const state = window.__KURIO_MOCK__!.getState()
      const { available } = state.config.realtime as { available: boolean }
      return !available || !state.realtime.accepting || state.realtime.connections > 0
    })
  }

  async setScenario(id: Scenario) {
    await this.ready()
    await this.page.evaluate((scenario) => window.__KURIO_MOCK__!.setScenario(scenario), id)
  }

  async configure(patch: Record<string, unknown>) {
    await this.ready()
    await this.page.evaluate((p) => window.__KURIO_MOCK__!.configure(p as never), patch)
  }

  async changePrice(nftId: string, percent: number, editionId?: string) {
    await this.realtimeReady()
    return this.page.evaluate(
      ([id, pct, edition]) =>
        window.__KURIO_MOCK__!.market.changePrice(id as string, pct as number, edition as string | undefined),
      [nftId, percent, editionId] as const,
    )
  }

  async setAvailability(nftId: string, available: number, editionId?: string) {
    await this.realtimeReady()
    return this.page.evaluate(
      ([id, qty, edition]) =>
        window.__KURIO_MOCK__!.market.setAvailability(
          id as string,
          qty as number,
          edition as string | undefined,
        ),
      [nftId, available, editionId] as const,
    )
  }

  async replayLastEvent() {
    await this.realtimeReady()
    return this.page.evaluate(() => window.__KURIO_MOCK__!.realtime.replayLast())
  }

  async emitStaleEvent() {
    await this.realtimeReady()
    return this.page.evaluate(() => window.__KURIO_MOCK__!.realtime.emitStale())
  }

  /** Resolve agora os pedidos pendentes, sem depender do atraso simulado do pagamento. */
  async resolvePendingOrders() {
    await this.ready()
    await this.page.evaluate(() => {
      const mock = window.__KURIO_MOCK__!
      for (const order of mock.getState().pendingOrders) mock.orders.resolveNow(order.id)
    })
  }

  async dropRealtime(refuseForMs = 0) {
    await this.page.evaluate((ms) => window.__KURIO_MOCK__!.realtime.drop(ms), refuseForMs)
  }

  async expireSessions() {
    await this.page.evaluate(() => window.__KURIO_MOCK__!.sessions.expire())
  }

  async state() {
    return this.page.evaluate(() => window.__KURIO_MOCK__!.getState())
  }
}

/** Toast (sonner) com o texto — o mesmo texto também vai para a região viva (sr-only). */
export const toastWith = (page: Page, text: string) =>
  page.locator('[data-sonner-toast]').filter({ hasText: text })

/** Primeiro elemento visível (o layout desktop/mobile coexistem no DOM em alguns pontos). */
export const visible = (locator: Locator) => locator.locator('visible=true').first()

export async function login(page: Page, account: keyof typeof ACCOUNTS = 'ana', redirect?: string) {
  const { email, password } = ACCOUNTS[account]
  await page.goto(redirect ? `/entrar?redirect=${encodeURIComponent(redirect)}` : '/entrar')
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(email)
  await page.getByRole('textbox', { name: 'Senha', exact: true }).fill(password)
  await page.getByTestId('login-submit').click()
  if (redirect) await page.waitForURL((url) => url.pathname === redirect.split('?')[0])
  else await page.waitForURL((url) => !url.pathname.startsWith('/entrar'))
  // A URL muda antes da rota nova montar: espera o formulário de login sair da tela.
  await expect(page.getByTestId('login-submit')).toHaveCount(0)
}

/** Adiciona um NFT ao carrinho pela página de detalhe (fluxo real de UI). */
export async function addToCart(page: Page, nftId: string, quantity = 1) {
  await page.goto(`/nft/${nftId}`)
  const plus = visible(page.getByRole('button', { name: /Aumentar quantidade/ }))
  for (let i = 1; i < quantity; i++) await plus.click()
  await visible(page.getByTestId('buy-button')).click()
  await page.waitForURL('**/carrinho')
  await expect(visible(page.getByTestId('summary-total'))).toBeVisible()
}

/** Espera fontes e as imagens visíveis na viewport (imagens ocultas ou lazy fora da tela são ignoradas). */
export async function waitForImages(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    const pending = Array.from(document.images).filter((img) => {
      const rect = img.getBoundingClientRect()
      const rendered = rect.width > 0 && rect.height > 0
      return rendered && rect.top < window.innerHeight && !img.complete
    })
    await Promise.race([
      Promise.all(
        pending.map(
          (img) =>
            new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true })
              img.addEventListener('error', resolve, { once: true })
            }),
        ),
      ),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ])
  })
  // As artes aparecem com fade (opacity) após o load: aguarda a transição terminar.
  await page.waitForTimeout(400)
}
