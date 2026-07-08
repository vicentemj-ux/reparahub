"use server"

import { getCurrentActorDisplayName } from "@/lib/auth/actor-display-name"
import { getCurrentTallerId } from "@/lib/auth/get-current-taller"
import { Prisma } from "@prisma/client"
import { getPrismaClient } from "@/lib/prisma"

export interface Proveedor {
  id: string
  nombre: string
  contacto: string | null
  telefono: string | null
  email: string | null
  notas: string | null
  activo: boolean
  created_at: string
}

export interface DetalleOrden {
  id: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  producto_id: string | null
}

export interface OrdenCompra {
  id: string
  folio: string
  proveedor_id: string | null
  proveedor_nombre: string
  estatus: "borrador" | "en_transito" | "pendiente" | "recibida" | "parcial" | "cancelada"
  total: number
  notas: string | null
  fecha_orden: string
  fecha_entrega: string | null
  stock_aplicado: boolean
  created_at: string
  custodio: string | null
  detalle?: DetalleOrden[]
  errores_recepcion?: string[] | null
  articulos_count?: number
}

export interface CreateProveedorInput {
  nombre: string
  contacto?: string | null
  telefono?: string | null
  email?: string | null
  notas?: string | null
}

export interface UpdateProveedorInput extends CreateProveedorInput {
  id: string
}

export interface DetalleInput {
  descripcion: string
  cantidad: number
  precio_unitario: number
  producto_id?: string | null
}

export interface CreateOrdenInput {
  proveedor_id?: string | null
  proveedor_nombre: string
  fecha_orden: string
  fecha_entrega?: string | null
  notas?: string | null
  detalle: DetalleInput[]
}

async function nextFolio(tallerId: string): Promise<string> {
  const prisma = getPrismaClient()
  const last = await prisma.ordenCompra.findFirst({
    where: { tenantId: tallerId },
    orderBy: { folio: "desc" },
    select: { folio: true },
  })
  const lastNum = last ? parseInt(last.folio.slice(3), 10) : 0
  return `OC-${String(lastNum + 1).padStart(5, "0")}`
}

