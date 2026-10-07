import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/features/catalog/home-page'
import { highlightsQueryOptions, nftListQueryOptions } from '@/features/catalog/queries'
import { catalogSearchSchema, toListQuery } from '@/features/catalog/search'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => ({ query: toListQuery(search) }),
  // Prefetch sem bloquear: a página (hero estático + skeletons) renderiza imediatamente.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListQueryOptions(deps.query))
    void context.queryClient.prefetchQuery(highlightsQueryOptions())
  },
  head: () => ({ meta: [{ title: 'KURIO · Marketplace de NFTs' }] }),
  staticData: { nav: 'home', mobileHeader: 'none' },
  component: HomePage,
})
