import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/features/account/profile-page'

export const Route = createFileRoute('/_auth/conta/perfil')({
  head: () => ({ meta: [{ title: 'Perfil do colecionador · KURIO' }] }),
  staticData: { mobileTitle: 'Meu perfil' },
  component: ProfilePage,
})
