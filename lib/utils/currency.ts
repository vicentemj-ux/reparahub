/**
 * Utilidades de formato monetario centralizadas.
 * Fuente unica de verdad para todo el formato de pesos mexicanos en ReparaHub.
 */

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-"
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[$,\s]/g, ""))
  if (Number.isNaN(num)) return "-"
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/** Alias corto para templates de impresion donde se prefiere legibilidad. */
export const formatPeso = formatCurrency

/** Alias para compatibilidad con codigo legacy. */
export const formatMoney = formatCurrency

/** Alias para funciones que esperan formato MXN explicito. */
export const formatMoneyMx = formatCurrency

/** Formato para posters / exhibicion (sin simbolo $, solo numero con comas). */
export function formatPosterMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-"
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[$,\s]/g, ""))
  if (Number.isNaN(num)) return "-"
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/** Formato compacto: sin decimales si el valor es entero (ej. $150), con decimales si los tiene (ej. $150.50). */
export function formatMoneyCompact(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-"
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[$,\s]/g, ""))
  if (Number.isNaN(num)) return "-"
  const hasDecimals = num % 1 !== 0
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(num)
}
