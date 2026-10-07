import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthScreen } from '@/features/auth/components/auth-screen'
import { authSearchSchema } from '@/features/auth/search'
import { sessionQueryOptions } from '@/features/auth/session'
import { safeRedirect } from '@/lib/safe-redirect'

export const Route = createFileRoute('/cadastro')({
  validateSearch: authSearchSchema,
  // Quem já está autenticado segue direto para o destino.
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions())
    if (session) throw redirect({ to: safeRedirect(search.redirect), replace: true })
  },
  head: () => ({ meta: [{ title: 'Criar conta · KURIO' }] }),
  staticData: { mobileHeader: 'none', hideTabBar: true },
  component: function AuthRoute() {
    const search = Route.useSearch()
    return <AuthScreen mode="register" search={search} />
  },
})
