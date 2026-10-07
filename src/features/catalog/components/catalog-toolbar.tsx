import { useId } from 'react'
import {
  NFT_SORT_LABEL,
  NFT_TAB_LABEL,
  nftSortSchema,
  nftTabSchema,
  type NftSort,
  type NftTab,
} from '@/contracts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export function CatalogTabs({
  value,
  onChange,
  className,
}: {
  value: NftTab
  onChange: (tab: NftTab) => void
  className?: string
}) {
  return (
    <div role="group" aria-label="Listagem" className={cn('flex gap-4 md:gap-5', className)}>
      {nftTabSchema.options.map((tab) => {
        const active = tab === value
        return (
          <button
            key={tab}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab)}
            className={cn(
              'relative cursor-pointer pb-1 text-sm leading-4 whitespace-nowrap transition-colors md:text-15 md:font-medium',
              active ? 'font-bold text-text-accent' : 'text-foreground hover:text-text-accent',
            )}
          >
            {NFT_TAB_LABEL[tab]}
            {active && (
              <span
                aria-hidden="true"
                className="absolute right-0 -bottom-1 left-0 h-0.5 rounded-full bg-primary"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export function SortSelect({
  value,
  onChange,
  className,
}: {
  value: NftSort
  onChange: (sort: NftSort) => void
  className?: string
}) {
  const labelId = useId()
  return (
    <div className={cn('flex items-center gap-1 text-15', className)}>
      <span id={labelId}>Ordenar por:</span>
      <Select value={value} onValueChange={(next) => onChange(next as NftSort)}>
        <SelectTrigger
          aria-labelledby={labelId}
          className="h-8 cursor-pointer gap-2 border-0 bg-transparent px-1 text-15 shadow-none focus-visible:ring-2 dark:bg-transparent"
          data-testid="sort-select"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" className="border-border-soft bg-surface">
          {nftSortSchema.options.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {NFT_SORT_LABEL[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
