type ArchivoLike = {
  publicUrl?: string | null
  storageKey?: string | null
  key?: string | null
}

function asAbsoluteHttpUrl(value: string): string | null {
  const s = value.trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  return null
}

export function getArchivoDisplayUrl(archivo: ArchivoLike): string | null {
  const direct = asAbsoluteHttpUrl(String(archivo.publicUrl ?? ""))
  if (direct) return direct

  const storageKey = String(archivo.storageKey ?? archivo.key ?? "").replace(/^\/+/, "").trim()
  if (!storageKey) return null

  const base = String(process.env.S3_PUBLIC_BASE_URL ?? process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "").trim()
  if (!base) return null

  return `${base}/${storageKey}`
}

