/**
 * URL absoluta para el QR de firma: siempre `/firma-digital/{token}` con el origen actual.
 * No usar texto fijo ni placeholders; el `token` es el UUID temporal de `firma_digital_tokens`.
 */
export function buildFirmaDigitalQrUrl(token: string): string {
  const t = token.trim()
  if (!t) return ""
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || "https://reparahub.com").replace(/\/$/, "")
  return `${origin}/firma-digital/${t}`
}
