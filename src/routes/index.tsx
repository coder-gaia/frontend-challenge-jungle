import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <main className="container-kurio py-24">
      <h1 className="text-display font-bold">KURIO</h1>
    </main>
  ),
})
