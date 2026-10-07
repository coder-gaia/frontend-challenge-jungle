import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ChangePasswordRequest,
  ConnectWalletRequest,
  Profile,
  UpdateProfileRequest,
  Wallet,
  WalletInput,
  WalletsResponse,
} from '@/contracts'
import { queryKeys } from '@/api/query-keys'
import { useSession } from '@/features/auth/session'
import { profileApi, walletsApi } from './api'

export const profileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.user.profile(userId),
    queryFn: ({ signal }) => profileApi.get(signal),
    staleTime: 60_000,
  })

export const walletsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.user.wallets(userId),
    queryFn: ({ signal }) => walletsApi.list(signal),
    staleTime: 60_000,
  })

function useUserId() {
  const { user } = useSession()
  return user?.id ?? 'anon'
}

export function useProfile() {
  const userId = useUserId()
  return useQuery({ ...profileQueryOptions(userId), enabled: userId !== 'anon' })
}

export function useWallets() {
  const userId = useUserId()
  return useQuery({ ...walletsQueryOptions(userId), enabled: userId !== 'anon' })
}

/** Após alterar o perfil, a sessão (nome, e-mail, avatar no header) também é revalidada. */
function useProfileMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Profile>) {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn,
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.user.profile(userId), profile)
      void queryClient.invalidateQueries({ queryKey: queryKeys.session })
    },
  })
}

export const useUpdateProfile = () =>
  useProfileMutation((body: UpdateProfileRequest) => profileApi.update(body))
export const useUpdateAvatar = () => useProfileMutation((dataUrl: string) => profileApi.updateAvatar(dataUrl))
export const useRemoveAvatar = () => useProfileMutation(() => profileApi.removeAvatar())

export function useChangePassword() {
  return useMutation({ mutationFn: (body: ChangePasswordRequest) => profileApi.changePassword(body) })
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: WalletInput }) =>
      id ? walletsApi.update(id, input) : walletsApi.create(input),
    onSuccess: (wallet: Wallet) => {
      queryClient.setQueryData<WalletsResponse>(queryKeys.user.wallets(userId), (data) => {
        const wallets = data?.wallets ?? []
        return {
          wallets: wallets.some((w) => w.id === wallet.id)
            ? wallets.map((w) => (w.id === wallet.id ? wallet : w))
            : [...wallets, wallet],
        }
      })
    },
  })
}

export function useConnectWallet() {
  return useMutation({
    mutationFn: ({ walletId, body }: { walletId: string; body: ConnectWalletRequest }) =>
      walletsApi.connect(walletId, body),
  })
}

export function useDisconnectWallet() {
  return useMutation({ mutationFn: (walletId: string) => walletsApi.disconnect(walletId) })
}
