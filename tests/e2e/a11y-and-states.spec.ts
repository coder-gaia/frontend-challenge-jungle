import { addToCart, expect, test, visible } from '../fixtures'

test.describe('Acessibilidade: teclado, foco e formulários', () => {
  test.skip(({ isMobile }) => isMobile, 'Navegação por teclado validada no desktop')

  test('skip link e navegação por teclado até o detalhe', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('catalog-grid')).toBeVisible()
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()

    // Foco visível nos cards: o link do nome é alcançável e abre o detalhe
    const firstCard = page.getByTestId('catalog-grid').getByRole('link').first()
    await firstCard.focus()
    await expect(firstCard).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/nft\//)
  })

  test('diálogo de zoom prende o foco e devolve ao fechar', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    const zoom = visible(page.getByRole('button', { name: 'Ampliar imagem de Emerald Ape #042' }))
    await zoom.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(zoom).toBeFocused()
  })

  test('busca rápida abre com Ctrl+K e navega pelo teclado', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('catalog-grid')).toBeVisible()
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder('Buscar por nome, coleção ou criador…')
    await expect(input).toBeFocused()
    await input.fill('ivory')
    await expect(page.getByRole('option', { name: /Ivory Baron #088/ })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/nft/ivory-baron-088')
  })

  test('modal de login com foco inicial, erros associados e Esc para fechar', async ({ page }) => {
    await page.goto('/entrar')
    const email = page.getByRole('textbox', { name: 'E-mail', exact: true })
    await expect(email).toBeFocused()
    await page.getByTestId('login-submit').click()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText('Informe um e-mail válido')
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL('/')
  })

  test('mutations e tempo real são anunciados na região viva', async ({ page, mock }) => {
    await addToCart(page, 'emerald-ape-042')
    await mock.changePrice('emerald-ape-042', 10)
    await expect(page.getByTestId('live-region')).toContainText('O preço de Emerald Ape #042 mudou')
  })
})

test.describe('Estados de carregamento, falha e recuperação', () => {
  test('skeletons com shimmer durante rede lenta', async ({ page, mock }) => {
    await page.goto('/carrinho')
    await mock.setScenario('slow-network')
    await page.goto('/')
    await expect(page.getByTestId('catalog-skeleton')).toBeVisible()
    await expect(page.getByTestId('catalog-grid')).toBeVisible({ timeout: 10_000 })

    await page.goto('/nft/sage-nomad-009')
    await expect(page.getByTestId('detail-skeleton')).toBeVisible()
    await expect(visible(page.getByTestId('detail-price'))).toBeVisible({ timeout: 10_000 })
  })

  test('resumo do carrinho mostra skeleton enquanto a cotação carrega', async ({ page, mock }) => {
    await addToCart(page, 'golden-signal-160')
    await mock.setScenario('slow-network')
    await page.reload()
    await expect(
      visible(page.getByTestId('cart-skeleton').or(page.getByTestId('summary-skeleton'))),
    ).toBeVisible()
    await expect(visible(page.getByTestId('summary-total'))).toBeVisible({ timeout: 10_000 })
  })

  test('falha 5xx esgota os retries, mostra erro e recupera na nova tentativa', async ({ page, mock }) => {
    await page.goto('/carrinho')
    await mock.setScenario('server-errors')
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Não foi possível carregar o catálogo' })).toBeVisible({
      timeout: 20_000,
    })
    await page.getByTestId('retry').click()
    await expect(page.getByTestId('catalog-grid')).toBeVisible({ timeout: 10_000 })
  })

  test('sem conexão: feedback de erro e recuperação quando a rede volta', async ({ page, mock }) => {
    await page.goto('/carrinho')
    await mock.setScenario('offline')
    await page.goto('/nft/ivory-baron-088')
    await expect(page.getByRole('heading', { name: 'Não foi possível carregar este NFT' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText('Não foi possível conectar')).toBeVisible()
    await mock.setScenario('default')
    await page.getByTestId('retry').click()
    await expect(visible(page.getByTestId('detail-price'))).toHaveText('1.79 ETH')
  })
})
