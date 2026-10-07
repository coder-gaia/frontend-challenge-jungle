import { createFileRoute } from '@tanstack/react-router'
import { CartPage } from '@/features/cart/cart-page'

export const Route = createFileRoute('/carrinho')({
  head: () => ({ meta: [{ title: 'Carrinho · KURIO' }] }),
  staticData: { nav: 'market', mobileHeader: 'back', mobileTitle: 'Carrinho de NFTs', hideTabBar: true },
  component: CartPage,
})
