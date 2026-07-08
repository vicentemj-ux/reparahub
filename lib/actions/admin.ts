"use server"

import { getPrismaClient } from "@/lib/prisma"
import { calcDiasRestantes } from "@/lib/utils/subscription"
import { cookies } from "next/headers"
import { randomBytes } from "crypto"
import type { User, Tenant } from "@prisma/client"

/** Verifies that the caller is a logged-in admin. Throws if not. */
async function requireAdmin(): Promise<{ userId: string; tenantId: string }> {
  const cookieStore = await cookies()
  const tallerId = cookieStore.get("tallerId")?.value
  const isAdmin = cookieStore.get("isAdmin")?.value === "true"

  if (!tallerId || !isAdmin) {
    throw new Error("ADMIN_UNAUTHORIZED")
  }

  const prisma = getPrismaClient()
  const user = await prisma.user.findUnique({ where: { id: tallerId } })
  if (!user || user.role !== "ADMIN") {
    throw new Error("ADMIN_UNAUTHORIZED")
  }

  return { userId: user.id, tenantId: user.tenantId }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlanTipo = "prueba" | "activo" | "suspendido"

export interface TallerForAdmin {
  id: string
  nombre_taller: string
  nombre_propietario: string
  email: string
  plan_activo: boolean
  plan_tipo: PlanTipo
  fecha_vencimiento_plan: string | null
  dias_restantes: number | null
  es_admin: boolean
  email_verified: boolean
}

export interface AdminStats {
  total: number
  prueba: number
  activo: number
  suspendido: number
  porVencer: number
  vencidos: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function derivePlanTipo(plan: string, trialEndsAt: Date | null): PlanTipo {
  if (plan === "PRO") return "activo"
  if (!trialEndsAt) return "prueba"
  const dias = calcDiasRestantes(trialEndsAt instanceof Date ? trialEndsAt.toISOString() : String(trialEndsAt))
  if (dias !== null && dias <= 0) return "suspendido"
  return "prueba"
}

function mapToTaller(user: User & { tenant: Tenant }): TallerForAdmin {
  const trialEndsAt = user.tenant.trialEndsAt
  const trialStr = trialEndsAt instanceof Date ? trialEndsAt.toISOString() : null
  return {
    id: user.id,
    nombre_taller: user.tenant.nombre,
    nombre_propietario: user.nombre,
    email: user.email,
    plan_activo: user.tenant.plan === "PRO",
    plan_tipo: derivePlanTipo(user.tenant.plan, trialEndsAt instanceof Date ? trialEndsAt : null),
    fecha_vencimiento_plan: trialStr,
    dias_restantes: calcDiasRestantes(trialStr),
    es_admin: user.role === "ADMIN",
    email_verified: user.emailVerified,
  }
}

// ─── actualizarPlanActivo ────────────────────────────────────────────────────

export async function actualizarPlanActivo(
  tallerId: string,
  planActivo: boolean
): Promise<{ success: boolean; error: string | null }> {
  await requireAdmin()
  try {
    const prisma = getPrismaClient()
    const user = await prisma.user.findUnique({ where: { id: tallerId } })
    if (!user) return { success: false, error: "Usuario no encontrado" }

    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { plan: planActivo ? "PRO" : "NORMAL" },
    })
    return { success: true, error: null }
  } catch (error) {
    console.error("[actualizarPlanActivo]", error)
    return { success: false, error: error instanceof Error ? error.message : "No se pudo actualizar" }
  }
}

// ─── getAdminStats ────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<{ stats: AdminStats | null; error: string | null }> {
  await requireAdmin()
  try {
    const prisma = getPrismaClient()
    const users = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      include: { tenant: true },
    })

    const now = new Date()
    const stats: AdminStats = {
      total: users.length,
      prueba: 0,
      activo: 0,
      suspendido: 0,
      porVencer: 0,
      vencidos: 0,
    }

    for (const u of users) {
      const t = u.tenant
      if (t.plan === "PRO") {
        stats.activo++
        continue
      }
      if (!t.trialEndsAt) {
        stats.prueba++
        continue
      }
      const dias = calcDiasRestantes(t.trialEndsAt instanceof Date ? t.trialEndsAt.toISOString() : String(t.trialEndsAt))
      if (dias !== null && dias <= 0) {
        stats.vencidos++
      } else if (dias !== null && dias < 3) {
        stats.porVencer++
        stats.prueba++
      } else {
        stats.prueba++
      }
    }

    return { stats, error: null }
  } catch (error) {
    console.error("[getAdminStats]", error)
    return { stats: null, error: "Error al cargar estadisticas" }
  }
}

// ─── getAllTalleres ──────────────────────────────────────────────────────────

type Filtro = "todos" | "prueba" | "activo" | "suspendido" | "por_vencer"

