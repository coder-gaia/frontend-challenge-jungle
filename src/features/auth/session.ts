import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/contracts'
import { toApiError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { cartApi } from '@/features/cart/api'
import { getGuestCartId, rotateGuestCartId } from '@/lib/guest-cart'
import { removeStorage, STORAGE_KEYS } from '@/lib/storage'
import { authApi } from './api'
import { sessionStore } from './session-store'

export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.session,
    queryFn: async ({ signal }) => {
      if (!sessionStore.getToken()) return null
      try {
        const session = await authApi.session(signal)
        sessionStore.refresh(session.user, session.expiresAt)
        return session
      } catch (error) {
        if (toApiError(error).status === 401) return null
        throw error
      }
    },
    staleTime: 5 * 60_000,
  })

export function useSession() {
  const query = useQuery(sessionQueryOptions())
  const session = query.data ?? null
  return {
    session,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session),
    isPending: query.isPending,
  }
}

/**
 * Remove do cache tudo que é privado (dados do usuário, carrinho, cotações).
 * Rascunhos de checkout só são apagados no logout explícito: na expiração eles permitem retomar
 * o fluxo (o rascunho guarda o id do usuário e só é restaurado para o mesmo usuário).
 */
export function clearPrivateData(queryClient: QueryClient, options: { dropDrafts?: boolean } = {}) {
  void queryClient.cancelQueries({ queryKey: queryKeys.user.all })
  queryClient.removeQueries({ queryKey: queryKeys.user.all })
  queryClient.removeQueries({ queryKey: queryKeys.cart.all })
  queryClient.removeQueries({ queryKey: queryKeys.quote.all })
  if (options.dropDrafts) {
    removeStorage(STORAGE_KEYS.checkoutDraft, 'session')
    removeStorage(STORAGE_KEYS.checkoutAttempt, 'session')
  }
}

/**
 * Conclui a autenticação: limpa dados privados de uma sessão anterior (troca de usuário),
 * registra a nova sessão e mescla o carrinho do visitante no carrinho da conta.
 */
async function completeSignIn(queryClient: QueryClient, auth: AuthResponse) {
  const guestCartId = getGuestCartId()
  clearPrivateData(queryClient)
  sessionStore.start(auth)
  queryClient.setQueryData(queryKeys.session, auth.session)
  try {
    const { adjustments } = await cartApi.merge(guestCartId)
    if (adjustments.length)
      toast.info('Ajustamos a quantidade de alguns itens do carrinho', {
        description: 'Somamos o carrinho de visitante à sua conta respeitando a disponibilidade.',
      })
    rotateGuestCartId()
  } catch {
    toast.warning('Não foi possível juntar o carrinho de visitante agora.', {
      description: 'Os itens continuam salvos; tente novamente em instantes.',
    })
  }
  await queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    onSuccess: (auth) => completeSignIn(queryClient, auth),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: RegisterRequest) => authApi.register(body),
    onSuccess: (auth) => completeSignIn(queryClient, auth),
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout()
      } catch {
        // Mesmo sem resposta do servidor, a sessão local é encerrada.
      }
    },
    onSettled: () => sessionStore.end('logout'),
  })
}
