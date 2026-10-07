import { expect, login, test, toastWith } from '../fixtures'

test.describe('Perfil, avatar, senha e carteiras', () => {
  test('edita perfil com validação e erro do servidor; alterações persistem', async ({ page }) => {
    await login(page, 'ana', '/conta/perfil')
    const email = page.getByRole('textbox', { name: 'E-mail', exact: true })
    const username = page.getByRole('textbox', { name: 'Nome de usuário' })

    await email.fill('ana@kurio')
    await page.getByTestId('profile-save').click()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Informe um e-mail válido')).toBeVisible()

    await email.fill('ana@kurio.dev')
    await username.fill('brunolima')
    await page.getByTestId('profile-save').click()
    await expect(page.getByText('Este nome de usuário já está em uso')).toBeVisible()

    await username.fill('ana.souza')
    await page.getByRole('textbox', { name: 'Nome de exibição' }).fill('Ana S.')
    await page.getByTestId('profile-save').click()
    await expect(toastWith(page, 'Dados do perfil salvos')).toBeVisible()
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue('Ana S.')
    await expect(page.getByRole('textbox', { name: 'Nome de usuário' })).toHaveValue('ana.souza')
  })

  test('avatar é redimensionado e enviado; remoção funciona', async ({ page }) => {
    await login(page, 'ana', '/conta/perfil')
    await page.getByTestId('avatar-input').setInputFiles('public/nfts/golden-beat-640.webp')
    await expect(page.getByRole('img', { name: 'Seu avatar atual' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('img', { name: 'Seu avatar atual' })).toBeVisible()
    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(page.getByRole('img', { name: 'Seu avatar atual' })).toHaveCount(0)
  })

  test('troca de senha valida a senha atual e passa a valer no login', async ({ page }) => {
    await login(page, 'ana', '/conta/perfil')
    await page.getByLabel('Nova senha', { exact: true }).fill('curta')
    await page.getByTestId('profile-save').click()
    await expect(page.getByText('Informe a senha atual')).toBeVisible()
    await expect(page.getByText('A senha precisa de pelo menos 8 caracteres')).toBeVisible()

    await page.getByLabel('Senha atual').fill('errada000')
    await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha2026')
    await page.getByLabel('Confirmar nova senha').fill('NovaSenha2026')
    await page.getByTestId('profile-save').click()
    await expect(page.getByText('Senha atual incorreta')).toBeVisible()

    await page.getByLabel('Senha atual').fill('Kurio@2026')
    await page.getByTestId('profile-save').click()
    await expect(toastWith(page, 'Senha alterada')).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).click()
    await page.goto('/entrar')
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('ana@kurio.dev')
    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill('NovaSenha2026')
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL('/')
  })

  test('carteiras principal e secundária com erros de validação e conflito', async ({ page }) => {
    await login(page, 'bruno', '/conta/carteiras')
    const primary = page.getByTestId('wallet-form-primary')
    await primary.getByRole('textbox', { name: 'Endereço da carteira' }).fill('0x123')
    await page.getByTestId('wallet-save-primary').click()
    await expect(
      primary.getByText('Endereço inválido: use 0x seguido de 40 caracteres hexadecimais'),
    ).toBeVisible()
    await primary
      .getByRole('textbox', { name: 'Endereço da carteira' })
      .fill('0x3b7C9e2A1d0F4e5B6a7C8d9E0f1A2b3C4d5E6f7A')
    await primary.getByRole('textbox', { name: 'Apelido da carteira' }).fill('Cofre')
    await page.getByTestId('wallet-save-primary').click()
    await expect(toastWith(page, 'Carteira principal salva')).toBeVisible()

    // Secundária: copia os dados da principal; endereço repetido gera conflito
    await page.getByRole('checkbox', { name: 'Igual à carteira principal' }).check()
    const secondary = page.getByTestId('wallet-form-secondary')
    await expect(secondary.getByRole('textbox', { name: 'Nome do perfil' })).toHaveValue('brunolima')
    await secondary
      .getByRole('textbox', { name: 'Endereço da carteira' })
      .fill('0x3b7C9e2A1d0F4e5B6a7C8d9E0f1A2b3C4d5E6f7A')
    await page.getByTestId('wallet-save-secondary').click()
    await expect(secondary.getByText('Endereço já cadastrado em outra carteira')).toBeVisible()
    await secondary
      .getByRole('textbox', { name: 'Endereço da carteira' })
      .fill('0x9999999999999999999999999999999999999999')
    await page.getByTestId('wallet-save-secondary').click()
    await expect(toastWith(page, 'Carteira secundária salva')).toBeVisible()

    await page.reload()
    await expect(
      page.getByTestId('wallet-form-secondary').getByRole('textbox', { name: 'Endereço da carteira' }),
    ).toHaveValue('0x9999999999999999999999999999999999999999')
    await expect(
      page.getByTestId('wallet-form-primary').getByRole('textbox', { name: 'Apelido da carteira' }),
    ).toHaveValue('Cofre')
  })
})
