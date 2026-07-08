/**
 * lib/storage.ts - Pure storage helpers for product, catalog and tenant images.
 * S3-compatible storage is canonical. Absolute legacy URLs are preserved as-is
 * so old rows keep rendering until a data migration moves them to MinIO/S3.
 */

const INVENTORY_STORAGE_PREFIX = "inventario"

/**
 * Product images live under the object key prefix `inventario/`.
 * The exported name stays for backwards-compatible imports.
 */
export const INVENTORY_PRODUCT_IMAGES_BUCKET = INVENTORY_STORAGE_PREFIX

export const BUCKETS = {
  REPAIR_PHOTOS: "repair-photos",
  INVENTORY: INVENTORY_PRODUCT_IMAGES_BUCKET,
  CATALOG: "catalogo",
  TALLER: "taller",
} as const

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS]

export const MAX_PRODUCT_IMAGES = 3

function resolveStorageBase(): string {
  return (
    process.env.S3_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ||
    process.env.R2_PUBLIC_BASE_URL ||
    ""
  ).replace(/\/$/, "")
}

function joinStorageKey(...parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => String(part ?? "").trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/")
}

function isAbsoluteUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://")
}

function isConfiguredStorageAbsoluteUrl(value: string): boolean {
  const storageBase = resolveStorageBase()
  return Boolean(storageBase && value.startsWith(storageBase))
}

/**
 * Extracts the object path from a public/signed Supabase Storage URL.
 * Kept only to normalize legacy absolute URLs that may still exist in DB rows.
 */
export function extractStoragePath(urlOrPath: string, bucket: string): string {
  if (!isAbsoluteUrl(urlOrPath)) return urlOrPath

  const publicMarker = `/object/public/${bucket}/`
  const signedMarker = `/object/sign/${bucket}/`

  let idx = urlOrPath.indexOf(publicMarker)
  if (idx !== -1) return urlOrPath.slice(idx + publicMarker.length)

  idx = urlOrPath.indexOf(signedMarker)
  if (idx !== -1) return urlOrPath.slice(idx + signedMarker.length).split("?")[0]

  return urlOrPath
}

/**
 * Builds a public S3-compatible URL for a logical bucket/prefix and path.
 * If S3_PUBLIC_BASE_URL is not configured, returns the clean object key.
 */
export function getPublicUrl(bucket: string, path: string): string {
  const key = joinStorageKey(bucket, path)
  const storageBase = resolveStorageBase()
  return storageBase ? `${storageBase}/${key}` : key
}

/**
 * Parse the stored `imagen_url` value into an array of image paths.
 * Handles null, plain string legacy values, and JSON arrays for multi-image products.
 */
export function parseImagenUrls(raw: string | null | undefined): string[] {
  if (raw == null) return []
  const s = String(raw).trim()
  if (!s) return []
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s)
      if (Array.isArray(arr)) {
        return arr.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, MAX_PRODUCT_IMAGES)
      }
    } catch {
      // Fall through to treat as a plain string.
    }
  }
  return [s]
}

export function getInventoryCanonicalImagePath(tallerId: string, productId: string): string {
  return `${tallerId}/${productId}.webp`
}

export function getInventoryCanonicalImageUrl(tallerId: string, productId: string): string {
  return getPublicUrl(INVENTORY_PRODUCT_IMAGES_BUCKET, getInventoryCanonicalImagePath(tallerId, productId))
}

function resolveInventoryStorageKey(path: string): string {
  const clean = path.replace(/^\/+/, "")
  if (!clean) return clean
  if (clean.startsWith(`${INVENTORY_STORAGE_PREFIX}/`)) return clean
  if (clean.startsWith("productos/")) return joinStorageKey(INVENTORY_STORAGE_PREFIX, clean.replace(/^productos\/+/, ""))
  return joinStorageKey(INVENTORY_STORAGE_PREFIX, clean)
}

function resolveSingleUrl(s: string): string | null {
  const clean = s.trim()
  if (!clean) return null
  if (isAbsoluteUrl(clean)) return clean

  const storageBase = resolveStorageBase()
  const key = resolveInventoryStorageKey(clean)
  return storageBase ? `${storageBase}/${key}` : key
}

/**
 * Ready-to-display URL for the value stored in `productos.imagen_url`.
 * - Absolute URLs are returned unchanged for legacy compatibility.
 * - JSON arrays return the first resolved image.
 * - Relative paths are resolved against R2.
 */
export function getInventoryPublicUrl(stored: string | null | undefined): string | null {
  if (stored == null) return null
  const s = String(stored).trim()
  if (s === "") return null

  if (s.startsWith("blob:")) return s

  if (s.startsWith("[")) {
    const urls = parseImagenUrls(s)
    if (urls.length === 0) return null
    return resolveSingleUrl(urls[0])
  }

  return resolveSingleUrl(s)
}

