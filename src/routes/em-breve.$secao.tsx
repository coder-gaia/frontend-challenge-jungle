import { createFileRoute } from '@tanstack/react-router'
import { Hourglass } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { EmptyState } from '@/components/page-states'
import { Button } from '@/components/ui/button'

const SECTIONS: Record<string, string> = {
  criadores: 'Criadores',
  aprenda: 'Aprenda',
  ajuda: 'Central de ajuda',
  colecao: 'Minha coleção',
  atividade: 'Atividade',
  estudio: 'Estúdio do criador',
  ofertas: 'Ofertas',
  downloads: 'Arquivos baixados',
  suporte: 'Suporte',
}

/** Seções fora do escopo da entrega: comunicam claramente que não estão disponíveis. */
export const Route = createFileRoute('/em-breve/$secao')({
  head: ({ params }) => ({ meta: [{ title: `${SECTIONS[params.secao] ?? 'Em breve'} · KURIO` }] }),
  staticData: { mobileHeader: 'back', mobileTitle: 'Em breve' },
  component: ComingSoon,
})

function ComingSoon() {
  const { secao } = Route.useParams()
  const title = SECTIONS[secao] ?? 'Esta seção'
  return (
    <div className="container-kurio py-12 md:py-16">
      <h1 className="sr-only">{title}</h1>
      <EmptyState
        icon={<Hourglass className="size-6" />}
        title={`${title} chega em breve`}
        description="Esta área não faz parte desta versão do KURIO. Nenhuma ação foi executada — continue explorando o mercado."
        action={
          <Button asChild>
            <Link to="/" hash="mercado">
              Explorar o mercado
            </Link>
          </Button>
        }
      />
    </div>
  )
}
