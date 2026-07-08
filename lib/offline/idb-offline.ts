const DB_NAME = "reparahub-offline"
const DB_VERSION = 2

export const STORE_NUEVA_REPARACION_DRAFT = "nueva_reparacion_draft"
export const STORE_NUEVA_COTIZACION_DRAFT = "nueva_cotizacion_draft"
export const STORE_REPAIR_QUEUE = "repair_queue"

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("indexedDB no disponible"))
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onerror = () => {
        // Reset so subsequent calls retry instead of caching the rejection forever.
        dbPromise = null
        reject(req.error ?? new Error("IDB open error"))
      }
      req.onsuccess = () => resolve(req.result)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NUEVA_REPARACION_DRAFT)) {
          db.createObjectStore(STORE_NUEVA_REPARACION_DRAFT)
        }
        if (!db.objectStoreNames.contains(STORE_NUEVA_COTIZACION_DRAFT)) {
          db.createObjectStore(STORE_NUEVA_COTIZACION_DRAFT)
        }
        if (!db.objectStoreNames.contains(STORE_REPAIR_QUEUE)) {
          db.createObjectStore(STORE_REPAIR_QUEUE, { keyPath: "id" })
        }
      }
    })
  }
  return dbPromise
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined"
}

export async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  if (!isIndexedDbAvailable()) return undefined
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly")
    const r = tx.objectStore(store).get(key)
    r.onsuccess = () => resolve(r.result as T | undefined)
    r.onerror = () => reject(r.error)
  })
}

export async function idbPut<T>(store: string, key: string, value: T): Promise<void> {
  if (!isIndexedDbAvailable()) return
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite")
    tx.objectStore(store).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function idbDelete(store: string, key: string): Promise<void> {
  if (!isIndexedDbAvailable()) return
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite")
    tx.objectStore(store).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function idbPutQueued<T extends { id: string }>(store: string, value: T): Promise<void> {
  if (!isIndexedDbAvailable()) return
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite")
    tx.objectStore(store).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function idbGetAllQueued<T>(store: string): Promise<T[]> {
  if (!isIndexedDbAvailable()) return []
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly")
    const r = tx.objectStore(store).getAll()
    r.onsuccess = () => resolve((r.result as T[]) ?? [])
    r.onerror = () => reject(r.error)
  })
}

export async function idbDeleteById(store: string, id: string): Promise<void> {
  if (!isIndexedDbAvailable()) return
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite")
    tx.objectStore(store).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
