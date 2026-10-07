import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { setApiReady } from '@/api/http'
import { createQueryClient } from '@/api/query-client'
import { createAppRouter } from '@/app/router'
import { RealtimeProvider } from '@/features/realtime/realtime-provider'
import './index.css'

/**
 * A camada de mocks (MSW: REST + Socket.IO) é ativada por configuração (`VITE_ENABLE_MOCKS`).
 * A renderização não espera o service worker: as requisições é que aguardam `apiReady`.
 */
async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { startMockServer } = await import('./mocks/browser')
  await startMockServer()
}

setApiReady(enableMocking())

const queryClient = createQueryClient()
const router = createAppRouter(queryClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <RouterProvider router={router} />
      </RealtimeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
