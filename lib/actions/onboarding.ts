"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"

type TxClient = Parameters<Parameters<ReturnType<typeof getPrismaClient>["$transaction"]>[0]>[0]

const nombreSchema = z.string().min(2, "El nombre del taller es obligatorio (minimo 2 caracteres)").max(100).trim()

const cookieBase = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
}

async function setTallerSessionCookies(tallerId: string, nombreTaller: string) {
  const cookieStore = await cookies()
  cookieStore.set("tallerId", tallerId, cookieBase)
  cookieStore.set("tallerName", encodeURIComponent(nombreTaller), cookieBase)
}

export async function completeOnboardingTaller(
  nombreTallerRaw: string,
): Promise<{ success: boolean; error?: string }> {
  const parsed = nombreSchema.safeParse(nombreTallerRaw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Datos invalidos" }
  }
  const nombreTaller = parsed.data

  const user = await getCurrentUser()
  const userId = (user as any)?.id as string | undefined
  const userEmail = user?.email?.toLowerCase().trim()
  if (!userId || !userEmail) {
    return { success: false, error: "Sesion no valida. Inicia sesion nuevamente." }
  }

  const prisma = getPrismaClient()
  const existingById = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  })

  if (existingById?.tenantId && existingById.tenant) {
    await setTallerSessionCookies(existingById.tenantId, existingById.tenant.nombre)
    redirect("/dashboard")
  }

  const targetUser =
    existingById ??
    (await prisma.user.findFirst({
      where: {
        email: { equals: userEmail, mode: "insensitive" },
      },
    }))

  if (!targetUser) {
    return { success: false, error: "No se encontro una cuenta de usuario para completar onboarding." }
  }

  const baseSlug = nombreTaller
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "taller"

  let slug = baseSlug
  let i = 1
  while (await prisma.tenant.findUnique({ where: { slug }, select: { id: true } })) {
    i += 1
    slug = `${baseSlug}-${i}`
  }

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 30)

  const result = await prisma.$transaction(async (tx: TxClient) => {
    const tenant = await tx.tenant.create({
      data: {
        nombre: nombreTaller,
        slug,
        plan: "PRO",
        trialEndsAt,
        currency: "MXN",
        timezone: "America/Mexico_City",
        paperSize: "80mm",
        printSettings: {},
      },
    })

    await tx.user.update({
      where: { id: targetUser.id },
      data: {
        tenantId: tenant.id,
        role: "OWNER",
        emailVerified: true,
        activo: true,
      },
    })

    await tx.configuracionTaller.create({
      data: {
        tenantId: tenant.id,
        nombreComercial: nombreTaller,
        moneda: "MXN",
        timezone: "America/Mexico_City",
        paperSize: "80mm",
        printSettings: {},
      },
    })

    return { tenantId: tenant.id }
  })

  await setTallerSessionCookies(result.tenantId, nombreTaller)
  redirect("/dashboard")
}
