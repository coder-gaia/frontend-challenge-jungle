import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/conta/carteiras')({
  component: () => <div>carteiras</div>,
})
