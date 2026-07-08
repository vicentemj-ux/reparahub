/**
 * Diagnostico PRO (health check) persistido en `reparaciones.checklist_pro`.
 * Cada item es ternario: pass / fail / na (sin probar, por defecto).
 */
import { itemsForDeviceType } from "@/lib/reparaciones/checklist-ingreso"

export type HealthProbeStatus = "pass" | "fail" | "na"

export interface ChecklistProData {
  funcional: Record<string, HealthProbeStatus>
  /** Si el tecnico omite el minimo de pruebas (express). */
  expressOmitReason?: string | null
}

/** Convierte valores legacy (boolean) o desconocidos a estatus ternario. */
export function normalizeProbeStatus(v: unknown): HealthProbeStatus {
  if (v === "pass" || v === "fail" || v === "na") return v
  if (v === true) return "pass"
  if (v === false) return "fail"
  return "na"
}

export function parseChecklistPro(raw: unknown): ChecklistProData | null {
  try {
    let data: unknown = raw
    if (typeof raw === "string") {
      const t = raw.trim()
      if (!t) return null
      data = JSON.parse(t) as unknown
    }
    if (data == null || typeof data !== "object" || Array.isArray(data)) return null
    const o = data as Record<string, unknown>
    const func = o.funcional
    if (!func || typeof func !== "object" || Array.isArray(func)) {
      const exOnly = o.expressOmitReason
      return {
        funcional: {},
        expressOmitReason: typeof exOnly === "string" && exOnly.trim() ? exOnly.trim() : null,
      }
    }
    const funcional: Record<string, HealthProbeStatus> = {}
    for (const [k, v] of Object.entries(func as Record<string, unknown>)) {
      funcional[k] = normalizeProbeStatus(v)
    }
    const ex = o.expressOmitReason
    return {
      funcional,
      expressOmitReason: typeof ex === "string" && ex.trim() ? ex.trim() : null,
    }
  } catch {
    return null
  }
}

/**
 * Nunca lanza: util en visor / UI ante JSON corrupto o tipos inesperados.
 * Convierte boolean legacy y valores raros a pass / fail / na.
 */
export function safeNormalizeChecklistPro(raw: unknown): ChecklistProData {
  try {
    const parsed = parseChecklistPro(raw)
    if (!parsed) return { funcional: {}, expressOmitReason: null }
    const out: Record<string, HealthProbeStatus> = {}
    const fr = parsed.funcional
    if (fr && typeof fr === "object" && !Array.isArray(fr)) {
      for (const [k, v] of Object.entries(fr as Record<string, unknown>)) {
        out[k] = normalizeProbeStatus(v)
      }
    }
    return {
      funcional: out,
      expressOmitReason:
        typeof parsed.expressOmitReason === "string" && parsed.expressOmitReason.trim()
          ? parsed.expressOmitReason.trim()
          : null,
    }
  } catch {
    return { funcional: {}, expressOmitReason: null }
  }
}

/** Cuenta pruebas marcadas como pass. */
export function countHealthProbesOk(funcional: Record<string, HealthProbeStatus> | undefined): number {
  if (!funcional || typeof funcional !== "object") return 0
  return Object.values(funcional).filter((v) => v === "pass").length
}

export const MIN_HEALTH_PROBES = 5

/** Hay al menos un dato distinto de «sin probar» o motivo express. */
export function hasMeaningfulChecklistProData(cp: ChecklistProData): boolean {
  if (cp.expressOmitReason?.trim()) return true
  return Object.values(cp.funcional).some((v) => v !== "na")
}

/** Cumple regla de minimo 5 pruebas OK o omision express documentada. */
export function passesHealthCheckRequirement(checklistProRaw: unknown): boolean {
  const cp = parseChecklistPro(checklistProRaw)
  if (!cp) return false
  if (cp.expressOmitReason && cp.expressOmitReason.trim().length > 0) return true
  return countHealthProbesOk(cp.funcional) >= MIN_HEALTH_PROBES
}

export function checklistProToJson(data: ChecklistProData): Record<string, unknown> {
  return {
    funcional: data.funcional,
    expressOmitReason: data.expressOmitReason?.trim() ? data.expressOmitReason.trim() : null,
  }
}

/** Asegura una entrada por cada key del tipo de equipo; faltantes → na. */
export function mergeFuncionalWithDeviceKeys(
  deviceType: string,
  existing: Record<string, HealthProbeStatus>,
): Record<string, HealthProbeStatus> {
  const safeExisting =
    existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {}
  const keys = itemsForDeviceType(deviceType?.trim() || "Otro").map((i) => i.key)
  const out: Record<string, HealthProbeStatus> = {}
  for (const k of keys) {
    out[k] = normalizeProbeStatus(safeExisting[k])
  }
  return out
}

export type DiagnosisProBadgeVariant = "empty" | "filled"

/** Texto del badge de resumen en el visor de ticket. */
export function getDiagnosisProBadgeText(
  deviceType: string,
  raw: ChecklistProData | null | undefined,
): { text: string; variant: DiagnosisProBadgeVariant } {
  try {
    const dt = deviceType?.trim() || "Otro"
    const cp = raw ?? { funcional: {}, expressOmitReason: null }
    const funcRaw = cp.funcional
    const funcObj =
      funcRaw && typeof funcRaw === "object" && !Array.isArray(funcRaw)
        ? (funcRaw as Record<string, unknown>)
        : {}
    const keys = itemsForDeviceType(dt).map((i) => i.key)
    const func: Record<string, HealthProbeStatus> = {}
    for (const k of keys) {
      func[k] = normalizeProbeStatus(funcObj[k])
    }
    const hasExpress = Boolean(
      typeof cp.expressOmitReason === "string" && cp.expressOmitReason.trim().length > 0,
    )
    const anyNonNa = keys.some((k) => func[k] !== "na")

    if (!anyNonNa && !hasExpress) {
      return { text: "Diagnostico: Express / Sin Probar", variant: "empty" }
    }
    if (hasExpress && !anyNonNa) {
      return { text: "Diagnostico: Express (omitido)", variant: "empty" }
    }
    const total = keys.length
    const passCount = keys.filter((k) => func[k] === "pass").length
    return {
      text: `Diagnostico Pro: ${passCount}/${total} puntos verificados ✔️`,
      variant: "filled",
    }
  } catch {
    return { text: "Informacion de diagnostico no disponible", variant: "empty" }
  }
}
