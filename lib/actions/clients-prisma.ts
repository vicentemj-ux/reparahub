"use server"

import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"
import { utcDateToYmd } from "@/lib/date-utils"

export interface Client {
  id: string
  nombre: string
  telefono: string
  telefono_secundario?: string | null
  correo?: string | null
  notas?: string | null
  created_at?: string
  ordenes_count?: number
  rfc?: string | null
  razon_social?: string | null
  codigo_postal_fiscal?: string | null
  regimen_fiscal?: string | null
  uso_cfdi?: string | null
}

export interface ClientDetail extends Client {
  ordenes: Array<{
    id: string
    folio: string
    marca: string
    modelo: string
    falla: string
    estatus: string
    precio_estimado: number | null
    created_at: string
  }>
  ventas: Array<{
    id: string
    folio: string
    total: number
    metodo_pago: string
    created_at: string
  }>
  apartados: Array<{
    id: string
    folio: string
    producto_nombre: string
    estado: string
    precio_acordado: number
    total_abonado: number
    saldo: number
    fecha_limite: string
    created_at: string
  }>
  visitas: Array<{
    id: string
    motivo_visita: string | null
    estado_atencion: string
    created_at: string
  }>
}

function normalizePhone(value?: string | null) {
  return (value ?? "").replace(/\D/g, "")
}

type ReparacionCountRow = { clienteId: string; _count: { _all: number } }
type ClienteRow = Parameters<typeof toClientDto>[0]
type ClienteReparacionRow = {
  id: string
  folio: string
  equipoMarca: string | null
  equipoModelo: string | null
  falla: string | null
  estado: string
  costoEstimado: unknown
  createdAt: Date
}
type ClienteVentaRow = {
  id: string
  folio: string
  total: unknown
  metodoPago: string
  createdAt: Date
}
type ClienteApartadoRow = {
  id: string
  folio: string
  productoNombre: string
  estado: string
  precioAcordado: unknown
  totalAbonado: unknown
  saldo: unknown
  fechaLimite: Date
  createdAt: Date
}
type ClienteVisitaRow = {
  id: string
  motivo: string | null
  estado: string
  fechaLlegada: Date
}

function toClientDto(row: {
  id: string
  nombre: string
  telefono: string | null
  telefonoSecundario: string | null
  email: string | null
  notas: string | null
  rfc: string | null
  razonSocial: string | null
  codigoPostalFiscal: string | null
  regimenFiscal: string | null
  usoCfdi: string | null
  createdAt: Date
}): Client {
  return {
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono ?? "",
    telefono_secundario: row.telefonoSecundario,
    correo: row.email,
    notas: row.notas,
    rfc: row.rfc,
    razon_social: row.razonSocial,
    codigo_postal_fiscal: row.codigoPostalFiscal,
    regimen_fiscal: row.regimenFiscal,
    uso_cfdi: row.usoCfdi,
    created_at: row.createdAt.toISOString(),
  }
}

export async function getClientes(): Promise<{ clients: Client[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const [clientes, countRows] = await Promise.all([
      prisma.cliente.findMany({
        where: { tenantId },
        orderBy: { nombre: "asc" },
        take: 200,
      }),
      prisma.reparacion.groupBy({
        by: ["clienteId"],
        where: { tenantId },
        _count: { _all: true },
      }),
    ])

    const counts = new Map(countRows.map((r: ReparacionCountRow) => [r.clienteId, r._count._all]))
    return {
      clients: clientes.map((c: ClienteRow) => ({ ...toClientDto(c), ordenes_count: counts.get(c.id) ?? 0 })),
      error: null,
    }
  } catch (error) {
    console.error("Error fetching clients with Prisma:", error)
    return { clients: [], error: "No se pudieron cargar los clientes" }
  }
}

export async function searchClientes(query: string): Promise<{ clients: Client[]; error: string | null }> {
  if (!query.trim()) return getClientes()

  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const cleanedPhone = normalizePhone(query)
    const search = query.trim()
    const conditions: Array<Record<string, unknown>> = [
      { nombre: { contains: search, mode: "insensitive" as const } },
      { email: { contains: search, mode: "insensitive" as const } },
      { id: { contains: search, mode: "insensitive" as const } },
    ]

    if (cleanedPhone.length > 0) {
      conditions.push(
        { telefono: { contains: cleanedPhone } },
        { telefonoSecundario: { contains: cleanedPhone } },
      )
    }

    const clientes = await prisma.cliente.findMany({
      where: {
        tenantId,
        OR: conditions,
      },
      orderBy: { nombre: "asc" },
      take: 200,
    })

    const ids = clientes.map((c: ClienteRow) => c.id)
    const countRows = ids.length
      ? await prisma.reparacion.groupBy({
          by: ["clienteId"],
          where: { tenantId, clienteId: { in: ids } },
          _count: { _all: true },
        })
      : []

    const counts = new Map((countRows as ReparacionCountRow[]).map((r: ReparacionCountRow) => [r.clienteId, r._count._all]))
    return {
      clients: clientes.map((c: ClienteRow) => ({ ...toClientDto(c), ordenes_count: counts.get(c.id) ?? 0 })),
      error: null,
    }
  } catch (error) {
    console.error("Error searching clients with Prisma:", error)
    return { clients: [], error: "Error en la busqueda" }
  }
}

