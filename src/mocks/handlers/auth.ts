import { http, HttpResponse } from 'msw'
import { loginRequestSchema, registerRequestSchema, type AuthResponse } from '@/contracts'
import { getDb, mutate } from '../db/store'
import { hashPassword, randomId, verifyPassword } from '../lib/crypto'
import { api, apiError, createSession, readJson, requireAuth, toUser, withNetwork } from '../lib/http'

export const authHandlers = [
  http.post(
    api('/auth/register'),
    withNetwork(async ({ request }) => {
      const body = await readJson(request, registerRequestSchema)
      if (body instanceof Response) return body
      const users = Object.values(getDb().users)
      const fields: Record<string, string> = {}
      if (users.some((u) => u.email === body.email)) fields.email = 'Este e-mail já está cadastrado'
      if (users.some((u) => u.username === body.username))
        fields.username = 'Este nome de usuário já está em uso'
      if (Object.keys(fields).length)
        return apiError(
          409,
          fields.email ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN',
          'Já existe uma conta com esses dados.',
          {
            fields,
          },
        )

      const now = new Date().toISOString()
      const user = {
        id: randomId('usr'),
        username: body.username,
        displayName: body.username,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        ensName: null,
        walletNickname: 'Minha carteira',
        avatarUrl: null,
        createdAt: now,
        updatedAt: now,
      }
      mutate((db) => {
        db.users[user.id] = user
        db.favorites[user.id] = []
        db.wallets[user.id] = []
      })
      const session = createSession(user.id)
      const response: AuthResponse = {
        token: session.token,
        session: { user: toUser(user), expiresAt: session.expiresAt },
      }
      return HttpResponse.json(response, { status: 201 })
    }),
  ),

  http.post(
    api('/auth/login'),
    withNetwork(async ({ request }) => {
      const body = await readJson(request, loginRequestSchema)
      if (body instanceof Response) return body
      const user = Object.values(getDb().users).find((u) => u.email === body.email)
      // Mesma mensagem para e-mail inexistente ou senha errada (não revela contas).
      if (!user || !(await verifyPassword(body.password, user.passwordHash)))
        return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
      const session = createSession(user.id)
      const response: AuthResponse = {
        token: session.token,
        session: { user: toUser(user), expiresAt: session.expiresAt },
      }
      return HttpResponse.json(response)
    }),
  ),

  http.get(
    api('/auth/session'),
    withNetwork(({ request }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      return HttpResponse.json({ user: toUser(auth.user), expiresAt: auth.session.expiresAt })
    }),
  ),

  http.post(
    api('/auth/logout'),
    withNetwork(({ request }) => {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '')
      if (token)
        mutate((db) => {
          delete db.sessions[token]
        })
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
