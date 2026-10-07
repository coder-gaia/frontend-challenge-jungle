/**
 * Auditoria Lighthouse reproduzível (ver lighthouse/config.mjs).
 * Uso: npm run lighthouse          (faz o build e mede o vite preview local)
 *      npm run lighthouse:deploy   (mede o deploy: --url=<endereço> --name=<alvo>)
 *
 * Saída em lighthouse/reports/ (ou lighthouse/reports-<alvo>/ para deploys):
 *  - <pagina>-<perfil>-run<N>.report.json  (todas as medições)
 *  - <pagina>-<perfil>-mediana.report.html (relatório HTML da medição mediana)
 *  - summary.json e lighthouse/RESULTADOS[-<alvo>].md (medianas, métricas, versões e ambiente)
 */
import { spawn } from 'node:child_process'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { AUDIT } from '../lighthouse/config.mjs'
import { auditPaths, renderMarkdown } from './lighthouse-summary.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
// Com --url, mede um deploy e não sobe o preview local.
const REMOTE_URL = arg('url')?.replace(/\/$/, '')
const TARGET = REMOTE_URL ? (arg('name') ?? 'deploy') : 'local'
const BASE = REMOTE_URL ?? `http://localhost:${AUDIT.port}`
const { reportsDir: OUT, summaryFile: SUMMARY_FILE, resultsFile: RESULTS_FILE } = auditPaths(TARGET)

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

const preview = REMOTE_URL
  ? null
  : spawn(
      process.execPath,
      [
        path.join(ROOT, 'node_modules/vite/bin/vite.js'),
        'preview',
        '--port',
        String(AUDIT.port),
        '--strictPort',
      ],
      { cwd: ROOT, stdio: 'ignore' },
    )

/** Resultados já gravados (usados por execuções parciais com LH_ONLY). */
async function previousResults() {
  try {
    return JSON.parse(await readFile(SUMMARY_FILE, 'utf8')).results ?? []
  } catch {
    return []
  }
}

async function removeReports(prefix) {
  const files = await readdir(OUT).catch(() => [])
  await Promise.all(files.filter((f) => f.startsWith(`${prefix}-`)).map((f) => rm(path.join(OUT, f))))
}

try {
  await waitForServer(BASE)
  // Execução completa recomeça do zero; a parcial (LH_ONLY=inicio-mobile,...) preserva as demais.
  const only = process.env.LH_ONLY?.split(',')
  if (!only) await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })
  const previous = only ? await previousResults() : []

  const summary = []
  let chrome = 'desconhecida'
  for (const page of AUDIT.pages) {
    for (const profile of AUDIT.profiles) {
      if (only && !only.includes(`${page.id}-${profile}`)) continue
      await removeReports(`${page.id}-${profile}`)
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
    cpu: `${os.cpus()[0]?.model.trim() ?? 'desconhecida'} × ${os.cpus().length}`,
    memoryGb: Math.round(os.totalmem() / 1024 ** 3),
    conditions: REMOTE_URL
      ? `Deploy em ${REMOTE_URL} (servido pela hospedagem), mocks MSW no cenário padrão, perfil Chrome limpo a cada medição (service worker registrado do zero).`
      : 'Build de produção servido por vite preview (localhost), mocks MSW no cenário padrão, perfil Chrome limpo a cada medição (service worker registrado do zero).',
    throttling: {
      mobile:
        'Padrão do Lighthouse: Moto G Power emulado, throttling simulado (RTT 150 ms, 1,6 Mbps, CPU 4x)',
      desktop: 'Preset desktop do Lighthouse: 1350×940, throttling simulado (RTT 40 ms, 10 Mbps, CPU 1x)',
    },
  }
  const order = AUDIT.pages.flatMap((p) => AUDIT.profiles.map((profile) => `${p.id}-${profile}`))
  const key = (r) => `${r.page}-${r.profile}`
  const results = [...previous.filter((r) => !summary.some((s) => key(s) === key(r))), ...summary].sort(
    (a, b) => order.indexOf(key(a)) - order.indexOf(key(b)),
  )
  const target = REMOTE_URL
    ? {
        name: TARGET,
        url: REMOTE_URL,
        command: process.env.npm_lifecycle_event
          ? `npm run ${process.env.npm_lifecycle_event}`
          : 'node scripts/lighthouse.mjs',
      }
    : { name: 'local' }
  const result = { environment, targets: AUDIT.targets, target, results }
  await writeFile(SUMMARY_FILE, JSON.stringify(result, null, 2))
  await writeFile(RESULTS_FILE, renderMarkdown(result))
  console.log(`\nResumo em ${path.relative(ROOT, RESULTS_FILE)}`)
} finally {
  preview?.kill()
}
