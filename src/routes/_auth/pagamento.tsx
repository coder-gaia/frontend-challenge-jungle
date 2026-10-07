import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '@/features/checkout/checkout-page'

export const Route = createFileRoute('/_auth/pagamento')({
  head: () => ({ meta: [{ title: 'Pagamento · KURIO' }] }),
  staticData: {
    nav: 'market',
    mobileHeader: 'back',
    mobileTitle: 'Pagamento com carteira',
    mobileBackTo: '/carrinho',
    hideTabBar: true,
  },
  component: CheckoutPage,
})
