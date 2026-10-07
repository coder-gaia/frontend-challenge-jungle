import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Gera a sequência de páginas com reticências: 1 … 4 5 6 … 12 */
export function pageItems(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const items: Array<number | 'gap'> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) items.push('gap')
  for (let page = start; page <= end; page++) items.push(page)
  if (end < total - 1) items.push('gap')
  items.push(total)
  return items
}

const base =
  'flex size-[35px] items-center justify-center rounded text-lg leading-4 transition-colors disabled:pointer-events-none disabled:opacity-40'

/** Paginação do Figma: quadrados de 35px, página atual em laranja. */
export function CatalogPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-center md:justify-end">
      <ul className="flex items-center gap-2">
        <li>
          <button
            type="button"
            className={cn(base, 'cursor-pointer border border-border hover:border-primary')}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-[18px]" aria-hidden="true" />
          </button>
        </li>
        {pageItems(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-text-secondary">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Página ${item}`}
                className={cn(
                  base,
                  'cursor-pointer',
                  item === page
                    ? 'bg-primary font-bold text-ink'
                    : 'border border-border hover:border-primary hover:text-text-accent',
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            className={cn(base, 'cursor-pointer border border-border hover:border-primary')}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight className="size-[18px]" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  )
}
