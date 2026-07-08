import type { CortePrintData } from "@/lib/actions/ventas-prisma"
import { buildWhatsAppUrl, normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"

function fmtMoney(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Numero del dueno: `NEXT_PUBLIC_OWNER_WHATSAPP` (recomendado) o telefono del taller en configuracion.
 */
export function resolveOwnerWhatsAppDigits(options: {
  envOwnerPhone?: string | null
  telefonoTaller?: string | null
  countryCode?: string
}): string | null {
  const fromEnv = (options.envOwnerPhone ?? "").trim()
  if (fromEnv) {
    const d = normalizePhoneForWhatsApp(fromEnv, options.countryCode)
    if (d) return d
  }
  const fromTaller = (options.telefonoTaller ?? "").trim()
  if (fromTaller) {
    return normalizePhoneForWhatsApp(fromTaller, options.countryCode)
  }
  return null
}

/**
 * Mensaje plano con emojis; la URL se arma con `buildWhatsAppSendUrl` / `buildWaMeUrl`.
 */
export function formatCorteOwnerWhatsAppMessage(nombreTaller: string, corte: CortePrintData): string {
  const efectivoEsperado = corte.saldo_final
  const tieneContadoFisico =
    corte.monto_cierre != null && Number.isFinite(corte.monto_cierre)
  const efectivoReal = tieneContadoFisico ? corte.monto_cierre! : corte.saldo_final
  const diferencia = efectivoReal - efectivoEsperado
  const n = corte.numero_corte

  const lines = [
    `📊 *Corte de caja - ${nombreTaller.trim() || "Mi taller"}*`,
    "",
    `🧾 Corte ${n > 0 ? `#${String(n).padStart(3, "0")}` : "-"}`,
    `📅 Apertura: ${fmtDateTime(corte.fecha_apertura)}`,
    `🔒 Cierre: ${fmtDateTime(corte.fecha_cierre)}`,
    "",
    "📦 *Ventas PDV*",
    `* Tickets / ventas registradas: ${corte.total_ventas}`,
    "",
    "💵 *Totales por forma de pago*",
    `* Efectivo (ventas): $${fmtMoney(corte.total_efectivo)}`,
    `* Tarjeta: $${fmtMoney(corte.total_tarjeta)}`,
    `* Transferencia: $${fmtMoney(corte.total_transferencia)}`,
    "",
    "🔧 *Reparaciones (movimientos en caja)*",
    `* Cobros reparaciones: $${fmtMoney(corte.total_abonos)}`,
    "",
    "📉 *Gastos (periodo del corte)*",
    `* Total gastos: $${fmtMoney(corte.total_gastos)}`,
    "",
    "✅ *Cuadre de efectivo*",
    `* Fondo inicial: $${fmtMoney(corte.monto_inicial)}`,
    `* Efectivo esperado (fondo + ventas en efectivo): $${fmtMoney(efectivoEsperado)}`,
    tieneContadoFisico
      ? `* Efectivo contado (fisico en caja): $${fmtMoney(efectivoReal)}`
      : `* Total sistema (referencia): $${fmtMoney(efectivoReal)}`,
    `* Diferencia (real vs esperado): ${diferencia >= 0 ? "+" : ""}$${fmtMoney(diferencia)}`,
    "",
    "_ReparaHub - Reporte de cierre_",
  ]

  return lines.join("\n")
}

/** Thin wrapper kept for backward compatibility. Delegates to buildWhatsAppUrl. */
export function buildWaMeUrl(phoneDigits: string, message: string): string {
  return buildWhatsAppUrl(phoneDigits, message)
}

