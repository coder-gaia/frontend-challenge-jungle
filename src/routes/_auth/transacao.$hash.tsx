import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { FlaskConical } from 'lucide-react'
import { NETWORK_LABEL } from '@/contracts'
import { queryKeys } from '@/api/query-keys'
import { ErrorState } from '@/components/page-states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ordersApi } from '@/features/account/api'
import { formatEth } from '@/lib/eth'

const STATUS = { pending: 'Pendente', confirmed: 'Sucesso', declined: 'Falhou' } as const

/** Explorador de blocos simulado: as referências de transação da demonstração não existem na rede real. */
export const Route = createFileRoute('/_auth/transacao/$hash')({
  head: () => ({ meta: [{ title: 'Transação · KURIO' }] }),
  staticData: { mobileHeader: 'back', mobileTitle: 'Transação' },
  component: TransactionPage,
})

function TransactionPage() {
  const { hash } = Route.useParams()
  const { session } = Route.useRouteContext()
  const query = useQuery({
    queryKey: queryKeys.user.transaction(session.user.id, hash),
    queryFn: ({ signal }) => ordersApi.byTransaction(hash, signal),
  })
  const order = query.data

  return (
    <div className="container-kurio max-w-3xl py-8 md:py-16">
      <p className="mb-4 flex items-center gap-2 rounded-md border border-amber/50 bg-amber/10 px-3 py-2 text-sm text-amber">
        <FlaskConical className="size-4 shrink-0" aria-hidden="true" />
        Explorador simulado: esta transação existe apenas no ambiente de demonstração.
      </p>
      <h1 className="text-h1 font-bold">Detalhes da transação</h1>
      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Transação não encontrada"
          className="mt-6"
          onRetry={() => void query.refetch()}
        />
      ) : !order ? (
        <Skeleton className="mt-6 h-72 w-full" />
      ) : (
        <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-border bg-surface p-5 text-sm sm:grid-cols-[180px_1fr]">
          <dt className="text-text-secondary">Hash</dt>
          <dd className="font-medium break-all">{order.transaction.hash}</dd>
          <dt className="text-text-secondary">Status</dt>
          <dd
            className={
              order.status === 'confirmed'
                ? 'text-success'
                : order.status === 'declined'
                  ? 'text-coral'
                  : 'text-amber'
            }
          >
            {STATUS[order.status]}
          </dd>
          <dt className="text-text-secondary">Rede</dt>
          <dd>{NETWORK_LABEL[order.network]}</dd>
          <dt className="text-text-secondary">De</dt>
          <dd className="break-all">{order.wallet.address}</dd>
          <dt className="text-text-secondary">Para (destino dos NFTs)</dt>
          <dd className="break-all">{order.buyer.walletAddress}</dd>
          <dt className="text-text-secondary">Valor</dt>
          <dd className="font-bold text-text-accent">{formatEth(order.receipt.total)}</dd>
          <dt className="text-text-secondary">Taxa de rede</dt>
          <dd>{formatEth(order.receipt.networkFee)}</dd>
          <dt className="text-text-secondary">Data</dt>
          <dd>{new Date(order.resolvedAt ?? order.createdAt).toLocaleString('pt-BR')}</dd>
          <dt className="text-text-secondary">Pedido</dt>
          <dd>
            <Link
              to="/pedido/$orderId"
              params={{ orderId: order.id }}
              className="text-text-accent hover:underline"
            >
              {order.number}
            </Link>
          </dd>
        </dl>
      )}
      <Button asChild variant="outline" className="mt-6">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
