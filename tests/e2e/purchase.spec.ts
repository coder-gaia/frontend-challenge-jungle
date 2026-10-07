import { expect, login, test, visible } from '../fixtures'
import { listOrders, openReview } from './checkout-helpers'

test.describe('Compra completa', () => {
  test('do catálogo ao recibo confirmado, com snapshot imutável', async ({ page, mock }) => {
    // Fluxo longo (login → catálogo → checkout → recibo → explorador → carrinho).
    test.slow()
    await login(page, 'ana')
    await page.goto('/')
    await page
      .getByTestId('catalog-grid')
      .getByRole('link', { name: 'Golden Beat #207', exact: true })
      .click()
    await expect(page).toHaveURL('/nft/golden-beat-207')
    await visible(page.getByTestId('buy-button')).click()
    await expect(page).toHaveURL('/carrinho')
    await visible(page.getByTestId('checkout-button')).click()

    const dialog = await openReview(page)
    await expect(dialog.getByTestId('summary-total')).toHaveText('1.006 ETH')
    await dialog.getByTestId('confirm-order').click()

    await expect(page).toHaveURL(/\/pedido\/ord_/)
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('receipt-total')).toHaveText('1.006 ETH')
    await expect(page.getByText('Golden Beat #207')).toBeVisible()

    // Mudanças posteriores no catálogo não alteram o recibo
    await mock.changePrice('golden-beat-207', 50)
    await page.reload()
    await expect(page.getByTestId('receipt-total')).toHaveText('1.006 ETH')

    // Explorador simulado
    await page.getByRole('link', { name: 'Ver no Etherscan' }).click()
    await expect(page.getByRole('heading', { name: 'Detalhes da transação' })).toBeVisible()
    await expect(page.getByText('Sucesso')).toBeVisible()

    // Itens comprados saem do carrinho
    await page.goto('/carrinho')
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    expect(await listOrders(page)).toHaveLength(1)
  })

  test('confirmação é exibida somente após o pedido ser confirmado (relógio controlado)', async ({
    page,
    mock,
  }) => {
    await page.clock.install()
    await login(page, 'ana')
    await mock.configure({ payment: { outcome: 'approve', delayMs: 30_000 } })
    await page.goto('/nft/golden-signal-160')
    await visible(page.getByTestId('buy-button')).click()
    await visible(page.getByTestId('checkout-button')).click()
    const dialog = await openReview(page)
    await dialog.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    await expect(page.getByTestId('order-confirmed')).toHaveCount(0)
    // Avança o relógio da página até a simulação resolver o pagamento
    await page.clock.fastForward(31_000)
    await expect(page.getByTestId('order-confirmed')).toBeVisible()
  })
})
