"use server"

import { randomInt } from "crypto"
import { cookies } from "next/headers"
import { getPrismaClient } from "@/lib/prisma"
import { sendAdminOTPEmail } from "@/lib/email/send"

const OTP_TTL_MINUTES = 10
const OTP_MAX_PER_WINDOW = 3
const OTP_WINDOW_MINUTES = 10
const OTP_MAX_ATTEMPTS = 5
const ADMIN_VERIFIED_COOKIE = "reparahub_admin_verified"
const ADMIN_VERIFIED_TTL_SECONDS = 8 * 60 * 60 // 8 hours

class AdminAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AdminAuthError"
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return email
  const visible = local.slice(0, 2)
  return `${visible}${"*".repeat(Math.max(0, local.length - 2))}@${domain}`
}

/** Verifies that the caller is a logged-in admin. Returns tallerId or throws AdminAuthError. */
async function requireAdmin(): Promise<string> {
  const cookieStore = await cookies()
  const tallerId = cookieStore.get("tallerId")?.value
  const isAdmin = cookieStore.get("isAdmin")?.value === "true"

  if (!tallerId || !isAdmin) {
    throw new AdminAuthError("ADMIN_UNAUTHORIZED")
  }

  const prisma = getPrismaClient()
  const user = await prisma.user.findUnique({ where: { id: tallerId } })
  if (!user || user.role !== "ADMIN") {
    throw new AdminAuthError("ADMIN_UNAUTHORIZED")
  }

  return tallerId
}

/**
 * Generates an 8-digit OTP, stores it in admin_otp_codes, and emails it to the
 * admin's registered address. Rate-limited to 3 codes per 10-minute window.
 */
export async function sendAdminOTP(): Promise<{
  success: boolean
  maskedEmail?: string
  error?: string
}> {
  try {
    const tallerId = await requireAdmin()
    const prisma = getPrismaClient()

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS admin_otp_codes (
        id text PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        admin_id text NOT NULL,
        code text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,
        attempts integer DEFAULT 0,
        CONSTRAINT admin_otp_code_format CHECK (code ~ '^[0-9]{8}$')
      );
    `)

    const adminUser = await prisma.user.findUnique({
      where: { id: tallerId },
      select: { email: true },
    })

    if (!adminUser?.email) {
      return { success: false, error: "No se pudo obtener el correo del administrador. Verifica tu perfil." }
    }

    const adminEmail = adminUser.email
    const windowStart = new Date(Date.now() - OTP_WINDOW_MINUTES * 60 * 1000).toISOString()

    const countRows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      "SELECT COUNT(*)::int AS count FROM admin_otp_codes WHERE admin_id = $1 AND created_at >= $2",
      tallerId, windowStart,
    )

    if ((countRows[0]?.count ?? 0) >= OTP_MAX_PER_WINDOW) {
      return {
        success: false,
        error: `Demasiados intentos. Espera ${OTP_WINDOW_MINUTES} minutos antes de solicitar otro codigo.`,
      }
    }

    await prisma.$executeRawUnsafe("DELETE FROM admin_otp_codes WHERE admin_id = $1", tallerId)

    const code = String(randomInt(0, 100_000_000)).padStart(8, "0")
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString()

    await prisma.$executeRawUnsafe(
      "INSERT INTO admin_otp_codes (admin_id, code, expires_at) VALUES ($1, $2, $3)",
      tallerId, code, expiresAt,
    )

    const emailResult = await sendAdminOTPEmail(adminEmail, code)
    if (!emailResult.success) {
      await prisma.$executeRawUnsafe("DELETE FROM admin_otp_codes WHERE admin_id = $1", tallerId)
      return { success: false, error: `Error al enviar el correo: ${emailResult.error}. Verifica la configuracion de RESEND_API_KEY.` }
    }

    return { success: true, maskedEmail: maskEmail(adminEmail) }
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return { success: false, error: "SESSION_EXPIRED" }
    }
    console.error("[admin-otp] Unhandled error in sendAdminOTP:", err)
    return { success: false, error: "Error inesperado del servidor. Contacta soporte tecnico." }
  }
}

/**
 * Validates the submitted OTP. On success, sets the reparahub_admin_verified
 * cookie (httpOnly, sameSite:strict, path:/admin, 8-hour TTL).
 */
export async function verifyAdminOTP(code: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const tallerId = await requireAdmin()

    if (!code || !/^\d{8}$/.test(code.trim())) {
      return { success: false, error: "El codigo debe tener exactamente 8 digitos." }
    }

    const prisma = getPrismaClient()

    const otpRows = await prisma.$queryRawUnsafe<Array<{ id: string; code: string; expires_at: string; attempts: number }>>(
      "SELECT id, code, expires_at, attempts FROM admin_otp_codes WHERE admin_id = $1 ORDER BY created_at DESC LIMIT 1",
      tallerId,
    )

    const otpRow = otpRows[0]
    if (!otpRow) {
      return { success: false, error: "No hay un codigo activo. Solicita uno nuevo." }
    }

    if (new Date(otpRow.expires_at) < new Date()) {
      await prisma.$executeRawUnsafe("DELETE FROM admin_otp_codes WHERE id = $1", otpRow.id)
      return { success: false, error: "El codigo ha expirado. Solicita uno nuevo." }
    }

    if ((otpRow.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
      await prisma.$executeRawUnsafe("DELETE FROM admin_otp_codes WHERE id = $1", otpRow.id)
      return { success: false, error: "Demasiados intentos fallidos. Solicita un nuevo codigo." }
    }

    if (otpRow.code !== code.trim()) {
      await prisma.$executeRawUnsafe(
        "UPDATE admin_otp_codes SET attempts = COALESCE(attempts, 0) + 1 WHERE id = $1",
        otpRow.id,
      )
      return { success: false, error: "Codigo incorrecto. Verifica e intenta de nuevo." }
    }

    await prisma.$executeRawUnsafe("DELETE FROM admin_otp_codes WHERE admin_id = $1", tallerId)

    const cookieStore = await cookies()
    cookieStore.set(ADMIN_VERIFIED_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/admin",
      maxAge: ADMIN_VERIFIED_TTL_SECONDS,
    })

    return { success: true }
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return { success: false, error: "SESSION_EXPIRED" }
    }
    console.error("[admin-otp] Unhandled error in verifyAdminOTP:", err)
    return { success: false, error: "Error inesperado. Intenta de nuevo." }
  }
}
