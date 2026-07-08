import {
  STORE_NUEVA_COTIZACION_DRAFT,
  idbDelete,
  idbGet,
  idbPut,
  isIndexedDbAvailable,
} from "@/lib/offline/idb-offline"

const DRAFT_KEY = "v1"

export interface CotizacionDraftItem {
  descripcion: string
  precio_unitario: string
  orden: number
}

export interface NuevaCotizacionDraftV1 {
  v: 1
  savedAt: number
  clienteId: string | null
  clienteNombre: string
  clienteTelefono: string
  equipoTipo: string
  selectedBrand: string
  customBrand: string
  showCustomBrand: boolean
  modelo: string
  descripcion: string
  observaciones: string
  origen: "Mostrador" | "WhatsApp" | "Telefono" | "Internet"
  fechaExpiracion: string
  items: CotizacionDraftItem[]
}

const LS_DRAFT = "tc_nueva_cotizacion_draft_v1_fallback"

function readLsDraft(): NuevaCotizacionDraftV1 | null {
  try {
    if (typeof localStorage === "undefined") return null
    const raw = localStorage.getItem(LS_DRAFT)
    if (!raw) return null
    const p = JSON.parse(raw) as NuevaCotizacionDraftV1
    return p?.v === 1 ? p : null
  } catch {
    return null
  }
}

function writeLsDraft(d: NuevaCotizacionDraftV1 | null) {
  try {
    if (typeof localStorage === "undefined") return
    if (d == null) localStorage.removeItem(LS_DRAFT)
    else localStorage.setItem(LS_DRAFT, JSON.stringify(d))
  } catch {
    /* quota */
  }
}

export async function saveNuevaCotizacionDraft(draft: NuevaCotizacionDraftV1): Promise<void> {
  const payload = { ...draft, savedAt: Date.now() }
  if (isIndexedDbAvailable()) {
    try {
      await idbPut(STORE_NUEVA_COTIZACION_DRAFT, DRAFT_KEY, payload)
      writeLsDraft(null)
      return
    } catch {
      /* fallback */
    }
  }
  writeLsDraft(payload)
}

export async function loadNuevaCotizacionDraft(): Promise<NuevaCotizacionDraftV1 | null> {
  if (isIndexedDbAvailable()) {
    try {
      const fromIdb = await idbGet<NuevaCotizacionDraftV1>(STORE_NUEVA_COTIZACION_DRAFT, DRAFT_KEY)
      if (fromIdb?.v === 1) return fromIdb
    } catch {
      /* */
    }
  }
  return readLsDraft()
}

export async function clearNuevaCotizacionDraft(): Promise<void> {
  if (isIndexedDbAvailable()) {
    try {
      await idbDelete(STORE_NUEVA_COTIZACION_DRAFT, DRAFT_KEY)
    } catch {
      /* */
    }
  }
  writeLsDraft(null)
}
