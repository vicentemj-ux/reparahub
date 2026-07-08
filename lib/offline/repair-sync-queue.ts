import type { CreateRepairInput } from "@/lib/actions/repairs-prisma"
import {
  STORE_REPAIR_QUEUE,
  idbDeleteById,
  idbGetAllQueued,
  idbPutQueued,
  isIndexedDbAvailable,
} from "@/lib/offline/idb-offline"

export interface QueuedRepairPayload {
  id: string
  input: CreateRepairInput
  createdAt: number
}

const LS_KEY_FALLBACK = "tc_repair_sync_queue_fallback"

/** Disparar tras cambiar la cola para actualizar UI (indicador, etc.). */
export const REPAIR_QUEUE_CHANGED_EVENT = "reparahub-repair-queue-changed"

export function dispatchRepairQueueChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(REPAIR_QUEUE_CHANGED_EVENT))
}

function readFallback(): QueuedRepairPayload[] {
  try {
    const raw = localStorage.getItem(LS_KEY_FALLBACK)
    if (!raw) return []
    const parsed = JSON.parse(raw) as QueuedRepairPayload[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeFallback(items: QueuedRepairPayload[]) {
  try {
    localStorage.setItem(LS_KEY_FALLBACK, JSON.stringify(items))
  } catch {
    /* quota u offline */
  }
}

export async function enqueueRepairQueueItem(input: CreateRepairInput): Promise<string> {
  const id = crypto.randomUUID()
  const item: QueuedRepairPayload = { id, input, createdAt: Date.now() }

  if (isIndexedDbAvailable()) {
    await idbPutQueued(STORE_REPAIR_QUEUE, item)
  } else {
    const list = readFallback()
    list.push(item)
    writeFallback(list)
  }
  return id
}

export async function getRepairQueueOrdered(): Promise<QueuedRepairPayload[]> {
  let items: QueuedRepairPayload[]
  if (isIndexedDbAvailable()) {
    items = await idbGetAllQueued<QueuedRepairPayload>(STORE_REPAIR_QUEUE)
  } else {
    items = readFallback()
  }
  return [...items].sort((a, b) => a.createdAt - b.createdAt)
}

export async function removeRepairQueueItem(id: string): Promise<void> {
  if (isIndexedDbAvailable()) {
    await idbDeleteById(STORE_REPAIR_QUEUE, id)
  }
  const list = readFallback().filter((x) => x.id !== id)
  writeFallback(list)
  dispatchRepairQueueChanged()
}

/** Migra cola fallback → IDB si ahora hay IDB y quedaban items solo en localStorage */
export async function mergeFallbackQueueIntoIdb(): Promise<void> {
  if (!isIndexedDbAvailable()) return
  const fallback = readFallback()
  if (fallback.length === 0) return
  const existing = await idbGetAllQueued<QueuedRepairPayload>(STORE_REPAIR_QUEUE)
  const byId = new Map(existing.map((e) => [e.id, e]))
  for (const it of fallback) {
    if (!byId.has(it.id)) {
      await idbPutQueued(STORE_REPAIR_QUEUE, it)
      byId.set(it.id, it)
    }
  }
  writeFallback([])
  dispatchRepairQueueChanged()
}
