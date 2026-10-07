import {
  API,
  favoriteMutationResponseSchema,
  favoritesResponseSchema,
  orderSchema,
  ordersResponseSchema,
  profileSchema,
  walletConnectionSchema,
  walletSchema,
  walletsResponseSchema,
  type ChangePasswordRequest,
  type ConnectWalletRequest,
  type CreateOrderRequest,
  type UpdateProfileRequest,
  type WalletInput,
} from '@/contracts'
import { HEADERS } from '@/contracts'
import { apiRequest, apiVoid } from '@/api/http'

export const favoritesApi = {
  list: (signal?: AbortSignal) => apiRequest(favoritesResponseSchema, { url: API.favorites.list, signal }),
  add: (nftId: string) =>
    apiRequest(favoriteMutationResponseSchema, { method: 'PUT', url: API.favorites.item(nftId) }),
  remove: (nftId: string) =>
    apiRequest(favoriteMutationResponseSchema, { method: 'DELETE', url: API.favorites.item(nftId) }),
}

export const profileApi = {
  get: (signal?: AbortSignal) => apiRequest(profileSchema, { url: API.profile.get, signal }),
  update: (body: UpdateProfileRequest) =>
    apiRequest(profileSchema, { method: 'PATCH', url: API.profile.get, data: body }),
  updateAvatar: (dataUrl: string) =>
    apiRequest(profileSchema, { method: 'PUT', url: API.profile.avatar, data: { dataUrl } }),
  removeAvatar: () => apiRequest(profileSchema, { method: 'DELETE', url: API.profile.avatar }),
  changePassword: (body: ChangePasswordRequest) =>
    apiVoid({ method: 'POST', url: API.profile.password, data: body }),
}

export const walletsApi = {
  list: (signal?: AbortSignal) => apiRequest(walletsResponseSchema, { url: API.wallets.list, signal }),
  create: (body: WalletInput) =>
    apiRequest(walletSchema, { method: 'POST', url: API.wallets.list, data: body }),
  update: (id: string, body: WalletInput) =>
    apiRequest(walletSchema, { method: 'PUT', url: API.wallets.item(id), data: body }),
  connect: (id: string, body: ConnectWalletRequest) =>
    apiRequest(walletConnectionSchema, { method: 'POST', url: API.wallets.connection(id), data: body }),
  disconnect: (id: string) => apiVoid({ method: 'DELETE', url: API.wallets.connection(id) }),
}

/** A criação de pedido usa timeout menor e é repetida com a MESMA chave de idempotência. */
export const ORDER_REQUEST_TIMEOUT_MS = 8_000

export const ordersApi = {
  create: (body: CreateOrderRequest, idempotencyKey: string) =>
    apiRequest(orderSchema, {
      method: 'POST',
      url: API.orders.create,
      data: body,
      timeout: ORDER_REQUEST_TIMEOUT_MS,
      headers: { [HEADERS.idempotencyKey]: idempotencyKey },
    }),
  get: (id: string, signal?: AbortSignal) => apiRequest(orderSchema, { url: API.orders.detail(id), signal }),
  list: (status?: 'pending' | 'confirmed' | 'declined', signal?: AbortSignal) =>
    apiRequest(ordersResponseSchema, { url: API.orders.list, params: { status }, signal }),
  byTransaction: (hash: string, signal?: AbortSignal) =>
    apiRequest(orderSchema, { url: API.orders.byTransaction(hash), signal }),
}
