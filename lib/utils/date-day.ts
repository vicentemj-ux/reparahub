/**
 * Utilidades de "dia" con zona horaria. Usadas por el motor de
 * "Reportes y Alertas" (lib/actions/alertas-prisma.ts) para dedupe
 * diario respetando la zona horaria del tenant.
 *
 * Un taller en `America/Mexico_City` que ejecuta su check a las 23:30
 * del lunes NO debe re-enviarse a las 00:30 del martes (sigue siendo
 * "hoy" para el taller, pero ya es manana en UTC).
 */

const SAFE_TZ_FALLBACK = "UTC"

/**
 * Devuelve la representacion (yyyy, mm, dd, dow) de `date` proyectada
 * a la zona horaria `tz`. Usamos `Intl.DateTimeFormat` con timeZone para
 * extraer los componentes locales sin librerias externas.
 */
function getLocalParts(date: Date, tz: string): {
  year: number
  month: number
  day: number
} {
  const safeTz = tz || SAFE_TZ_FALLBACK
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: safeTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    const parts = fmt.formatToParts(date)
    const y = Number(parts.find((p) => p.type === "year")?.value)
    const m = Number(parts.find((p) => p.type === "month")?.value)
    const d = Number(parts.find((p) => p.type === "day")?.value)
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return { year: y, month: m, day: d }
    }
  } catch {
    /* tz invalida, cae al fallback */
  }
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

/**
 * Devuelve `true` si `a` y `b` caen en el mismo dia civil cuando se
 * proyectan a la zona horaria `tz`.
 */
export function isSameLocalDay(a: Date | string | null | undefined, b: Date | string | null | undefined, tz: string): boolean {
  if (!a || !b) return false
  const da = a instanceof Date ? a : new Date(a)
  const db = b instanceof Date ? b : new Date(b)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false
  const pa = getLocalParts(da, tz)
  const pb = getLocalParts(db, tz)
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day
}

/**
 * Diferencia entera en dias calendario (b - a) segun la zona horaria `tz`.
 * Positivo si `b` es futuro, negativo si `b` es pasado. Util para
 * calcular "llevas X dias sin movimiento" en alertas.
 */
export function diffLocalDays(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined,
  tz: string,
): number {
  if (!a || !b) return 0
  const da = a instanceof Date ? a : new Date(a)
  const db = b instanceof Date ? b : new Date(b)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 0

  const pa = getLocalParts(da, tz)
  const pb = getLocalParts(db, tz)

  const utcA = Date.UTC(pa.year, pa.month - 1, pa.day)
  const utcB = Date.UTC(pb.year, pb.month - 1, pb.day)
  return Math.round((utcB - utcA) / 86_400_000)
}

/**
 * Devuelve un ISO string (YYYY-MM-DD) del dia local de `date` en `tz`.
 * Util para agrupar eventos en la bitacora sin acoplar a UTC.
 */
export function localDayIso(date: Date | string | null | undefined, tz: string): string {
  const d = !date ? new Date() : date instanceof Date ? date : new Date(date)
  const { year, month, day } = getLocalParts(d, tz)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/**
 * Devuelve la fecha UTC que corresponde al inicio del dia civil
 * `dateStr` (formato "YYYY-MM-DD") interpretado en la zona horaria
 * `tz`. Es decir, el `Date` que en la zona horaria `tz` se ve como
 * `${dateStr}T00:00:00.000`.
 *
 * Util para construir rangos de fechas para Prisma que respeten la
 * zona horaria del tenant. Por ejemplo, "2026-06-05" en
 * "America/Mexico_City" (UTC-6, sin DST) corresponde al instante UTC
 * `2026-06-05T06:00:00Z`.
 *
 * Si `dateStr` no es "YYYY-MM-DD" valido, devuelve `null`.
 */
export function startOfLocalDayUtc(dateStr: string, tz: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null

  const safeTz = tz || SAFE_TZ_FALLBACK

  try {
    // Truco: partimos del wall clock deseado tratado como si fuera
    // UTC (`wallAsUtcMs`). Pedimos a Intl que formatee ese mismo
    // instante en la tz objetivo; eso nos da la pared que Intl ve
    // (`tzWallMs`, en ms).
    //
    // Si la tz coincide con UTC, `tzWallMs == wallAsUtcMs` y
    // devolvemos tal cual. Si no, el desfase es:
    //   wallAsUtcMs - tzWallMs = (utc - local_as_utc) en ms
    // Para Mexico (UTC-6) `tzWallMs = wallAsUtcMs - 6h`, asi que
    //   diff = wallAsUtcMs - tzWallMs = +6h
    // Para encontrar el UTC real del wall clock deseado sumamos esa
    // diferencia (en UTC- el reloj va ATRAS, asi que UTC va
    // ADELANTE del wall): actual = wallAsUtcMs + diff.
    //
    // Verificacion Mexico "2026-06-05":
    //   wallAsUtcMs = 2026-06-05T00:00:00Z
    //   tzWallMs    = 2026-06-04T18:00:00Z
    //   diff        = +6h
    //   actual      = 2026-06-05T06:00:00Z  (== 2026-06-05 00:00 -06:00)  CORRECTO
    //
    // Verificacion India (UTC+5:30) "2026-06-05":
    //   wallAsUtcMs = 2026-06-05T00:00:00Z
    //   tzWallMs    = 2026-06-05T05:30:00Z
    //   diff        = -5:30
    //   actual      = 2026-06-04T18:30:00Z  (== 2026-06-05 00:00 +05:30)  CORRECTO
    const wallAsUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0)
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
    const parts = fmt.formatToParts(new Date(wallAsUtcMs))
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
    const tzWallMs = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    )
    const diffMs = wallAsUtcMs - tzWallMs
    return new Date(wallAsUtcMs + diffMs)
  } catch {
    return null
  }
}

/**
 * Devuelve la fecha UTC que corresponde al FINAL del dia civil
 * `dateStr` (inclusivo) interpretado en la zona horaria `tz`:
 * `23:59:59.999` en esa zona, convertido a UTC.
 *
 * Implementado como `startOfLocalDayUtc + 24h - 1ms` para tolerar
 * DST (donde un dia civil puede tener 23 o 25 horas).
 *
 * Si `dateStr` no es "YYYY-MM-DD" valido, devuelve `null`.
 */
export function endOfLocalDayUtc(dateStr: string, tz: string): Date | null {
  const start = startOfLocalDayUtc(dateStr, tz)
  if (!start) return null
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
}
