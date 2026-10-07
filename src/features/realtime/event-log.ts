import type { RealtimeEventType } from '@/contracts'

export type EventOutcome = 'applied' | 'duplicate' | 'stale' | 'foreign' | 'invalid'

export interface ProcessedEvent {
  id: string
  type: RealtimeEventType | 'unknown'
  resource: string
  version: number
  outcome: EventOutcome
  summary: string
  receivedAt: number
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

/** Estado observável do tempo real (status + últimos eventos), consumido pela UI e pelo Chaos Lab. */
const LIMIT = 60
let events: ProcessedEvent[] = []
let status: ConnectionStatus = 'idle'
let reconnections = 0
const listeners = new Set<() => void>()
export interface RealtimeSnapshot {
  events: ProcessedEvent[]
  status: ConnectionStatus
  reconnections: number
}
let snapshot: RealtimeSnapshot = { events, status, reconnections }

function emit() {
  snapshot = { events, status, reconnections }
  listeners.forEach((listener) => listener())
}

export const realtimeLog = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot: () => snapshot,
  push(event: ProcessedEvent) {
    events = [event, ...events].slice(0, LIMIT)
    emit()
  },
  setStatus(next: ConnectionStatus) {
    if (next === status) return
    status = next
    emit()
  },
  countReconnection() {
    reconnections += 1
    emit()
  },
  clear() {
    events = []
    emit()
  },
}
