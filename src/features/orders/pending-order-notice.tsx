import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/session'
import { orderQueryOptions, pendingOrderStore } from './queries'

/**
 * Retomada de pedido pendente após refresh/reconexão: o id fica salvo localmente e o estado é
 * reconsultado via REST (com polling enquanto pendente). Nenhuma nova compra é criada.
 */
export function PendingOrderNotice() {
  const { user } = useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const ref = pendingOrderStore.get(user?.id ?? null)
  const query = useQuery({
    ...orderQueryOptions(user?.id ?? 'anon', ref?.orderId ?? ''),
    enabled: Boolean(user && ref),
  })
  const order = query.data

  useEffect(() => {
    if (!order || order.status === 'pending') return
    pendingOrderStore.clear(order.id)
    if (pathname.startsWith('/pedido/')) return
    if (order.status === 'confirmed')
      toast.success(`Pedido ${order.number} confirmado`, {
        id: `order-${order.id}`,
        description: 'Seus NFTs já estão na sua carteira.',
      })
    else
      toast.error(`Pedido ${order.number} recusado`, {
        id: `order-${order.id}`,
        description: order.failureReason ?? 'Nenhum valor foi cobrado.',
      })
  }, [order, pathname])

  if (!ref || !order || order.status !== 'pending' || pathname === `/pedido/${order.id}`) return null
  return (
    <div
      role="status"
      className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-primary/50 bg-surface px-4 py-3 shadow-glow md:top-auto md:right-6 md:bottom-6 md:left-auto"
      data-testid="pending-order-notice"
    >
      <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
      <p className="flex-1 text-sm">
        Pedido <strong>{order.number}</strong> aguardando confirmação.
      </p>
      <Link
        to="/pedido/$orderId"
        params={{ orderId: order.id }}
        className="text-sm font-bold text-text-accent hover:underline"
      >
        Ver pedido
      </Link>
    </div>
  )
}
