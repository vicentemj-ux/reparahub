import type { ChecklistIngreso } from "@/lib/reparaciones/checklist-ingreso"
import type { ChecklistProData } from "@/lib/reparaciones/checklist-pro"
import type { SecurityValue } from "@/lib/reparaciones/security"
import type { SelectedServicio } from "@/components/dashboard/servicios/ServiceSelector"
import {
  STORE_NUEVA_REPARACION_DRAFT,
  idbDelete,
  idbGet,
  idbPut,
  isIndexedDbAvailable,
} from "@/lib/offline/idb-offline"

const DRAFT_KEY = "v1"

/** Cliente serializado para borrador */
export interface DraftCliente {
  id: string
  nombre: string
  telefono: string
  correo?: string | null
}

export interface NuevaReparacionDraftV1 {
  v: 1
  savedAt: number
  client: DraftCliente | null
  tipo_equipo: string
  brand: string
  showCustomBrand: boolean
  selectedBrand: string
  customBrand: string
  deviceModel: string
  imei: string
  color: string
  notasInternas: string
  problemDesc: string
  checklistIngreso: ChecklistIngreso
  checklistProHealth: ChecklistProData
  estimatedPrice: string
  fechaPromesaEntrega?: string
  deposit: string
  ingresoACotizar: boolean
  security: SecurityValue
  technician: string
  selectedServices?: SelectedServicio[]
  isReingreso: boolean
  previousFolio: string
  folio: string
  photosBase64: string[]
}

const LS_DRAFT = "tc_nueva_reparacion_draft_v1_fallback"

function readLsDraft(): NuevaReparacionDraftV1 | null {
  try {
    const raw = localStorage.getItem(LS_DRAFT)
    if (!raw) return null
    const p = JSON.parse(raw) as NuevaReparacionDraftV1
    return p?.v === 1 ? p : null
  } catch {
    return null
  }
}

function writeLsDraft(d: NuevaReparacionDraftV1 | null) {
  try {
    if (d == null) localStorage.removeItem(LS_DRAFT)
    else localStorage.setItem(LS_DRAFT, JSON.stringify(d))
  } catch {
    /* quota */
  }
}

export async function saveNuevaReparacionDraft(draft: NuevaReparacionDraftV1): Promise<void> {
  const payload = { ...draft, savedAt: Date.now() }
  if (isIndexedDbAvailable()) {
    try {
      await idbPut(STORE_NUEVA_REPARACION_DRAFT, DRAFT_KEY, payload)
      writeLsDraft(null)
      return
    } catch {
      /* fallback */
    }
  }
  writeLsDraft(payload)
}

export async function loadNuevaReparacionDraft(): Promise<NuevaReparacionDraftV1 | null> {
  if (isIndexedDbAvailable()) {
    try {
      const fromIdb = await idbGet<NuevaReparacionDraftV1>(STORE_NUEVA_REPARACION_DRAFT, DRAFT_KEY)
      if (fromIdb?.v === 1) return fromIdb
    } catch {
      /* */
    }
  }
  return readLsDraft()
}

export async function clearNuevaReparacionDraft(): Promise<void> {
  if (isIndexedDbAvailable()) {
    try {
      await idbDelete(STORE_NUEVA_REPARACION_DRAFT, DRAFT_KEY)
    } catch {
      /* */
    }
  }
  writeLsDraft(null)
}
