import { createFileRoute } from '@tanstack/react-router'
import { FavoritesPage } from '@/features/account/favorites-page'

export const Route = createFileRoute('/_auth/conta/favoritos')({
  head: () => ({ meta: [{ title: 'Lista de interesse · KURIO' }] }),
  staticData: { mobileTitle: 'Lista de interesse' },
  component: FavoritesPage,
})
