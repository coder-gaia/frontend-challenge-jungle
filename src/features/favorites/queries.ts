import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { FavoritesResponse, NftSummary } from '@/contracts'
import { errorMessage } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { announce } from '@/components/live-announcer'
import { favoritesApi } from '@/features/account/api'
import { useSession } from '@/features/auth/session'

export function useFavorites() {
  const { user } = useSession()
  return useQuery({
    queryKey: queryKeys.user.favorites(user?.id ?? 'anon'),
    queryFn: ({ signal }) => favoritesApi.list(signal),
    enabled: Boolean(user),
    staleTime: 60_000,
  })
}

export function useIsFavorite(nftId: string) {
  const { data } = useFavorites()
  return data?.ids.includes(nftId) ?? false
}

/**
 * Favoritar com atualização otimista: o coração muda na hora, o cache é revertido se a API falhar
 * e a lista é revalidada ao final. Visitantes são levados ao login (favoritos exigem conta).
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })

  const mutation = useMutation({
    mutationFn: ({ nft, favorite }: { nft: NftSummary; favorite: boolean }) =>
      favorite ? favoritesApi.add(nft.id) : favoritesApi.remove(nft.id),
    onMutate: async ({ nft, favorite }) => {
      const key = queryKeys.user.favorites(user!.id)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoritesResponse>(key)
      queryClient.setQueryData<FavoritesResponse>(key, (data) => {
        const base = data ?? { ids: [], items: [] }
        return favorite
          ? {
              ids: [nft.id, ...base.ids.filter((id) => id !== nft.id)],
              items: [nft, ...base.items.filter((i) => i.id !== nft.id)],
            }
          : { ids: base.ids.filter((id) => id !== nft.id), items: base.items.filter((i) => i.id !== nft.id) }
      })
      announce(
        favorite
          ? `${nft.name} adicionado à lista de interesse.`
          : `${nft.name} removido da lista de interesse.`,
      )
      return { previous, key }
    },
    onError: (error, { nft, favorite }, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
      toast.error(favorite ? 'Não foi possível favoritar' : 'Não foi possível remover dos favoritos', {
        id: `favorite-${nft.id}`,
        description: `${errorMessage(error)} O estado anterior foi restaurado.`,
      })
      announce(`Falha ao atualizar a lista de interesse. ${nft.name} voltou ao estado anterior.`, 'assertive')
    },
    onSettled: () => {
      if (user) void queryClient.invalidateQueries({ queryKey: queryKeys.user.favorites(user.id) })
    },
  })

  const toggle = (nft: NftSummary, currentlyFavorite: boolean) => {
    if (!user) {
      toast.info('Entre para salvar favoritos', { id: 'favorite-login' })
      void navigate({ to: '/entrar', search: { redirect: href } })
      return
    }
    mutation.mutate({ nft, favorite: !currentlyFavorite })
  }

  return { toggle, isPending: mutation.isPending, pendingId: mutation.variables?.nft.id }
}
