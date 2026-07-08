"use server"

import { randomInt } from "crypto"
import { getCurrentUser } from "@/lib/auth"
import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"
import { sendMemberVerificationPinEmail } from "@/lib/email/send"

type IssuePinInput = {
  userId: string
  tallerId: string
  email: string
  nombre: string
}

function makePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0")
}

export async function issueMemberVerificationPin(input: IssuePinInput): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = input.userId.trim()
    const tallerId = input.tallerId.trim()
    const email = input.email.trim().toLowerCase()
    const nombre = input.nombre.trim() || "Usuario"

    if (!userId || !tallerId || !email) {
      return { success: false, error: "Datos incompletos para enviar verificacion." }
    }

    const prisma = getPrismaClient()
    const pin = makePin()
    const expiraAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.verificationPin.deleteMany({
      where: { userId, tenantId: tallerId },
    })

    await prisma.verificationPin.create({
      data: { userId, tenantId: tallerId, pin, expiraAt },
    })

    const emailRes = await sendMemberVerificationPinEmail(email, nombre, pin)
    if (!emailRes.success) {
      return { success: false, error: emailRes.error || "No se pudo enviar el correo de verificacion." }
    }

    return { success: true }
  } catch (error) {
    console.error("[issueMemberVerificationPin]", error)
    return { success: false, error: "Verificacion por PIN no disponible temporalmente." }
  }
}

export async function getCurrentUserVerificationStatus(): Promise<{
  requiresVerification: boolean
  email: string
  nombre: string
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { requiresVerification: false, email: "", nombre: "" }
    }

    const userId = (user as any).id
    if (!userId) {
      return { requiresVerification: false, email: "", nombre: "" }
    }

    const prisma = getPrismaClient()
    const member = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, email: true, nombre: true },
    })

    if (!member) {
      return { requiresVerification: false, email: "", nombre: "" }
    }

    return {
      requiresVerification: !member.emailVerified,
      email: member.email?.trim() || "",
      nombre: member.nombre?.trim() || "Usuario",
    }
  } catch (error) {
    console.error("[getCurrentUserVerificationStatus]", error)
    return { requiresVerification: false, email: "", nombre: "" }
  }
}

export async function resendCurrentUserVerificationPin(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Sesion no valida para reenviar codigo." }

    const userId = (user as any).id
    let tallerId: string
    try { tallerId = await getTenantIdOrThrow() } catch { return { success: false, error: "Sesion no valida." } }

    const prisma = getPrismaClient()
    const member = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, nombre: true },
    })

    if (!member) {
      return { success: false, error: "No se encontro el miembro para reenviar el codigo." }
    }

    return issueMemberVerificationPin({
      userId,
      tallerId,
      email: member.email?.trim() || "",
      nombre: member.nombre?.trim() || "Usuario",
    })
  } catch (error) {
    console.error("[resendCurrentUserVerificationPin]", error)
    return { success: false, error: "Verificacion por PIN no disponible temporalmente." }
  }
}

export async function verifyCurrentUserPin(pin: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPin = (pin || "").trim()
    if (!/^[0-9]{6}$/.test(normalizedPin)) {
      return { success: false, error: "Codigo incorrecto o expirado." }
    }

    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Sesion no valida para verificar codigo." }

    const userId = (user as any).id
    let tallerId: string
    try { tallerId = await getTenantIdOrThrow() } catch { return { success: false, error: "Sesion no valida." } }

    const prisma = getPrismaClient()
    const record = await prisma.verificationPin.findFirst({
      where: {
        userId,
        tenantId: tallerId,
        pin: normalizedPin,
        expiraAt: { gt: new Date() },
      },
    })

    if (!record) {
      return { success: false, error: "Codigo incorrecto o expirado." }
    }

    await prisma.verificationPin.delete({ where: { id: record.id } })

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    })

    return { success: true }
  } catch (error) {
    console.error("[verifyCurrentUserPin]", error)
    return { success: false, error: "Verificacion por PIN no disponible temporalmente." }
  }
}

/**
 * Verifica un PIN de STAFF sin requerir sesion (para usuarios que
 * acaban de ser invitados y aun no pueden iniciar sesion). Busca el
 * PIN por (email + tenantId del usuario), valida vigencia de 15 min,
 * marca `emailVerified: true` y borra el registro del PIN.
 *
 * Solo aplica a usuarios con role="STAFF" y emailVerified=false. Para
 * OWNERs la verificacion es por enlace (ver `verifyEmailToken`).
 */
export async function verifyStaffPinByEmail(
  email: string,
  pin: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPin = (pin || "").trim()
    if (!/^[0-9]{6}$/.test(normalizedPin)) {
      return { success: false, error: "Codigo incorrecto o expirado." }
    }

    const normalizedEmail = (email || "").trim().toLowerCase()
    if (!normalizedEmail) {
      return { success: false, error: "Email requerido." }
    }

    const prisma = getPrismaClient()
    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        role: "STAFF",
        emailVerified: false,
      },
      select: { id: true, tenantId: true },
    })

    if (!user) {
      return { success: false, error: "No hay un miembro pendiente de verificacion con este correo." }
    }

    const record = await prisma.verificationPin.findFirst({
      where: {
        userId: user.id,
        tenantId: user.tenantId,
        pin: normalizedPin,
        expiraAt: { gt: new Date() },
      },
    })

    if (!record) {
      return { success: false, error: "Codigo incorrecto o expirado. Solicita uno nuevo." }
    }

    await prisma.verificationPin.delete({ where: { id: record.id } })
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    })

    return { success: true }
  } catch (error) {
    console.error("[verifyStaffPinByEmail]", error)
    return { success: false, error: "Verificacion por PIN no disponible temporalmente." }
  }
}

/**
 * Reenvia el PIN a un STAFF sin requerir sesion. Equivalente a
 * `issueMemberVerificationPin` pero busca al usuario por email en
 * lugar de por id, para que un usuario bloqueado pueda pedir un
 * nuevo codigo desde la pantalla de login.
 */
export async function resendStaffPinByEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = (email || "").trim().toLowerCase()
    if (!normalizedEmail) {
      return { success: false, error: "Email requerido." }
    }

    const prisma = getPrismaClient()
    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        role: "STAFF",
        emailVerified: false,
      },
      select: { id: true, tenantId: true, email: true, nombre: true },
    })

    if (!user) {
      return { success: false, error: "No hay un miembro pendiente de verificacion con este correo." }
    }

    return issueMemberVerificationPin({
      userId: user.id,
      tallerId: user.tenantId,
      email: user.email,
      nombre: user.nombre?.trim() || "Usuario",
    })
  } catch (error) {
    console.error("[resendStaffPinByEmail]", error)
    return { success: false, error: "Reenvio de PIN no disponible temporalmente." }
  }
}
