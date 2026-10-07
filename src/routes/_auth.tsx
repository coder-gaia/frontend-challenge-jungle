import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/features/auth/session'

/**
 * Layout das rotas privadas (checkout, pedidos, perfil, carteiras, favoritos).
 * Sem sessão válida, redireciona ao login preservando o destino para retomada.
 */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions())
    if (!session) throw redirect({ to: '/entrar', search: { redirect: location.href } })
    return { session }
  },
  component: Outlet,
})
