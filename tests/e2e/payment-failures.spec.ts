import { addToCart, expect, login, test, visible } from '../fixtures'
import { listOrders, openReview } from './checkout-helpers'

test.describe('Falhas de pagamento e idempotência', () => {
  test('pagamento recusado preserva os itens do carrinho', async ({ page, mock }) => {
    await login(page, 'ana')
    await mock.setScenario('payment-declined')
    await addToCart(page, 'emerald-ape-042', 2)
    await visible(page.getByTestId('checkout-button')).click()
    const dialog = await openReview(page)
    await dialog.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-declined')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page.getByTestId('cart-line').locator('visible=true')).toHaveCount(1)
    await expect(visible(page.getByTestId('quantity-value'))).toHaveText('2')
  })

  test('cliques repetidos não duplicam o pedido', async ({ page }) => {
    await login(page, 'ana')
    await addToCart(page, 'golden-signal-160')
    await visible(page.getByTestId('checkout-button')).click()
    const dialog = await openReview(page)
    // Duplo clique: a trava do cliente e a idempotência do servidor garantem um único pedido
    await dialog.getByTestId('confirm-order').dblclick()
    await expect(page).toHaveURL(/\/pedido\//)
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
    expect(await listOrders(page)).toHaveLength(1)
  })

  test('timeout após a criação recupera o mesmo pedido pela chave de idempotência', async ({
    page,
    mock,
  }) => {
    test.slow()
    await login(page, 'ana')
    await mock.setScenario('order-timeout')
    await addToCart(page, 'golden-signal-160')
    await visible(page.getByTestId('checkout-button')).click()
    const dialog = await openReview(page)
    const attempts: Array<{ key: string; status?: number; replayed?: string }> = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/orders'))
        attempts.push({ key: request.headers()['idempotency-key'] ?? '' })
    })
    page.on('response', (response) => {
      if (response.request().method() === 'POST' && response.url().endsWith('/api/orders')) {
        const attempt = attempts.findLast((a) => a.key === response.request().headers()['idempotency-key'])
        if (attempt)
          Object.assign(attempt, {
            status: response.status(),
            replayed: response.headers()['idempotent-replayed'],
          })
      }
    })
    await dialog.getByTestId('confirm-order').click()
    // O cliente estoura o timeout (8 s) e repete a requisição com a mesma chave
    await expect(dialog.getByTestId('order-retrying')).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/pedido\//, { timeout: 20_000 })
    expect(attempts.length).toBeGreaterThanOrEqual(2)
    expect(new Set(attempts.map((a) => a.key)).size).toBe(1)
    expect(attempts.at(-1)).toMatchObject({ status: 200, replayed: 'true' })
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
    const orders = await listOrders(page)
    expect(orders).toHaveLength(1)
    expect(page.url()).toContain(orders[0]!.id)
  })

  test('carteira que recusa a conexão impede o envio', async ({ page, mock }) => {
    await login(page, 'ana')
    await mock.setScenario('wallet-rejected')
    await addToCart(page, 'golden-signal-160')
    await visible(page.getByTestId('checkout-button')).click()
    await page.waitForURL('**/pagamento')
    await visible(page.getByTestId('connect-wallet')).click()
    await expect(page.getByTestId('wallet-connection')).toContainText('A conexão foi recusada na carteira')
    await visible(page.getByRole('button', { name: 'Confirmar compra' })).click()
    await expect(page.getByTestId('review-dialog')).toHaveCount(0)
    await expect(page.getByTestId('wallet-connection')).toContainText('Conecte a carteira')
  })
})
