import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"

const GENERIC_CLIENT_NAME = "Cliente sin nombre"

type PrismaClientLike = ReturnType<typeof getPrismaClient>
type ClienteDelegate = PrismaClientLike["cliente"]
type ClienteResolverDb = { cliente: ClienteDelegate }

export interface ResolvedCliente {
  id: string
  nombre: string
  telefono: string
  correo: string
}

export interface ResolveClienteInput {
  tenantId: string
  telefono?: string | null
  nombre?: string | null
  correo?: string | null
  notasOrigen?: string | null
  clienteId?: string | null
}

export interface ResolveClienteResult {
  client: ResolvedCliente | null
  created: boolean
  telefono: string
  error: string | null
}

export function normalizeClienteTelefono(value?: string | null) {
  return (value ?? "").replace(/\D/g, "")
}

export function isValidClienteTelefono(value?: string | null) {
  const digits = normalizeClienteTelefono(value)
  return digits.length >= 6 && digits.length <= 15
}

function isGenericClientName(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase()
  return !normalized || normalized === GENERIC_CLIENT_NAME.toLowerCase() || normalized === "cliente"
}

function toResolvedCliente(row: {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
}): ResolvedCliente {
  return {
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono ?? "",
    correo: row.email ?? "",
  }
}

export async function resolveClienteByTelefono(
  input: ResolveClienteInput,
  db: ClienteResolverDb = getPrismaClient(),
): Promise<ResolveClienteResult> {
  const telefono = normalizeClienteTelefono(input.telefono)
  const nombre = input.nombre?.trim() || ""
  const correo = input.correo?.trim() || ""
  const notasOrigen = input.notasOrigen?.trim() || ""
  const clienteId = input.clienteId?.trim() || ""

  if (!isValidClienteTelefono(telefono)) {
    return { client: null, created: false, telefono, error: "Telefono invalido" }
  }

  const select = { id: true, nombre: true, telefono: true, email: true, notas: true } as const

  let existing = clienteId
    ? await db.cliente.findFirst({
        where: { id: clienteId, tenantId: input.tenantId },
        select,
      })
    : null

  if (!existing) {
    existing = await db.cliente.findFirst({
      where: { tenantId: input.tenantId, telefono },
      orderBy: { createdAt: "asc" },
      select,
    })
  }

  if (existing) {
    const data: {
      nombre?: string
      telefono?: string
      email?: string | null
      notas?: string | null
    } = {}

    if (existing.telefono !== telefono) data.telefono = telefono
    if (nombre && isGenericClientName(existing.nombre)) data.nombre = nombre
    if (correo && !existing.email) data.email = correo
    if (notasOrigen && !existing.notas) data.notas = notasOrigen

    if (Object.keys(data).length > 0) {
      const updated = await db.cliente.update({
        where: { id: existing.id },
        data,
        select: { id: true, nombre: true, telefono: true, email: true },
      })
      return { client: toResolvedCliente(updated), created: false, telefono, error: null }
    }

    return { client: toResolvedCliente(existing), created: false, telefono, error: null }
  }

  const created = await db.cliente.create({
    data: {
      tenantId: input.tenantId,
      nombre: nombre || GENERIC_CLIENT_NAME,
      telefono,
      email: correo || null,
      notas: notasOrigen || null,
    },
    select: { id: true, nombre: true, telefono: true, email: true },
  })

  return { client: toResolvedCliente(created), created: true, telefono, error: null }
}

export async function resolveCurrentTenantClienteByTelefono(input: Omit<ResolveClienteInput, "tenantId">) {
  const tenantId = await getTenantIdOrThrow()
  return resolveClienteByTelefono({ ...input, tenantId })
}
