import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/conta')({
  component: () => (
    <div className="container-kurio py-8">
      <Outlet />
    </div>
  ),
})
