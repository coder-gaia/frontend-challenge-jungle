import { addToCart, expect, login, test, visible, waitForImages } from '../fixtures'

/**
 * Regressão visual com dados estáveis (seed fixa, latência zero, animações desligadas).
 * Baselines versionadas em tests/__screenshots__ (por projeto e plataforma).
 */
test.describe('Regressão visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('início', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('catalog-grid')).toBeVisible()
    await expect(page.getByTestId('realtime-status').first()).toHaveAttribute('data-status', 'connected')
    await waitForImages(page)
    await expect(page).toHaveScreenshot('home.png', { fullPage: false })
  })

  test('detalhe do NFT', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await expect(visible(page.getByTestId('detail-price'))).toBeVisible()
    await waitForImages(page)
    await expect(page).toHaveScreenshot('nft-detail.png', { fullPage: false })
  })

  test('carrinho', async ({ page }) => {
    await addToCart(page, 'emerald-ape-042', 2)
    await addToCart(page, 'violet-nomad-314')
    await page.mouse.move(0, 0)
    await expect(visible(page.getByTestId('summary-total'))).toHaveText('3.786 ETH')
    await waitForImages(page)
    await expect(page).toHaveScreenshot('cart.png', { fullPage: false })
  })

  test('pagamento', async ({ page }) => {
    await login(page, 'ana')
    await addToCart(page, 'emerald-ape-042', 2)
    await page.goto('/pagamento')
    await expect(visible(page.getByTestId('summary-total'))).toHaveText('2.396 ETH')
    await waitForImages(page)
    await expect(page).toHaveScreenshot('checkout.png', { fullPage: false })
  })
})
