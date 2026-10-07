import type { Page } from '@playwright/test'
import { expect, visible } from '../fixtures'

/** Conecta a carteira selecionada e abre a revisão do pedido. */
export async function openReview(page: Page) {
  await page.waitForURL('**/pagamento')
  await expect(visible(page.getByTestId('summary-total'))).toBeVisible()
  await visible(page.getByTestId('connect-wallet')).click()
  await expect(page.getByTestId('wallet-connection')).toContainText('Conectada')
  await visible(page.getByRole('button', { name: 'Confirmar compra' })).click()
  const dialog = page.getByTestId('review-dialog')
  await expect(dialog.getByTestId('confirm-order')).toBeEnabled()
  return dialog
}

/** Lista os pedidos do usuário atual pela API (passando pelos handlers MSW). */
export async function listOrders(page: Page) {
  return page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem('kurio:session') ?? 'null') as { token: string } | null
    const response = await fetch('/api/orders', { headers: { Authorization: `Bearer ${session?.token}` } })
    return ((await response.json()) as { items: Array<{ id: string; status: string }> }).items
  })
}
