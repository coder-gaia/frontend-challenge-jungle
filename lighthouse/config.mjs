/**
 * Configuração versionada da auditoria Lighthouse.
 * - Build otimizado (`npm run build`) servido por `vite preview`, com o cenário padrão dos mocks.
 * - Páginas: início e detalhe do NFT; perfis mobile (padrão do Lighthouse: Moto G Power,
 *   throttling simulado de 4G lento + CPU 4x) e desktop (preset oficial `desktop`).
 * - 3 medições por página/perfil; o resumo usa a mediana de cada categoria e métrica.
 */
export const AUDIT = {
  port: 4174,
  runs: 3,
  pages: [
    { id: 'inicio', label: 'Início', path: '/' },
    { id: 'detalhe', label: 'Detalhe', path: '/nft/emerald-ape-042' },
  ],
  profiles: ['mobile', 'desktop'],
  categories: ['performance', 'accessibility', 'best-practices', 'seo'],
  targets: { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 },
  metrics: {
    'largest-contentful-paint': 'LCP',
    'cumulative-layout-shift': 'CLS',
    'total-blocking-time': 'TBT',
    'first-contentful-paint': 'FCP',
    'speed-index': 'Speed Index',
  },
}
