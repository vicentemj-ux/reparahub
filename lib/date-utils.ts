/**
 * Helpers de fecha agnósticos a la zona horaria.
 *
 * El bug original: el server (UTC) escribia la fecha como ISO con sufijo
 * `Z`, y el cliente (Mexico, UTC-6) la interpretaba como 6 horas antes,
 * mostrando "15/jun" cuando el usuario habia creado el apartado el "16/jun".
 *
 * Estos helpers siempre mueven las fechas por calendario (no por horas) y
 * usan unica y exclusivamente la representacion "YYYY-MM-DD" en el cable.
 * Para Postgres DATE, las horas siempre son UTC 00:00:00, asi nunca hay
 * drift al redondear al insertar.
 */

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

/**
 * Devuelve la fecha de HOY en la zona horaria del tenant como "YYYY-MM-DD".
 * Si la tz es null/invalida cae a UTC.
 *
 * Usa Intl.DateTimeFormat (soportado en Node 18+ y todos los browsers
 * modernos) para evitar arrastrar dependencias de timezone.
 */
export function todayYmdInTimezone(tz: string | null | undefined): string {
  const tzName = (tz ?? "UTC").trim() || "UTC"
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tzName,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date())
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
    const y = get("year")
    const m = get("month")
    const d = get("day")
    if (y && m && d) return `${y}-${m}-${d}`
  } catch {
    // tz invalida -> cae al fallback de abajo
  }
  const d = new Date()
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

/**
 * Suma N dias calendario a un "YYYY-MM-DD" y devuelve el resultado.
 * La suma se hace sobre el calendario (UTC) para evitar drift por DST.
 */
export function addDaysToYmd(ymd: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return ymd
  const [, y, mo, d] = m
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)))
  date.setUTCDate(date.getUTCDate() + days)
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

/**
 * Convierte "YYYY-MM-DD" en un Date a UTC 00:00:00 del mismo dia.
 * Esto es lo que se envia a Postgres DATE: la hora siempre es 00:00:00 UTC,
 * asi no hay drift al guardar.
 */
export function ymdToUtcDate(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return null
  const [, y, mo, d] = m
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)))
}

/**
 * Convierte un Date (que se asume a UTC 00:00:00) en "YYYY-MM-DD"
 * usando sus componentes UTC. Esto garantiza que la fecha que sale del
 * server es exactamente la misma que se guardo en Postgres DATE.
 */
export function utcDateToYmd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

/**
 * Parsea un "YYYY-MM-DD" como fecha LOCAL (medianoche en la zona del browser).
 * Util para mostrar la fecha sin que se desplace un dia por culpa del UTC.
 */
export function ymdToLocalDate(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return null
  const [, y, mo, d] = m
  return new Date(Number(y), Number(mo) - 1, Number(d))
}
