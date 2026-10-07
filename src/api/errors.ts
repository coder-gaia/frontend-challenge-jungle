import { isAxiosError } from 'axios'
import { apiErrorBodySchema, type ApiErrorCode } from '@/contracts'

export type ClientErrorCode =
  ApiErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELED' | 'INVALID_RESPONSE' | 'UNKNOWN'

/** Erro normalizado que sai da camada HTTP: a UI nunca lida com AxiosError diretamente. */
export class ApiError extends Error {
  readonly code: ClientErrorCode
  readonly status: number
  readonly fields?: Record<string, string>
  readonly details?: Record<string, unknown>
  readonly retryable: boolean
  readonly requestId?: string

  constructor(init: {
    code: ClientErrorCode
    message: string
    status?: number
    fields?: Record<string, string>
    details?: Record<string, unknown>
    retryable?: boolean
    requestId?: string
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status ?? 0
    this.fields = init.fields
    this.details = init.details
    this.retryable = init.retryable ?? false
    this.requestId = init.requestId
  }

  get isAuthError() {
    return this.status === 401 && this.code !== 'INVALID_CREDENTIALS'
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED')
      return new ApiError({ code: 'CANCELED', message: 'Requisição cancelada.', retryable: false })
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
      return new ApiError({
        code: 'TIMEOUT',
        message: 'O servidor demorou para responder. Verificando novamente…',
        retryable: true,
      })
    if (!error.response)
      return new ApiError({
        code: 'NETWORK_ERROR',
        message: 'Não foi possível conectar. Verifique sua conexão e tente novamente.',
        retryable: true,
      })
    const parsed = apiErrorBodySchema.safeParse(error.response.data)
    if (parsed.success) return new ApiError(parsed.data.error)
    return new ApiError({
      code: 'UNKNOWN',
      status: error.response.status,
      message: 'Algo deu errado. Tente novamente.',
      retryable: error.response.status >= 500,
    })
  }
  return new ApiError({
    code: 'UNKNOWN',
    message: error instanceof Error ? error.message : 'Erro inesperado.',
  })
}

/** Mensagem amigável para exibir em toasts/alertas. */
export function errorMessage(error: unknown): string {
  return toApiError(error).message
}
