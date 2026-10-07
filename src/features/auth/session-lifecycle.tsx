import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { queryKeys } from '@/api/query-keys'
import { announce } from '@/components/live-announcer'
import { clearPrivateData, sessionQueryOptions, useSession } from './session'
import { sessionStore } from './session-store'

/** Rotas privadas ficam sob o layout `_auth`. */
const isPrivateRoute = (routeIds: string[]) => routeIds.some((id) => id.startsWith('/_auth'))

/**
 * Reage às mudanças de sessão:
 * - expiração: limpa dados privados e, se a rota é privada, leva ao login com `redirect` para retomada;
 * - logout: limpa caches (subscriptions são encerradas pelo RealtimeProvider);
 * - login/logout em outra aba: revalida a sessão.
 * Também agenda a verificação proativa quando o `expiresAt` da sessão é atingido.
 */
export function SessionLifecycle() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { session } = useSession()

  useEffect(
    () =>
      sessionStore.subscribe((_, reason) => {
        if (reason === 'login') return
        const location = router.state.location
        const onPrivateRoute = isPrivateRoute(router.state.matches.map((m) => m.routeId))

        if (reason === 'external') {
          clearPrivateData(queryClient)
          void queryClient.invalidateQueries({ queryKey: queryKeys.session })
          void router.invalidate()
          return
        }

        clearPrivateData(queryClient, { dropDrafts: reason === 'logout' })
        queryClient.setQueryData(queryKeys.session, null)

        if (reason === 'expired') {
          announce('Sua sessão expirou. Entre novamente para continuar.', 'assertive')
          toast.warning('Sua sessão expirou', {
            id: 'session-expired',
            description: onPrivateRoute
              ? 'Entre novamente para continuar de onde parou.'
              : 'Você continua navegando como visitante.',
          })
          if (onPrivateRoute) {
            void router.navigate({
              to: '/entrar',
              search: { redirect: location.href, reason: 'expired' },
              replace: true,
            })
          }
        } else {
          toast('Você saiu da sua conta.', { id: 'logout' })
          if (onPrivateRoute) void router.navigate({ to: '/', replace: true })
        }
      }),
    [queryClient, router],
  )

  useEffect(() => {
    if (!session) return
    const remaining = Date.parse(session.expiresAt) - Date.now()
    const timer = setTimeout(
      () => void queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 }).catch(() => undefined),
      Math.max(0, remaining) + 250,
    )
    return () => clearTimeout(timer)
  }, [session, queryClient])

  return null
}
