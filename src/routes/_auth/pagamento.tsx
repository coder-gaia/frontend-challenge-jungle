import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/pagamento')({
  head: () => ({ meta: [{ title: 'Pagamento · KURIO' }] }),
  staticData: {
    nav: 'market',
    mobileHeader: 'back',
    mobileTitle: 'Pagamento com carteira',
    hideTabBar: true,
  },
  component: () => <div className="container-kurio py-16">Pagamento</div>,
})
