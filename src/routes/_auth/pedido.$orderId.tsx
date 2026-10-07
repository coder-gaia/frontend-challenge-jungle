import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/pedido/$orderId')({
  head: () => ({ meta: [{ title: 'Pedido · KURIO' }] }),
  staticData: { nav: 'market', mobileHeader: 'back', mobileTitle: 'Pedido', mobileBackTo: '/' },
  component: () => <div className="container-kurio py-16">Pedido</div>,
})
