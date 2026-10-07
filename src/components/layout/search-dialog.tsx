import { useDeferredValue, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, Search } from 'lucide-react'
import { queryKeys } from '@/api/query-keys'
import { NftImage } from '@/components/nft-image'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { catalogApi } from '@/features/catalog/api'
import { formatEth } from '@/lib/eth'

/**
 * Busca rápida (command palette). A filtragem é feita pela API (`GET /nfts?q=`);
 * consultas anteriores em voo são canceladas pelo TanStack Query quando o termo muda.
 */
export default function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [term, setTerm] = useState('')
  const deferred = useDeferredValue(term.trim())
  const navigate = useNavigate()

  const query = useQuery({
    queryKey: queryKeys.nfts.search(deferred),
    queryFn: ({ signal }) => catalogApi.list({ q: deferred, pageSize: 6 }, signal),
    enabled: open && deferred.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

  const close = () => {
    onOpenChange(false)
    setTerm('')
  }

  const goToResults = () => {
    navigate({ to: '/', search: { q: deferred || undefined }, hash: 'mercado' })
    close()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(value) => (value ? onOpenChange(true) : close())}
      title="Buscar NFTs"
      description="Pesquise por nome, coleção, criador ou atributo"
      shouldFilter={false}
      className="border-border-soft bg-surface"
    >
      <CommandInput value={term} onValueChange={setTerm} placeholder="Buscar por nome, coleção ou criador…" />
      <CommandList>
        {deferred.length < 2 ? (
          <p className="px-4 py-6 text-center text-sm text-text-secondary">Digite pelo menos 2 caracteres.</p>
        ) : query.isPending ? (
          <p
            className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-text-secondary"
            role="status"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Buscando…
          </p>
        ) : query.isError ? (
          <p className="px-4 py-6 text-center text-sm text-destructive-foreground" role="alert">
            Não foi possível buscar agora. Tente novamente.
          </p>
        ) : (
          <>
            <CommandEmpty>Nenhum NFT encontrado para “{deferred}”.</CommandEmpty>
            {query.data && query.data.items.length > 0 && (
              <CommandGroup heading={`${query.data.total} resultado(s)`}>
                {query.data.items.map((nft) => (
                  <CommandItem
                    key={nft.id}
                    value={nft.id}
                    onSelect={() => {
                      navigate({ to: '/nft/$nftId', params: { nftId: nft.id } })
                      close()
                    }}
                    className="gap-3"
                  >
                    <NftImage image={nft.image} sizes="40px" alt="" className="size-10 shrink-0 rounded-md" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{nft.name}</span>
                      <span className="truncate text-xs text-text-secondary">{nft.collection}</span>
                    </span>
                    <span className="text-sm font-bold text-text-accent">{formatEth(nft.price)}</span>
                  </CommandItem>
                ))}
                <CommandItem value="__all" onSelect={goToResults} className="justify-center text-text-accent">
                  <Search className="size-4" aria-hidden="true" /> Ver todos os resultados no catálogo
                </CommandItem>
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
