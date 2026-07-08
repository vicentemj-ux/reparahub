"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getCurrentActorDisplayName } from "@/lib/auth/actor-display-name"
import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"
import { createRepair } from "@/lib/actions/repairs-prisma"
import { getTallerSettings } from "@/lib/actions/settings-prisma"
import { buildCustomerWhatsAppUrl, getTallerWhatsAppCountryCode, normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { isValidClienteTelefono, resolveClienteByTelefono } from "@/lib/actions/client-resolver-prisma"

export type CotizacionEstado = "pendiente" | "aceptada" | "rechazada" | "convertida"

export type CotizacionOrigen = "Mostrador" | "WhatsApp" | "Telefono" | "Internet"

export interface CotizacionItemInput {
  descripcion: string
  cantidad: number
  precio_unitario: number
  orden?: number
}

export interface CotizacionInput {
  cliente_id?: string | null
  cliente_nombre: string
  cliente_telefono?: string | null
  equipo_tipo: string
  marca: string
  modelo: string
  descripcion?: string
  observaciones?: string | null
  origen?: CotizacionOrigen
  descuento?: number
  fecha_expiracion?: string | null
  items: CotizacionItemInput[]
}

export interface Cotizacion extends Omit<CotizacionInput, "items" | "descuento"> {
  id: string
  taller_id: string
  folio: string
  subtotal: number
  descuento: number
  total: number
  estado: CotizacionEstado
  origen: CotizacionOrigen
  fecha: string
  creado_por: string | null
  reparacion_id: string | null
  created_at: string
  updated_at: string
  items: CotizacionItem[]
}

export interface CotizacionItem extends CotizacionItemInput {
  id: string
  cotizacion_id: string
  taller_id: string
  total: number
  created_at: string
  updated_at: string
}

function safeOrigen(value: unknown): CotizacionOrigen {
  return value === "WhatsApp" || value === "Telefono" || value === "Internet" ? value : "Mostrador"
}

function sanitizeItems(items: CotizacionItemInput[]): Array<Required<Pick<CotizacionItemInput, "descripcion" | "cantidad" | "precio_unitario" | "orden">>> {
  const cleaned = items
    .map((item, idx) => ({
      descripcion: item.descripcion.trim(),
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
      orden: Number.isFinite(item.orden) ? Number(item.orden) : idx,
    }))
    .filter((item) => item.descripcion && item.cantidad > 0 && item.precio_unitario >= 0)
  // Reasigna orden 0..N secuencial preservando el orden relativo del input
  return cleaned.map((item, idx) => ({ ...item, orden: idx }))
}

function computeTotals(items: CotizacionItemInput[], descuentoRaw?: number) {
  const subtotal = items.reduce((acc, item) => acc + item.cantidad * item.precio_unitario, 0)
  const descuento = Math.min(Math.max(Number(descuentoRaw ?? 0), 0), subtotal)
  const total = Math.max(0, subtotal - descuento)
  return {
    subtotal: Number(subtotal.toFixed(2)),
    descuento: Number(descuento.toFixed(2)),
    total: Number(total.toFixed(2)),
  }
}

function mapCotizacion(row: any): Cotizacion {
  const items: CotizacionItem[] = (row.items ?? [])
    .slice()
    .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((item: any) => ({
      id: item.id,
      cotizacion_id: item.cotizacionId ?? row.id,
      taller_id: item.tenantId ?? row.tenantId,
      descripcion: item.descripcion,
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precioUnitario ?? item.precio_unitario),
      total: Number(item.total),
      orden: Number(item.orden ?? 0),
      created_at: item.createdAt?.toISOString?.() ?? item.created_at,
      updated_at: item.updatedAt?.toISOString?.() ?? item.updated_at,
    }))

  return {
    id: row.id,
    taller_id: row.tenantId,
    folio: row.folio,
    cliente_id: row.clienteId,
    cliente_nombre: row.clienteNombre,
    cliente_telefono: row.clienteTelefono,
    equipo_tipo: row.equipoTipo,
    marca: row.marca,
    modelo: row.modelo,
    descripcion: row.descripcion ?? "",
    observaciones: row.observaciones,
    subtotal: Number(row.subtotal),
    descuento: Number(row.descuento),
    total: Number(row.total),
    estado: row.estado as CotizacionEstado,
    origen: safeOrigen(row.origen),
    fecha: row.fecha?.toISOString?.()?.split("T")[0] ?? row.fecha,
    fecha_expiracion: row.fechaExpiracion?.toISOString?.()?.split("T")[0] ?? row.fechaExpiracion,
    creado_por: row.creadoPor,
    reparacion_id: row.reparacionId,
    created_at: row.createdAt?.toISOString?.() ?? row.created_at,
    updated_at: row.updatedAt?.toISOString?.() ?? row.updated_at,
    items,
  }
}

