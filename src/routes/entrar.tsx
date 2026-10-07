import { createFileRoute } from '@tanstack/react-router'
import { authSearchSchema } from '@/features/auth/search'

export const Route = createFileRoute('/entrar')({
  validateSearch: authSearchSchema,
  head: () => ({ meta: [{ title: 'Entrar · KURIO' }] }),
  staticData: { mobileHeader: 'none', hideTabBar: true },
  component: () => <div className="container-kurio py-16">Entrar</div>,
})
