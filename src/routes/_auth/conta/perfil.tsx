import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/conta/perfil')({
  component: () => <div>perfil</div>,
})
