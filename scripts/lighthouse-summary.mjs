/**
 * Gera lighthouse/RESULTADOS.md a partir de lighthouse/reports/summary.json.
 * Usado pelo scripts/lighthouse.mjs ao fim da auditoria; também pode ser rodado sozinho
 * (`node scripts/lighthouse-summary.mjs`) para regenerar o resumo sem medir de novo.
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { AUDIT } from '../lighthouse/config.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
export const SUMMARY_FILE = path.join(ROOT, 'lighthouse', 'reports', 'summary.json')
export const RESULTS_FILE = path.join(ROOT, 'lighthouse', 'RESULTADOS.md')

const LABEL = {
  performance: 'Performance',
  accessibility: 'Acessibilidade',
  'best-practices': 'Boas práticas',
  seo: 'SEO',
}
const seconds = (ms) => `${(ms / 1000).toFixed(2)} s`
const pageLabel = (id) => AUDIT.pages.find((p) => p.id === id)?.label ?? id

export function renderMarkdown({ environment, results }) {
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

  return `# Auditoria Lighthouse

Medianas de ${AUDIT.runs} medições por página e perfil (gerado por \`npm run lighthouse\`).

| Página | Perfil | ${AUDIT.categories.map((c) => `${LABEL[c]} (meta ${AUDIT.targets[c]})`).join(' | ')} | FCP | LCP | CLS | TBT |
| --- | --- | ${AUDIT.categories.map(() => '---:').join(' | ')} | ---: | ---: | ---: | ---: |
${rows}
${misses.length ? `\n## Metas não atingidas\n\n${misses.join('\n')}\n\n${JUSTIFICATION}` : ''}
## Ambiente e condições

- Data: ${environment.date}
- Lighthouse ${environment.lighthouse} · ${environment.chrome} · Node ${environment.node}
- Sistema: ${environment.os} · CPU: ${environment.cpu.replace(/\s+/g, ' ')} · ${environment.memoryGb} GB RAM
- ${environment.conditions}
- Mobile: ${environment.throttling.mobile}
- Desktop: ${environment.throttling.desktop}

Relatórios: \`lighthouse/reports/*-mediana.report.html\` (medição representativa) e
\`lighthouse/reports/*-run<N>.report.json\` (todas as medições).
`
}

const JUSTIFICATION = `Por que a performance mobile fica abaixo de 90 (análise completa em
[ARCHITECTURE.md § 13](../ARCHITECTURE.md#13-performance-e-lighthouse)):

1. **Renderização 100% no cliente.** Nada é pintado antes de cerca de 210 KB gzip de JavaScript da
   stack obrigatória (React, TanStack Router e Query, Axios, Zod) baixarem e executarem. Com 4G lento
   simulado e CPU 4× mais lenta, o FCP fica em torno de 3 s.
2. **O backend simulado roda dentro da página.** O MSW registra um Service Worker antes da primeira
   resposta da API e intermedeia todas as requisições, inclusive as de imagem. Esse custo não existe
   com uma API real.
3. **LCP dependente de dados no mobile.** No layout mobile do Figma, o maior elemento é a imagem do
   primeiro card do catálogo, que depende da resposta da API. No desktop, o hero estático é o LCP e a
   nota é 99.

CLS é 0 e o TBT fica abaixo de 220 ms em todas as páginas. O próximo passo para o mobile é SSR ou
prerender da página inicial (TanStack Start), com o cache do Query desidratado no HTML.
`

// Execução direta: regenera o resumo a partir do summary.json existente.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const summary = JSON.parse(await readFile(SUMMARY_FILE, 'utf8'))
  await writeFile(RESULTS_FILE, renderMarkdown(summary))
  console.log(`Resumo regenerado em ${path.relative(ROOT, RESULTS_FILE)}`)
}
