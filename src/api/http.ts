import axios, { type AxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { HEADERS } from '@/contracts'
import { sessionStore } from '@/features/auth/session-store'
import { getGuestCartId } from '@/lib/guest-cart'
import { ApiError, toApiError } from './errors'

export const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

/**
 * Todas as chamadas REST passam por esta instância do Axios.
 * - `paramsSerializer` com `indexes: null` → arrays como chaves repetidas (`category=a&category=b`);
 * - timeout padrão de 12 s (a criação de pedido usa 8 s e retry idempotente);
 * - interceptors anexam sessão/carrinho de visitante e normalizam erros em `ApiError`.
 */
export const http = axios.create({
  baseURL: API_URL,
  timeout: 12_000,
  headers: { Accept: 'application/json' },
  paramsSerializer: { indexes: null },
})

let ready: Promise<unknown> = Promise.resolve()

/** Segura as requisições até a camada de rede (ex.: MSW) estar pronta, sem bloquear a renderização. */
export function setApiReady(promise: Promise<unknown>) {
  ready = promise.catch(() => undefined)
}

export function whenApiReady() {
  return ready
}

http.interceptors.request.use(async (config) => {
  await ready
  const token = sessionStore.getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set(HEADERS.guestCart, getGuestCartId())
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error)
    const sentToken = Boolean(error?.config?.headers?.Authorization)
    // Sessão inválida/expirada em qualquer chamada autenticada encerra a sessão local.
    if (sentToken && (apiError.code === 'SESSION_EXPIRED' || apiError.code === 'UNAUTHENTICATED')) {
      sessionStore.end('expired')
    }
    return Promise.reject(apiError)
  },
)

/** Requisição tipada: valida a resposta com o schema do contrato antes de entregá-la ao cache. */
export async function apiRequest<S extends z.ZodType>(
  schema: S,
  config: AxiosRequestConfig,
): Promise<z.infer<S>> {
  const response = await http.request(config)
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    if (import.meta.env.DEV) console.error('[contrato] resposta inválida', config.url, parsed.error.issues)
    throw new ApiError({
      code: 'INVALID_RESPONSE',
      status: response.status,
      message: 'Recebemos uma resposta inesperada do servidor.',
    })
  }
  return parsed.data
}

/** Requisição sem corpo de resposta (204). */
export async function apiVoid(config: AxiosRequestConfig): Promise<void> {
  await http.request(config)
}
