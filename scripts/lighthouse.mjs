/**
 * Auditoria Lighthouse reproduzível (ver lighthouse/config.mjs).
 * Uso: npm run lighthouse   (faz o build e roda as medições)
 *
 * Saída em lighthouse/reports/:
 *  - <pagina>-<perfil>-run<N>.report.json  (todas as medições)
 *  - <pagina>-<perfil>-mediana.report.html (relatório HTML da medição mediana)
 *  - summary.json e lighthouse/RESULTADOS.md (medianas, métricas, versões e ambiente)
 */
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { AUDIT } from '../lighthouse/config.mjs'
import { renderMarkdown, RESULTS_FILE, SUMMARY_FILE } from './lighthouse-summary.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'lighthouse', 'reports')
const BASE = process.env.LH_BASE_URL ?? `http://localhost:${AUDIT.port}`

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      /* ainda subindo */
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error(`Servidor não respondeu em ${url}`)
}

async function runOnce(url, profile) {
  const chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROME_PATH || undefined,
    chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'],
  })
  try {
    const flags = {
      port: chrome.port,
      output: ['json', 'html'],
      logLevel: 'error',
      onlyCategories: AUDIT.categories,
    }
    const result = await lighthouse(url, flags, profile === 'desktop' ? desktopConfig : undefined)
    return {
      lhr: result.lhr,
      json: result.report[0],
      html: result.report[1],
      chromeVersion: await chromeVersion(chrome.port),
    }
  } finally {
    await chrome.kill()
  }
}

async function chromeVersion(port) {
  try {
    const response = await fetch(`http://localhost:${port}/json/version`)
    return (await response.json()).Browser
  } catch {
    return 'desconhecida'
  }
}

const preview = spawn(
  process.execPath,
  [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(AUDIT.port), '--strictPort'],
  {
    cwd: ROOT,
    stdio: 'ignore',
  },
)

try {
  await waitForServer(BASE)
  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })

  const summary = []
  let chrome = 'desconhecida'
  const only = process.env.LH_ONLY?.split(',')
  for (const page of AUDIT.pages) {
    for (const profile of AUDIT.profiles) {
      if (only && !only.includes(`${page.id}-${profile}`)) continue
      const runs = []
      const runCount = Number(process.env.LH_RUNS ?? AUDIT.runs)
      for (let i = 1; i <= runCount; i++) {
        process.stdout.write(`→ ${page.id} (${profile}) medição ${i}/${runCount}… `)
        const result = await runOnce(`${BASE}${page.path}`, profile)
        chrome = result.chromeVersion
        await writeFile(path.join(OUT, `${page.id}-${profile}-run${i}.report.json`), result.json)
        runs.push(result)
        const scores = AUDIT.categories.map((c) => Math.round((result.lhr.categories[c]?.score ?? 0) * 100))
        console.log(scores.join(' / '))
      }

      const categories = Object.fromEntries(
        AUDIT.categories.map((c) => [
          c,
          median(runs.map((r) => Math.round((r.lhr.categories[c]?.score ?? 0) * 100))),
        ]),
      )
      const metrics = Object.fromEntries(
        Object.keys(AUDIT.metrics).map((id) => [
          id,
          median(runs.map((r) => r.lhr.audits[id]?.numericValue ?? 0)),
        ]),
      )
      // Relatório HTML da medição mais próxima da mediana de performance.
      const perfMedian = categories.performance
      const representative = runs.reduce((best, r) =>
        Math.abs(r.lhr.categories.performance.score * 100 - perfMedian) <
        Math.abs(best.lhr.categories.performance.score * 100 - perfMedian)
          ? r
          : best,
      )
      await writeFile(path.join(OUT, `${page.id}-${profile}-mediana.report.html`), representative.html)
      summary.push({
        page: page.id,
        url: page.path,
        profile,
        categories,
        metrics,
        runs: runs.map((r) => ({
          categories: Object.fromEntries(
            AUDIT.categories.map((c) => [c, Math.round((r.lhr.categories[c]?.score ?? 0) * 100)]),
          ),
          lcp: r.lhr.audits['largest-contentful-paint']?.numericValue,
          cls: r.lhr.audits['cumulative-layout-shift']?.numericValue,
          tbt: r.lhr.audits['total-blocking-time']?.numericValue,
        })),
      })
    }
  }

  const pkg = JSON.parse(await readFile(path.join(ROOT, 'node_modules/lighthouse/package.json'), 'utf8'))
  const environment = {
    date: new Date().toISOString(),
    lighthouse: pkg.version,
    chrome,
    node: process.version,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: `${os.cpus()[0]?.model ?? 'desconhecida'} × ${os.cpus().length}`,
    memoryGb: Math.round(os.totalmem() / 1024 ** 3),
    conditions:
      'Build de produção servido por vite preview (localhost), mocks MSW no cenário padrão, perfil Chrome limpo a cada medição (service worker registrado do zero).',
    throttling: {
      mobile:
        'Padrão do Lighthouse: Moto G Power emulado, throttling simulado (RTT 150 ms, 1,6 Mbps, CPU 4x)',
      desktop: 'Preset desktop do Lighthouse: 1350×940, throttling simulado (RTT 40 ms, 10 Mbps, CPU 1x)',
    },
  }
  const result = { environment, targets: AUDIT.targets, results: summary }
  await writeFile(SUMMARY_FILE, JSON.stringify(result, null, 2))
  await writeFile(RESULTS_FILE, renderMarkdown(result))
  console.log('\nResumo em lighthouse/RESULTADOS.md')
} finally {
  preview.kill()
}
