import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/page-states'
import { Button } from '@/components/ui/button'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { useFavorites } from '@/features/favorites/queries'

/** "Lista de interesse": favoritos do usuário autenticado (persistidos na API). */
export function FavoritesPage() {
  const query = useFavorites()
  return (
    <section aria-labelledby="favorites-title" className="flex flex-col gap-6">
      <h1 id="favorites-title" className="text-17 leading-4 font-bold">
        Lista de interesse
      </h1>
      {query.isError && !query.data ? (
        <ErrorState
          error={query.error}
          title="Não foi possível carregar seus favoritos"
          onRetry={() => void query.refetch()}
        />
      ) : !query.data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <NftCardSkeleton key={i} />
          ))}
        </div>
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-6" />}
          title="Nenhum favorito ainda"
          description="Toque no coração de um NFT para acompanhá-lo aqui."
          action={
            <Button asChild>
              <Link to="/" hash="mercado">
                Explorar o mercado
              </Link>
            </Button>
          }
        />
      ) : (
        <ul
          className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 lg:gap-x-8"
          data-testid="favorites-grid"
        >
          {query.data.items.map((nft) => (
            <li key={nft.id}>
              <NftCard nft={nft} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
