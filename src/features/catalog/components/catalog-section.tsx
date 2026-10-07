import { lazy, Suspense, useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Loader2, SlidersHorizontal } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/page-states'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DEFAULT_PAGE_SIZE } from '../constants'
import { nftListQueryOptions } from '../queries'
import { hasActiveFilters, toListQuery, type CatalogSearch } from '../search'
import { CatalogTabs, SortSelect } from './catalog-toolbar'
import { FeaturedBanner } from './editorial'
import { CatalogFilters, CatalogSearchInput } from './filters'
import { NftCard, NftCardSkeleton } from './nft-card'
import { CatalogPagination } from './pagination'

const FiltersSheet = lazy(() => import('./filters-sheet'))
const route = getRouteApi('/')

/** Remove valores padrão para manter a URL limpa e a chave de cache estável. */
function cleanSearch(search: CatalogSearch): CatalogSearch {
  return {
    q: search.q || undefined,
    category: search.category?.length ? search.category : undefined,
    network: search.network?.length ? search.network : undefined,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    tab: search.tab && search.tab !== 'all' ? search.tab : undefined,
    sort: search.sort && search.sort !== 'recent' ? search.sort : undefined,
    page: search.page && search.page > 1 ? search.page : undefined,
  }
}

function scrollToCatalog() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document
    .getElementById('mercado')
    ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}

function useCatalogState() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const listQuery = toListQuery(search)
  const query = useQuery(nftListQueryOptions(listQuery))

  /** Toda mudança de filtro reinicia a paginação; a página só muda pelo paginador. */
  const update = useCallback(
    (patch: Partial<CatalogSearch>, options: { replace?: boolean } = {}) => {
      void navigate({
        search: (prev) => cleanSearch({ ...prev, ...patch, page: 'page' in patch ? patch.page : undefined }),
        replace: options.replace,
        resetScroll: false,
      })
    },
    [navigate],
  )
  return { search, listQuery, query, update }
}

/** Barra de busca + filtros do mobile/tablet (topo da página, como no frame mobile do Figma). */
export function MobileCatalogBar() {
  const { search, query, update } = useCatalogState()
  const [sheetOpen, setSheetOpen] = useState(false)
  const activeFilters = hasActiveFilters(search)
  return (
    <div className="container-kurio flex items-center gap-3 pt-6 lg:hidden">
      <CatalogSearchInput
        className="flex-1 [&_input]:h-11 [&_input]:rounded-xl [&_input]:border-surface [&_input]:bg-surface [&_input]:text-base"
        value={search.q}
        placeholder="Explorar coleções"
        onCommit={(q) => {
          update({ q })
          if (q) scrollToCatalog()
        }}
      />
      <Button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label={activeFilters ? 'Filtros (ativos)' : 'Filtros'}
        className="relative size-11 rounded-xl bg-linear-to-b from-primary to-brand-dark p-0"
        data-testid="open-filters"
      >
        <SlidersHorizontal className="size-5" aria-hidden="true" />
        {activeFilters && (
          <span className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-background bg-coral" />
        )}
      </Button>
      {sheetOpen && (
        <Suspense fallback={null}>
          <FiltersSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            search={search}
            facets={query.data?.facets}
            total={query.data?.total}
            onChange={update}
          />
        </Suspense>
      )}
    </div>
  )
}

export function CatalogSection() {
  const { search, listQuery, query, update } = useCatalogState()
  const { data, isPending, isError, error, isFetching, isPlaceholderData, refetch, isRefetching } = query

  const changePage = (page: number) => {
    update({ page })
    scrollToCatalog()
  }

  const page = data?.page ?? listQuery.page ?? 1
  const from = data && data.total > 0 ? (page - 1) * DEFAULT_PAGE_SIZE + 1 : 0
  const to = data ? Math.min(page * DEFAULT_PAGE_SIZE, data.total) : 0
  const activeFilters = hasActiveFilters(search)

  return (
    <section id="mercado" aria-labelledby="catalog-title" className="container-kurio scroll-mt-6">
      <h2 id="catalog-title" className="sr-only">
        Catálogo de NFTs
      </h2>
      <div className="flex gap-12">
        {/* Barra lateral (desktop) */}
        <div className="hidden w-[310px] shrink-0 flex-col gap-6 lg:flex">
          <div className="bg-surface p-5">
            <CatalogFilters search={search} facets={data?.facets} onChange={update} />
          </div>
          <FeaturedBanner />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <CatalogTabs value={search.tab ?? 'all'} onChange={(tab) => update({ tab })} />
            {isFetching && !isPending && (
              <span
                className="inline-flex items-center gap-1.5 text-sm text-text-secondary md:order-last md:w-full md:justify-end"
                role="status"
              >
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Atualizando…
              </span>
            )}
            <SortSelect
              className="hidden md:flex"
              value={search.sort ?? 'recent'}
              onChange={(sort) => update({ sort })}
            />
          </div>

          {isPending ? (
            <div
              className="grid grid-cols-2 gap-x-4 gap-y-6 pb-8 md:grid-cols-3 md:gap-x-8 md:gap-y-[72px] md:pb-0 [&>*:nth-child(even)]:translate-y-8 md:[&>*:nth-child(even)]:translate-y-0"
              aria-busy="true"
              data-testid="catalog-skeleton"
            >
              {Array.from({ length: DEFAULT_PAGE_SIZE }, (_, i) => (
                <NftCardSkeleton key={i} />
              ))}
            </div>
          ) : isError && !data ? (
            <ErrorState
              error={error}
              title="Não foi possível carregar o catálogo"
              onRetry={() => void refetch()}
              retrying={isRefetching}
            />
          ) : data && data.items.length === 0 ? (
            <EmptyState
              title="Nenhum NFT encontrado"
              description={
                activeFilters || search.tab
                  ? 'Ajuste a busca ou remova alguns filtros para ver mais resultados.'
                  : 'O catálogo está vazio no momento. Volte em breve para novos lançamentos.'
              }
              action={
                activeFilters ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      update({
                        q: undefined,
                        category: undefined,
                        network: undefined,
                        minPrice: undefined,
                        maxPrice: undefined,
                      })
                    }
                  >
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : data ? (
            <>
              <ul
                className={cn(
                  'grid grid-cols-2 gap-x-4 gap-y-6 pb-8 transition-opacity md:grid-cols-3 md:gap-x-8 md:gap-y-[72px] md:pb-0',
                  '[&>*:nth-child(even)]:translate-y-8 md:[&>*:nth-child(even)]:translate-y-0',
                  isPlaceholderData && 'opacity-60',
                )}
                aria-busy={isPlaceholderData}
                data-testid="catalog-grid"
              >
                {data.items.map((nft, index) => (
                  <li key={nft.id}>
                    <NftCard nft={nft} priority={index < 2 && page === 1} />
                  </li>
                ))}
              </ul>
              <div className="flex flex-col-reverse items-center justify-between gap-4 md:flex-row">
                <p
                  className="text-sm text-text-secondary"
                  role="status"
                  aria-live="polite"
                  data-testid="results-summary"
                >
                  Mostrando {from}–{to} de {data.total} NFTs{search.q ? ` para “${search.q}”` : ''}
                </p>
                <CatalogPagination page={page} totalPages={data.totalPages} onPageChange={changePage} />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}
