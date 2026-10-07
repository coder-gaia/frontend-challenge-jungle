# Auditoria Lighthouse

Medianas de 3 medições por página e perfil (gerado por `npm run lighthouse`).

| Página | Perfil | Performance (meta 90) | Acessibilidade (meta 95) | Boas práticas (meta 95) | SEO (meta 90) | FCP | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início (`/`) | mobile | 78 ⚠️ | 100 ✅ | 100 ✅ | 100 ✅ | 3.05 s | 3.95 s | 0.000 | 217 ms |
| Início (`/`) | desktop | 99 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.71 s | 0.86 s | 0.000 | 0 ms |
| Detalhe (`/nft/emerald-ape-042`) | mobile | 83 ⚠️ | 97 ✅ | 100 ✅ | 100 ✅ | 2.94 s | 3.55 s | 0.000 | 176 ms |
| Detalhe (`/nft/emerald-ape-042`) | desktop | 99 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.68 s | 0.79 s | 0.000 | 0 ms |

## Metas não atingidas

- Performance · Início (mobile): 78 (meta 90)
- Performance · Detalhe (mobile): 83 (meta 90)

Por que a performance mobile fica abaixo de 90 (análise completa em
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

## Ambiente e condições

- Data: 2026-10-07T15:46:58.725Z
- Lighthouse 13.5.0 · Chrome/155.0.8059.39 · Node v22.13.0
- Sistema: Windows_NT 10.0.26300 (x64) · CPU: AMD Ryzen 7 5700U with Radeon Graphics × 16 · 18 GB RAM
- Build de produção servido por vite preview (localhost), mocks MSW no cenário padrão, perfil Chrome limpo a cada medição (service worker registrado do zero).
- Mobile: Padrão do Lighthouse: Moto G Power emulado, throttling simulado (RTT 150 ms, 1,6 Mbps, CPU 4x)
- Desktop: Preset desktop do Lighthouse: 1350×940, throttling simulado (RTT 40 ms, 10 Mbps, CPU 1x)

Relatórios: `lighthouse/reports/*-mediana.report.html` (medição representativa) e
`lighthouse/reports/*-run<N>.report.json` (todas as medições).
