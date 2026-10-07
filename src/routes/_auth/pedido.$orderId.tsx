import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { toApiError } from '@/api/errors'
import { ErrorState, NotFoundState } from '@/components/page-states'
import { OrderSkeleton, OrderView } from '@/features/orders/order-page'
import { orderQueryOptions } from '@/features/orders/queries'

export const Route = createFileRoute('/_auth/pedido/$orderId')({
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(orderQueryOptions(context.session.user.id, params.orderId))
    } catch (error) {
      if (toApiError(error).code === 'NOT_FOUND') throw notFound()
      throw error
    }
  },
  head: () => ({ meta: [{ title: 'Pedido · KURIO' }] }),
  pendingMs: 0,
  pendingComponent: OrderSkeleton,
  notFoundComponent: () => (
    <NotFoundState title="Pedido não encontrado" description="Não encontramos este pedido na sua conta." />
  ),
  errorComponent: function OrderError({ error, reset }) {
    const router = useRouter()
    return (
      <div className="container-kurio py-16">
        <ErrorState
          error={error}
          title={
            toApiError(error).code === 'FORBIDDEN'
              ? 'Sem permissão para ver este pedido'
              : 'Não foi possível carregar o pedido'
          }
          onRetry={() => {
            reset()
            void router.invalidate()
          }}
        />
      </div>
    )
  },
  staticData: { nav: 'market', mobileHeader: 'back', mobileTitle: 'Pedido', mobileBackTo: '/' },
  component: function OrderRoute() {
    const { orderId } = Route.useParams()
    const { session } = Route.useRouteContext()
    return <OrderView userId={session.user.id} orderId={orderId} />
  },
})