/**
 * Normalizes a value before storing it in `imagen_url`.
 * New values should be object keys. Absolute legacy URLs are converted to paths when
 * possible; otherwise they are preserved so existing images are not lost.
 */
export function normalizeInventoryImagePathForDb(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim()
  if (!s) return null
  if (s.startsWith("blob:")) return null
  if (s.startsWith("[")) {
    const normalized = parseImagenUrls(s)
      .map((item) => normalizeInventoryImagePathForDb(item))
      .filter((item): item is string => Boolean(item))
      .slice(0, MAX_PRODUCT_IMAGES)
    return serializeImagenUrls(normalized)
  }
  if (isAbsoluteUrl(s)) {
    const storageBase = resolveStorageBase()
    if (storageBase && s.startsWith(storageBase)) {
      const path = s.slice(storageBase.length).replace(/^\/+/, "")
      if (path) return path
    }

    for (const bucket of [INVENTORY_PRODUCT_IMAGES_BUCKET, "inventario", "productos"]) {
      const path = extractStoragePath(s, bucket)
      if (!isAbsoluteUrl(path)) {
        const cleaned = path.replace(/^\/+/, "")
        if (cleaned) return resolveInventoryStorageKey(cleaned)
      }
    }

    return s
  }
  return resolveInventoryStorageKey(s)
}

/**
 * Serialize an array of image paths for storage in `imagen_url`.
 * Returns null if empty. Returns a plain string for one image and JSON for 2-3.
 */
export function serializeImagenUrls(urls: (string | null | undefined)[]): string | null {
  const clean = urls.map((u) => (u ?? "").trim()).filter((u) => u.length > 0)
  if (clean.length === 0) return null
  if (clean.length === 1) return clean[0]
  return JSON.stringify(clean)
}

/** Resolve all stored image paths to public URLs. */
export function getInventoryPublicUrls(raw: string | null | undefined): string[] {
  return parseImagenUrls(raw).map((p) => getInventoryPublicUrl(p) ?? p).filter(Boolean)
}

/**
 * Derives the thumbnail object key from a full-size image path.
 * Converts `inventario/abc/123.webp` to `inventario/abc/123_thumb.webp`
 * and `inventario/abc/123_2.webp` to `inventario/abc/123_2_thumb.webp`.
 */
export function getThumbnailPath(fullPath: string): string {
  return fullPath.replace(/\.(\w+)$/, "_thumb.$1")
}

/**
 * Resolves a thumbnail public URL from a stored `imagen_url` value.
 * Returns the first thumbnail URL for the product. Falls back to the full URL
 * if the stored value is not a recognised image path.
 */
export function getInventoryThumbnailUrl(stored: string | null | undefined): string | null {
  const full = getInventoryPublicUrl(stored)
  if (!full) return null
  if (full.startsWith("blob:")) return full

  const paths = parseImagenUrls(stored)
  if (paths.length === 0) return null

  if (isAbsoluteUrl(paths[0]) && !isConfiguredStorageAbsoluteUrl(paths[0])) return full

  const firstPath = normalizeInventoryImagePathForDb(paths[0]) ?? paths[0]
  if (isAbsoluteUrl(firstPath)) return full
  return resolveSingleUrl(getThumbnailPath(firstPath))
}

/** Resolves all thumbnail URLs for a product with multiple images. */
export function getInventoryThumbnailUrls(raw: string | null | undefined): string[] {
  return parseImagenUrls(raw)
    .map((p) => {
      if (isAbsoluteUrl(p) && !isConfiguredStorageAbsoluteUrl(p)) return getInventoryPublicUrl(p)
      const normalized = normalizeInventoryImagePathForDb(p) ?? p
      if (isAbsoluteUrl(normalized)) return getInventoryPublicUrl(normalized)
      return resolveSingleUrl(getThumbnailPath(normalized))
    })
    .filter((v): v is string => v != null)
}

/**
 * Resolve both full and thumbnail URLs for the first stored image.
 * Used by display components that try thumbnail first and then fall back to full.
 */
export function getInventoryImagePair(stored: string | null | undefined): {
  full: string | null
  thumb: string | null
} {
  const full = getInventoryPublicUrl(stored)
  if (!full || full.startsWith("blob:")) return { full, thumb: full }

  const paths = parseImagenUrls(stored)
  if (paths.length === 0) return { full, thumb: null }

  if (isAbsoluteUrl(paths[0]) && !isConfiguredStorageAbsoluteUrl(paths[0])) return { full, thumb: null }

  const normalized = normalizeInventoryImagePathForDb(paths[0]) ?? paths[0]
  if (isAbsoluteUrl(normalized)) return { full, thumb: null }

  const thumb = resolveSingleUrl(getThumbnailPath(normalized))
  return { full, thumb }
}