export async function getOrdenes(opts?: { search?: string; estatus?: string }): Promise<{ data: OrdenCompra[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const search = opts?.search?.trim() ?? ""

    const rows = await prisma.ordenCompra.findMany({
      where: {
        tenantId: tallerId,
        ...(opts?.estatus && opts.estatus !== "todos" ? { estatus: opts.estatus } : {}),
        ...(search
          ? {
              OR: [
                { folio: { contains: search, mode: "insensitive" as const } },
                { proveedorNombre: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 150,
      include: {
        _count: { select: { detalles: true } },
      },
    })

    return {
      data: rows.map((r) => ({
        id: r.id,
        folio: r.folio,
        proveedor_id: r.proveedorId,
        proveedor_nombre: r.proveedorNombre,
        estatus: r.estatus as OrdenCompra["estatus"],
        total: Number(r.total),
        notas: r.notas,
        fecha_orden: r.fechaOrden.toISOString(),
        fecha_entrega: r.fechaEntrega?.toISOString() ?? null,
        stock_aplicado: r.stockAplicado,
        created_at: r.createdAt.toISOString(),
        custodio: r.custodio,
        errores_recepcion: (() => {
          if (!r.erroresRecepcion) return null
          const val = r.erroresRecepcion
          if (Array.isArray(val)) return val as unknown as string[]
          return null
        })(),
        articulos_count: r._count.detalles,
      })),
      error: null,
    }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Error al cargar ordenes" }
  }
}

export async function getOrdenById(ordenId: string): Promise<{ data: OrdenCompra | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()

    const orden = await prisma.ordenCompra.findFirst({
      where: { id: ordenId, tenantId: tallerId },
      include: {
        detalles: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!orden) return { data: null, error: "Orden no encontrada." }

    const data: OrdenCompra = {
      id: orden.id,
      folio: orden.folio,
      proveedor_id: orden.proveedorId,
      proveedor_nombre: orden.proveedorNombre,
      estatus: orden.estatus as OrdenCompra["estatus"],
      total: Number(orden.total),
      notas: orden.notas,
      fecha_orden: orden.fechaOrden.toISOString(),
      fecha_entrega: orden.fechaEntrega?.toISOString() ?? null,
      stock_aplicado: orden.stockAplicado,
      created_at: orden.createdAt.toISOString(),
      custodio: orden.custodio,
      errores_recepcion: (() => {
        if (!orden.erroresRecepcion) return null
        const val = orden.erroresRecepcion
        if (Array.isArray(val)) return val as unknown as string[]
        return null
      })(),
      detalle: orden.detalles.map((d) => ({
        id: d.id,
        descripcion: d.descripcion,
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precioUnitario),
        subtotal: Number(d.subtotal),
        producto_id: d.productoId,
      })),
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Error cargando orden" }
  }
}

export async function createOrden(input: CreateOrdenInput): Promise<{ data: OrdenCompra | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const actor = await getCurrentActorDisplayName()

    if (!input.detalle?.length) return { data: null, error: "Agrega al menos un producto." }
    if (!input.proveedor_nombre.trim()) return { data: null, error: "El proveedor es requerido." }

    const total = input.detalle.reduce((s, d) => s + Number(d.cantidad) * Number(d.precio_unitario), 0)
    const folio = await nextFolio(tallerId)

    const orden = await prisma.ordenCompra.create({
      data: {
        tenantId: tallerId,
        folio,
        proveedorId: input.proveedor_id ?? null,
        proveedorNombre: input.proveedor_nombre.trim(),
        estatus: "borrador",
        total,
        notas: input.notas?.trim() || null,
        fechaOrden: new Date(input.fecha_orden),
        fechaEntrega: input.fecha_entrega ? new Date(input.fecha_entrega) : null,
        custodio: actor,
        detalles: {
          create: input.detalle.map((d) => ({
            tenantId: tallerId,
            descripcion: d.descripcion.trim(),
            cantidad: Number(d.cantidad),
            precioUnitario: Number(d.precio_unitario),
            subtotal: Number(d.cantidad) * Number(d.precio_unitario),
            productoId: d.producto_id ?? null,
          })),
        },
      },
    })

    return {
      data: {
        id: orden.id,
        folio: orden.folio,
        proveedor_id: orden.proveedorId,
        proveedor_nombre: orden.proveedorNombre,
        estatus: orden.estatus as OrdenCompra["estatus"],
        total: Number(orden.total),
        notas: orden.notas,
        fecha_orden: orden.fechaOrden.toISOString(),
        fecha_entrega: orden.fechaEntrega?.toISOString() ?? null,
        stock_aplicado: orden.stockAplicado,
        created_at: orden.createdAt.toISOString(),
        custodio: orden.custodio,
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Error creando orden" }
  }
}

export async function emitirOrden(ordenId: string): Promise<{ error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    await prisma.ordenCompra.updateMany({
      where: { id: ordenId, tenantId: tallerId, estatus: "borrador" },
      data: { estatus: "en_transito" },
    })
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error emitiendo orden" }
  }
}

export async function abortarOrden(ordenId: string): Promise<{ error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    await prisma.ordenCompra.deleteMany({
      where: { id: ordenId, tenantId: tallerId, estatus: "borrador" },
    })
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error abortando orden" }
  }
}

export async function getProveedores(): Promise<{ data: Proveedor[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const rows = await prisma.proveedor.findMany({
      where: { tenantId: tallerId, activo: true },
      orderBy: { nombre: "asc" },
    })
    return {
      data: rows.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        contacto: r.contacto,
        telefono: r.telefono,
        email: r.email,
        notas: r.notas,
        activo: r.activo,
        created_at: r.createdAt.toISOString(),
      })),
      error: null,
    }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Error cargando proveedores" }
  }
}

export async function createProveedor(input: CreateProveedorInput): Promise<{ data: Proveedor | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    if (!input.nombre?.trim()) return { data: null, error: "El nombre es requerido." }

    const r = await prisma.proveedor.create({
      data: {
        tenantId: tallerId,
        nombre: input.nombre.trim(),
        contacto: input.contacto?.trim() || null,
        telefono: input.telefono?.trim() || null,
        email: input.email?.trim() || null,
        notas: input.notas?.trim() || null,
      },
    })

    return {
      data: {
        id: r.id,
        nombre: r.nombre,
        contacto: r.contacto,
        telefono: r.telefono,
        email: r.email,
        notas: r.notas,
        activo: r.activo,
        created_at: r.createdAt.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Error creando proveedor" }
  }
}

export async function updateProveedor(input: UpdateProveedorInput): Promise<{ error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    if (!input.nombre?.trim()) return { error: "El nombre es requerido." }

    await prisma.proveedor.updateMany({
      where: { id: input.id, tenantId: tallerId },
      data: {
        nombre: input.nombre.trim(),
        contacto: input.contacto?.trim() || null,
        telefono: input.telefono?.trim() || null,
        email: input.email?.trim() || null,
        notas: input.notas?.trim() || null,
      },
    })
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error actualizando proveedor" }
  }
}

export async function deleteProveedor(id: string): Promise<{ error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    await prisma.proveedor.updateMany({
      where: { id, tenantId: tallerId },
      data: { activo: false },
    })
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error eliminando proveedor" }
  }
}

export async function buscarProductosParaCompra(query: string): Promise<{ data: { id: string; nombre: string; stock_actual: number; costo: number; sku: string | null }[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const rows = await prisma.producto.findMany({
      where: {
        tenantId: tallerId,
        nombre: { contains: query, mode: "insensitive" as const },
      },
      orderBy: { nombre: "asc" },
      take: 8,
      select: { id: true, nombre: true, stockActual: true, costo: true, sku: true },
    })
    return {
      data: rows.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        stock_actual: p.stockActual,
        costo: Number(p.costo),
        sku: p.sku ?? null,
      })),
      error: null,
    }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Error buscando productos" }
  }
}

