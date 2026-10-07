import { useEffect, useId, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import {
  CATEGORY_LABEL,
  categorySchema,
  NETWORK_LABEL,
  networkSchema,
  type Category,
  type Network,
  type NftListResponse,
} from '@/contracts'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { hasActiveFilters, type CatalogSearch } from '../search'

export type FacetData = NftListResponse['facets']

interface FiltersProps {
  search: CatalogSearch
  facets?: FacetData
  onChange: (patch: Partial<CatalogSearch>, options?: { replace?: boolean }) => void
  /** Exibe o campo de busca no topo (no mobile ele fica na barra superior). */
  showSearch?: boolean
  className?: string
}

/** Campo de busca do catálogo: atualiza `q` na URL com debounce (sem empilhar histórico a cada tecla). */
export function CatalogSearchInput({
  value,
  onCommit,
  className,
  placeholder = 'Buscar NFTs…',
}: {
  value?: string
  onCommit: (q: string | undefined) => void
  className?: string
  placeholder?: string
}) {
  const id = useId()
  const [draft, setDraft] = useState(value ?? '')

  // Mudanças externas (voltar/avançar no histórico) atualizam o campo (ajuste de estado durante o render).
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    setSynced(value)
    setDraft(value ?? '')
  }

  useEffect(() => {
    const next = draft.trim() || undefined
    if (next === (value || undefined)) return
    const timer = setTimeout(() => onCommit(next), 350)
    return () => clearTimeout(timer)
  }, [draft, value, onCommit])

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        Buscar no catálogo
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit(draft.trim() || undefined)
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="h-10 w-full rounded-md border border-border bg-ink pr-9 pl-9 text-sm outline-none placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
        data-testid="catalog-search"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft('')
            onCommit(undefined)
          }}
          aria-label="Limpar busca"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-text-secondary hover:text-text-accent"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function FacetList<T extends string>({
  legend,
  options,
  labels,
  selected,
  counts,
  onToggle,
  name,
}: {
  legend: string
  options: readonly T[]
  labels: Record<T, string>
  selected: T[]
  counts?: Record<T, number>
  onToggle: (value: T) => void
  name: string
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-lg leading-4 font-bold">{legend}</legend>
      <ul className="px-3">
        {options.map((option) => {
          const checked = selected.includes(option)
          const count = counts?.[option]
          return (
            <li key={option}>
              <label
                className={cn(
                  'flex h-10 cursor-pointer items-center justify-between gap-3 rounded text-15 leading-10 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                  checked ? 'text-text-accent' : 'text-text-secondary hover:text-foreground',
                  count === 0 && !checked && 'opacity-60',
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    name={name}
                    value={option}
                    checked={checked}
                    onChange={() => onToggle(option)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
                      checked ? 'border-primary bg-primary text-ink' : 'border-border-soft',
                    )}
                  >
                    {checked && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{labels[option]}</span>
                </span>
                {count !== undefined && <span className={cn(checked && 'font-bold')}>({count})</span>}
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

const toNumber = (value: string | undefined, fallback: number) => (value ? Number(value) : fallback)

function PriceRange({
  search,
  facets,
  onChange,
}: {
  search: CatalogSearch
  facets?: FacetData
  onChange: FiltersProps['onChange']
}) {
  const ceiling = Math.max(1, Math.ceil(Number(facets?.price.max ?? '12.3') * 10) / 10)
  const applied: [number, number] = [toNumber(search.minPrice, 0), toNumber(search.maxPrice, ceiling)]
  const [range, setRange] = useState<[number, number]>(applied)
  const labelId = useId()

  const appliedKey = `${applied[0]}-${applied[1]}`
  const [syncedKey, setSyncedKey] = useState(appliedKey)
  if (syncedKey !== appliedKey) {
    setSyncedKey(appliedKey)
    setRange(applied)
  }

  const dirty = range[0] !== applied[0] || range[1] !== applied[1]
  const format = (value: number) => formatEth(value.toFixed(2), { maxDecimals: 2, withUnit: false })

  return (
    <div className="flex flex-col gap-3" role="group" aria-labelledby={labelId}>
      <h3 id={labelId} className="text-lg leading-4 font-bold">
        Faixa de preço
      </h3>
      <div className="flex flex-col gap-3 pl-3">
        <Slider
          min={0}
          max={ceiling}
          step={0.01}
          value={range}
          minStepsBetweenThumbs={1}
          onValueChange={(value) => setRange([value[0] ?? 0, value[1] ?? ceiling])}
          aria-label="Faixa de preço em ETH"
          thumbLabels={['Preço mínimo', 'Preço máximo']}
          className="py-1.5"
        />
        <p className="text-15 leading-5" aria-live="polite">
          Preço: {format(range[0])} - {format(range[1])} ETH
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-9 w-[92px] text-base"
            disabled={!dirty}
            onClick={() =>
              onChange({
                minPrice: range[0] > 0 ? range[0].toFixed(2) : undefined,
                maxPrice: range[1] < ceiling ? range[1].toFixed(2) : undefined,
              })
            }
          >
            Aplicar
          </Button>
          {(search.minPrice || search.maxPrice) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-9"
              onClick={() => onChange({ minPrice: undefined, maxPrice: undefined })}
            >
              Limpar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

const toggle = <T,>(list: T[] | undefined, value: T) =>
  list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value]

/** Filtros combináveis do catálogo (coleções, faixa de preço e rede). */
export function CatalogFilters({ search, facets, onChange, showSearch = true, className }: FiltersProps) {
  return (
    <div className={cn('flex flex-col gap-10', className)}>
      {showSearch && <CatalogSearchInput value={search.q} onCommit={(q) => onChange({ q })} />}
      <FacetList<Category>
        legend="Coleções"
        name="category"
        options={categorySchema.options}
        labels={CATEGORY_LABEL}
        selected={search.category ?? []}
        counts={facets?.categories}
        onToggle={(value) => {
          const next = toggle(search.category, value)
          onChange({ category: next.length ? next : undefined })
        }}
      />
      <PriceRange search={search} facets={facets} onChange={onChange} />
      <FacetList<Network>
        legend="Rede"
        name="network"
        options={networkSchema.options}
        labels={NETWORK_LABEL}
        selected={search.network ?? []}
        counts={facets?.networks}
        onToggle={(value) => {
          const next = toggle(search.network, value)
          onChange({ network: next.length ? next : undefined })
        }}
      />
      {hasActiveFilters(search) && (
        <Button
          variant="outline"
          onClick={() =>
            onChange({
              q: undefined,
              category: undefined,
              network: undefined,
              minPrice: undefined,
              maxPrice: undefined,
            })
          }
        >
          <X className="size-4" aria-hidden="true" /> Limpar todos os filtros
        </Button>
      )}
    </div>
  )
}
