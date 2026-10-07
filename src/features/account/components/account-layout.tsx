import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Download, Heart, LifeBuoy, LogOut, ShoppingCart, TrendingUp, UserRound, Wallet } from 'lucide-react'
import { useLogout } from '@/features/auth/session'
import { cn } from '@/lib/utils'

const ITEMS = [
  { label: 'Dados do perfil', to: '/conta/perfil', icon: UserRound },
  { label: 'Carteiras', to: '/conta/carteiras', icon: Wallet },
  { label: 'Atividade', to: '/em-breve/$secao', secao: 'atividade', icon: ShoppingCart, soon: true },
  { label: 'Lista de interesse', to: '/conta/favoritos', icon: Heart },
  { label: 'Ofertas', to: '/em-breve/$secao', secao: 'ofertas', icon: TrendingUp, soon: true },
  { label: 'Arquivos baixados', to: '/em-breve/$secao', secao: 'downloads', icon: Download, soon: true },
  { label: 'Suporte', to: '/em-breve/$secao', secao: 'suporte', icon: LifeBuoy, soon: true },
] as const

/** Menu "Meu perfil" do Figma (lateral no desktop, abas roláveis no mobile). */
export function AccountLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const logout = useLogout()

  return (
    <div className="container-kurio flex flex-col gap-6 pt-4 md:flex-row md:gap-7 md:pt-8">
      <nav aria-label="Minha conta" className="shrink-0 md:w-[310px]">
        <div className="bg-surface md:pb-0">
          <h2 className="hidden px-2.5 pt-6 pb-3 text-lg leading-4 font-bold md:block">Meu perfil</h2>
          <ul className="flex scrollbar-none gap-1 overflow-x-auto p-2 md:flex-col md:gap-0 md:p-0">
            {ITEMS.map(({ label, to, icon: Icon, ...item }) => {
              const secao = 'secao' in item ? item.secao : undefined
              const href = secao ? `/em-breve/${secao}` : to
              const active = pathname === href
              return (
                <li key={label} className="shrink-0">
                  <Link
                    to={to}
                    params={secao ? { secao } : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-11 items-center gap-3 rounded-md border-l-4 border-transparent px-3 text-15 whitespace-nowrap text-text-accent transition-colors hover:bg-surface-raised md:rounded-none md:px-3.5',
                      active && 'border-primary bg-surface-raised md:bg-transparent',
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                    {label}
                    {'soon' in item && <span className="sr-only">(em breve)</span>}
                  </Link>
                </li>
              )
            })}
            <li className="shrink-0 md:border-t md:border-border">
              <button
                type="button"
                onClick={() => logout.mutate()}
                className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-md border-l-4 border-transparent px-3 text-15 font-bold whitespace-nowrap text-text-accent hover:bg-surface-raised md:rounded-none md:px-3.5"
              >
                <LogOut className="size-5" aria-hidden="true" /> Sair
              </button>
            </li>
          </ul>
        </div>
      </nav>
      <div className="min-w-0 flex-1 pb-10">{children}</div>
    </div>
  )
}
