import { Link, useCanGoBack, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { ChevronLeft, Heart, House, ScanSearch, ShoppingCart, UserRound } from 'lucide-react'
import { useRouteMeta } from '@/app/route-meta'
import { useSession } from '@/features/auth/session'
import { useCart } from '@/features/cart/queries'
import { cn } from '@/lib/utils'
import { KurioWordmark } from './kurio-wordmark'
import { openSearch } from './search-host'

/** Botão voltar redondo do Figma (32px, borda #3F2319). */
export function BackButton({
  to,
  className,
  label = 'Voltar',
}: {
  to?: string
  className?: string
  label?: string
}) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => (to ? navigate({ to }) : canGoBack ? router.history.back() : navigate({ to: '/' }))}
      className={cn(
        'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-raised text-text-accent hover:bg-surface-dark',
        className,
      )}
    >
      <ChevronLeft className="size-5" aria-hidden="true" />
    </button>
  )
}

/** Cabeçalho mobile por rota (voltar + título ou marca). */
export function MobileTopBar() {
  const meta = useRouteMeta()
  if (meta.mobileHeader === 'none') return null
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-background/95 px-4 backdrop-blur md:hidden">
      {meta.mobileHeader === 'back' ? (
        <>
          <BackButton to={meta.mobileBackTo} />
          <p className="flex-1 truncate text-center text-xl font-bold">{meta.mobileTitle}</p>
          <span className="size-9" aria-hidden="true" />
        </>
      ) : (
        <>
          <Link to="/" aria-label="KURIO, página inicial">
            <KurioWordmark />
          </Link>
          <span className="flex-1" />
          <button
            type="button"
            onClick={openSearch}
            aria-label="Buscar NFTs"
            className="inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-raised"
          >
            <ScanSearch className="size-5" aria-hidden="true" />
          </button>
        </>
      )}
    </header>
  )
}

/**
 * Barra de abas inferior do layout mobile: Início, Favoritos, busca (botão central),
 * Carrinho e Conta. Oculta em páginas com ações fixas no rodapé (detalhe, carrinho, pagamento).
 */
export function MobileTabBar() {
  const meta = useRouteMeta()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { user } = useSession()
  const { data: cart } = useCart()
  if (meta.hideTabBar) return null

  const count = cart?.itemCount ?? 0
  const tab = (active: boolean) =>
    cn(
      'relative flex size-12 flex-col items-center justify-center rounded-xl transition-colors',
      active ? 'text-text-accent' : 'text-foreground/80 hover:text-text-accent',
    )

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative mx-auto h-[74px] max-w-[480px] rounded-t-[32px] border-t border-border-soft bg-surface shadow-[0_-10px_30px_rgb(10_6_4/0.45)]">
        <div className="grid h-full grid-cols-5 items-center justify-items-center px-4">
          <Link
            to="/"
            className={tab(pathname === '/')}
            aria-label="Início"
            aria-current={pathname === '/' ? 'page' : undefined}
          >
            <House className="size-5" fill={pathname === '/' ? 'currentColor' : 'none'} aria-hidden="true" />
          </Link>
          <Link
            to="/conta/favoritos"
            className={tab(pathname === '/conta/favoritos')}
            aria-label="Lista de interesse"
            aria-current={pathname === '/conta/favoritos' ? 'page' : undefined}
          >
            <Heart
              className="size-5"
              fill={pathname === '/conta/favoritos' ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          </Link>
          <button
            type="button"
            onClick={openSearch}
            aria-label="Buscar NFTs"
            className="-mt-12 flex size-16 cursor-pointer items-center justify-center rounded-full border-4 border-background bg-linear-to-b from-primary/50 to-primary text-ink shadow-[0_8px_20px_rgb(210_138_76/0.35)]"
          >
            <ScanSearch className="size-7" aria-hidden="true" />
          </button>
          <Link
            to="/carrinho"
            className={tab(pathname === '/carrinho')}
            aria-label={count ? `Carrinho com ${count} itens` : 'Carrinho vazio'}
          >
            <ShoppingCart className="size-5" aria-hidden="true" />
            {count > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-surface bg-primary px-0.5 text-[10px] font-medium text-ink"
              >
                {count}
              </span>
            )}
          </Link>
          <Link
            to={user ? '/conta/perfil' : '/entrar'}
            className={tab(pathname.startsWith('/conta/perfil') || pathname.startsWith('/conta/carteiras'))}
            aria-label={user ? 'Minha conta' : 'Entrar'}
          >
            <UserRound className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </nav>
  )
}
