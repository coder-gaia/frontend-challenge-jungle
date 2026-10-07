import { http, HttpResponse } from 'msw'
import {
  changePasswordRequestSchema,
  connectWalletRequestSchema,
  updateAvatarRequestSchema,
  updateProfileRequestSchema,
  walletInputSchema,
  type Profile,
  type Wallet,
  type WalletConnection,
} from '@/contracts'
import { getConfig } from '../config'
import { getDb, mutate } from '../db/store'
import type { UserRecord } from '../db/types'
import { hashPassword, randomId, verifyPassword } from '../lib/crypto'
import { api, apiError, readJson, requireAuth, withNetwork } from '../lib/http'

const MAX_AVATAR_DATA_URL = 280_000

function toProfile(user: UserRecord): Profile {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    ensName: user.ensName,
    walletNickname: user.walletNickname,
    updatedAt: user.updatedAt,
  }
}

export const accountHandlers = [
  http.get(
    api('/me/profile'),
    withNetwork(({ request }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      return HttpResponse.json(toProfile(auth.user))
    }),
  ),

  http.patch(
    api('/me/profile'),
    withNetwork(async ({ request }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const body = await readJson(request, updateProfileRequestSchema)
      if (body instanceof Response) return body
      const others = Object.values(getDb().users).filter((u) => u.id !== auth.user.id)
      const fields: Record<string, string> = {}
      if (others.some((u) => u.email === body.email))
        fields.email = 'Este e-mail já está em uso por outra conta'
      if (others.some((u) => u.username === body.username))
        fields.username = 'Este nome de usuário já está em uso'
      if (Object.keys(fields).length)
        return apiError(
          409,
          fields.email ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN',
          'Alguns dados já estão em uso.',
          { fields },
        )
      const updated = mutate((db) => {
        const user = db.users[auth.user.id]!
        Object.assign(user, body, { updatedAt: new Date().toISOString() })
        return user
      })
      return HttpResponse.json(toProfile(updated))
    }),
  ),

  http.put(
    api('/me/avatar'),
    withNetwork(async ({ request }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const body = await readJson(request, updateAvatarRequestSchema)
      if (body instanceof Response) return body
      if (body.dataUrl.length > MAX_AVATAR_DATA_URL)
        return apiError(422, 'VALIDATION_ERROR', 'A imagem é muito grande.', {
          fields: { avatar: 'Envie uma imagem de até 200 KB' },
        })
      const updated = mutate((db) => {
        const user = db.users[auth.user.id]!
        user.avatarUrl = body.dataUrl
        user.updatedAt = new Date().toISOString()
        return user
      })
      return HttpResponse.json(toProfile(updated))
    }),
  ),

  http.delete(
    api('/me/avatar'),
    withNetwork(({ request }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const updated = mutate((db) => {
        const user = db.users[auth.user.id]!
        user.avatarUrl = null
        user.updatedAt = new Date().toISOString()
        return user
      })
      return HttpResponse.json(toProfile(updated))
    }),
  ),

  http.post(
    api('/me/password'),
    withNetwork(async ({ request }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const body = await readJson(request, changePasswordRequestSchema)
      if (body instanceof Response) return body
      if (!(await verifyPassword(body.currentPassword, auth.user.passwordHash)))
        return apiError(422, 'INVALID_PASSWORD', 'A senha atual está incorreta.', {
          fields: { currentPassword: 'Senha atual incorreta' },
        })
      if (body.currentPassword === body.newPassword)
        return apiError(422, 'VALIDATION_ERROR', 'A nova senha precisa ser diferente da atual.', {
          fields: { newPassword: 'Use uma senha diferente da atual' },
        })
      const passwordHash = await hashPassword(body.newPassword)
      mutate((db) => {
        db.users[auth.user.id]!.passwordHash = passwordHash
        db.users[auth.user.id]!.updatedAt = new Date().toISOString()
      })
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  // ---------------------------------------------------------------- carteiras

  http.get(
    api('/me/wallets'),
    withNetwork(({ request }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      return HttpResponse.json({ wallets: getDb().wallets[auth.user.id] ?? [] })
    }),
  ),

  http.post(
    api('/me/wallets'),
    withNetwork(async ({ request }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const body = await readJson(request, walletInputSchema)
      if (body instanceof Response) return body
      const wallets = getDb().wallets[auth.user.id] ?? []
      if (wallets.some((w) => w.slot === body.slot))
        return apiError(
          409,
          'WALLET_SLOT_TAKEN',
          'Você já cadastrou uma carteira neste espaço. Edite a existente.',
        )
      if (wallets.some((w) => w.address.toLowerCase() === body.address.toLowerCase()))
        return apiError(409, 'WALLET_ADDRESS_TAKEN', 'Este endereço já está cadastrado.', {
          fields: { address: 'Endereço já cadastrado em outra carteira' },
        })
      if (body.slot === 'secondary' && !wallets.some((w) => w.slot === 'primary'))
        return apiError(422, 'VALIDATION_ERROR', 'Cadastre a carteira principal primeiro.')
      const now = new Date().toISOString()
      const wallet: Wallet = {
        id: randomId('wal'),
        ...body,
        secondaryAddress: body.secondaryAddress || null,
        createdAt: now,
        updatedAt: now,
      }
      mutate((db) => {
        ;(db.wallets[auth.user.id] ??= []).push(wallet)
      })
      return HttpResponse.json(wallet, { status: 201 })
    }),
  ),

  http.put(
    api('/me/wallets/:id'),
    withNetwork(async ({ request, params }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const body = await readJson(request, walletInputSchema)
      if (body instanceof Response) return body
      const wallets = getDb().wallets[auth.user.id] ?? []
      const wallet = wallets.find((w) => w.id === params.id)
      if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
      if (wallets.some((w) => w.id !== wallet.id && w.address.toLowerCase() === body.address.toLowerCase()))
        return apiError(409, 'WALLET_ADDRESS_TAKEN', 'Este endereço já está cadastrado.', {
          fields: { address: 'Endereço já cadastrado em outra carteira' },
        })
      const updated = mutate((db) => {
        const target = db.wallets[auth.user.id]!.find((w) => w.id === wallet.id)!
        Object.assign(target, body, {
          slot: wallet.slot,
          secondaryAddress: body.secondaryAddress || null,
          updatedAt: new Date().toISOString(),
        })
        // Alterar endereço/rede invalida a conexão simulada.
        delete db.walletConnections[wallet.id]
        return target
      })
      return HttpResponse.json(updated)
    }),
  ),

  http.post(
    api('/me/wallets/:id/connection'),
    withNetwork(async ({ request, params }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      const body = await readJson(request, connectWalletRequestSchema)
      if (body instanceof Response) return body
      const wallet = (getDb().wallets[auth.user.id] ?? []).find((w) => w.id === params.id)
      if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
      if (getConfig().walletConnection === 'reject')
        return apiError(403, 'WALLET_REJECTED', 'A conexão foi recusada na carteira.')
      const connection: WalletConnection = {
        walletId: wallet.id,
        status: 'connected',
        provider: body.provider,
        network: body.network,
        address: wallet.address,
        connectedAt: new Date().toISOString(),
      }
      mutate((db) => {
        db.walletConnections[wallet.id] = {
          walletId: wallet.id,
          userId: auth.user.id,
          provider: body.provider,
          network: body.network,
          connectedAt: connection.connectedAt,
        }
      })
      return HttpResponse.json(connection)
    }),
  ),

  http.delete(
    api('/me/wallets/:id/connection'),
    withNetwork(({ request, params }) => {
      const auth = requireAuth(request)
      if (auth instanceof Response) return auth
      mutate((db) => {
        const connection = db.walletConnections[String(params.id)]
        if (connection?.userId === auth.user.id) delete db.walletConnections[String(params.id)]
      })
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
