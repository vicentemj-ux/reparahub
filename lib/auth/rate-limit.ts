import { getPrismaClient } from "@/lib/prisma"

export type RateLimitAction =
  | "login"
  | "login_admin"
  | "register"
  | "reset"
  | "verify"
  | "kiosk_pin"

interface RateLimitConfig {
  maxAttempts: number
  windowMinutes: number
}

const LIMITS: Record<RateLimitAction, RateLimitConfig> = {
  login:       { maxAttempts: 5,  windowMinutes: 15 },
  login_admin: { maxAttempts: 3,  windowMinutes: 15 },
  register:    { maxAttempts: 3,  windowMinutes: 60 },
  reset:       { maxAttempts: 3,  windowMinutes: 60 },
  verify:      { maxAttempts: 5,  windowMinutes: 60 },
  kiosk_pin:   { maxAttempts: 8,  windowMinutes: 15 },
}

/**
 * Verifica si el identificador (email o IP) ha superado el limite
 * para la accion dada. Si no lo ha superado, registra el intento.
 *
 * @returns { allowed: true }  si puede continuar
 * @returns { allowed: false, retryAfterMinutes } si esta bloqueado
 */
export async function checkRateLimit(
  identifier: string,
  action: RateLimitAction
): Promise<{ allowed: boolean; retryAfterMinutes?: number }> {
  const { maxAttempts, windowMinutes } = LIMITS[action]
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)
  const normalizedIdentifier = identifier.toLowerCase()

  try {
    const prisma = getPrismaClient()
    const result = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(*)::bigint AS count
      FROM auth_rate_limits
      WHERE identifier = ${normalizedIdentifier}
        AND action = ${action}
        AND attempt_at >= ${windowStart}
    `
    const attempts = Number(result?.[0]?.count ?? 0)
    if (attempts >= maxAttempts) {
      return { allowed: false, retryAfterMinutes: windowMinutes }
    }

    await prisma.$executeRaw`
      INSERT INTO auth_rate_limits (identifier, action)
      VALUES (${normalizedIdentifier}, ${action})
    `

    return { allowed: true }
  } catch (error) {
    // Fail-open temporal: evita bloquear login/registro por dependencia de rate limit.
    console.error("[rate-limit] Prisma fallback failed:", error)
    return { allowed: true }
  }
}
