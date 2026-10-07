import { delay, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import type { ApiErrorBody, ApiErrorCode, User } from '@/contracts'
import { HEADERS } from '@/contracts'
import { getConfig, updateConfig, type FailureRule, type LatencyProfile } from '../config'
import { getDb, mutate } from '../db/store'
import type { SessionRecord, UserRecord } from '../db/types'
import { createRng } from './rng'
import { randomToken } from './crypto'

export const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
export const api = (path: string) => `${API_BASE}${path}`

const STATUS_RETRYABLE = new Set([408, 429, 500, 502, 503, 504])

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: { fields?: Record<string, string>; details?: Record<string, unknown> } = {},
) {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      status,
      retryable: STATUS_RETRYABLE.has(status),
      requestId: `req_${randomToken(6)}`,
      ...extra,
    },
  }
  return HttpResponse.json(body, { status })
}

export const notFound = (message = 'Recurso não encontrado') => apiError(404, 'NOT_FOUND', message)

// ------------------------------------------------------------------ latência determinística

let rng = createRng(getConfig().seed)
let lastSeed = getConfig().seed

/** Reinicia a sequência pseudoaleatória (ex.: ao trocar de cenário) para reproduzir os mesmos atrasos. */
export function resetNetworkSequence(seed = getConfig().seed) {
  rng = createRng(seed)
  lastSeed = seed
}

function latencyFor(profile: LatencyProfile): number {
  if (getConfig().seed !== lastSeed) resetNetworkSequence()
  switch (profile) {
    case 'instant':
      return 0
    case 'realistic':
      return rng.int(60, 220)
    case 'slow':
      return rng.int(1600, 2600)
    case 'chaotic':
      return rng.chance(0.5) ? rng.int(40, 200) : rng.int(900, 2200)
  }
}

function matchesRule(rule: FailureRule, method: string, path: string) {
  if (rule.remaining === 0) return false
  if (rule.method !== '*' && rule.method !== method) return false
  const pattern = new RegExp(`^${rule.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
  return pattern.test(path)
}

function consumeFailure(method: string, path: string): FailureRule | null {
  const { failures } = getConfig()
  const rule = failures.find((r) => matchesRule(r, method, path))
  if (!rule) return null
  if (rule.remaining > 0) {
    updateConfig({
      failures: failures.map((r) => (r.id === rule.id ? { ...r, remaining: r.remaining - 1 } : r)),
    })
  }
  return rule
}

/**
 * Envolve um resolver com as condições de rede simuladas: offline, falhas configuradas
 * (HTTP, erro de rede ou timeout) e latência determinística.
 */
export function withNetwork<Params extends PathParams, Body extends DefaultBodyType>(
  resolver: HttpResponseResolver<Params, Body>,
): HttpResponseResolver<Params, Body> {
  return async (info) => {
    const config = getConfig()
    if (config.offline) return HttpResponse.error()

    const url = new URL(info.request.url)
    const path = url.pathname.slice(API_BASE.length) || '/'
    const failure = consumeFailure(info.request.method, path)

    await delay(latencyFor(config.latency))

    if (failure) {
      if (failure.status === 'network') return HttpResponse.error()
      if (failure.status === 'timeout') {
        await delay('infinite')
        return HttpResponse.error()
      }
      return apiError(
        failure.status,
        failure.code ?? (failure.status >= 500 ? 'SERVICE_UNAVAILABLE' : 'BAD_REQUEST'),
        failure.status >= 500
          ? 'Serviço temporariamente indisponível. Tente novamente em instantes.'
          : 'Requisição recusada pelo servidor.',
      )
    }
    return resolver(info)
  }
}

// ------------------------------------------------------------------ sessão

export interface AuthContext {
  user: UserRecord
  session: SessionRecord
}

export function toUser(record: UserRecord): User {
  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName,
    email: record.email,
    avatarUrl: record.avatarUrl,
  }
}

export function createSession(userId: string): SessionRecord {
  const now = Date.now()
  const session: SessionRecord = {
    token: randomToken(24),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + getConfig().sessionTtlSeconds * 1000).toISOString(),
  }
  mutate((db) => {
    db.sessions[session.token] = session
  })
  return session
}

function readToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

/** Resolve a sessão pelo token; sessões vencidas são removidas e sinalizadas como expiradas. */
export function resolveSession(token: string | null): AuthContext | 'expired' | null {
  if (!token) return null
  const db = getDb()
  const session = db.sessions[token]
  if (!session) return null
  if (Date.parse(session.expiresAt) <= Date.now()) {
    mutate((state) => {
      delete state.sessions[token]
    })
    return 'expired'
  }
  const user = db.users[session.userId]
  return user ? { user, session } : null
}

export function optionalAuth(request: Request): AuthContext | Response | null {
  const token = readToken(request)
  if (!token) return null
  const result = resolveSession(token)
  if (result === 'expired') return apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.')
  if (!result) return apiError(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.')
  return result
}

export function requireAuth(request: Request): AuthContext | Response {
  const auth = optionalAuth(request)
  if (auth === null) return apiError(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.')
  return auth
}

export const guestCartIdFrom = (request: Request) => {
  const id = request.headers.get(HEADERS.guestCart)
  return id && /^[a-zA-Z0-9-]{8,64}$/.test(id) ? id : null
}

/** Lê e valida o corpo JSON; retorna erro 400/422 padronizado em caso de falha. */
export async function readJson<T>(
  request: Request,
  schema: {
    safeParse: (
      v: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } }
  },
): Promise<T | Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, 'BAD_REQUEST', 'Corpo da requisição inválido.')
  }
  const parsed = schema.safeParse(body)
  if (parsed.success) return parsed.data
  const fields: Record<string, string> = {}
  for (const issue of parsed.error.issues) {
    const key = issue.path.map(String).join('.') || '_'
    fields[key] ??= issue.message
  }
  return apiError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', { fields })
}
