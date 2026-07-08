/**
 * Rate limit basico en memoria para rutas publicas.
 * No es distribuido (cada instancia de Next.js tiene su propio contador),
 * pero es suficiente para proteger el endpoint `/t/*` contra abuse a nivel
 * de Vercel Edge / contenedor individual.
 *
 * Limites:
 *   - 60 requests / minuto por IP para `/t/*` (catalogo y detalle de producto).
 *
 * Si se necesita rate limit distribuido o limites mas estrictos, migrar a
 * @upstash/ratelimit (gratis hasta 10k req/dia) o similar.
 */

type Bucket = { count: number; resetAt: number }

const STORE = new Map<string, Bucket>()
const WINDOW_MS = 60_000 // 1 minuto
const MAX_REQS = 60

function pruneExpired(now: number) {
  for (const [key, bucket] of STORE.entries()) {
    if (bucket.resetAt <= now) {
      STORE.delete(key)
    }
  }
}

export function checkPublicRateLimit(key: string): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  if (STORE.size > 5000) pruneExpired(now)

  const bucket = STORE.get(key)
  if (!bucket || bucket.resetAt <= now) {
    STORE.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: MAX_REQS - 1, resetAt: now + WINDOW_MS }
  }

  bucket.count += 1
  const remaining = Math.max(0, MAX_REQS - bucket.count)
  return {
    ok: bucket.count <= MAX_REQS,
    remaining,
    resetAt: bucket.resetAt,
  }
}

export function getClientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip")
  if (cf) return cf
  const real = headers.get("x-real-ip")
  if (real) return real
  const fwd = headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return "unknown"
}