export async function recibirOrdenConCreacion(ordenId: string, margenPorcentaje: number | null): Promise<{ success: boolean; creados: number; actualizados: number; errores: string[] }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const errores: string[] = []
    let creados = 0
    let actualizados = 0

    const result = await prisma.$transaction(async (tx) => {
      const orden = await tx.ordenCompra.findFirst({
        where: { id: ordenId, tenantId: tallerId },
        include: { detalles: true },
      })

      if (!orden) return { success: false, creados: 0, actualizados: 0, errores: ["Orden no encontrada."] }
      if (!["pendiente", "parcial", "en_transito"].includes(orden.estatus) || orden.stockAplicado) {
        return { success: false, creados: 0, actualizados: 0, errores: ["La orden ya fue recibida o cancelada."] }
      }

      for (const linea of orden.detalles.filter((d) => !d.productoId)) {
        const costo = Number(linea.precioUnitario)
        const cantidad = Number(linea.cantidad)
        const precioVenta = margenPorcentaje != null && margenPorcentaje > 0 ? costo * (1 + margenPorcentaje / 100) : 0

        const prod = await tx.producto.create({
          data: {
            tenantId: tallerId,
            nombre: linea.descripcion.trim(),
            costo,
            precioVenta: Number(precioVenta.toFixed(2)),
            stockActual: cantidad,
            stockMinimo: 1,
            esEquipo: false,
          },
        })

        await tx.detalleOrdenCompra.update({
          where: { id: linea.id },
          data: { productoId: prod.id },
        })
        creados += 1
      }

      for (const linea of orden.detalles.filter((d) => d.productoId)) {
        const prod = await tx.producto.findUnique({
          where: { id: linea.productoId! },
          select: { costo: true, stockActual: true },
        })

        if (!prod) {
          errores.push(`Producto no encontrado para "${linea.descripcion}"`)
          continue
        }

        const costoActual = Number(prod.costo)
        const stockActual = prod.stockActual
        const costoCompra = Number(linea.precioUnitario)
        const cantidad = Number(linea.cantidad)
        const stockTotal = stockActual + cantidad
        const nuevoCosto = stockTotal > 0 ? (costoActual * stockActual + costoCompra * cantidad) / stockTotal : costoCompra

        await tx.producto.update({
          where: { id: linea.productoId! },
          data: {
            costo: Number(nuevoCosto.toFixed(2)),
            stockActual: stockTotal,
          },
        })
        actualizados += 1
      }

      if (errores.length > 0) {
        await tx.ordenCompra.update({
          where: { id: ordenId },
          data: { erroresRecepcion: JSON.stringify(errores) },
        })
        return { success: false, creados, actualizados, errores }
      }

      await tx.ordenCompra.update({
        where: { id: ordenId },
        data: { estatus: "recibida", stockAplicado: true, erroresRecepcion: Prisma.DbNull },
      })

      return { success: true, creados, actualizados, errores: [] }
    })

    return result
  } catch (err) {
    return { success: false, creados: 0, actualizados: 0, errores: [err instanceof Error ? err.message : "Error inesperado"] }
  }
}

// Compat helpers used in some legacy paths
export async function getOrdenDetalle(ordenId: string): Promise<{ data: DetalleOrden[]; error: string | null }> {
  const ord = await getOrdenById(ordenId)
  return { data: ord.data?.detalle ?? [], error: ord.error }
}

export async function recibirOrden(ordenId: string): Promise<{ error: string | null }> {
  const res = await recibirOrdenConCreacion(ordenId, null)
  return { error: res.success ? null : res.errores.join("\n") }
}

export async function cancelarOrden(ordenId: string): Promise<{ error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    await prisma.ordenCompra.updateMany({
      where: {
        id: ordenId,
        tenantId: tallerId,
        estatus: { in: ["pendiente", "en_transito", "borrador"] },
      },
      data: { estatus: "cancelada" },
    })
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error cancelando orden" }
  }
}
