import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { toApiError } from '@/api/errors'
import { ErrorState, NotFoundState } from '@/components/page-states'
import { nftDetailQueryOptions, relatedQueryOptions } from '@/features/catalog/queries'
import { NftDetailPage, NftDetailSkeleton } from '@/features/nft/detail-page'
import { nftDetailSearchSchema } from '@/features/nft/edition'

export const Route = createFileRoute('/nft/$nftId')({
  validateSearch: nftDetailSearchSchema,
  // O detalhe depende dos dados para a arte principal (LCP): o loader garante o cache e o
  // skeleton aparece imediatamente (pendingMs 0). NFT inexistente vira 404 da rota.
  loader: async ({ context, params }) => {
    void context.queryClient.prefetchQuery(relatedQueryOptions(params.nftId))
    try {
      const nft = await context.queryClient.ensureQueryData(nftDetailQueryOptions(params.nftId))
      return { name: nft.name, description: nft.description }
    } catch (error) {
      if (toApiError(error).code === 'NOT_FOUND') throw notFound()
      throw error
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} · KURIO` : 'NFT · KURIO' },
      ...(loaderData ? [{ name: 'description', content: loaderData.description }] : []),
    ],
  }),
  pendingMs: 0,
  pendingComponent: NftDetailSkeleton,
  notFoundComponent: () => (
    <NotFoundState
      title="NFT não encontrado"
      description="Este NFT não existe ou foi removido do catálogo. Que tal explorar outras obras?"
    />
  ),
  errorComponent: DetailError,
  staticData: { nav: 'market', mobileHeader: 'none', hideTabBar: true },
  component: NftDetailPage,
})

function DetailError({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter()
  return (
    <div className="container-kurio py-16">
      <ErrorState
        error={error}
        title="Não foi possível carregar este NFT"
        onRetry={() => {
          reset()
          void router.invalidate()
        }}
      />
    </div>
  )
}
