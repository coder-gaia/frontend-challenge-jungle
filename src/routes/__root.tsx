import { createRootRouteWithContext, HeadContent, Outlet, useRouter } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { useRouteMeta } from '@/app/route-meta'
import { LiveAnnouncer } from '@/components/live-announcer'
import { MobileTabBar, MobileTopBar } from '@/components/layout/mobile-nav'
import { SearchHost } from '@/components/layout/search-host'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { OfflineBanner, RouteAnnouncer } from '@/components/layout/status-banners'
import { ErrorState, NotFoundState } from '@/components/page-states'
import { Toaster } from '@/components/ui/sonner'
import { ChaosLabLauncher } from '@/features/devtools/chaos-lab-launcher'
import { SessionLifecycle } from '@/features/auth/session-lifecycle'
import { PendingOrderNotice } from '@/features/orders/pending-order-notice'
import { cn } from '@/lib/utils'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [{ title: 'KURIO · Marketplace de NFTs' }],
  }),
  component: RootLayout,
  notFoundComponent: () => <NotFoundState />,
  errorComponent: RootError,
})

function RootLayout() {
  const meta = useRouteMeta()
  return (
    <>
      <HeadContent />
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      <OfflineBanner />
      <SessionLifecycle />
      <RouteAnnouncer />
      <SiteHeader />
      <MobileTopBar />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <SiteFooter className={cn(meta.hideTabBar && 'hidden md:block')} />
      <MobileTabBar />
      <SearchHost />
      <PendingOrderNotice />
      <Toaster position="top-center" closeButton />
      <LiveAnnouncer />
      <ChaosLabLauncher />
    </>
  )
}

function RootError({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter()
  return (
    <div className="container-kurio py-16">
      <ErrorState
        error={error}
        title="Algo deu errado nesta página"
        onRetry={() => {
          reset()
          void router.invalidate()
        }}
      />
    </div>
  )
}
