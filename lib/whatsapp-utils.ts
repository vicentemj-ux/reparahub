import { getCodigoTelefono, PAISES } from "@/lib/constants/paises"

/**
 * Normaliza un telefono para usarlo en `https://api.whatsapp.com/send?phone=...`.
 *
 * Reglas:
 * - Si el telefono ya parece venir en formato internacional, se respeta.
 * - Si `countryCode` viene definido y el telefono parece local, se antepone `countryCode`.
 * - Si `countryCode` no viene definido y el telefono no parece internacional, retorna null.
 */
export function normalizePhoneForWhatsApp(
  raw: string | null | undefined,
  countryCode: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null
  const cc = (countryCode ?? "").replace(/\D/g, "")

  let d = raw.replace(/\D/g, "")
  if (!d) return null

  const international = normalizeExplicitInternationalPhone(raw, d)
  if (international) return international

  if (!cc) return null

  if (d.startsWith(cc) && d.length > 10) return d

  return `${cc}${d}`
}

const KNOWN_COUNTRY_CODES = Array.from(new Set(PAISES.map((p) => p.codigoTelefono))).sort(
  (a, b) => b.length - a.length,
)

function normalizeExplicitInternationalPhone(raw: string, digits: string): string | null {
  const trimmed = raw.trim()

  if (trimmed.startsWith("+")) {
    return digits.length >= 7 && digits.length <= 15 ? digits : null
  }

  if (trimmed.startsWith("00")) {
    const withoutInternationalPrefix = digits.replace(/^00/, "")
    return withoutInternationalPrefix.length >= 7 && withoutInternationalPrefix.length <= 15
      ? withoutInternationalPrefix
      : null
  }

  if (digits.length <= 10 || digits.length > 15) return null

  const matchingCode = KNOWN_COUNTRY_CODES.find((code) => digits.startsWith(code))
  if (!matchingCode) return null

  return digits.length > matchingCode.length + 7 ? digits : null
}

export function buildWhatsAppUrl(
  phoneDigits: string,
  text: string,
): string {
  const phone = String(phoneDigits).replace(/\D/g, "")
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
}

export const WHATSAPP_BRAND_SIGNATURE = "*_Organizado por ReparaHub.net_*"

export function withReparaHubWhatsAppSignature(message: string): string {
  const cleanMessage = String(message ?? "").replace(/\s+$/g, "")
  if (cleanMessage.includes(WHATSAPP_BRAND_SIGNATURE)) return cleanMessage
  return `${cleanMessage}\n\n${WHATSAPP_BRAND_SIGNATURE}`
}

export function buildCustomerWhatsAppUrl(
  phoneDigits: string,
  text: string,
): string {
  return buildWhatsAppUrl(phoneDigits, withReparaHubWhatsAppSignature(text))
}

/**
 * Resuelve el codigo de pais (sin el "+") para un nombre de pais almacenado
 * en `configuracionTaller.pais`. Retorna `null` si el pais no esta definido o
 * no esta en el catalogo `PAISES`. NO hace fallback a Mexico.
 */
export function getTallerWhatsAppCountryCode(paisNombre: string | null | undefined): string | null {
  return getCodigoTelefono(paisNombre)
}
