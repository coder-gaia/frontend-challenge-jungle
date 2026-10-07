import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const CI = Boolean(process.env.CI)
/** `E2E_BASE_URL=https://…` roda a suíte contra um deploy, sem subir o preview local. */
const EXTERNAL_BASE_URL = process.env.E2E_BASE_URL?.replace(/\/$/, '')

/**
 * E2E + regressão visual rodando contra o build de demonstração (mocks MSW ativos).
 * Cada teste usa um contexto novo (localStorage vazio ⇒ banco simulado com a seed conhecida).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // Cada worker roda um Chromium com o app e o backend simulado: com 8 ou mais em paralelo numa
  // máquina já ocupada, fluxos longos (checkout, reconexão) passam a estourar os tempos.
  workers: CI ? 2 : 4,
  timeout: 60_000,
  expect: {
    timeout: 12_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.015, animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}',
  use: {
    baseURL: EXTERNAL_BASE_URL ?? `http://localhost:${PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: EXTERNAL_BASE_URL
    ? undefined
    : {
        command: `npm run build && npm run preview -- --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !CI,
        timeout: 180_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
})
