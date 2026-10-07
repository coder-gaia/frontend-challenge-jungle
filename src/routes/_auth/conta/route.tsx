import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AccountLayout } from '@/features/account/components/account-layout'

export const Route = createFileRoute('/_auth/conta')({
  staticData: { mobileHeader: 'back', mobileTitle: 'Meu perfil' },
  component: () => (
    <AccountLayout>
      <Outlet />
    </AccountLayout>
  ),
})
