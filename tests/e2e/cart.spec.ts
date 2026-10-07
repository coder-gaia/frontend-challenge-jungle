import { addToCart, expect, login, test, visible } from '../fixtures'

test.describe('Carrinho', () => {
  test('quantidades, remoção com desfazer, cupom e totais da API', async ({ page }) => {
    await addToCart(page, 'emerald-ape-042', 2)
    await addToCart(page, 'golden-signal-160')
    const total = visible(page.getByTestId('summary-total'))
    // 2 × 1.19 + 0.39 + taxa 0.016
    await expect(total).toHaveText('2.786 ETH')

    // Aumentar quantidade
    await visible(page.getByRole('button', { name: 'Aumentar quantidade de Golden Signal #160' })).click()
    await expect(total).toHaveText('3.176 ETH')

    // Cupom inválido, expirado e válido
    const coupon = visible(page.getByTestId('coupon-input'))
    await coupon.fill('NAOEXISTE')
    await visible(page.getByRole('button', { name: 'Aplicar' })).click()
    await expect(visible(page.getByTestId('coupon-error'))).toHaveText('Cupom inválido.')
    await coupon.fill('VERAO2025')
    await visible(page.getByRole('button', { name: 'Aplicar' })).click()
    await expect(visible(page.getByTestId('coupon-error'))).toHaveText('Este cupom expirou.')
    await coupon.fill('kurio10')
    await visible(page.getByRole('button', { name: 'Aplicar' })).click()
    await expect(visible(page.getByTestId('applied-coupon'))).toContainText('KURIO10')
    // subtotal 3.16 − 10% (0.316) + 0.016
    await expect(total).toHaveText('2.86 ETH')
    await expect(visible(page.getByTestId('summary-discount'))).toHaveText('(-) 0.316 ETH')

    // Remover e desfazer
    await visible(page.getByRole('button', { name: 'Remover Golden Signal #160 do carrinho' })).click()
    await expect(page.getByTestId('cart-line').locator('visible=true')).toHaveCount(1)
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.getByTestId('cart-line').locator('visible=true')).toHaveCount(2)

    // Persistência após refresh
    await page.reload()
    await expect(page.getByTestId('cart-line').locator('visible=true')).toHaveCount(2)
    await expect(visible(page.getByTestId('applied-coupon'))).toBeVisible()
  })

  test('carrinho de visitante é preservado ao entrar na conta', async ({ page }) => {
    await addToCart(page, 'ivory-baron-088', 3)
    await page.reload()
    await expect(page.getByTestId('cart-line').locator('visible=true')).toHaveCount(1)
    await visible(page.getByTestId('checkout-button')).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('bruno@kurio.dev')
    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill('Kurio@2026')
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL('/pagamento')
    await page.goto('/carrinho')
    await expect(page.getByTestId('cart-line').locator('visible=true')).toHaveCount(1)
    await expect(visible(page.getByTestId('quantity-value'))).toHaveText('3')
  })

  test('alteração de preço em tempo real atualiza o resumo e exige ciência', async ({ page, mock }) => {
    await login(page, 'ana')
    await addToCart(page, 'emerald-ape-042')
    const total = visible(page.getByTestId('summary-total'))
    await expect(total).toHaveText('1.206 ETH')
    await mock.changePrice('emerald-ape-042', 10)
    await expect(page.getByTestId('cart-issues')).toContainText('O preço de um item mudou')
    await expect(total).toHaveText('1.326 ETH')
    await page.getByTestId('acknowledge-prices').click()
    await expect(page.getByTestId('cart-issues')).toHaveCount(0)
  })

  test('esgotamento em tempo real bloqueia a finalização', async ({ page, mock }) => {
    await addToCart(page, 'violet-nomad-314', 2)
    await mock.setAvailability('violet-nomad-314', 1, 'violet-nomad-314--1-50')
    await expect(page.getByTestId('cart-issues')).toContainText('Disponibilidade alterada')
    await expect(visible(page.getByTestId('checkout-button'))).toBeDisabled()
    await visible(page.getByRole('button', { name: 'Ajustar para 1' })).click()
    await expect(visible(page.getByTestId('checkout-button'))).toBeEnabled()
  })
})
