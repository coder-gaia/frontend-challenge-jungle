import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import {
  Activity,
  CircleSlash,
  Copy,
  History,
  RefreshCw,
  RotateCcw,
  Timer,
  TrendingDown,
  TrendingUp,
  UserRoundCog,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/api/errors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLogin, useLogout, useSession } from '@/features/auth/session'
import { useCart } from '@/features/cart/queries'
import type { EventOutcome } from '@/features/realtime/event-log'
import { realtimeLog } from '@/features/realtime/event-log'
import { useRealtimeStatus } from '@/features/realtime/realtime-provider'
import { removeStorage, STORAGE_KEYS } from '@/lib/storage'
import { useFocusReturn } from '@/lib/use-focus-return'
import { useIsDesktop } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { mockApi, type MockState } from './mock-api'

const OUTCOME: Record<EventOutcome, { label: string; className: string; hint: string }> = {
  applied: {
    label: 'aplicado',
    className: 'bg-success/20 text-success',
    hint: 'Versão nova: cache atualizado',
  },
  duplicate: {
    label: 'duplicado',
    className: 'bg-amber/20 text-amber',
    hint: 'Mesmo id já processado: ignorado',
  },
  stale: {
    label: 'obsoleto',
    className: 'bg-coral/20 text-coral',
    hint: 'Versão ≤ conhecida: estado não regride',
  },
  foreign: {
    label: 'outro usuário',
    className: 'bg-surface-dark text-text-secondary',
    hint: 'Evento de outra sessão: descartado',
  },
  invalid: {
    label: 'inválido',
    className: 'bg-destructive/20 text-destructive-foreground',
    hint: 'Fora do contrato',
  },
}

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function useMockState(open: boolean) {
  return useQuery({
    queryKey: ['devtools', 'mock-state'],
    queryFn: mockApi.state,
    refetchInterval: open ? 1500 : false,
    staleTime: 0,
    retry: false,
  })
}

function useAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ run }: { run: () => Promise<unknown>; label: string }) => run(),
    onSuccess: (_data, { label }) => {
      toast.success(label, { id: 'chaos-action' })
      void queryClient.invalidateQueries({ queryKey: ['devtools'] })
    },
    onError: (error) => toast.error('Falha no Chaos Lab', { description: errorMessage(error) }),
  })
}

