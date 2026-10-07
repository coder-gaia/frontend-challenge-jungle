import { createFileRoute } from '@tanstack/react-router'
import { authSearchSchema } from '@/features/auth/search'

export const Route = createFileRoute('/cadastro')({
  validateSearch: authSearchSchema,
  head: () => ({ meta: [{ title: 'Criar conta · KURIO' }] }),
  staticData: { mobileHeader: 'none', hideTabBar: true },
  component: () => <div className="container-kurio py-16">Cadastro</div>,
})