export async function getClienteById(clientId: string): Promise<{ client: ClientDetail | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const client = await prisma.cliente.findFirst({
      where: { id: clientId, tenantId },
      include: {
        reparaciones: {
          orderBy: { createdAt: "desc" },
        },
        ventas: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        apartados: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        visitas: {
          orderBy: { fechaLlegada: "desc" },
          take: 50,
        },
      },
    })

    if (!client) return { client: null, error: "Cliente no encontrado" }

    return {
      client: {
        ...toClientDto(client),
        ordenes: client.reparaciones.map((r: ClienteReparacionRow) => ({
          id: r.id,
          folio: r.folio,
          marca: r.equipoMarca ?? "",
          modelo: r.equipoModelo ?? "",
          falla: r.falla ?? "",
          estatus: r.estado,
          precio_estimado: r.costoEstimado == null ? null : Number(r.costoEstimado),
          created_at: r.createdAt.toISOString(),
        })),
        ventas: client.ventas.map((v: ClienteVentaRow) => ({
          id: v.id,
          folio: v.folio,
          total: Number(v.total),
          metodo_pago: v.metodoPago,
          created_at: v.createdAt.toISOString(),
        })),
        apartados: client.apartados.map((a: ClienteApartadoRow) => ({
          id: a.id,
          folio: a.folio,
          producto_nombre: a.productoNombre,
          estado: a.estado,
          precio_acordado: Number(a.precioAcordado),
          total_abonado: Number(a.totalAbonado),
          saldo: Number(a.saldo),
          fecha_limite: utcDateToYmd(a.fechaLimite),
          created_at: a.createdAt.toISOString(),
        })),
        visitas: client.visitas.map((v: ClienteVisitaRow) => ({
          id: v.id,
          motivo_visita: v.motivo,
          estado_atencion: v.estado,
          created_at: v.fechaLlegada.toISOString(),
        })),
      },
      error: null,
    }
  } catch (error) {
    console.error("Error fetching client detail with Prisma:", error)
    return { client: null, error: "Error al cargar ordenes" }
  }
}

export async function createCliente(input: Partial<Client>) {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    if (!input.nombre?.trim() || !input.telefono?.trim()) {
      return { client: null, error: "Nombre y telefono son requeridos" }
    }

    const row = await prisma.cliente.create({
      data: {
        tenantId,
        nombre: input.nombre.trim(),
        telefono: normalizePhone(input.telefono),
        telefonoSecundario: normalizePhone(input.telefono_secundario) || null,
        email: input.correo?.trim() || null,
        notas: input.notas?.trim() || null,
        rfc: input.rfc?.trim().toUpperCase() || null,
        razonSocial: input.razon_social?.trim() || null,
        codigoPostalFiscal: input.codigo_postal_fiscal?.trim() || null,
        regimenFiscal: input.regimen_fiscal?.trim() || null,
        usoCfdi: input.uso_cfdi?.trim() || null,
      },
    })

    return { client: toClientDto(row), error: null }
  } catch (error) {
    console.error("Error creating client with Prisma:", error)
    return { client: null, error: "No se pudo crear el cliente" }
  }
}

export async function updateCliente(clientId: string, updates: Partial<Client>) {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const existing = await prisma.cliente.findFirst({ where: { id: clientId, tenantId }, select: { id: true } })
    if (!existing) return { client: null, error: "Cliente no encontrado" }

    const row = await prisma.cliente.update({
      where: { id: clientId },
      data: {
        nombre: updates.nombre?.trim(),
        telefono: updates.telefono === undefined ? undefined : normalizePhone(updates.telefono),
        telefonoSecundario:
          updates.telefono_secundario === undefined
            ? undefined
            : normalizePhone(updates.telefono_secundario) || null,
        email: updates.correo === undefined ? undefined : updates.correo?.trim() || null,
        notas: updates.notas === undefined ? undefined : updates.notas?.trim() || null,
        rfc: updates.rfc === undefined ? undefined : updates.rfc?.trim().toUpperCase() || null,
        razonSocial: updates.razon_social === undefined ? undefined : updates.razon_social?.trim() || null,
        codigoPostalFiscal:
          updates.codigo_postal_fiscal === undefined
            ? undefined
            : updates.codigo_postal_fiscal?.trim() || null,
        regimenFiscal:
          updates.regimen_fiscal === undefined ? undefined : updates.regimen_fiscal?.trim() || null,
        usoCfdi: updates.uso_cfdi === undefined ? undefined : updates.uso_cfdi?.trim() || null,
      },
    })

    return { client: toClientDto(row), error: null }
  } catch (error) {
    console.error("Error updating client with Prisma:", error)
    return { client: null, error: "No se pudo actualizar el cliente" }
  }
}

export async function deleteCliente(clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const existing = await prisma.cliente.findFirst({ where: { id: clientId, tenantId }, select: { id: true } })
    if (!existing) return { success: false, error: "Cliente no encontrado" }

    await prisma.cliente.delete({ where: { id: clientId } })
    return { success: true }
  } catch (error) {
    console.error("Error deleting client with Prisma:", error)
    return { success: false, error: "No se pudo eliminar el cliente" }
  }
}

export const getAllClients = getClientes
export const getClientDetail = getClienteById
export const searchClients = searchClientes
export const createClient = createCliente
export const updateClient = updateCliente
export const deleteClient = deleteCliente