function Section({
  title,
  children,
  icon,
}: {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised/40 p-3">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  )
}

function ScenariosTab({ state }: { state: MockState | undefined }) {
  const action = useAction()
  const config = state?.config
  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Cenários determinísticos"
        icon={<Zap className="size-4 text-text-accent" aria-hidden="true" />}
      >
        <p className="text-xs text-text-secondary">
          Presets reproduzíveis (seed {config?.seed ?? '—'}). Também via URL:{' '}
          <code>?scenario=&lt;id&gt;</code>.
        </p>
        <ul className="flex flex-col gap-1.5" aria-label="Cenários">
          {state?.scenarios.map((scenario) => {
            const active = config?.scenario === scenario.id
            return (
              <li key={scenario.id}>
                <button
                  type="button"
                  onClick={() =>
                    action.mutate({
                      run: () => mockApi.setScenario(scenario.id),
                      label: `Cenário: ${scenario.label}`,
                    })
                  }
                  aria-pressed={active}
                  className={cn(
                    'w-full cursor-pointer rounded-md border px-3 py-2 text-left transition-colors hover:border-primary/70',
                    active ? 'border-primary bg-primary/10' : 'border-border',
                  )}
                  data-testid={`scenario-${scenario.id}`}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-bold">
                    {scenario.label}
                    <code className="text-[10px] font-normal text-text-muted">{scenario.id}</code>
                  </span>
                  <span className="mt-0.5 block text-xs leading-4 text-text-secondary">
                    {scenario.description}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </Section>
      <Section title="Ajustes finos" icon={<Timer className="size-4 text-text-accent" aria-hidden="true" />}>
        <label className="flex items-center justify-between gap-3 text-sm">
          Latência
          <select
            className="h-8 rounded border border-border bg-background px-2 text-sm"
            value={config?.latency ?? 'realistic'}
            onChange={(e) =>
              action.mutate({
                run: () => mockApi.configure({ latency: e.target.value as MockState['config']['latency'] }),
                label: `Latência: ${e.target.value}`,
              })
            }
          >
            <option value="instant">Instantânea</option>
            <option value="realistic">Realista (60–220 ms)</option>
            <option value="slow">Lenta (1,6–2,6 s)</option>
            <option value="chaotic">Caótica (fora de ordem)</option>
          </select>
        </label>
        {(
          [
            [
              'offline',
              'Sem conexão (REST e Socket.IO)',
              config?.offline ?? false,
              (v: boolean) => ({ offline: v }),
            ],
            [
              'payment',
              'Recusar pagamentos',
              config?.payment.outcome === 'decline',
              (v: boolean) => ({
                payment: { outcome: v ? 'decline' : 'approve', delayMs: config?.payment.delayMs ?? 2500 },
              }),
            ],
            [
              'pulse',
              'Mercado ao vivo (preços a cada 8 s)',
              config?.realtime.marketPulse ?? false,
              (v: boolean) => ({
                realtime: {
                  ...(config?.realtime ?? { available: true, pulseIntervalMs: 8000 }),
                  marketPulse: v,
                },
              }),
            ],
          ] as const
        ).map(([id, label, checked, patch]) => (
          <label key={id} className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            {label}
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={checked}
              onChange={(e) =>
                action.mutate({
                  run: () => mockApi.configure(patch(e.target.checked) as Partial<MockState['config']>),
                  label: `${label}: ${e.target.checked ? 'ligado' : 'desligado'}`,
                })
              }
            />
          </label>
        ))}
      </Section>
      <Button
        variant="outline"
        onClick={async () => {
          await mockApi.reset()
          for (const key of Object.values(STORAGE_KEYS)) {
            removeStorage(key)
            removeStorage(key, 'session')
          }
          window.location.assign('/')
        }}
        data-testid="chaos-reset"
      >
        <RotateCcw className="size-4" aria-hidden="true" /> Resetar dados e cenário (seed)
      </Button>
    </div>
  )
}

function RealtimeTab({ state }: { state: MockState | undefined }) {
  const action = useAction()
  const { status, events, reconnections } = useRealtimeStatus()
  const { data: cart } = useCart()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const detailId = pathname.startsWith('/nft/') ? decodeURIComponent(pathname.split('/')[2] ?? '') : null
  const targets = [
    ...(cart?.lines.map((line) => ({
      id: `${line.nftId}|${line.editionId}`,
      label: `${line.name} (${line.editionLabel}) — carrinho`,
    })) ?? []),
    ...(detailId ? [{ id: `${detailId}|`, label: `${detailId} — página atual` }] : []),
    { id: 'sage-nomad-009|', label: 'Sage Nomad #009 — destaque' },
  ]
  const [target, setTarget] = useState(targets[0]?.id ?? '')
  const selected = targets.some((t) => t.id === target) ? target : (targets[0]?.id ?? '')
  const [nftId = '', editionId] = selected.split('|')

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Conexão Socket.IO"
        icon={<Activity className="size-4 text-text-accent" aria-hidden="true" />}
      >
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-text-secondary">Cliente</dt>
          <dd data-testid="chaos-client-status">{status}</dd>
          <dt className="text-text-secondary">Reconexões</dt>
          <dd>{reconnections}</dd>
          <dt className="text-text-secondary">Servidor aceitando</dt>
          <dd>{state ? (state.realtime.accepting ? 'sim' : 'não') : '—'}</dd>
          <dt className="text-text-secondary">Conexões (autenticadas)</dt>
          <dd>{state ? `${state.realtime.connections} (${state.realtime.authenticated})` : '—'}</dd>
          <dt className="text-text-secondary">Interceptação</dt>
          <dd data-testid="chaos-transport">
            {state ? (state.transport === 'service-worker' ? 'Service Worker' : 'Em página') : '—'}
          </dd>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => action.mutate({ run: () => mockApi.dropRealtime(0), label: 'Conexão derrubada' })}
          >
            <RefreshCw className="size-4" aria-hidden="true" /> Derrubar e reconectar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              action.mutate({ run: () => mockApi.dropRealtime(8000), label: 'Servidor fora por 8 s' })
            }
          >
            <CircleSlash className="size-4" aria-hidden="true" /> Fora do ar por 8 s
          </Button>
        </div>
      </Section>

      <Section
        title="Disparar eventos (pelo servidor)"
        icon={<Zap className="size-4 text-text-accent" aria-hidden="true" />}
      >
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Alvo
          <select
            className="h-8 rounded border border-border bg-background px-2 text-sm text-foreground"
            value={selected}
            onChange={(e) => setTarget(e.target.value)}
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              action.mutate({
                run: () => mockApi.changePrice(nftId, 10, editionId || undefined),
                label: 'Preço +10% emitido',
              })
            }
            data-testid="chaos-price-up"
          >
            <TrendingUp className="size-4" aria-hidden="true" /> Preço +10%
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              action.mutate({
                run: () => mockApi.changePrice(nftId, -10, editionId || undefined),
                label: 'Preço −10% emitido',
              })
            }
          >
            <TrendingDown className="size-4" aria-hidden="true" /> Preço −10%
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              action.mutate({
                run: () => mockApi.setAvailability(nftId, 0, editionId || undefined),
                label: 'Edição esgotada',
              })
            }
          >
            <CircleSlash className="size-4" aria-hidden="true" /> Esgotar edição
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              action.mutate({ run: () => mockApi.replayLastEvent(), label: 'Último evento reenviado' })
            }
            data-testid="chaos-duplicate"
          >
            <Copy className="size-4" aria-hidden="true" /> Duplicar último
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="col-span-2"
            onClick={() =>
              action.mutate({ run: () => mockApi.emitStaleEvent(), label: 'Evento antigo emitido' })
            }
            data-testid="chaos-stale"
          >
            <History className="size-4" aria-hidden="true" /> Enviar versão antiga (fora de ordem)
          </Button>
        </div>
      </Section>

      <Section
        title="Eventos recebidos pelo cliente"
        icon={<Activity className="size-4 text-text-accent" aria-hidden="true" />}
      >
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>Deduplicação por id · ordenação por versão</span>
          <button
            type="button"
            className="cursor-pointer text-text-accent hover:underline"
            onClick={() => realtimeLog.clear()}
          >
            Limpar
          </button>
        </div>
        {events.length === 0 ? (
          <p className="text-xs text-text-muted">
            Nenhum evento ainda. Dispare um acima ou ligue o "Mercado ao vivo".
          </p>
        ) : (
          <ol
            className="flex max-h-72 flex-col gap-1.5 overflow-y-auto"
            aria-live="polite"
            data-testid="chaos-event-log"
          >
            {events.map((event, index) => (
              <li
                key={`${event.id}-${event.receivedAt}-${index}`}
                className="rounded border border-border p-2 text-xs"
                data-outcome={event.outcome}
              >
                <div className="flex items-center justify-between gap-2">
                  <code className="font-bold">{event.type}</code>
                  <Badge
                    className={cn('border-0', OUTCOME[event.outcome].className)}
                    title={OUTCOME[event.outcome].hint}
                  >
                    {OUTCOME[event.outcome].label}
                  </Badge>
                </div>
                <p className="mt-1 text-text-secondary">{event.summary}</p>
                <p className="mt-0.5 text-[10px] text-text-muted">
                  {timeFormatter.format(event.receivedAt)} · {event.resource} · v{event.version} · {event.id}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  )
}

function SessionTab({ state }: { state: MockState | undefined }) {
  const action = useAction()
  const { session, user } = useSession()
  const login = useLogin()
  const logout = useLogout()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const remaining = session ? Math.max(0, Math.round((Date.parse(session.expiresAt) - now) / 1000)) : null

  const switchTo = async (email: string, password: string) => {
    if (user) await logout.mutateAsync()
    await login.mutateAsync({ email, password })
    toast.success(`Conectado como ${email}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Sessão atual"
        icon={<UserRoundCog className="size-4 text-text-accent" aria-hidden="true" />}
      >
        {user && session ? (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-text-secondary">Usuário</dt>
            <dd>{user.displayName}</dd>
            <dt className="text-text-secondary">Expira em</dt>
            <dd data-testid="chaos-session-remaining">{remaining}s</dd>
          </dl>
        ) : (
          <p className="text-xs text-text-secondary">Navegando como visitante.</p>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={!user}
          onClick={() =>
            action.mutate({ run: () => mockApi.expireSession(), label: 'Sessão expirada no servidor' })
          }
          data-testid="chaos-expire-session"
        >
          <Timer className="size-4" aria-hidden="true" /> Expirar sessão agora
        </Button>
        <p className="text-[11px] text-text-muted">
          A próxima chamada autenticada recebe 401 SESSION_EXPIRED; em rota privada o app leva ao login
          preservando o contexto.
        </p>
      </Section>
      <Section
        title="Trocar de usuário"
        icon={<UserRoundCog className="size-4 text-text-accent" aria-hidden="true" />}
      >
        <p className="text-[11px] text-text-muted">
          Logout limpa o cache privado e encerra o socket da sessão anterior.
        </p>
        {state?.demoAccounts.map((account) => (
          <Button
            key={account.email}
            size="sm"
            variant={user?.email === account.email ? 'default' : 'outline'}
            disabled={user?.email === account.email || login.isPending}
            onClick={() => void switchTo(account.email, account.password)}
          >
            Entrar como {account.name}
          </Button>
        ))}
      </Section>
      {state && state.pendingOrders.length > 0 && (
        <Section title="Pedidos pendentes (servidor)">
          {state.pendingOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-2 text-xs">
              <span>
                {order.number} · {order.outcome === 'approve' ? 'será aprovado' : 'será recusado'}
              </span>
              <Button
                size="xs"
                variant="outline"
                onClick={() =>
                  action.mutate({
                    run: () => mockApi.resolveOrder(order.id),
                    label: `Pedido ${order.number} resolvido`,
                  })
                }
              >
                Resolver agora
              </Button>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}

export default function ChaosLabPanel({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const desktop = useIsDesktop()
  const { data: state } = useMockState(open)
  const returnFocus = useFocusReturn(open)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? 'right' : 'bottom'}
        className={cn(
          'gap-0 border-border-soft bg-surface p-0',
          desktop ? 'w-[440px] sm:max-w-[440px]' : 'max-h-[88dvh] rounded-t-3xl',
        )}
        data-testid="chaos-lab"
        onCloseAutoFocus={returnFocus}
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            Chaos Lab
            <Badge variant="outline" className="border-primary/50 text-text-accent">
              {state?.config.scenario ?? '…'}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Controle o backend simulado (MSW) e veja como o app reage a falhas, latência e eventos em tempo
            real.
          </SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="scenarios" className="min-h-0 flex-1 gap-0">
          <TabsList className="mx-4 mt-3 grid grid-cols-3">
            <TabsTrigger value="scenarios">Cenários</TabsTrigger>
            <TabsTrigger value="realtime">Tempo real</TabsTrigger>
            <TabsTrigger value="session">Sessão</TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <TabsContent value="scenarios">
              <ScenariosTab state={state} />
            </TabsContent>
            <TabsContent value="realtime">
              <RealtimeTab state={state} />
            </TabsContent>
            <TabsContent value="session">
              <SessionTab state={state} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
