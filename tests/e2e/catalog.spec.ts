import { expect, test, visible } from '../fixtures'

test.describe('Catálogo: busca, filtros, ordenação e paginação', () => {
  test('combina filtros na URL, reinicia a paginação e restaura pelo histórico', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/')
    const summary = page.getByTestId('results-summary')
    await expect(summary).toHaveText('Mostrando 1–9 de 60 NFTs')

    // Paginação
    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(summary).toHaveText('Mostrando 10–18 de 60 NFTs')

    // Filtros combinados (no mobile ficam na gaveta)
    if (isMobile) await page.getByTestId('open-filters').click()
    await visible(page.locator('label').filter({ hasText: 'Música' })).click()
    await expect(page).not.toHaveURL(/page=2/) // mudança de filtro reinicia a paginação
    await visible(page.locator('label').filter({ hasText: 'Ethereum' })).click()
    await expect(page).toHaveURL(/category=.*music.*network=.*ethereum/)
    if (isMobile) await page.getByRole('button', { name: /Ver \d+ resultado/ }).click()
    await expect(summary).toContainText('de 4 NFTs')

    // Ordenação
    if (isMobile) await page.getByTestId('open-filters').click()
    await visible(page.getByTestId('sort-select')).click()
    await page.getByRole('option', { name: 'Maior preço' }).click()
    if (isMobile) await page.getByRole('button', { name: /Ver \d+ resultado/ }).click()
    await expect(page).toHaveURL(/sort=price-desc/)
    const prices = await page.getByTestId('catalog-grid').getByTestId('nft-price').allTextContents()
    const values = prices.map((p) => Number.parseFloat(p))
    expect(values).toEqual([...values].sort((a, b) => b - a))

    // Histórico: voltar desfaz a ordenação e o filtro de rede
    await page.goBack()
    await expect(page).not.toHaveURL(/sort=/)
    await page.goBack()
    await expect(page).toHaveURL(/category=/)
    await expect(page).not.toHaveURL(/network=/)
    await expect(summary).toContainText('de 11 NFTs')

    // Refresh mantém o estado
    await page.reload()
    await expect(summary).toContainText('de 11 NFTs')
  })

  test('busca por texto reflete na URL e na API, com estado vazio e limpar filtros', async ({ page }) => {
    await page.goto('/')
    const input = visible(page.getByTestId('catalog-search'))
    await input.fill('emerald')
    await expect(page).toHaveURL(/q=emerald/)
    await expect(page.getByTestId('results-summary')).toContainText('para “emerald”')
    await expect(page.getByTestId('catalog-grid')).toHaveAttribute('aria-busy', 'false')
    const names = await page.getByTestId('catalog-grid').getByRole('heading').allTextContents()
    expect(names.length).toBeGreaterThan(0)
    expect(names.every((name) => name.toLowerCase().includes('emerald'))).toBe(true)

    await input.fill('nada-existe-aqui')
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page.getByTestId('results-summary')).toHaveText('Mostrando 1–9 de 60 NFTs')
  })

  test('respostas fora de ordem não sobrescrevem a consulta atual', async ({ page, mock }) => {
    await page.goto('/')
    await expect(page.getByTestId('results-summary')).toBeVisible()
    await mock.configure({ latency: 'chaotic' })
    // Abas trocadas rapidamente: cada uma dispara uma consulta com latência variável (seed fixa).
    const tab = (name: string) => page.getByRole('button', { name, exact: true })
    await tab('Em alta').click()
    await tab('Novos lançamentos').click()
    await tab('Todos os NFTs').click()
    await tab('Novos lançamentos').click()
    await expect(page).toHaveURL(/tab=new/)
    await expect(page.getByTestId('catalog-grid')).toHaveAttribute('aria-busy', 'false', { timeout: 10_000 })
    // O resultado exibido é o da última consulta (Novos lançamentos), não de uma resposta atrasada.
    await mock.configure({ latency: 'instant' })
    const expected = await page.evaluate(async () => {
      const response = await fetch('/api/nfts?tab=new&page=1&pageSize=9')
      return ((await response.json()) as { total: number }).total
    })
    await expect(page.getByTestId('results-summary')).toContainText(`de ${expected} NFTs`)
  })

  test('cenário de catálogo vazio mostra estado vazio', async ({ page, mock }) => {
    await page.goto('/')
    await mock.setScenario('empty-catalog')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
  })
})