export async function getAllTalleres(
  filtro: Filtro = "todos"
): Promise<{ talleres: TallerForAdmin[]; error: string | null }> {
  await requireAdmin()
  try {
    const prisma = getPrismaClient()
    const users = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      include: { tenant: true },
      orderBy: { nombre: "asc" },
    })

    let talleres = users.map(mapToTaller)

    if (filtro === "prueba") {
      talleres = talleres.filter((t) => t.plan_tipo === "prueba")
    } else if (filtro === "activo") {
      talleres = talleres.filter((t) => t.plan_tipo === "activo")
    } else if (filtro === "suspendido") {
      talleres = talleres.filter((t) => t.plan_tipo === "suspendido")
    } else if (filtro === "por_vencer") {
      talleres = talleres.filter((t) => {
        if (t.plan_tipo === "suspendido" || !t.fecha_vencimiento_plan) return false
        const dias = calcDiasRestantes(t.fecha_vencimiento_plan)
        return dias !== null && dias >= 0 && dias < 3
      })
    }

    talleres.sort((a, b) => (a.dias_restantes ?? 9999) - (b.dias_restantes ?? 9999))
    return { talleres, error: null }
  } catch (error) {
    console.error("[getAllTalleres]", error)
    return { talleres: [], error: "Error al cargar talleres" }
  }
}

// ─── searchTalleres ──────────────────────────────────────────────────────────

export async function searchTalleres(
  query: string
): Promise<{ talleres: TallerForAdmin[]; error: string | null }> {
  await requireAdmin()
  if (!query.trim()) return getAllTalleres()

  try {
    const prisma = getPrismaClient()
    const users = await prisma.user.findMany({
      where: {
        role: { not: "ADMIN" },
        OR: [
          { tenant: { nombre: { contains: query, mode: "insensitive" } } },
          { nombre: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { tenant: true },
      orderBy: { nombre: "asc" },
    })
    return { talleres: users.map(mapToTaller), error: null }
  } catch (error) {
    console.error("[searchTalleres]", error)
    return { talleres: [], error: "Error en busqueda" }
  }
}

// ─── extendSuscripcion ───────────────────────────────────────────────────────

export async function extendSuscripcion(
  tallerId: string,
  dias: number
): Promise<{ success: boolean; nuevaFecha: string | null; error: string | null }> {
  await requireAdmin()
  if (dias <= 0) return { success: false, nuevaFecha: null, error: "Los dias deben ser mayores a 0" }

  try {
    const prisma = getPrismaClient()
    const user = await prisma.user.findUnique({ where: { id: tallerId }, include: { tenant: true } })
    if (!user) return { success: false, nuevaFecha: null, error: "Usuario no encontrado" }

    const tenant = user.tenant
    const baseDate = tenant.trialEndsAt && new Date(tenant.trialEndsAt) > new Date()
      ? new Date(tenant.trialEndsAt)
      : new Date()

    const nuevaFecha = new Date(baseDate)
    nuevaFecha.setDate(nuevaFecha.getDate() + dias)

    const wasExpired = !tenant.trialEndsAt || new Date(tenant.trialEndsAt) < new Date()

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        trialEndsAt: nuevaFecha,
        plan: wasExpired ? "PRO" : tenant.plan,
      },
    })

    return { success: true, nuevaFecha: nuevaFecha.toISOString(), error: null }
  } catch (error) {
    console.error("[extendSuscripcion]", error)
    return { success: false, nuevaFecha: null, error: "Error al extender acceso" }
  }
}

// ─── cambiarEstatus ──────────────────────────────────────────────────────────

export async function cambiarEstatus(
  tallerId: string,
  nuevoEstatus: "activo" | "suspendido"
): Promise<{ success: boolean; error: string | null }> {
  await requireAdmin()
  try {
    const prisma = getPrismaClient()
    const user = await prisma.user.findUnique({ where: { id: tallerId }, include: { tenant: true } })
    if (!user) return { success: false, error: "Usuario no encontrado" }

    if (nuevoEstatus === "activo") {
      const tenant = user.tenant
      const needsNewTrial = !tenant.trialEndsAt || new Date(tenant.trialEndsAt) < new Date()
      const nuevaFecha = new Date()
      nuevaFecha.setDate(nuevaFecha.getDate() + 30)

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          plan: "PRO",
          trialEndsAt: needsNewTrial ? nuevaFecha : tenant.trialEndsAt,
        },
      })
    } else {
      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: { plan: "NORMAL" },
      })
    }

    return { success: true, error: null }
  } catch (error) {
    console.error("[cambiarEstatus]", error)
    return { success: false, error: "Error al cambiar estatus" }
  }
}

// ─── resetPasswordAdmin ──────────────────────────────────────────────────────

export async function resetPasswordAdmin(
  tallerId: string
): Promise<{ success: boolean; resetToken?: string; error: string | null }> {
  await requireAdmin()
  try {
    const prisma = getPrismaClient()
    const resetToken = randomBytes(32).toString("hex")

    await prisma.user.update({
      where: { id: tallerId },
      data: { sessionVersion: { increment: 1 } },
    })

    return { success: true, resetToken, error: null }
  } catch (error) {
    console.error("[resetPasswordAdmin]", error)
    return { success: false, error: "Error al resetear contrasena" }
  }
}

// ─── deleteTallerAccount ─────────────────────────────────────────────────────

export async function deleteTallerAccount(
  tallerId: string
): Promise<{ success: boolean; error: string | null }> {
  await requireAdmin()
  try {
    const prisma = getPrismaClient()
    const user = await prisma.user.findUnique({ where: { id: tallerId } })
    if (!user) return { success: false, error: "Usuario no encontrado" }

    await prisma.user.delete({ where: { id: tallerId } })
    return { success: true, error: null }
  } catch (error) {
    console.error("[deleteTallerAccount]", error)
    return { success: false, error: "Error al eliminar cuenta" }
  }
}
