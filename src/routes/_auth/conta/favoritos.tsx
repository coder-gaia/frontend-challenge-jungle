import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/conta/favoritos')({
  component: () => <div>favoritos</div>,
})
