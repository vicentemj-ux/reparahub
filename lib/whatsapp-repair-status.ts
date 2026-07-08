/**
 * Construye la URL de WhatsApp (api.whatsapp.com) para notificar cambio de estado de reparacion.
 * Solo cliente (sin dependencias de servidor).
 */

import { buildCustomerWhatsAppUrl, normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { formatMoneyMx } from "@/lib/utils/currency"
import { getPublicAppBaseUrl } from "@/lib/app-public"

function safeStr(v: unknown, fallback = "-"): string {
  if (v == null) return fallback
  const s = String(v).trim()
  return s.length ? s : fallback
}

export function buildRepairStatusWhatsAppUrl(params: {
  phoneRaw?: string | null
  countryCode?: string
  nombreTaller?: string | null
  cliente?: string | null
  equipo?: string | null
  folio?: string | null
  repairId?: string | null
  estadoNuevo?: string | null
  notaTecnica?: string | null
  esperaRefaccionConcepto?: string | null
  esperaRefaccionEta?: string | null
  esperaRefaccionNota?: string | null
  total?: number | null
  restante?: number | null
  /** Costo de revision cuando el estado es Sin Reparacion */
  costoRevision?: number | null
  baseUrl?: string | null
}): string | null {
  try {
    const digits = normalizePhoneForWhatsApp(params.phoneRaw ?? "", params.countryCode)
    if (!digits) return null

    const cliente = safeStr(params.cliente, "cliente")
    const equipo = safeStr(params.equipo, "equipo")
    const folio = safeStr(params.folio, "-")
    const repairId = safeStr(params.repairId, "")
    const n = (params.estadoNuevo ?? "").trim()
    let body = ""

    const base =
      safeStr(params.baseUrl, "").replace(/\/$/, "") ||
      getPublicAppBaseUrl() ||
      "https://reparahub.com"
    const track = repairId ? `${base}/track/${repairId}` : base

    if (n === "Listo") {
      body = [
        `Hola ${cliente} 🎉`,
        "",
        `Tu equipo *${equipo}* ya esta *LISTO* para entrega.`,
        `📄 Folio: *#${folio}*`,
        `💵 Total: ${formatMoneyMx(params.total)}`,
        `💳 Restante: ${formatMoneyMx(params.restante)}`,
        "",
        `📲 Puedes revisar tu folio aqui: ${track}`,
        "",
        "Gracias por tu preferencia. Te esperamos para la entrega de tu equipo 🙌",
      ].join("\n")
    } else if (n === "Diagnostico") {
      body = [
        `Hola ${cliente} 🔎`,
        "",
        `Tu equipo *${equipo}* ya esta en *DIAGNOSTICO*.`,
        `📄 Folio: *#${folio}*`,
        "",
        "Estamos revisandolo a detalle para identificar la falla y definir la mejor solucion. 🛠️",
        `📲 Da seguimiento aqui: ${track}`,
      ].join("\n")
    } else if (n === "En Reparacion") {
      body = [
        `Hola ${cliente} 🧰`,
        "",
        `Tu equipo *${equipo}* ya paso a *EN REPARACION*.`,
        `📄 Folio: *#${folio}*`,
        "",
        "Ya estamos trabajando en la solucion para dejarlo listo lo antes posible. ⚙️",
        `📲 Sigue el avance aqui: ${track}`,
      ].join("\n")
    } else if (n === "Esperando Refaccion") {
      const concepto = params.esperaRefaccionConcepto?.trim() || "refaccion/proveedor externo"
      const eta = params.esperaRefaccionEta
        ? new Date(params.esperaRefaccionEta).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
        : null
      const nota = params.esperaRefaccionNota?.trim() || params.notaTecnica?.trim()
      body = [
        `Hola ${cliente}`,
        "",
        `Tu equipo *${equipo}* ya esta en reparacion, pero estamos en espera de *${concepto}* por proveedor externo.`,
        `Folio: *#${folio}*`,
        eta ? `Fecha estimada: *${eta}*` : null,
        nota ? `Nota: ${nota}` : null,
        "",
        "En cuanto tengamos avance o llegue la refaccion, te avisaremos por este medio.",
        `Sigue el avance aqui: ${track}`,
      ].filter(Boolean).join("\n")
    } else if (n === "Sin Reparacion") {
      const motivo = params.notaTecnica?.trim() || "Te compartiremos mas detalles si los necesitas."
      body = [
        `Hola ${cliente} 👋`,
        "",
        `Te compartimos la actualizacion de tu equipo *${equipo}*.`,
        `📄 Folio: *#${folio}*`,
        `📍 Resultado: *SIN REPARACION*`,
        `📝 Motivo / observaciones: ${motivo}`,
        `💵 Costo de revision: ${formatMoneyMx(params.costoRevision)}`,
        "",
        `📲 Puedes consultar tu folio aqui: ${track}`,
        "",
        "Si deseas que revisemos otra alternativa, responde este mensaje y con gusto te apoyamos.",
      ].join("\n")
    } else {
      body = [
        `Hola ${cliente} 📢`,
        "",
        `Tu folio *#${folio}* tuvo una actualizacion.`,
        `📍 Nuevo estado: *${n || "ACTUALIZADO"}*`,
        `🧾 Equipo: *${equipo}*`,
        "",
        `📲 Rastreo: ${track}`,
      ].join("\n")
    }

    return buildCustomerWhatsAppUrl(digits, body)
  } catch (e) {
    console.error("[buildRepairStatusWhatsAppUrl]", e)
    return null
  }
}
