/**
 * Checklist de ingreso - almacenado en `reparaciones.checklist_ingreso` (JSONB).
 */
export type EncendidoRecepcion = "ok" | "intermitente" | "no"

export function encendidoRecepcionLabel(e: EncendidoRecepcion | null): string {
  if (e === "ok") return "Enciende y entra a sistema"
  if (e === "intermitente") return "Enciende con dificultad"
  if (e === "no") return "No enciende"
  return "-"
}

export interface ChecklistIngreso {
  encendido: EncendidoRecepcion | null
  /** true = funciona / OK, false = falla reportada */
  funcional: Record<string, boolean>
  observacionesEsteticas: string
}

/** Health check por tipo de equipo - 10 puntos de diagnostico funcional por categoria. */
export const CHECKLIST_FUNCIONAL_ITEMS: Record<
  string,
  readonly { key: string; label: string }[]
> = {
  Celular: [
    { key: "camaras", label: "Camaras" },
    { key: "sensores", label: "Sensores" },
    { key: "puertos", label: "Puertos" },
    { key: "pantalla", label: "Pantalla" },
    { key: "audio", label: "Audio / altavoz" },
    { key: "bateria", label: "Bateria / carga" },
    { key: "wifi_bt", label: "Wi‑Fi / Bluetooth" },
    { key: "botones", label: "Botones laterales" },
    { key: "microfono", label: "Microfono" },
    { key: "biometria", label: "Face ID / huella" },
  ],
  Tablet: [
    { key: "camaras", label: "Camaras" },
    { key: "sensores", label: "Sensores" },
    { key: "puertos", label: "Puertos" },
    { key: "pantalla", label: "Pantalla / tactil" },
    { key: "audio", label: "Audio" },
    { key: "bateria", label: "Bateria / carga" },
    { key: "wifi_bt", label: "Wi‑Fi / Bluetooth" },
    { key: "botones", label: "Botones" },
    { key: "microfono", label: "Microfono" },
    { key: "estructura", label: "Estructura / bisagras" },
  ],
  Laptop: [
    { key: "pantalla", label: "Pantalla" },
    { key: "teclado", label: "Teclado" },
    { key: "trackpad", label: "Trackpad / raton" },
    { key: "puertos", label: "Puertos / USB" },
    { key: "audio", label: "Audio" },
    { key: "wifi_bt", label: "Wi‑Fi / Bluetooth" },
    { key: "bateria", label: "Bateria / carga" },
    { key: "camara", label: "Camara" },
    { key: "ventilacion", label: "Ventilacion" },
    { key: "estructura", label: "Estructura / bisagras" },
  ],
  Videojuego: [
    { key: "controles", label: "Controles" },
    { key: "puertos", label: "Puertos / USB" },
    { key: "video", label: "Video / HDMI" },
    { key: "audio", label: "Audio" },
    { key: "disco", label: "Disco / almacenamiento" },
    { key: "ventilacion", label: "Ventilacion" },
    { key: "lector", label: "Lector de cartuchos / discos" },
    { key: "wifi_bt", label: "Wi‑Fi / Bluetooth" },
    { key: "alimentacion", label: "Alimentacion" },
    { key: "estructura", label: "Estructura" },
  ],
  Impresora: [
    { key: "alimentacion_electrica", label: "Alimentacion / encendido" },
    { key: "conectividad", label: "Conectividad (USB / Wi‑Fi / Ethernet)" },
    { key: "calidad_impresion", label: "Calidad de impresion" },
    { key: "alimentacion_papel", label: "Alimentacion de papel" },
    { key: "escaner", label: "Escaner / copiadora" },
    { key: "panel_control", label: "Panel de control / pantalla" },
    { key: "consumibles", label: "Toner / tinta / cartuchos" },
    { key: "rodillos", label: "Rodillos / mecanismo de arrastre" },
    { key: "ruido", label: "Ruido / vibracion" },
    { key: "estructura", label: "Estructura / carcasa" },
  ],
  Reloj: [
    { key: "pantalla", label: "Pantalla / tactil" },
    { key: "bateria", label: "Bateria / carga" },
    { key: "conectividad", label: "Conectividad (Bluetooth / Wi‑Fi / GPS)" },
    { key: "sensores", label: "Sensores (frecuencia, pasos, etc.)" },
    { key: "botones", label: "Botones / corona / bisel" },
    { key: "audio", label: "Microfono / altavoz" },
    { key: "estructura", label: "Estructura / cristal / caja" },
    { key: "notificaciones", label: "Notificaciones / vibracion" },
    { key: "sellado", label: "Sellado / resistencia al agua" },
    { key: "alimentacion", label: "Cargador / dock" },
  ],
  Computadora: [
    { key: "encendido", label: "Encendido / POST" },
    { key: "pantalla", label: "Pantalla / monitor" },
    { key: "puertos", label: "Puertos USB / conectividad" },
    { key: "audio", label: "Audio / altavoces" },
    { key: "ventilacion", label: "Ventilacion / temperatura" },
    { key: "almacenamiento", label: "Almacenamiento / disco" },
    { key: "ram", label: "RAM / rendimiento" },
    { key: "red", label: "Red / Wi‑Fi / Ethernet" },
    { key: "perifericos", label: "Perifericos (teclado / raton)" },
    { key: "fuente", label: "Fuente de poder" },
  ],
  Proyector: [
    { key: "encendido", label: "Encendido / lampara" },
    { key: "imagen", label: "Imagen / enfoque / color" },
    { key: "conectividad", label: "Conectividad (HDMI / VGA / USB / Wi‑Fi)" },
    { key: "ventilacion", label: "Ventilacion / ruido" },
    { key: "audio", label: "Audio / altavoz" },
    { key: "control_remoto", label: "Control remoto / botones" },
    { key: "lente", label: "Lente / optica" },
    { key: "alimentacion", label: "Alimentacion / cableado" },
    { key: "keystone", label: "Correccion keystone / zoom" },
    { key: "estructura", label: "Estructura / soporte" },
  ],
  Otro: [
    { key: "estructura", label: "Estructura" },
    { key: "pantalla", label: "Pantalla" },
    { key: "conectividad", label: "Conectividad" },
    { key: "audio", label: "Audio" },
    { key: "alimentacion", label: "Alimentacion" },
    { key: "sensores", label: "Sensores" },
    { key: "puertos", label: "Puertos" },
    { key: "botones", label: "Botones / controles" },
    { key: "bateria", label: "Bateria / energia" },
    { key: "otros", label: "Otros" },
  ],
}

