import { Link } from '@tanstack/react-router'
import { CheckCircle2, Loader2, PlugZap, Unplug, WalletCards, XCircle } from 'lucide-react'
import {
  NETWORK_LABEL,
  WALLET_PROVIDER_LABEL,
  walletProviderSchema,
  type Network,
  type Wallet,
  type WalletProvider,
} from '@/contracts'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ConnectionState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'connected'; key: string }
  | { status: 'rejected'; message: string }
  | { status: 'error'; message: string }

export const connectionKey = (walletId: string, provider: WalletProvider, network: Network) =>
  `${walletId}:${provider}:${network}`

const shortAddress = (address: string) =>
  address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address

function ProviderMark({ provider }: { provider: WalletProvider }) {
  if (provider === 'coinbase') return <WalletCards className="size-4" aria-hidden="true" />
  return (
    <span aria-hidden="true" className="text-xs font-bold">
      {provider === 'metamask' ? 'M' : 'W'}
    </span>
  )
}

/**
 * "Carteira e rede": escolha da carteira cadastrada, do aplicativo de carteira e conexão simulada
 * (aceite, recusa e desconexão vêm da API simulada).
 */
export function WalletPanel({
  wallets,
  walletId,
  provider,
  network,
  connection,
  onSelectWallet,
  onSelectProvider,
  onConnect,
  onDisconnect,
  disconnecting,
}: {
  wallets: Wallet[]
  walletId: string
  provider: WalletProvider
  network: Network
  connection: ConnectionState
  onSelectWallet: (wallet: Wallet) => void
  onSelectProvider: (provider: WalletProvider) => void
  onConnect: () => void
  onDisconnect: () => void
  disconnecting?: boolean
}) {
  const connected =
    connection.status === 'connected' && connection.key === connectionKey(walletId, provider, network)

  return (
    <section aria-labelledby="wallet-title" className="flex flex-col gap-4" data-testid="wallet-panel">
      <div className="flex items-center justify-between">
        <h2 id="wallet-title" className="text-17 leading-4 font-bold">
          Carteira e rede
        </h2>
        <Link to="/conta/carteiras" className="text-sm font-bold text-text-accent hover:underline">
          Gerenciar carteiras
        </Link>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-15 font-bold">Carteira conectada</legend>
        {wallets.map((wallet) => (
          <label
            key={wallet.id}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-xl border bg-surface p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
              wallet.id === walletId ? 'border-primary' : 'border-transparent hover:border-border-soft',
            )}
          >
            <input
              type="radio"
              name="wallet"
              checked={wallet.id === walletId}
              onChange={() => onSelectWallet(wallet)}
              className="mt-1 size-4 accent-primary"
            />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-base font-bold">
                {wallet.nickname}
                <span className="ml-2 text-xs font-normal text-text-secondary">
                  {wallet.slot === 'primary' ? 'Principal' : 'Secundária'}
                </span>
              </span>
              <span className="truncate text-sm text-text-secondary">
                {wallet.secondaryAddress || shortAddress(wallet.address)}
              </span>
              <span className="text-sm text-text-secondary">Rede {NETWORK_LABEL[wallet.network]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-15 font-bold">Aplicativo de carteira</legend>
        {walletProviderSchema.options.map((option) => (
          <label
            key={option}
            className={cn(
              'flex h-16 cursor-pointer items-center gap-3 rounded-xl border bg-surface px-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
              option === provider ? 'border-primary' : 'border-transparent hover:border-border-soft',
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-full border border-border bg-surface-raised text-text-accent">
              <ProviderMark provider={option} />
            </span>
            <span className="flex-1 text-sm">{WALLET_PROVIDER_LABEL[option]}</span>
            <input
              type="radio"
              name="provider"
              checked={option === provider}
              onChange={() => onSelectProvider(option)}
              className="size-4 accent-primary"
            />
          </label>
        ))}
      </fieldset>

      <div
        className="flex flex-col gap-2 rounded-lg border border-border p-3"
        aria-live="polite"
        data-testid="wallet-connection"
      >
        {connected ? (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Conectada via {WALLET_PROVIDER_LABEL[provider]} · {NETWORK_LABEL[network]}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={onDisconnect} disabled={disconnecting}>
              <Unplug className="size-4" aria-hidden="true" /> Desconectar
            </Button>
          </div>
        ) : (
          <>
            {connection.status === 'rejected' && (
              <p className="flex items-center gap-2 text-sm text-coral" role="alert">
                <XCircle className="size-4 shrink-0" aria-hidden="true" /> {connection.message} Tente
                novamente.
              </p>
            )}
            {connection.status === 'error' && (
              <p className="flex items-center gap-2 text-sm text-coral" role="alert">
                <XCircle className="size-4 shrink-0" aria-hidden="true" /> {connection.message}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-text-secondary">
                {connection.status === 'connecting'
                  ? 'Aguardando aprovação na carteira…'
                  : 'Carteira desconectada'}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onConnect}
                disabled={!walletId || connection.status === 'connecting'}
                data-testid="connect-wallet"
              >
                {connection.status === 'connecting' ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <PlugZap className="size-4" aria-hidden="true" />
                )}
                Conectar carteira
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
