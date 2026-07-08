import { buildCustomerWhatsAppUrl, normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { getPublicAppBaseUrl } from "@/lib/app-public"

export type RepairWelcomeWhatsAppPayload = {
  folio: string
  repairId: string
  customerName: string
  customerPhone: string
  countryCode?: string
  deviceBrand: string
  deviceModel: string
  reportedFault: string
}

export function buildRepairWelcomeWhatsAppMessage(p: RepairWelcomeWhatsAppPayload): string {
  const clienteNombre = (p.customerName || "cliente").trim()
  const equipoMarcaModelo = `${p.deviceBrand || ""} ${p.deviceModel || ""}`.trim() || "tu equipo"
  const baseUrl = getPublicAppBaseUrl()
  const trackingUrl = `${baseUrl}/track/${encodeURIComponent(p.repairId)}`
  const falla = (p.reportedFault || "").trim()

  return [
    `Hola ${clienteNombre} 👋`,
    "",
    `✅ Ya recibimos tu equipo *${equipoMarcaModelo}* correctamente.`,
    `📄 Folio: *#${p.folio}*`,
    `📍 Estado actual: *RECIBIDO*`,
    ...(falla ? [`🛠️ Falla reportada: ${falla}`] : []),
    "",
    `🔎 Puedes dar seguimiento en tiempo real aqui: ${trackingUrl}`,
    "",
    "Gracias por confiar en nosotros. Te iremos avisando cada avance de tu folio. 🤝",
  ].join("\n")
}

export async function openRepairWelcomeWhatsApp(p: RepairWelcomeWhatsAppPayload): Promise<void> {
  const digits = normalizePhoneForWhatsApp(p.customerPhone, p.countryCode)
  if (!digits) return
  const message = buildRepairWelcomeWhatsAppMessage(p)
  const url = buildCustomerWhatsAppUrl(digits, message)
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer")
  }
}
