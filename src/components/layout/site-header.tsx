import { lazy, Suspense, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { LogIn, Menu, Search, ShoppingCart } from 'lucide-react'
import { useRouteMeta } from '@/app/route-meta'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/session'
import { useCart } from '@/features/cart/queries'
import { cn } from '@/lib/utils'
import { KurioWordmark } from './kurio-wordmark'
import { RealtimeAlert } from './realtime-indicator'
import { UserAvatar } from '@/components/user-avatar'
import { openSearch } from './search-host'

const UserMenu = lazy(() => import('./user-menu'))
const NavSheet = lazy(() => import('./nav-sheet'))

export const NAV_ITEMS = [
  { id: 'home', label: 'Início', to: '/', hash: undefined },
  { id: 'market', label: 'Mercado', to: '/', hash: 'mercado' },
  { id: 'creators', label: 'Criadores', to: '/em-breve/$secao', params: { secao: 'criadores' } },
  { id: 'learn', label: 'Aprenda', to: '/em-breve/$secao', params: { secao: 'aprenda' } },
] as const

export function CartLink({ className }: { className?: string }) {
  const { data: cart } = useCart()
  const count = cart?.itemCount ?? 0
  return (
    <Link
      to="/carrinho"
      className={cn(
        'relative inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-raised',
        className,
      )}
      aria-label={count ? `Carrinho com ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}
      data-testid="header-cart"
    >
      <ShoppingCart className="size-6" aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          data-testid="cart-badge"
          className="absolute top-1 right-0 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-ink bg-primary px-0.5 text-[10px] leading-none font-medium text-ink"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

function LoginButton() {
  const href = useRouterState({ select: (s) => s.location.href })
  const redirect = href.startsWith('/entrar') || href.startsWith('/cadastro') ? undefined : href
  return (
    <Button asChild className="h-[35px] gap-1 px-2.5 text-base font-medium">
      <Link to="/entrar" search={{ redirect }}>
        <LogIn className="size-5" aria-hidden="true" />
        Entrar
      </Link>
    </Button>
  )
}

/** Header desktop/tablet (o mobile usa `MobileTopBar` + barra de abas). */
export function SiteHeader() {
  const meta = useRouteMeta()
  const { user, isPending } = useSession()

  return (
    <header className="container-kurio hidden pt-6 md:block">
      <div className="grid h-[45px] grid-cols-[1fr_auto_1fr] items-start border-b border-primary/30">
        <div className="flex h-[35px] items-center gap-3">
          <MobileNavSheet />
          <Link to="/" aria-label="KURIO, página inicial" className="rounded-sm">
            <KurioWordmark />
          </Link>
        </div>

        <nav aria-label="Principal" className="hidden h-full gap-10 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = meta.nav === item.id
            return (
              <Link
                key={item.id}
                to={item.to}
                hash={'hash' in item ? item.hash : undefined}
                params={'params' in item ? item.params : undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-full items-start text-base leading-[21px] transition-colors hover:text-text-accent',
                  active && 'font-bold text-text-accent',
                )}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute right-0 -bottom-0.5 left-0 h-[3px] rounded-full bg-primary"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex h-[35px] items-center justify-end gap-5 xl:gap-7">
          <RealtimeAlert />
          <button
            type="button"
            onClick={openSearch}
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-md hover:bg-surface-raised"
            aria-label="Buscar NFTs (atalho Ctrl+K)"
            aria-keyshortcuts="Control+K Meta+K"
          >
            <Search className="size-5" aria-hidden="true" />
          </button>
          <CartLink />
          {user ? (
            <Suspense fallback={<UserAvatar user={user} />}>
              <UserMenu user={user} />
            </Suspense>
          ) : isPending ? (
            <div className="h-[35px] w-[100px]" />
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </header>
  )
}

/** Navegação principal em gaveta para tablets (entre md e lg), carregada no primeiro clique. */
function MobileNavSheet() {
  const [open, setOpen] = useState(false)
  const [requested, setRequested] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        aria-label="Abrir menu de navegação"
        aria-expanded={open}
        onClick={() => {
          setRequested(true)
          setOpen(true)
        }}
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>
      {requested && (
        <Suspense fallback={null}>
          <NavSheet open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  )
}