async function getNextCotFolio(tenantId: string): Promise<string> {
  const prisma = getPrismaClient()
  const last = await prisma.cotizacion.findMany({
    where: { tenantId },
    select: { folio: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  let maxNum = 0
  for (const row of last) {
    const n = Number(String(row.folio).replace(/\D/g, ""))
    if (Number.isFinite(n)) maxNum = Math.max(maxNum, n)
  }
  return `COT-${String(maxNum + 1).padStart(4, "0")}`
}

export async function getCotizaciones(params?: {
  search?: string
  estado?: "todas" | CotizacionEstado
  origen?: "todos" | CotizacionOrigen
}): Promise<{ data: Cotizacion[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const where: any = { tenantId }
    if (params?.estado && params.estado !== "todas") {
      where.estado = params.estado
    }
    if (params?.origen && params.origen !== "todos") {
      where.origen = params.origen
    }
    if (params?.search?.trim()) {
      const q = params.search.trim()
      where.OR = [
        { clienteNombre: { contains: q, mode: "insensitive" } },
        { marca: { contains: q, mode: "insensitive" } },
        { modelo: { contains: q, mode: "insensitive" } },
        { folio: { contains: q, mode: "insensitive" } },
      ]
    }

    const rows = await prisma.cotizacion.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    return { data: rows.map(mapCotizacion), error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : "Error al cargar cotizaciones" }
  }
}

export async function getCotizacionById(id: string): Promise<{ data: Cotizacion | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const row = await prisma.cotizacion.findFirst({
      where: { id, tenantId },
      include: { items: true },
    })
    if (!row) return { data: null, error: "Cotizacion no encontrada." }
    return { data: mapCotizacion(row), error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Error al cargar cotizacion" }
  }
}

export interface OrigenStats {
  total: number
  porOrigen: Record<CotizacionOrigen, number>
  conversionPct: number
  autorizadas: number
}

export async function getCotizacionOrigenStats(): Promise<{ data: OrigenStats | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const rows = await prisma.cotizacion.findMany({
      where: { tenantId },
      select: { estado: true, origen: true },
    })
    const porOrigen: Record<CotizacionOrigen, number> = { Mostrador: 0, WhatsApp: 0, Telefono: 0, Internet: 0 }
    let autorizadas = 0
    for (const r of rows) {
      const o = safeOrigen(r.origen)
      porOrigen[o] = (porOrigen[o] ?? 0) + 1
      if (r.estado === "aceptada" || r.estado === "convertida") autorizadas += 1
    }
    const total = rows.length
    const conversionPct = total === 0 ? 0 : Math.round((autorizadas / total) * 100)
    return { data: { total, porOrigen, conversionPct, autorizadas }, error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Error al cargar estadisticas" }
  }
}

export async function createCotizacion(input: CotizacionInput): Promise<{ data: Cotizacion | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const actorNombre = await getCurrentActorDisplayName()

    if (!input.cliente_nombre.trim()) return { data: null, error: "El nombre del cliente es requerido." }
    if (!isValidClienteTelefono(input.cliente_telefono)) return { data: null, error: "El telefono del cliente es requerido." }
    const cleanItems = sanitizeItems(input.items)
    if (!cleanItems.length) return { data: null, error: "Debes agregar al menos un item." }

    const totals = computeTotals(cleanItems, input.descuento)
    const folio = await getNextCotFolio(tenantId)
    const origen = safeOrigen(input.origen)
    const resolvedCliente = await resolveClienteByTelefono({
      tenantId,
      clienteId: input.cliente_id,
      telefono: input.cliente_telefono,
      nombre: input.cliente_nombre,
      notasOrigen: "Creado o vinculado desde Cotizaciones.",
    })
    if (resolvedCliente.error) return { data: null, error: resolvedCliente.error }

    const row = await prisma.cotizacion.create({
      data: {
        tenantId,
        folio,
        clienteId: resolvedCliente.client?.id ?? input.cliente_id ?? null,
        clienteNombre: resolvedCliente.client?.nombre ?? input.cliente_nombre.trim(),
        clienteTelefono: resolvedCliente.telefono || input.cliente_telefono?.trim() || null,
        equipoTipo: input.equipo_tipo.trim() || "Celular",
        marca: input.marca.trim(),
        modelo: input.modelo.trim(),
        descripcion: input.descripcion?.trim() || "",
        observaciones: input.observaciones?.trim() || null,
        subtotal: totals.subtotal,
        descuento: totals.descuento,
        total: totals.total,
        estado: "pendiente",
        origen,
        fechaExpiracion: input.fecha_expiracion ? new Date(input.fecha_expiracion) : null,
        creadoPor: actorNombre,
        items: {
          create: cleanItems.map((item) => ({
            tenantId,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precioUnitario: item.precio_unitario,
            total: Number((item.cantidad * item.precio_unitario).toFixed(2)),
            orden: item.orden,
          })),
        },
      },
      include: { items: true },
    })

    revalidatePath("/dashboard/cotizaciones")
    return { data: mapCotizacion(row), error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Error al crear cotizacion" }
  }
}

export async function updateCotizacion(
  id: string,
  input: CotizacionInput,
): Promise<{ data: Cotizacion | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const cleanItems = sanitizeItems(input.items)

    if (!input.cliente_nombre.trim()) return { data: null, error: "El nombre del cliente es requerido." }
    if (!isValidClienteTelefono(input.cliente_telefono)) return { data: null, error: "El telefono del cliente es requerido." }
    if (!cleanItems.length) return { data: null, error: "Debes agregar al menos un item." }

    const current = await prisma.cotizacion.findUnique({
      where: { id },
      select: { estado: true, tenantId: true },
    })
    if (!current || current.tenantId !== tenantId) return { data: null, error: "Cotizacion no encontrada." }
    if (current.estado === "convertida") return { data: null, error: "No puedes editar una cotizacion convertida." }

    const totals = computeTotals(cleanItems, input.descuento)
    const origen = safeOrigen(input.origen)
    const resolvedCliente = await resolveClienteByTelefono({
      tenantId,
      clienteId: input.cliente_id,
      telefono: input.cliente_telefono,
      nombre: input.cliente_nombre,
      notasOrigen: "Vinculado desde Cotizaciones.",
    })
    if (resolvedCliente.error) return { data: null, error: resolvedCliente.error }

    const row = await prisma.$transaction(async (tx) => {
      await tx.cotizacionItem.deleteMany({ where: { cotizacionId: id, tenantId } })
      return tx.cotizacion.update({
        where: { id },
        data: {
          clienteId: resolvedCliente.client?.id ?? input.cliente_id ?? null,
          clienteNombre: resolvedCliente.client?.nombre ?? input.cliente_nombre.trim(),
          clienteTelefono: resolvedCliente.telefono || input.cliente_telefono?.trim() || null,
          equipoTipo: input.equipo_tipo.trim() || "Celular",
          marca: input.marca.trim(),
          modelo: input.modelo.trim(),
          descripcion: input.descripcion?.trim() || "",
          observaciones: input.observaciones?.trim() || null,
          subtotal: totals.subtotal,
          descuento: totals.descuento,
          total: totals.total,
          origen,
          fechaExpiracion: input.fecha_expiracion ? new Date(input.fecha_expiracion) : null,
          items: {
            create: cleanItems.map((item) => ({
              tenantId,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              precioUnitario: item.precio_unitario,
              total: Number((item.cantidad * item.precio_unitario).toFixed(2)),
              orden: item.orden,
            })),
          },
        },
        include: { items: true },
      })
    })

    revalidatePath("/dashboard/cotizaciones")
    return { data: mapCotizacion(row), error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Error al actualizar cotizacion" }
  }
}

export async function setCotizacionEstado(id: string, estado: CotizacionEstado): Promise<{ error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    await prisma.cotizacion.updateMany({
      where: { id, tenantId },
      data: { estado },
    })

    revalidatePath("/dashboard/cotizaciones")
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al actualizar estado" }
  }
}

export async function deleteCotizacion(id: string): Promise<{ error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    await prisma.cotizacion.deleteMany({
      where: { id, tenantId },
    })

    revalidatePath("/dashboard/cotizaciones")
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al eliminar cotizacion" }
  }
}

export async function buildCotizacionWhatsAppLink(cotizacion: Cotizacion): Promise<{ url: string | null; error: string | null; message?: string }> {
  try {
    const { settings } = await getTallerSettings()
    const cc = getTallerWhatsAppCountryCode(settings?.pais)
    const digits = normalizePhoneForWhatsApp(cotizacion.cliente_telefono, cc)
    if (!digits) return { url: null, error: "No hay telefono valido para WhatsApp." }

    const money = (value: number) =>
      `$${value.toLocaleString("es-419", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const equipo = [cotizacion.equipo_tipo, cotizacion.marca, cotizacion.modelo].filter(Boolean).join(" ").trim()
    const itemsSorted = (cotizacion.items ?? []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    const principalItem = itemsSorted.find((item) => item.orden === 0) ?? itemsSorted[0]
    const conceptoPrincipal =
      principalItem?.descripcion?.trim() || cotizacion.descripcion?.trim() || "Servicio cotizado"
    const conceptoLines = itemsSorted
      .filter((item) => item.descripcion?.trim())
      .map((item) => {
        const totalItem = item.cantidad * item.precio_unitario
        const qty = item.cantidad > 1 ? ` x${item.cantidad}` : ""
        const estrella = item.orden === 0 ? " ⭐" : ""
        return `- ${item.descripcion}${qty}: ${money(totalItem)}${estrella}`
      })
    const vigencia = cotizacion.fecha_expiracion
      ? `Vigencia: ${cotizacion.fecha_expiracion}`
      : "Vigencia: sujeta a disponibilidad de refacciones."
    const origenTag = `📍 Origen: ${cotizacion.origen}`

    const lines = [
      `Hola ${cotizacion.cliente_nombre} 👋`,
      "",
      `📄 Cotizacion: *${cotizacion.folio}*`,
      `💬 Servicio cotizado: *${conceptoPrincipal}*`,
      equipo ? `📱 Equipo: ${equipo}` : null,
      cotizacion.descripcion?.trim() ? `📝 Descripcion: ${cotizacion.descripcion.trim()}` : null,
      "",
      conceptoLines.length ? "🧾 Conceptos incluidos:" : null,
      ...conceptoLines,
      "",
      `💵 Suma de opciones: ${money(cotizacion.total)}`,
      `⏳ ${vigencia}`,
      origenTag,
      "",
      "Si estas de acuerdo, responde a este mensaje y con gusto continuamos con tu orden. 🤝",
    ]
      .filter((line): line is string => Boolean(line))
    const message = lines.join("\n")
    const url = buildCustomerWhatsAppUrl(digits, message)
    return { url, error: null, message }
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : "Error al generar enlace de WhatsApp" }
  }
}

export async function convertirCotizacionAReparacion(cotizacionId: string): Promise<{
  success: boolean
  error: string | null
  reparacionId?: string
  folioReparacion?: string
}> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const cot = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      select: { tenantId: true, estado: true, clienteNombre: true, clienteTelefono: true, equipoTipo: true, marca: true, modelo: true, descripcion: true, total: true },
    })
    if (!cot || cot.tenantId !== tenantId) return { success: false, error: "Cotizacion no encontrada." }
    if (cot.estado === "convertida") return { success: false, error: "Esta cotizacion ya fue convertida." }

    const repair = await createRepair({
      customerName: cot.clienteNombre,
      customerPhone: cot.clienteTelefono || "",
      tipo_equipo: cot.equipoTipo || "Celular",
      deviceBrand: cot.marca || "Sin marca",
      deviceModel: cot.modelo || "Sin modelo",
      reportedFault: cot.descripcion || "Diagnostico pendiente segun cotizacion.",
      estimatedPrice: String(cot.total ?? 0),
      deposit: "0",
    })

    if (!repair.success || !repair.repairId) {
      return { success: false, error: repair.error ?? "No se pudo convertir la cotizacion a reparacion." }
    }

    await prisma.cotizacion.update({
      where: { id: cotizacionId },
      data: { estado: "convertida", reparacionId: repair.repairId },
    })

    revalidatePath("/dashboard/cotizaciones")
    return {
      success: true,
      error: null,
      reparacionId: repair.repairId,
      folioReparacion: repair.folio,
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al convertir cotizacion" }
  }
}
