import { API, authResponseSchema, sessionSchema, type LoginRequest, type RegisterRequest } from '@/contracts'
import { apiRequest, apiVoid } from '@/api/http'

export const authApi = {
  login: (body: LoginRequest) =>
    apiRequest(authResponseSchema, { method: 'POST', url: API.auth.login, data: body }),
  register: (body: RegisterRequest) =>
    apiRequest(authResponseSchema, { method: 'POST', url: API.auth.register, data: body }),
  session: (signal?: AbortSignal) => apiRequest(sessionSchema, { url: API.auth.session, signal }),
  logout: () => apiVoid({ method: 'POST', url: API.auth.logout }),
}
