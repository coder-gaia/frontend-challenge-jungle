import { addToCart, expect, login, test, visible } from '../fixtures'
import { listOrders, openReview } from './checkout-helpers'

test.describe('Tempo real (Socket.IO via MSW)', () => {
  test('preço muda durante o checkout: resumo atualiza e a confirmação exige nova revisão', async ({
    page,
    mock,
  }) => {
    await login(page, 'ana')
    await addToCart(page, 'emerald-ape-042')
    await visible(page.getByTestId('checkout-button')).click()
    const dialog = await openReview(page)
    await expect(dialog.getByTestId('summary-total')).toHaveText('1.206 ETH')

    // O evento chega pelo socket.io-client enquanto o usuário revisa
    await mock.changePrice('emerald-ape-042', 10)
    await expect(dialog.getByTestId('quote-changed')).toBeVisible()
    await expect(dialog.getByTestId('confirm-order')).toHaveCount(0)
    await dialog.getByTestId('accept-changes').click()
    await expect(dialog.getByTestId('summary-total')).toHaveText('1.326 ETH')
    await dialog.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('receipt-total')).toHaveText('1.326 ETH')
  })

  test('cotação desatualizada é recusada pelo servidor (sem o evento) e exige confirmação', async ({
    page,
    mock,
  }) => {
    await login(page, 'ana')
    await addToCart(page, 'emerald-ape-042')
    await visible(page.getByTestId('checkout-button')).click()
    const dialog = await openReview(page)
    // Tempo real fora do ar: o cliente não recebe o evento; o servidor detecta na confirmação
    await mock.configure({ realtime: { available: false, marketPulse: false, pulseIntervalMs: 8000 } })
    await mock.dropRealtime()
    await mock.changePrice('emerald-ape-042', 10)
    await dialog.getByTestId('confirm-order').click()
    await expect(dialog.getByTestId('quote-changed')).toContainText('O preço de Emerald Ape #042 mudou')
    await dialog.getByTestId('accept-changes').click()
    await dialog.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
  })

  test('eventos duplicados ou antigos não regridem o estado', async ({ page, mock }) => {
    await page.goto('/nft/emerald-ape-042')
    const price = visible(page.getByTestId('detail-price'))
    await expect(price).toHaveText('1.19 ETH')
    await mock.changePrice('emerald-ape-042', 10)
    await expect(price).toHaveText('1.31 ETH')
    await mock.replayLastEvent()
    await mock.emitStaleEvent()
    await page.waitForTimeout(500)
    await expect(price).toHaveText('1.31 ETH')

    // O Chaos Lab mostra como o cliente tratou cada evento
    await page.getByTestId('chaos-lab-launcher').click()
    await page.getByRole('tab', { name: 'Tempo real' }).click()
    const log = page.getByTestId('chaos-event-log')
    await expect(log.locator('[data-outcome="applied"]')).toHaveCount(1)
    await expect(log.locator('[data-outcome="duplicate"]')).toHaveCount(1)
    await expect(log.locator('[data-outcome="stale"]')).toHaveCount(1)
  })

  test('desconexão com pedido pendente: reconecta, reconcilia e não duplica a compra', async ({
    page,
    mock,
  }) => {
    // Inclui a janela de recusa do servidor (6 s) e o backoff de reconexão do cliente.
    test.slow()
    await login(page, 'ana')
    await mock.configure({ payment: { outcome: 'approve', delayMs: 4000 } })
    await addToCart(page, 'golden-signal-160')
    await visible(page.getByTestId('checkout-button')).click()
    const dialog = await openReview(page)
    await dialog.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-pending')).toBeVisible()

    // Servidor de tempo real cai: o pedido resolve enquanto o cliente está desconectado
    await mock.dropRealtime(6000)
    await expect(page.getByTestId('realtime-status').first()).toHaveAttribute('data-status', 'reconnecting')
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('realtime-status').first()).toHaveAttribute('data-status', 'connected', {
      timeout: 15_000,
    })
    expect(await listOrders(page)).toHaveLength(1)
  })

  test('refresh durante pedido pendente recupera o estado sem criar outra compra', async ({ page, mock }) => {
    test.slow()
    await login(page, 'ana')
    // O pagamento só é resolvido quando o teste mandar: o pedido segue pendente durante os refreshes.
    await mock.configure({ payment: { outcome: 'approve', delayMs: 10 * 60_000 } })
    await addToCart(page, 'golden-signal-160')
    await visible(page.getByTestId('checkout-button')).click()
    const dialog = await openReview(page)
    await dialog.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    const orderUrl = page.url()

    await page.goto('/')
    await expect(page.getByTestId('pending-order-notice')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('pending-order-notice')).toBeVisible()
    await page.getByTestId('pending-order-notice').getByRole('link', { name: 'Ver pedido' }).click()
    await expect(page).toHaveURL(orderUrl)
    await expect(page.getByTestId('order-pending')).toBeVisible()
    await mock.resolvePendingOrders()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    expect(await listOrders(page)).toHaveLength(1)
  })

  test('evento de pedido de outra sessão não chega ao novo usuário', async ({ page, mock }) => {
    // Checkout, logout e novo login antes da resolução do pagamento.
    test.slow()
    await login(page, 'ana')
    await mock.configure({ payment: { outcome: 'approve', delayMs: 3000 } })
    await addToCart(page, 'golden-signal-160')
    await visible(page.getByTestId('checkout-button')).click()
    const dialog = await openReview(page)
    await dialog.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-pending')).toBeVisible()

    // Troca de usuário antes da resolução
    await page.goto('/conta/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
    await login(page, 'bruno')
    await page.waitForTimeout(4000)
    await expect(page.getByText('Pagamento confirmado!')).toHaveCount(0)
    await expect(page.getByTestId('pending-order-notice')).toHaveCount(0)
    expect(await listOrders(page)).toHaveLength(0)
  })
})