export function itemsForDeviceType(deviceType: string): readonly { key: string; label: string }[] {
  const t = (deviceType || "").trim()
  if (CHECKLIST_FUNCIONAL_ITEMS[t]) return CHECKLIST_FUNCIONAL_ITEMS[t]
  return CHECKLIST_FUNCIONAL_ITEMS.Otro
}

export function defaultFuncionalForDevice(deviceType: string): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const { key } of itemsForDeviceType(deviceType)) {
    out[key] = true
  }
  return out
}

export function parseChecklistIngreso(raw: unknown): ChecklistIngreso | null {
  if (raw == null || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const enc = o.encendido
  const encendido =
    enc === "ok" || enc === "intermitente" || enc === "no" ? enc : null
  const obs = typeof o.observacionesEsteticas === "string" ? o.observacionesEsteticas : ""
  const funcional: Record<string, boolean> = {}
  if (o.funcional && typeof o.funcional === "object" && !Array.isArray(o.funcional)) {
    for (const [k, v] of Object.entries(o.funcional as Record<string, unknown>)) {
      funcional[k] = Boolean(v)
    }
  }
  return { encendido, funcional, observacionesEsteticas: obs }
}

export function checklistIngresoToJson(c: ChecklistIngreso): Record<string, unknown> {
  return {
    encendido: c.encendido,
    funcional: c.funcional,
    observacionesEsteticas: c.observacionesEsteticas.trim(),
  }
}

/** Normaliza checklist cargado de BD o valores por defecto segun tipo de equipo. */
export function ensureChecklistIngreso(
  deviceType: string,
  raw: ChecklistIngreso | null | undefined,
): ChecklistIngreso {
  const defaults = defaultFuncionalForDevice(deviceType)
  if (!raw) {
    return { encendido: null, funcional: defaults, observacionesEsteticas: "" }
  }
  const func: Record<string, boolean> = { ...defaults }
  for (const key of Object.keys(defaults)) {
    if (key in raw.funcional) func[key] = raw.funcional[key]!
  }
  return {
    encendido: raw.encendido,
    funcional: func,
    observacionesEsteticas: raw.observacionesEsteticas ?? "",
  }
}
