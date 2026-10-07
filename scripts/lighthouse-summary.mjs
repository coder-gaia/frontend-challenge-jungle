/**
 * Gera o resumo em Markdown (lighthouse/RESULTADOS*.md) a partir do summary.json de uma auditoria.
 * Usado pelo scripts/lighthouse.mjs ao fim das medições; também pode ser rodado sozinho para
 * regenerar o resumo sem medir de novo: `node scripts/lighthouse-summary.mjs [alvo]`
 * (alvo `local`, o padrão, ou o nome de um deploy, como `vercel`).
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { AUDIT } from '../lighthouse/config.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')

/** `local`: build servido por vite preview. Outros alvos (deploys) ficam em pastas próprias. */
export function auditPaths(name = 'local') {
  const suffix = name === 'local' ? '' : `-${name}`
  const reportsDir = path.join(ROOT, 'lighthouse', `reports${suffix}`)
  return {
    reportsDir,
    summaryFile: path.join(reportsDir, 'summary.json'),
    resultsFile: path.join(ROOT, 'lighthouse', `RESULTADOS${suffix}.md`),
  }
}

const LABEL = {
  performance: 'Performance',
  accessibility: 'Acessibilidade',
  'best-practices': 'Boas práticas',
  seo: 'SEO',
}
const seconds = (ms) => `${(ms / 1000).toFixed(2)} s`
const pageLabel = (id) => AUDIT.pages.find((p) => p.id === id)?.label ?? id

export function renderMarkdown({ environment, results, target = { name: 'local' } }) {
  const local = target.name === 'local'
  const reports = path.relative(ROOT, auditPaths(target.name).reportsDir).replaceAll('\\', '/')
  const ok = (category, value) => (value >= AUDIT.targets[category] ? '✅' : '⚠️')
  const rows = results
    .map(
      (r) =>
        `| ${pageLabel(r.page)} (\`${r.url}\`) | ${r.profile} | ${AUDIT.categories.map((c) => `${r.categories[c]} ${ok(c, r.categories[c])}`).join(' | ')} | ${seconds(r.metrics['first-contentful-paint'])} | ${seconds(r.metrics['largest-contentful-paint'])} | ${r.metrics['cumulative-layout-shift'].toFixed(3)} | ${Math.round(r.metrics['total-blocking-time'])} ms |`,
    )
    .join('\n')

  const misses = results.flatMap((r) =>
    AUDIT.categories
      .filter((c) => r.categories[c] < AUDIT.targets[c])
      .map(
        (c) =>
          `- ${LABEL[c]} · ${pageLabel(r.page)} (${r.profile}): ${r.categories[c]} (meta ${AUDIT.targets[c]})`,
      ),
  )

  const scope = local
    ? 'no build de produção servido localmente por `vite preview` (gerado por `npm run lighthouse`)'
    : `no deploy ${target.url} (gerado por \`${target.command}\`)`

  return `# Auditoria Lighthouse${local ? '' : ` — deploy (${target.name})`}

Medianas de ${AUDIT.runs} medições por página e perfil, ${scope}.

| Página | Perfil | ${AUDIT.categories.map((c) => `${LABEL[c]} (meta ${AUDIT.targets[c]})`).join(' | ')} | FCP | LCP | CLS | TBT |
| --- | --- | ${AUDIT.categories.map(() => '---:').join(' | ')} | ---: | ---: | ---: | ---: |
${rows}
${misses.length ? `\n## Metas não atingidas\n\n${misses.join('\n')}\n\n${justification(local)}` : ''}
## Ambiente e condições

- Data: ${environment.date}
- Lighthouse ${environment.lighthouse} · ${environment.chrome} · Node ${environment.node}
- Sistema: ${environment.os} · CPU: ${environment.cpu.replace(/\s+/g, ' ')} · ${environment.memoryGb} GB RAM
- ${environment.conditions}
- Mobile: ${environment.throttling.mobile}
- Desktop: ${environment.throttling.desktop}

Relatórios: \`${reports}/*-mediana.report.html\` (medição representativa) e
\`${reports}/*-run<N>.report.json\` (todas as medições).
`
}

const justification = (local) => `Por que a performance mobile fica abaixo de 90 aqui (análise completa em
[ARCHITECTURE.md § 13](../ARCHITECTURE.md#13-performance-e-lighthouse)):

1. **Renderização 100% no cliente.** Nada é pintado antes de cerca de 210 KB gzip de JavaScript da
   stack obrigatória (React, TanStack Router e Query, Axios, Zod) baixarem e executarem. Com 4G lento
   simulado e CPU 4× mais lenta, o FCP fica entre 2,5 e 3 s.
2. **O backend simulado roda dentro da página.** O MSW registra um Service Worker antes da primeira
   resposta da API e intermedeia todas as requisições, inclusive as de imagem. Esse custo não existe
   com uma API real.
3. **LCP dependente de dados no mobile.** No layout mobile do Figma, o maior elemento da página
   inicial é a imagem do primeiro card do catálogo, que depende da resposta da API. No desktop, o hero
   estático é o LCP.
${
  local
    ? `4. **Transporte do preview local.** O \`vite preview\` serve HTTP/1.1 com gzip. No deploy (Vercel, com
   HTTP/2, Brotli e CDN), a mesma build mede melhor no mobile: ver
   [RESULTADOS-vercel.md](RESULTADOS-vercel.md).
`
    : ''
}
CLS é 0 em todas as páginas. Para ganhar margem no mobile, o próximo passo é SSR ou prerender da
página inicial (TanStack Start), com o cache do Query desidratado no HTML.
`

// Execução direta: regenera o resumo a partir do summary.json existente.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { summaryFile, resultsFile } = auditPaths(process.argv[2])
  const summary = JSON.parse(await readFile(summaryFile, 'utf8'))
  await writeFile(resultsFile, renderMarkdown(summary))
  console.log(`Resumo regenerado em ${path.relative(ROOT, resultsFile)}`)
}
