import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { SOCKET_EVENTS, type RealtimeEvent } from '@/contracts'
import { whenApiReady } from '@/api/http'
import { queryKeys } from '@/api/query-keys'
import { announce } from '@/components/live-announcer'
import { sessionStore } from '@/features/auth/session-store'
import { formatEth } from '@/lib/eth'
import { realtimeLog } from './event-log'
import { createEventProcessor, type EventProcessor } from './processor'

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.kurio.mock').replace(/\/$/, '')

/** Após reconectar, os recursos ativos são reconciliados com a API REST (eventos podem ter sido perdidos). */
function reconcile(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all, refetchType: 'active' })
  void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all, refetchType: 'active' })
  void queryClient.invalidateQueries({ queryKey: queryKeys.quote.all, refetchType: 'active' })
  void queryClient.invalidateQueries({
    queryKey: queryKeys.user.all,
    refetchType: 'active',
    predicate: (query) => query.queryKey[2] === 'orders',
  })
}

function notify(event: RealtimeEvent, { inCart }: { inCart: boolean }) {
  if (event.type === 'nft.updated') {
    if (!inCart) return
    const changed = event.data.editions.find((e) => e.price !== e.previousPrice)
    const message =
      event.data.reason === 'price_change' && changed
        ? `O preço de ${event.data.name} mudou de ${formatEth(changed.previousPrice)} para ${formatEth(changed.price)}.`
        : `A disponibilidade de ${event.data.name} mudou.`
    toast.warning('Item do seu carrinho foi atualizado', {
      id: `nft-${event.data.nftId}`,
      description: message,
    })
    announce(message)
    return
  }
  if (event.data.status === 'confirmed') {
    toast.success('Pagamento confirmado!', {
      id: `order-${event.data.orderId}`,
      description: 'Seus NFTs já estão na sua carteira.',
    })
    announce('Pagamento confirmado. Seus NFTs já estão na sua carteira.', 'assertive')
  } else if (event.data.status === 'declined') {
    toast.error('Pagamento recusado', {
      id: `order-${event.data.orderId}`,
      description: event.data.failureReason ?? 'Nenhum valor foi cobrado.',
    })
    announce('Pagamento recusado. Nenhum valor foi cobrado.', 'assertive')
  }
}

/**
 * Mantém uma conexão Socket.IO por sessão. Ao trocar de usuário (ou sair), a conexão anterior
 * é encerrada e seus listeners liberados antes de abrir a nova — eventos da sessão anterior
 * não alcançam o cache da próxima.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const token = useSyncExternalStore(sessionStore.subscribe, sessionStore.getToken, () => null)
  const processorRef = useRef<EventProcessor | null>(null)

  processorRef.current ??= createEventProcessor({
    queryClient,
    getUserId: sessionStore.getUserId,
    onApplied: notify,
  })

  useEffect(() => {
    const processor = processorRef.current!
    processor.resetPrivate()
    let disposed = false
    let socket: Socket | null = null
    let hasConnected = false
    realtimeLog.setStatus('connecting')

    const handleOnline = () => socket?.connect()

    void (async () => {
      await whenApiReady()
      const { io } = await import('socket.io-client')
      if (disposed) return
      socket = io(SOCKET_URL, {
        transports: ['websocket'],
        auth: token ? { token } : {},
        reconnectionDelay: 800,
        reconnectionDelayMax: 5_000,
        timeout: 8_000,
      })
      socket.on('connect', () => {
        realtimeLog.setStatus('connected')
        if (hasConnected) {
          realtimeLog.countReconnection()
          reconcile(queryClient)
        }
        hasConnected = true
      })
      socket.on('disconnect', (reason) => {
        realtimeLog.setStatus(reason === 'io client disconnect' ? 'offline' : 'reconnecting')
      })
      socket.on('connect_error', () => realtimeLog.setStatus('reconnecting'))
      for (const name of SOCKET_EVENTS) {
        socket.on(name, (payload: unknown) => {
          if (disposed) return
          realtimeLog.push(processor.process(payload))
        })
      }
      window.addEventListener('online', handleOnline)
    })()

    return () => {
      disposed = true
      window.removeEventListener('online', handleOnline)
      if (socket) {
        socket.removeAllListeners()
        socket.io.removeAllListeners()
        socket.disconnect()
      }
      realtimeLog.setStatus('idle')
    }
  }, [token, queryClient])

  return children
}

export function useRealtimeStatus() {
  return useSyncExternalStore(realtimeLog.subscribe, realtimeLog.getSnapshot, realtimeLog.getSnapshot)
}
