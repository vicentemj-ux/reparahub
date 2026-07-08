/**
 * Origen publico de la instalacion (tracking, QR, enlaces en tickets).
 * Configurar `NEXT_PUBLIC_APP_URL` en cada entorno; en cliente se usa `window.location.origin` como respaldo.
 */
export function getPublicAppBaseUrl(): string {
  const fromEnv = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_APP_URL?.trim() : undefined
  if (fromEnv) return fromEnv.replace(/\/$/, "")
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin
  return ""
}

/** Hostname para membretes (ej. `app.midominio.com`), sin protocolo. */
export function getPublicAppHostname(): string {
  const base = getPublicAppBaseUrl()
  if (!base) return ""
  try {
    return new URL(base.startsWith("http") ? base : `https://${base}`).hostname
  } catch {
    return ""
  }
}
