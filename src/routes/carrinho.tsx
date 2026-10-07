import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/carrinho')({
  head: () => ({ meta: [{ title: 'Carrinho · KURIO' }] }),
  staticData: { nav: 'market', mobileHeader: 'back', mobileTitle: 'Carrinho de NFTs', hideTabBar: true },
  component: () => <div className="container-kurio py-16">Carrinho</div>,
})
