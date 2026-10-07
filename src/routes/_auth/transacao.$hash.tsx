import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/transacao/$hash')({
  head: () => ({ meta: [{ title: 'Transação · KURIO' }] }),
  staticData: { mobileHeader: 'back', mobileTitle: 'Transação' },
  component: () => <div className="container-kurio py-16">Transação</div>,
})
