"use server"

import { revalidatePath } from "next/cache"
import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"

type TxClient = Parameters<Parameters<ReturnType<typeof getPrismaClient>["$transaction"]>[0]>[0]

export interface Servicio {
  id: string
  nombre: string
  descripcion: string
  precio: number
  created_at: string
  updated_at: string
}

export interface ReparacionServicio {
  id: string
  reparacion_id: string
  servicio_id: string | null
  nombre_snapshot: string
  precio_snapshot: number
  cantidad: number
  created_at: string
}

export interface CreateServicioInput {
  nombre: string
  descripcion: string
  precio: number
}

function mapServicio(r: { id: string; nombre: string; descripcion: string; precio: any; createdAt: Date; updatedAt: Date }): Servicio {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    precio: Number(r.precio),
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }
}

function mapReparacionServicio(r: {
  id: string
  reparacionId: string
  servicioId: string | null
  nombreSnapshot: string
  precioSnapshot: any
  cantidad: number
  createdAt: Date
}): ReparacionServicio {
  return {
    id: r.id,
    reparacion_id: r.reparacionId,
    servicio_id: r.servicioId,
    nombre_snapshot: r.nombreSnapshot,
    precio_snapshot: Number(r.precioSnapshot),
    cantidad: r.cantidad,
    created_at: r.createdAt.toISOString(),
  }
}

// ─── Catálogo de servicios ────────────────────────────────────────────────────

export async function getServicios(): Promise<{ data: Servicio[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const rows = await prisma.catalogoServicio.findMany({
      where: { tenantId },
      orderBy: { nombre: "asc" },
    })
    return { data: rows.map(mapServicio), error: null }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Error al cargar servicios" }
  }
}

export async function createServicio(
  input: CreateServicioInput
): Promise<{ data: Servicio | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const row = await prisma.catalogoServicio.create({
      data: {
        tenantId,
        nombre: input.nombre.trim(),
        descripcion: input.descripcion.trim(),
        precio: input.precio,
      },
    })
    revalidatePath("/dashboard/servicios")
    return { data: mapServicio(row), error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Error al crear servicio" }
  }
}

export async function updateServicio(
  id: string,
  input: Partial<CreateServicioInput>
): Promise<{ data: Servicio | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const data: Record<string, unknown> = {}
    if (input.nombre !== undefined) data.nombre = input.nombre.trim()
    if (input.descripcion !== undefined) data.descripcion = input.descripcion.trim()
    if (input.precio !== undefined) data.precio = input.precio

    const row = await prisma.catalogoServicio.update({
      where: { id, tenantId },
      data,
    })
    revalidatePath("/dashboard/servicios")
    return { data: mapServicio(row), error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Error al actualizar servicio" }
  }
}

export async function deleteServicio(id: string): Promise<{ error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    await prisma.catalogoServicio.delete({ where: { id, tenantId } })
    revalidatePath("/dashboard/servicios")
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error al eliminar servicio" }
  }
}

// ─── Servicios aplicados a reparaciones ───────────────────────────────────────

export async function getServiciosReparacion(
  reparacionId: string
): Promise<{ data: ReparacionServicio[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const rows = await prisma.reparacionServicio.findMany({
      where: { reparacionId, tenantId },
      orderBy: { createdAt: "asc" },
    })
    return { data: rows.map(mapReparacionServicio), error: null }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Error al cargar servicios de reparacion" }
  }
}

export async function addServicioReparacion(
  reparacionId: string,
  servicioId: string,
  cantidad = 1
): Promise<{ data: ReparacionServicio | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const svc = await prisma.catalogoServicio.findFirst({
      where: { id: servicioId, tenantId },
      select: { nombre: true, precio: true },
    })
    if (!svc) return { data: null, error: "Servicio no encontrado" }

    const row = await prisma.reparacionServicio.create({
      data: {
        tenantId,
        reparacionId,
        servicioId,
        nombreSnapshot: svc.nombre,
        precioSnapshot: svc.precio,
        cantidad,
      },
    })
    revalidatePath(`/dashboard/reparaciones/${reparacionId}`)
    return { data: mapReparacionServicio(row), error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Error al agregar servicio" }
  }
}

export async function removeServicioReparacion(
  reparacionServicioId: string,
  reparacionId: string
): Promise<{ error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    await prisma.reparacionServicio.delete({
      where: { id: reparacionServicioId, tenantId },
    })
    revalidatePath(`/dashboard/reparaciones/${reparacionId}`)
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error al eliminar servicio de reparacion" }
  }
}

export async function setServiciosReparacion(
  reparacionId: string,
  servicios: { servicio_id: string; cantidad?: number }[],
  txClient?: TxClient,
): Promise<{ error: string | null }> {
  try {
    const prisma = txClient ?? getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    await prisma.reparacionServicio.deleteMany({
      where: { reparacionId, tenantId },
    })

    if (!servicios.length) {
      if (!txClient) revalidatePath(`/dashboard/reparaciones/${reparacionId}`)
      return { error: null }
    }

    const ids = servicios.map((s) => s.servicio_id)
    const catRows = await prisma.catalogoServicio.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true, nombre: true, precio: true },
    })
    const catMap = new Map(catRows.map((r) => [r.id, { nombre: r.nombre, precio: r.precio }]))

    const inserts = servicios
      .map((s) => {
        const cat = catMap.get(s.servicio_id)
        if (!cat) return null
        return {
          tenantId,
          reparacionId,
          servicioId: s.servicio_id,
          nombreSnapshot: cat.nombre,
          precioSnapshot: cat.precio,
          cantidad: Math.max(1, s.cantidad ?? 1),
        }
      })
      .filter(Boolean) as {
        tenantId: string
        reparacionId: string
        servicioId: string
        nombreSnapshot: string
        precioSnapshot: any
        cantidad: number
      }[]

    if (inserts.length) {
      await prisma.reparacionServicio.createMany({ data: inserts })
    }

    if (!txClient) revalidatePath(`/dashboard/reparaciones/${reparacionId}`)
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error al asignar servicios" }
  }
}
