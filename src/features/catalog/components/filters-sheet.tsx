import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useFocusReturn } from '@/lib/use-focus-return'
import type { CatalogSearch } from '../search'
import { SortSelect } from './catalog-toolbar'
import { CatalogFilters, type FacetData } from './filters'

/** Gaveta de filtros do mobile/tablet (mesmos filtros da barra lateral + ordenação). */
export default function FiltersSheet({
  open,
  onOpenChange,
  search,
  facets,
  total,
  onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  search: CatalogSearch
  facets?: FacetData
  total?: number
  onChange: (patch: Partial<CatalogSearch>, options?: { replace?: boolean }) => void
}) {
  const returnFocus = useFocusReturn(open)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] rounded-t-[28px] border-border-soft bg-surface"
        onCloseAutoFocus={returnFocus}
      >
        <SheetHeader>
          <SheetTitle className="text-lg">Filtros</SheetTitle>
          <SheetDescription>
            Combine coleções, faixa de preço e rede. Os resultados atualizam na hora.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-8 overflow-y-auto px-4 pb-2">
          <SortSelect value={search.sort ?? 'recent'} onChange={(sort) => onChange({ sort })} />
          <CatalogFilters search={search} facets={facets} onChange={onChange} showSearch={false} />
        </div>
        <SheetFooter>
          <Button size="lg" onClick={() => onOpenChange(false)}>
            {total === undefined ? 'Ver resultados' : `Ver ${total} resultado${total === 1 ? '' : 's'}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
