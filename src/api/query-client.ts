import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, toApiError } from './errors'

/**
 * Política de cache, retries e sincronização (documentada no ARCHITECTURE.md):
 * - staleTime 30 s: dados públicos (catálogo) reaproveitados entre navegações; o tempo real complementa;
 * - gcTime 5 min para consultas sem observadores;
 * - retry apenas para erros transitórios (rede, timeout, 408/429/5xx) com backoff exponencial;
 *   4xx (validação, sessão, permissão, inexistente, conflito) não são repetidos;
 * - mutations nunca são repetidas automaticamente (evita duplicar operações). A criação de pedido
 *   tem um retry próprio, seguro por idempotência.
 */
export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Falha em atualização de segundo plano (já havia dados): avisa sem quebrar a tela.
        if (query.state.data !== undefined && toApiError(error).code !== 'CANCELED') {
          toast.warning('Não foi possível atualizar os dados agora.', {
            id: 'background-refresh-error',
            description: 'Mostrando a última versão carregada.',
          })
        }
      },
    }),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          const apiError = toApiError(error)
          return apiError instanceof ApiError && apiError.retryable && failureCount < 3
        },
        retryDelay: (attempt) => Math.min(600 * 2 ** attempt, 5_000),
      },
      mutations: {
        retry: false,
      },
    },
  })
}
