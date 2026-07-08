export const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Dias restantes hasta `fechaVencimiento`, comparando en UTC a nivel de dia.
 * - Valida fechas invalidas
 * - Devuelve `null` para ausencia de fecha
 * - Devuelve siempre >= 0
 *
 * Semantica: `fecha_vencimiento_plan` es el ULTIMO DIA VALIDO (no el primer dia invalido).
 * El admin guarda el timestamp del momento de creacion + N dias (incluye componente de hora).
 * El proxy bloquea cuando `timestamp < Date.now()` (compara hora exacta).
 * Esta funcion usa "fin del dia almacenado UTC" como target para alinear con el proxy:
 *   - Dia de vencimiento (ej. April 10): muestra "1 dia" → proxy no bloquea aun ✓
 *   - Dia siguiente (ej. April 11):     muestra "0 dias" → proxy bloquea despues de la hora exacta ✓
 */
export function calcDiasRestantes(fechaVencimiento: string | null | undefined): number | null {
  if (!fechaVencimiento) return null

  const raw = String(fechaVencimiento).trim()

  // Parsear DD/MM/YYYY antes de `new Date()`: JS interpreta fechas ambiguas
  // como MM/DD/YYYY y eso rompe vencimientos en formato LATAM.
  const dmyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dmyMatch) {
    const day = Number(dmyMatch[1])
    const month = Number(dmyMatch[2])
    const year = Number(dmyMatch[3])
    const fallbackUtc = Date.UTC(year, month - 1, day + 1)
    const todayUtc = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
    const dias = Math.ceil((fallbackUtc - todayUtc) / MS_PER_DAY)
    return Math.max(0, dias)
  }

  const parsedDate = new Date(fechaVencimiento)
  if (Number.isNaN(parsedDate.getTime())) {
    let year: number | undefined
    let month: number | undefined
    let day: number | undefined

    // Intentar ISO: 2026-04-29
    const isoPart = raw.substring(0, 10)
    if (isoPart.includes("-")) {
      ;[year, month, day] = isoPart.split("-").map(Number)
    }

    if (!year || !month || !day) return null

    // Fecha-only: misma semantica de fin-de-dia (+1)
    const fallbackUtc = Date.UTC(year, month - 1, day + 1)
    const todayUtc = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
    const dias = Math.ceil((fallbackUtc - todayUtc) / MS_PER_DAY)
    return Math.max(0, dias)
  }

  // Usar el dia siguiente al almacenado como limite ("fin del dia UTC")
  // Esto alinea el conteo de dias con la logica del proxy (que compara timestamp exacto).
  const todayUtc = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
  const targetUtc = Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate() + 1)
  const dias = Math.ceil((targetUtc - todayUtc) / MS_PER_DAY)

  return Math.max(0, dias)
}
