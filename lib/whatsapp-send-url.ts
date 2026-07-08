/**
 * URL oficial de envio WhatsApp (`https://api.whatsapp.com/send`).
 * No usar wa.me: mejor compatibilidad en apps y escritorio.
 *
 * @param phoneDigits Solo digitos, formato internacional sin + (ej. 526681227393).
 * @param text Mensaje en claro; se codifica con encodeURIComponent.
 */
export function buildWhatsAppSendUrl(phoneDigits: string, text: string): string {
  const phone = String(phoneDigits).replace(/\D/g, "")
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
}

/** Abre el chat sin mensaje prellenado (solo `phone`). */
export function buildWhatsAppOpenChatUrl(phoneDigits: string): string {
  const phone = String(phoneDigits).replace(/\D/g, "")
  return `https://api.whatsapp.com/send?phone=${phone}`
}

/** Soporte y ventas ReparaHub (Mexico). */
export const REPARAHUB_WHATSAPP_SUPPORT_DIGITS = "526681227393"
