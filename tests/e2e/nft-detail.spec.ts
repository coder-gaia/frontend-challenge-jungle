import { expect, test, visible } from '../fixtures'

test.describe('Detalhe do NFT', () => {
  test('acesso direto mostra galeria, edição e informações', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await expect(page).toHaveTitle('Emerald Ape #042 · KURIO')
    await expect(visible(page.getByRole('heading', { name: 'Emerald Ape #042', level: 1 }))).toBeVisible()
    await expect(visible(page.getByTestId('detail-price'))).toHaveText('1.19 ETH')
    await expect(visible(page.getByRole('radio', { name: '1/50' }))).toBeChecked()
    // Trocar de edição atualiza a URL e o preço
    await visible(page.getByText('1/10', { exact: true })).click()
    await expect(page).toHaveURL(/edicao=1-10/)
    await expect(visible(page.getByTestId('detail-price'))).toHaveText('1.90 ETH')
  })

  test('NFT inexistente exibe 404', async ({ page }) => {
    await page.goto('/nft/nao-existe-123')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao início' }).click()
    await expect(page).toHaveURL('/')
  })

  test('rota inexistente exibe a página 404 global', async ({ page }) => {
    await page.goto('/rota/que/nao/existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })

  test('edição indisponível e limite de quantidade', async ({ page, mock }) => {
    await page.goto('/nft/emerald-ape-042?edicao=1-10')
    await expect(visible(page.getByTestId('detail-price'))).toHaveText('1.90 ETH')
    // Esgota a edição pelo servidor simulado (a mudança chega via Socket.IO)
    await mock.setAvailability('emerald-ape-042', 0, 'emerald-ape-042--1-10')
    await expect(visible(page.getByTestId('edition-unavailable'))).toBeVisible()
    await expect(visible(page.getByTestId('buy-button'))).toBeDisabled()

    // Limite por pedido: a edição 1/50 permite no máximo 10 unidades
    await page.goto('/nft/emerald-ape-042?edicao=1-50')
    const plus = visible(page.getByRole('button', { name: /Aumentar quantidade/ }))
    for (let i = 0; i < 12; i++) if (await plus.isEnabled()) await plus.click()
    await expect(visible(page.getByTestId('quantity-value'))).toHaveText('10')
    await expect(plus).toBeDisabled()
    await expect(visible(page.getByTestId('limit-hint'))).toContainText('Máx. 10 por pedido')
  })
})
