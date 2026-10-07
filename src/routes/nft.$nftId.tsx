import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/nft/$nftId')({
  staticData: { nav: 'market', mobileHeader: 'none', hideTabBar: true },
  component: () => <div className="container-kurio py-16">Detalhe</div>,
})
