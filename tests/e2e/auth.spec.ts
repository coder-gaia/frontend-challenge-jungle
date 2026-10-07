import { ACCOUNTS, addToCart, expect, login, test, visible } from '../fixtures'

test.describe('Conta e sessão', () => {
  test('cadastro com validação, conflito e criação da conta', async ({ page }) => {
    await page.goto('/cadastro')
    await page.getByTestId('register-submit').click()
    await expect(page.getByTestId('field-error').first()).toBeVisible()

    await page.getByRole('textbox', { name: 'Nome de usuário' }).fill('anasouza')
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(ACCOUNTS.ana.email)
    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill('Senha1234')
    await page.getByRole('textbox', { name: 'Confirmar senha' }).fill('Senha9999')
    await page.getByTestId('register-submit').click()
    await expect(page.getByText('As senhas não conferem')).toBeVisible()

    await page.getByRole('textbox', { name: 'Confirmar senha' }).fill('Senha1234')
    await page.getByTestId('register-submit').click()
    // Conflito vindo da API, associado aos campos
    await expect(page.getByText('Este e-mail já está cadastrado')).toBeVisible()
    await expect(page.getByText('Este nome de usuário já está em uso')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByRole('textbox', { name: 'Nome de usuário' }).fill('nova.colecionadora')
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('nova@kurio.dev')
    await page.getByTestId('register-submit').click()
    await expect(page).toHaveURL('/')
    await page.reload()
    await expect(
      page.getByTestId('user-menu').or(page.getByRole('link', { name: 'Minha conta' })),
    ).toBeVisible()
  })

  test('login inválido, retorno ao fluxo anterior e sessão após refresh', async ({ page }) => {
    await page.goto('/conta/perfil')
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fconta%2Fperfil/)
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(ACCOUNTS.ana.email)
    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill('senha-errada1')
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('form-alert')).toHaveText('E-mail ou senha incorretos.')

    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill(ACCOUNTS.ana.password)
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL('/conta/perfil')
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue('Ana Souza')
  })

  test('expiração durante a navegação leva ao login e retoma o contexto', async ({ page, mock }) => {
    await login(page, 'ana', '/conta/carteiras')
    await mock.expireSessions()
    // Navegação client-side para uma tela ainda não carregada: a chamada autenticada recebe 401 SESSION_EXPIRED
    await page.getByRole('link', { name: 'Lista de interesse' }).first().click()
    await expect(page).toHaveURL(/\/entrar\?.*reason=expired/)
    await expect(page.getByTestId('session-expired-notice')).toBeVisible()
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(ACCOUNTS.ana.email)
    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill(ACCOUNTS.ana.password)
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL(/\/conta\//)
  })

  test('expiração durante o checkout preserva o rascunho do formulário', async ({ page, mock }) => {
    await login(page, 'ana')
    await addToCart(page, 'golden-signal-160')
    await page.goto('/pagamento')
    const note = page.getByRole('textbox', { name: 'Observação do colecionador (opcional)' })
    await note.fill('Presente para o meu irmão')
    await mock.expireSessions()
    await visible(page.getByTestId('connect-wallet')).click()
    await expect(page).toHaveURL(/\/entrar\?.*redirect=%2Fpagamento.*reason=expired/)
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(ACCOUNTS.ana.email)
    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill(ACCOUNTS.ana.password)
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL('/pagamento')
    await expect(page.getByRole('textbox', { name: 'Observação do colecionador (opcional)' })).toHaveValue(
      'Presente para o meu irmão',
    )
  })

  test('logout e troca de usuário não vazam dados privados', async ({ page }) => {
    await login(page, 'ana')
    await page.goto('/conta/favoritos')
    await expect(
      page.getByTestId('favorites-grid').getByRole('heading', { name: 'Emerald Ape #042' }),
    ).toBeVisible()

    // Logout
    await page.goto('/conta/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL('/')
    await page.goto('/conta/favoritos')
    await expect(page).toHaveURL(/\/entrar/)

    // Outro usuário vê apenas os próprios dados
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(ACCOUNTS.bruno.email)
    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill(ACCOUNTS.bruno.password)
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL('/conta/favoritos')
    const grid = page.getByTestId('favorites-grid')
    await expect(grid.getByRole('heading', { name: 'Sage Nomad #009' })).toBeVisible()
    await expect(grid.getByRole('heading', { name: 'Emerald Ape #042' })).toHaveCount(0)
    await page.goto('/conta/perfil')
    await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue('Bruno Lima')
  })
})
