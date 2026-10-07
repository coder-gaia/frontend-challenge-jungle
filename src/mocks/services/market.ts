import type { NftUpdatedEvent } from '@/contracts'
import { scaleEth } from '@/lib/eth'
import { getConfig, onConfigChange } from '../config'
import { getDb, mutate } from '../db/store'
import { CATALOG } from '../fixtures/catalog'
import { createRng } from '../lib/rng'
import { nextEventId, publish } from '../realtime/server'
import { findCatalogItem, getEditions, toSummary } from './catalog'

/**
 * Mudanças de mercado. Toda alteração passa pelo banco (refletida no REST) e gera um
 * `nft.updated` com versão incrementada (refletido no Socket.IO) — as duas fontes nunca divergem.
 */

type EditionChange = { editionId: string; price?: string; available?: number }

export function applyNftChange(
  nftId: string,
  changes: EditionChange[],
  reason: NftUpdatedEvent['data']['reason'],
): NftUpdatedEvent | null {
  const item = findCatalogItem(nftId)
  if (!item) return null
  const before = new Map(getEditions(item).map((e) => [e.id, e]))

  mutate((db) => {
    const state = db.nfts[nftId]!
    for (const change of changes) {
      const edition = state.editions[change.editionId]
      if (!edition) continue
      if (change.price !== undefined) edition.price = change.price
      if (change.available !== undefined) edition.available = Math.max(0, change.available)
    }
    state.version += 1
  })

  const summary = toSummary(item)
  const event: NftUpdatedEvent = {
    id: nextEventId('nft'),
    type: 'nft.updated',
    resource: { type: 'nft', id: nftId },
    version: summary.version,
    occurredAt: new Date().toISOString(),
    data: {
      nftId,
      name: item.name,
      reason,
      price: summary.price,
      compareAtPrice: summary.compareAtPrice,
      available: summary.available,
      editions: getEditions(item).map((e) => ({
        id: e.id,
        price: e.price,
        previousPrice: before.get(e.id)?.price ?? e.price,
        available: e.available,
      })),
    },
  }
  publish(event)
  return event
}

/** Reajusta o preço de uma edição em `percent` (ex.: 8 → +8%). */
export function changePrice(nftId: string, editionId: string, percent: number) {
  const item = findCatalogItem(nftId)
  const edition = item && getEditions(item).find((e) => e.id === editionId)
  if (!edition) return null
  const factor = (1 + percent / 100).toFixed(4)
  let price = scaleEth(edition.price, factor, 2)
  if (price === edition.price) price = scaleEth(edition.price, percent >= 0 ? '1.0100' : '0.9900', 4)
  return applyNftChange(nftId, [{ editionId, price }], 'price_change')
}

export function setAvailability(nftId: string, editionId: string, available: number) {
  return applyNftChange(nftId, [{ editionId, available }], 'availability_change')
}

/** Ajusta disponibilidade em lote (reserva/liberação de pedidos). */
export function adjustAvailability(lines: Array<{ nftId: string; editionId: string; delta: number }>) {
  const byNft = new Map<string, EditionChange[]>()
  for (const line of lines) {
    const current = getDb().nfts[line.nftId]?.editions[line.editionId]
    if (!current) continue
    const list = byNft.get(line.nftId) ?? []
    list.push({ editionId: line.editionId, available: current.available + line.delta })
    byNft.set(line.nftId, list)
  }
  for (const [nftId, changes] of byNft) applyNftChange(nftId, changes, 'availability_change')
}

// ------------------------------------------------------------------ "mercado ao vivo"

let pulseTimer: ReturnType<typeof setInterval> | null = null
let pulseRng = createRng(getConfig().seed + 7)
let pulseKey = ''

function syncPulse() {
  const { realtime, seed } = getConfig()
  const key = `${seed}:${realtime.marketPulse}:${realtime.pulseIntervalMs}`
  if (key === pulseKey) return
  pulseKey = key
  if (pulseTimer) clearInterval(pulseTimer)
  pulseTimer = null
  if (!realtime.marketPulse) return
  pulseRng = createRng(seed + 7)
  pulseTimer = setInterval(() => {
    const item = pulseRng.pick(CATALOG.slice(0, 24))
    const percent = pulseRng.pick([-6, -4, -3, 3, 4, 6, 8])
    changePrice(item.id, item.defaultEditionId, percent)
  }, realtime.pulseIntervalMs)
}

export function startMarketPulse() {
  syncPulse()
  onConfigChange(syncPulse)
}
