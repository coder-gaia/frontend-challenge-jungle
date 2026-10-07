import { expect, test } from '../fixtures'
import type { FrameLocator, Page } from '@playwright/test'

/**
 * O backend simulado precisa funcionar mesmo quando o Service Worker não intercepta a página:
 * simuladores mobile e previews de editor carregam o app num iframe de outra origem, alguns
 * navegadores não expõem a API e o worker pode não assumir o controle da página.
 */
async function expectWorkingApp(app: Page | FrameLocator) {
  await expect(app.getByText('Emerald Ape #042').first()).toBeVisible()
  await expect(app.getByTestId('realtime-status').first()).toHaveAttribute('data-status', 'connected')
}

test.describe('Backend simulado sem Service Worker', () => {
  test('app em iframe de outra origem usa o modo em página, com REST e tempo real', async ({
    page,
    baseURL,
  }) => {
    await page.setContent(
      `<iframe title="KURIO" src="${baseURL}/" style="width: 390px; height: 844px; border: 0"></iframe>`,
    )
    await expectWorkingApp(page.frameLocator('iframe[title="KURIO"]'))
    const frame = page.frames().find((f) => f.url().startsWith(baseURL!))
    expect(await frame!.evaluate(() => window.__KURIO_MOCK__?.transport)).toBe('in-page')
  })

  test('navegador sem a API de Service Worker mantém REST e tempo real', async ({ page }) => {
    await page.addInitScript(() => {
      delete (Navigator.prototype as { serviceWorker?: unknown }).serviceWorker
    })
    await page.goto('/')
    await expectWorkingApp(page)
    expect(await page.evaluate(() => window.__KURIO_MOCK__?.transport)).toBe('in-page')
  })

  test('página que o worker não controla cai para o modo em página', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(ServiceWorkerContainer.prototype, 'controller', { get: () => null })
    })
    await page.goto('/')
    await expectWorkingApp(page)
    expect(await page.evaluate(() => window.__KURIO_MOCK__?.transport)).toBe('in-page')
  })

  test('aba normal continua usando o Service Worker', async ({ page, mock }) => {
    await page.goto('/')
    await mock.ready()
    expect(await page.evaluate(() => window.__KURIO_MOCK__?.transport)).toBe('service-worker')
  })
})
