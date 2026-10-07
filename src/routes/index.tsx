import { createFileRoute } from '@tanstack/react-router'
import { catalogSearchSchema } from '@/features/catalog/search'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  staticData: { nav: 'home', mobileHeader: 'none' },
  component: () => (
    <div className="container-kurio py-16">
      <h1 className="text-display font-bold">SEJA DONO DO FUTURO DA ARTE DIGITAL</h1>
      <div id="mercado" />
    </div>
  ),
})
