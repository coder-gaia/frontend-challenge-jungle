import { addToCart, expect, login, test } from '../fixtures'

const WIDTHS = [390, 768, 1440]

/** Nenhuma tela principal pode ter rolagem horizontal indevida nas larguras avaliadas. */
test.describe('Responsividade sem overflow horizontal', () => {
  test.skip(({ isMobile }) => isMobile, 'As larguras são controladas pelo próprio teste')

  for (const width of WIDTHS) {
    test(`telas principais em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const pages = ['/', '/nft/emerald-ape-042', '/entrar', '/em-breve/criadores', '/rota-inexistente']
      for (const path of pages) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, `overflow horizontal em ${path} (${width}px)`).toBeLessThanOrEqual(0)
      }

      await login(page, 'ana', '/conta/perfil')
      await addToCart(page, 'emerald-ape-042', 2)
      for (const path of [
        '/carrinho',
        '/pagamento',
        '/conta/perfil',
        '/conta/carteiras',
        '/conta/favoritos',
      ]) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, `overflow horizontal em ${path} (${width}px)`).toBeLessThanOrEqual(0)
      }
    })
  }
})
