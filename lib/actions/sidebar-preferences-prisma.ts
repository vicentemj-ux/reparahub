"use server"

import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"

const ALLOWED_SIDEBAR_HREFS = [
  "/dashboard/facturacion",
  "/dashboard/ventas",
  "/dashboard/reparaciones",
  "/dashboard/historial-ventas",
  "/dashboard/inventario",
  "/dashboard/mercado",
  "/dashboard/clientes",
  "/dashboard/bitacora-gastos",
  "/dashboard/equipo",
  "/dashboard/configuracion",
  "/dashboard/bitacora-visitas",
  "/dashboard/chat",
  "/dashboard/cotizaciones",
  "/dashboard/compras",
  "/dashboard/utilidad",
  "/dashboard/reportes",
  "/dashboard/servicios",
] as const

function normalizeSidebarOrder(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const allowed = new Set<string>(ALLOWED_SIDEBAR_HREFS)
  const seen = new Set<string>()
  return input
    .map((href) => String(href))
    .filter((href) => {
      if (!allowed.has(href) || seen.has(href)) return false
      seen.add(href)
      return true
    })
}

function mergeSidebarPreferences(current: unknown, order: string[]) {
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {}
  base.sidebar = {
    ...((base.sidebar as Record<string, unknown> | undefined) ?? {}),
    order,
  }
  return base
}

export async function getSidebarPreferences(): Promise<{ order: string[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId },
      select: { uiPreferences: true },
    })
    const source = row?.uiPreferences as Record<string, unknown> | null | undefined
    const order = normalizeSidebarOrder((source?.sidebar as Record<string, unknown> | undefined)?.order)
    return { order, error: null }
  } catch (error) {
    console.error("[sidebar-preferences] get:", error)
    return { order: [], error: "No se pudo cargar el orden del menu." }
  }
}

export async function updateSidebarPreferences(orderInput: string[]): Promise<{ order: string[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const order = normalizeSidebarOrder(orderInput)

    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId },
      select: { uiPreferences: true },
    })

    const uiPreferences = mergeSidebarPreferences(row?.uiPreferences, order)
    await prisma.configuracionTaller.upsert({
      where: { tenantId },
      create: {
        tenantId,
        nombreComercial: "Mi Taller",
        uiPreferences: uiPreferences as any,
      },
      update: { uiPreferences: uiPreferences as any },
    })

    return { order, error: null }
  } catch (error) {
    console.error("[sidebar-preferences] update:", error)
    return { order: [], error: "No se pudo guardar el orden del menu." }
  }
}
