import { expect, login, test, toastWith, visible } from '../fixtures'

test.describe('Favoritos', () => {
  test('visitante é levado ao login ao favoritar', async ({ page }) => {
    await page.goto('/nft/cosmic-bloom-118')
    await visible(page.getByTestId('detail-favorite')).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=/)
  })

  test('favoritar persiste após refresh (atualização otimista confirmada)', async ({ page }) => {
    await login(page, 'ana')
    await page.goto('/nft/cosmic-bloom-118')
    const toggle = visible(page.getByTestId('detail-favorite'))
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(visible(page.getByTestId('detail-favorite'))).toHaveAttribute('aria-pressed', 'true')
    await page.goto('/conta/favoritos')
    await expect(
      page.getByTestId('favorites-grid').getByRole('heading', { name: 'Cosmic Bloom #118' }),
    ).toBeVisible()
  })

  test('falha na mutation reverte o estado e informa o erro', async ({ page, mock }) => {
    await login(page, 'ana')
    await mock.setScenario('favorites-failure')
    await page.goto('/nft/cosmic-bloom-118')
    const toggle = visible(page.getByTestId('detail-favorite'))
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await toggle.click()
    await expect(toastWith(page, 'Não foi possível favoritar')).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')

    // Recuperação: com o serviço de volta, a ação funciona
    await mock.setScenario('default')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })
})
