# Auditoria Lighthouse — deploy (vercel)

Medianas de 3 medições por página e perfil, no deploy https://kurio-sage.vercel.app (gerado por `npm run lighthouse:deploy`).

| Página | Perfil | Performance (meta 90) | Acessibilidade (meta 95) | Boas práticas (meta 95) | SEO (meta 90) | FCP | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início (`/`) | mobile | 86 ⚠️ | 100 ✅ | 100 ✅ | 100 ✅ | 2.57 s | 2.99 s | 0.000 | 228 ms |
| Início (`/`) | desktop | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.55 s | 0.64 s | 0.000 | 1 ms |
| Detalhe (`/nft/emerald-ape-042`) | mobile | 92 ✅ | 97 ✅ | 100 ✅ | 100 ✅ | 2.51 s | 2.81 s | 0.000 | 100 ms |
| Detalhe (`/nft/emerald-ape-042`) | desktop | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.52 s | 0.60 s | 0.000 | 0 ms |

## Metas não atingidas

- Performance · Início (mobile): 86 (meta 90)

Por que a performance mobile fica abaixo de 90 aqui (análise completa em
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

CLS é 0 em todas as páginas. Para ganhar margem no mobile, o próximo passo é SSR ou prerender da
página inicial (TanStack Start), com o cache do Query desidratado no HTML.

## Ambiente e condições

- Data: 2026-10-07T18:39:02.275Z
- Lighthouse 13.5.0 · Chrome/155.0.8059.39 · Node v22.13.0
- Sistema: Windows_NT 10.0.26300 (x64) · CPU: AMD Ryzen 7 5700U with Radeon Graphics × 16 · 18 GB RAM
- Deploy em https://kurio-sage.vercel.app (servido pela hospedagem), mocks MSW no cenário padrão, perfil Chrome limpo a cada medição (service worker registrado do zero).
- Mobile: Padrão do Lighthouse: Moto G Power emulado, throttling simulado (RTT 150 ms, 1,6 Mbps, CPU 4x)
- Desktop: Preset desktop do Lighthouse: 1350×940, throttling simulado (RTT 40 ms, 10 Mbps, CPU 1x)

Relatórios: `lighthouse/reports-vercel/*-mediana.report.html` (medição representativa) e
`lighthouse/reports-vercel/*-run<N>.report.json` (todas as medições).
