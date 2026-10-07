import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const nodeModules = (packages: string) => new RegExp(`node_modules[\\\\/](${packages})[\\\\/]`)

/**
 * O backend simulado (MSW) é importado dinamicamente no boot e toda requisição espera por ele:
 * pré-carregar o chunk no HTML evita uma ida e volta extra antes das primeiras chamadas à API.
 */
function preloadMocksChunk(): Plugin {
  return {
    name: 'kurio:preload-mocks-chunk',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (process.env.VITE_ENABLE_MOCKS === 'false') return []
        const chunk = Object.values(ctx.bundle ?? {}).find(
          (output) => output.type === 'chunk' && output.name === 'mocks',
        )
        return chunk
          ? [
              {
                tag: 'link',
                attrs: { rel: 'modulepreload', crossorigin: '', href: `/${chunk.fileName}` },
                injectTo: 'head',
              },
            ]
          : []
      },
    },
  }
}

export default defineConfig({
  plugins: [
    // O plugin do router precisa vir antes do plugin do React.
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
    preloadMocksChunk(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // O backend simulado não usa cookies: ver src/mocks/shims/tough-cookie.ts.
      'tough-cookie': fileURLToPath(new URL('./src/mocks/shims/tough-cookie.ts', import.meta.url)),
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        // Menos requisições no carregamento inicial: dependências agrupadas por momento de uso.
        // Cada grupo leva junto as dependências ainda não capturadas, em ordem de prioridade: os
        // contratos (zod/big.js) ficam no `core`, carregado pelo app, e o `mocks` (importado
        // dinamicamente no boot) só contém o MSW e o backend simulado. O modo em página
        // (src/mocks/in-page.ts e os interceptadores de fetch/XHR) fica de fora: só é baixado
        // quando o Service Worker não intercepta a página.
        codeSplitting: {
          groups: [
            { name: 'react', priority: 40, test: nodeModules('react|react-dom|scheduler') },
            { name: 'tanstack', priority: 40, test: nodeModules('@tanstack') },
            {
              // O helper de preload do Vite é usado pelo app e pelos mocks: fica no `core` para o
              // app não importar o chunk de mocks só por causa dele.
              name: 'core',
              priority: 30,
              test: /node_modules[\\/](axios|zod|sonner|tailwind-merge|clsx|class-variance-authority|big\.js)[\\/]|src[\\/](contracts[\\/]|lib[\\/]eth\.ts)|vite[\\/]preload-helper/,
            },
            {
              name: 'mocks',
              priority: 10,
              test: /node_modules[\\/](msw|@mswjs|@bundled-es-modules|@open-draft|headers-polyfill|outvariant|strict-event-emitter|path-to-regexp|rettime|is-node-process|until-async|set-cookie-parser|engine\.io-parser|socket\.io-parser)[\\/](?!interceptors[\\/]lib[\\/]browser[\\/](interceptors[\\/])?(fetch|XMLHttpRequest)\b)|src[\\/]mocks[\\/](?!in-page\.ts)/,
            },
          ],
        },
      },
    },
  },
})
