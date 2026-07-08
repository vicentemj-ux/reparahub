"use server"

import { revalidatePath } from "next/cache"
import { getPrismaClient } from "@/lib/prisma"
import { getCurrentActorDisplayName } from "@/lib/auth/actor-display-name"
import { getCurrentTallerId } from "@/lib/auth/get-current-taller"
import { resolveClienteByTelefono } from "@/lib/actions/client-resolver-prisma"
import { getPosKioscoCapability } from "@/lib/actions/settings-prisma"
import { requireCajaAbierta } from "@/lib/actions/ventas-prisma"
import { addDaysToYmd, todayYmdInTimezone, utcDateToYmd, ymdToUtcDate } from "@/lib/date-utils"

export type ApartadoEstado = "activo" | "liquidado" | "entregado" | "cancelado" | "vencido"
export type ApartadoMetodoPago = "efectivo" | "tarjeta" | "transferencia"

export interface ApartadoResumen {
  id: string
  folio: string
  estado: ApartadoEstado
  producto_id: string
  producto_nombre: string
  producto_sku: string | null
  cantidad: number
  precio_acordado: number
  total_abonado: number
  saldo: number
  fecha_limite: string
  fecha_liquidacion: string | null
  fecha_cancelacion: string | null
  motivo_cancelacion: string | null
  vendedor_nombre: string | null
  cliente_id: string
  cliente_nombre: string
  cliente_telefono: string
  abonos_count: number
  created_at: string
}

export interface ApartadoAbonoResumen {
  id: string
  monto: number
  metodo_pago: ApartadoMetodoPago
  referencia_pago: string | null
  vendedor_nombre: string | null
  created_at: string
}

export interface ApartadoDetalle extends ApartadoResumen {
  abonos: ApartadoAbonoResumen[]
}

export interface CrearApartadoInput {
  producto_id: string
  cliente_nombre?: string | null
  cliente_telefono: string
  cantidad?: number
  precio_acordado: number
  anticipo: number
  metodo_pago: ApartadoMetodoPago
  referencia_pago?: string | null
  /**
   * Plazo en dias a partir de hoy. Preferido sobre `fecha_limite` porque
   * evita que el usuario tenga que hacer cuentas en un datepicker. Se
   * calcula en la zona horaria del tenant.
   */
  plazo_dias?: number
  /**
   * Fecha limite en formato "YYYY-MM-DD". Se sigue aceptando para
   * compatibilidad con integraciones externas, pero la UI lo envia como
   * derivado de `plazo_dias`.
   */
  fecha_limite?: string
  notas?: string | null
}

export interface RegistrarAbonoApartadoInput {
  apartado_id: string
  monto: number
  metodo_pago: ApartadoMetodoPago
  referencia_pago?: string | null
}

export interface CancelarApartadoInput {
  apartado_id: string
  motivo: string
}

type ActionResult<T> = { data: T | null; error: string | null }

const ACTIVE_STATES = new Set(["activo", "vencido"])

function money(value: unknown) {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0
}

function normalizeQty(value: unknown) {
  const qty = Math.floor(Number(value ?? 1))
  return Number.isFinite(qty) && qty > 0 ? qty : 1
}

function asApartadoEstado(estado: string, fechaLimiteYmd: string, todayYmd: string): ApartadoEstado {
  // Comparamos dos "YYYY-MM-DD" lexicograficamente; funciona para ISO 8601
  // y evita cualquier drift por zona horaria.
  if (estado === "activo" && fechaLimiteYmd < todayYmd) return "vencido"
  if (["activo", "liquidado", "entregado", "cancelado", "vencido"].includes(estado)) return estado as ApartadoEstado
  return "activo"
}

function parseLimitDate(value: string): Date | null {
  // "YYYY-MM-DD" -> Date a UTC 00:00:00 del mismo dia. Asi Postgres DATE
  // guarda la fecha exacta sin correr un dia por zona horaria.
  return ymdToUtcDate(value)
}

async function assertApartadosEnabled(): Promise<string | null> {
  const capability = await getPosKioscoCapability()
  if (!capability.canUsePosKiosco) {
    return "Apartados es una funcion PRO. Activa PRO o usa el periodo de prueba para habilitarla."
  }
  return null
}

/**
 * Resuelve la zona horaria del tenant. Si no esta configurada cae a "UTC".
 * Es una query liviana (campo escalar) que se amortiza en el resto del flujo.
 */
async function getTenantTimezone(tenantId: string): Promise<string> {
  try {
    const prisma = getPrismaClient()
    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId },
      select: { timezone: true },
    })
    return row?.timezone?.trim() || "UTC"
  } catch {
    return "UTC"
  }
}

function mapApartado(row: {
  id: string
  folio: string
  estado: string
  productoId: string
  productoNombre: string
  productoSku: string | null
  cantidad: number
  precioAcordado: unknown
  totalAbonado: unknown
  saldo: unknown
  fechaLimite: Date
  fechaLiquidacion: Date | null
  fechaCancelacion: Date | null
  motivoCancelacion: string | null
  vendedorNombre: string | null
  clienteId: string
  cliente: { nombre: string; telefono: string | null }
  abonos?: Array<{ id: string }>
  createdAt: Date
}, todayYmd: string): ApartadoResumen {
  const fechaLimiteYmd = utcDateToYmd(row.fechaLimite)
  return {
    id: row.id,
    folio: row.folio,
    estado: asApartadoEstado(row.estado, fechaLimiteYmd, todayYmd),
    producto_id: row.productoId,
    producto_nombre: row.productoNombre,
    producto_sku: row.productoSku,
    cantidad: row.cantidad,
    precio_acordado: money(row.precioAcordado),
    total_abonado: money(row.totalAbonado),
    saldo: money(row.saldo),
    fecha_limite: fechaLimiteYmd,
    fecha_liquidacion: row.fechaLiquidacion?.toISOString() ?? null,
    fecha_cancelacion: row.fechaCancelacion?.toISOString() ?? null,
    motivo_cancelacion: row.motivoCancelacion,
    vendedor_nombre: row.vendedorNombre,
    cliente_id: row.clienteId,
    cliente_nombre: row.cliente.nombre,
    cliente_telefono: row.cliente.telefono ?? "",
    abonos_count: row.abonos?.length ?? 0,
    created_at: row.createdAt.toISOString(),
  }
}

function mapApartadoAbono(row: {
  id: string
  monto: unknown
  metodoPago: string
  referenciaPago: string | null
  vendedorNombre: string | null
  createdAt: Date
}): ApartadoAbonoResumen {
  return {
    id: row.id,
    monto: money(row.monto),
    metodo_pago: (row.metodoPago || "efectivo") as ApartadoMetodoPago,
    referencia_pago: row.referenciaPago,
    vendedor_nombre: row.vendedorNombre,
    created_at: row.createdAt.toISOString(),
  }
}

async function nextFolio(tx: any, tenantId: string) {
  const count = await tx.apartado.count({ where: { tenantId } })
  return `APT-${String(count + 1).padStart(5, "0")}`
}

async function createCashMovement(tx: any, input: {
  tenantId: string
  cajaId: string
  apartadoId: string
  folio: string
  monto: number
  metodoPago: string
  referenciaPago?: string | null
  vendedorNombre: string
  descripcion: string
}) {
  return tx.movimientoCaja.create({
    data: {
      tenantId: input.tenantId,
      cajaId: input.cajaId,
      tipo: "apartado_abono",
      referenciaId: input.apartadoId,
      descripcion: input.descripcion,
      monto: input.monto,
      metodoPago: input.metodoPago,
      folio: input.folio,
      vendedorNombre: input.vendedorNombre,
    },
  })
}

export async function getApartados(estado?: ApartadoEstado | "todos"): Promise<ActionResult<ApartadoResumen[]>> {
  try {
    const gated = await assertApartadosEnabled()
    if (gated) return { data: [], error: gated }

    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    const dbEstado = estado && estado !== "todos" && estado !== "vencido" ? estado : undefined
    const [rows, tz] = await Promise.all([
      prisma.apartado.findMany({
        where: { tenantId, ...(dbEstado ? { estado: dbEstado } : {}) },
        orderBy: [{ estado: "asc" }, { fechaLimite: "asc" }, { createdAt: "desc" }],
        take: 200,
        include: {
          cliente: { select: { nombre: true, telefono: true } },
          abonos: { select: { id: true } },
        },
      }),
      getTenantTimezone(tenantId),
    ])
    const todayYmd = todayYmdInTimezone(tz)

    const mapped = rows.map((r) => mapApartado(r, todayYmd))
    const filtered = estado === "vencido" ? mapped.filter((a) => a.estado === "vencido") : mapped
    return { data: filtered, error: null }
  } catch (error) {
    console.error("[apartados] getApartados:", error)
    return { data: [], error: error instanceof Error ? error.message : "No se pudieron cargar los apartados" }
  }
}

export async function getApartadoDetalle(apartadoId: string): Promise<ActionResult<ApartadoDetalle>> {
  try {
    const gated = await assertApartadosEnabled()
    if (gated) return { data: null, error: gated }

    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    const tz = await getTenantTimezone(tenantId)
    const todayYmd = todayYmdInTimezone(tz)
    const row = await prisma.apartado.findFirst({
      where: { id: apartadoId, tenantId },
      include: {
        cliente: { select: { nombre: true, telefono: true } },
        abonos: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            monto: true,
            metodoPago: true,
            referenciaPago: true,
            vendedorNombre: true,
            createdAt: true,
          },
        },
      },
    })

    if (!row) return { data: null, error: "Apartado no encontrado." }
    return {
      data: {
        ...mapApartado(row, todayYmd),
        abonos: row.abonos.map(mapApartadoAbono),
      },
      error: null,
    }
  } catch (error) {
    console.error("[apartados] getApartadoDetalle:", error)
    return { data: null, error: error instanceof Error ? error.message : "No se pudo cargar el detalle del apartado" }
  }
}

export async function crearApartado(input: CrearApartadoInput): Promise<ActionResult<ApartadoResumen>> {
  try {
    const gated = await assertApartadosEnabled()
    if (gated) return { data: null, error: gated }

    const cajaResult = await requireCajaAbierta()
    if (cajaResult.error || !cajaResult.caja) return { data: null, error: cajaResult.error }

    const tenantId = await getCurrentTallerId()
    const vendedorNombre = await getCurrentActorDisplayName()
    const cantidad = normalizeQty(input.cantidad)
    const precioAcordado = money(input.precio_acordado)
    const anticipo = money(input.anticipo)

    if (!input.producto_id) return { data: null, error: "Selecciona un producto para apartar." }
    if (precioAcordado <= 0) return { data: null, error: "El precio acordado debe ser mayor a 0." }
    if (anticipo <= 0) return { data: null, error: "El anticipo debe ser mayor a 0." }

    // Resolver la fecha limite. Preferencia: plazo_dias (UX friendly) ->
    // fecha_limite explicita (compat). La fecha se calcula SIEMPRE en la
    // zona horaria del tenant para que el "hoy" no se desplace un dia.
    const tz = await getTenantTimezone(tenantId)
    const todayYmd = todayYmdInTimezone(tz)
    let fechaLimiteYmd: string | null = null
    if (typeof input.plazo_dias === "number" && Number.isFinite(input.plazo_dias)) {
      const dias = Math.floor(input.plazo_dias)
      if (dias <= 0) return { data: null, error: "El plazo debe ser al menos 1 dia." }
      if (dias > 365) return { data: null, error: "El plazo maximo permitido es 365 dias." }
      fechaLimiteYmd = addDaysToYmd(todayYmd, dias)
    } else if (input.fecha_limite) {
      fechaLimiteYmd = input.fecha_limite
    } else {
      return { data: null, error: "Indica el plazo en dias para el apartado." }
    }
    const fechaLimite = ymdToUtcDate(fechaLimiteYmd)
    if (!fechaLimite) return { data: null, error: "Selecciona una fecha limite valida." }

    const total = money(precioAcordado * cantidad)
    if (anticipo > total) return { data: null, error: "El anticipo no puede ser mayor al total del apartado." }

    const prisma = getPrismaClient()
    const result = await prisma.$transaction(async (tx: any) => {
      const cliente = await resolveClienteByTelefono({
        tenantId,
        telefono: input.cliente_telefono,
        nombre: input.cliente_nombre,
        notasOrigen: "Cliente creado desde apartado POS",
      }, tx)
      if (cliente.error || !cliente.client) throw new Error(cliente.error ?? "Cliente invalido")

      const producto = await tx.producto.findFirst({
        where: { id: input.producto_id, tenantId },
        select: { id: true, nombre: true, sku: true, stockActual: true },
      })
      if (!producto) throw new Error("Producto no encontrado.")
      if (producto.stockActual < cantidad) throw new Error("No hay stock suficiente para apartar este producto.")

      const folio = await nextFolio(tx, tenantId)
      const saldo = money(total - anticipo)
      const apartado = await tx.apartado.create({
        data: {
          tenantId,
          clienteId: cliente.client.id,
          productoId: producto.id,
          cajaId: cajaResult.caja.id,
          folio,
          productoNombre: producto.nombre,
          productoSku: producto.sku,
          cantidad,
          precioAcordado,
          totalAbonado: anticipo,
          saldo,
          estado: saldo <= 0 ? "liquidado" : "activo",
          fechaLimite,
          fechaLiquidacion: saldo <= 0 ? new Date() : null,
          vendedorNombre,
          notas: input.notas?.trim() || null,
        },
      })

      await tx.producto.update({ where: { id: producto.id }, data: { stockActual: { decrement: cantidad } } })
      await tx.apartadoAbono.create({
        data: {
          tenantId,
          apartadoId: apartado.id,
          cajaId: cajaResult.caja.id,
          monto: anticipo,
          metodoPago: input.metodo_pago,
          referenciaPago: input.referencia_pago?.trim() || null,
          vendedorNombre,
        },
      })
      await createCashMovement(tx, {
        tenantId,
        cajaId: cajaResult.caja.id,
        apartadoId: apartado.id,
        folio,
        monto: anticipo,
        metodoPago: input.metodo_pago,
        referenciaPago: input.referencia_pago,
        vendedorNombre,
        descripcion: `Apartado ${folio} - ${cliente.client.nombre}`,
      })

      return tx.apartado.findUniqueOrThrow({
        where: { id: apartado.id },
        include: { cliente: { select: { nombre: true, telefono: true } }, abonos: { select: { id: true } } },
      })
    }, { timeout: 15000 })

    revalidatePath("/dashboard/ventas")
    revalidatePath("/dashboard/corte")
    revalidatePath("/dashboard/historial-ventas")
    revalidatePath("/dashboard/inventario")
    revalidatePath("/dashboard/clientes")
    return { data: mapApartado(result, todayYmd), error: null }
  } catch (error) {
    console.error("[apartados] crearApartado:", error)
    return { data: null, error: error instanceof Error ? error.message : "No se pudo crear el apartado" }
  }
}

export async function registrarAbonoApartado(input: RegistrarAbonoApartadoInput): Promise<ActionResult<ApartadoResumen>> {
  try {
    const gated = await assertApartadosEnabled()
    if (gated) return { data: null, error: gated }

    const cajaResult = await requireCajaAbierta()
    if (cajaResult.error || !cajaResult.caja) return { data: null, error: cajaResult.error }

    const monto = money(input.monto)
    if (!input.apartado_id) return { data: null, error: "Selecciona un apartado." }
    if (monto <= 0) return { data: null, error: "El abono debe ser mayor a 0." }

    const tenantId = await getCurrentTallerId()
    const vendedorNombre = await getCurrentActorDisplayName()
    const prisma = getPrismaClient()
    const tz = await getTenantTimezone(tenantId)
    const todayYmd = todayYmdInTimezone(tz)

    const result = await prisma.$transaction(async (tx: any) => {
      const apartado = await tx.apartado.findFirst({
        where: { id: input.apartado_id, tenantId },
        include: { cliente: { select: { nombre: true, telefono: true } } },
      })
      if (!apartado) throw new Error("Apartado no encontrado.")
      if (!ACTIVE_STATES.has(apartado.estado)) throw new Error("Este apartado ya no acepta abonos.")

      const saldoActual = money(apartado.saldo)
      if (monto > saldoActual) throw new Error("El abono no puede ser mayor al saldo pendiente.")
      const nuevoSaldo = money(saldoActual - monto)
      const nuevoTotalAbonado = money(Number(apartado.totalAbonado) + monto)

      await tx.apartadoAbono.create({
        data: {
          tenantId,
          apartadoId: apartado.id,
          cajaId: cajaResult.caja.id,
          monto,
          metodoPago: input.metodo_pago,
          referenciaPago: input.referencia_pago?.trim() || null,
          vendedorNombre,
        },
      })
      await createCashMovement(tx, {
        tenantId,
        cajaId: cajaResult.caja.id,
        apartadoId: apartado.id,
        folio: apartado.folio,
        monto,
        metodoPago: input.metodo_pago,
        referenciaPago: input.referencia_pago,
        vendedorNombre,
        descripcion: `Abono apartado ${apartado.folio} - ${apartado.cliente.nombre}`,
      })

      const updated = await tx.apartado.update({
        where: { id: apartado.id },
        data: {
          totalAbonado: nuevoTotalAbonado,
          saldo: nuevoSaldo,
          estado: nuevoSaldo <= 0 ? "liquidado" : "activo",
          fechaLiquidacion: nuevoSaldo <= 0 ? new Date() : null,
        },
        include: { cliente: { select: { nombre: true, telefono: true } }, abonos: { select: { id: true } } },
      })
      return updated
    }, { timeout: 15000 })

    revalidatePath("/dashboard/ventas")
    revalidatePath("/dashboard/corte")
    revalidatePath("/dashboard/historial-ventas")
    revalidatePath("/dashboard/clientes")
    return { data: mapApartado(result, todayYmd), error: null }
  } catch (error) {
    console.error("[apartados] registrarAbonoApartado:", error)
    return { data: null, error: error instanceof Error ? error.message : "No se pudo registrar el abono" }
  }
}

export async function liquidarApartado(apartadoId: string): Promise<ActionResult<ApartadoResumen>> {
  try {
    const gated = await assertApartadosEnabled()
    if (gated) return { data: null, error: gated }

    const tenantId = await getCurrentTallerId()
    const prisma = getPrismaClient()
    const tz = await getTenantTimezone(tenantId)
    const todayYmd = todayYmdInTimezone(tz)
    const row = await prisma.apartado.findFirst({
      where: { id: apartadoId, tenantId },
      include: { cliente: { select: { nombre: true, telefono: true } }, abonos: { select: { id: true } } },
    })
    if (!row) return { data: null, error: "Apartado no encontrado." }
    if (!ACTIVE_STATES.has(row.estado)) return { data: null, error: "Este apartado no puede liquidarse." }
    if (money(row.saldo) > 0) return { data: null, error: "Primero registra el saldo pendiente antes de entregar." }

    const updated = await prisma.apartado.update({
      where: { id: row.id },
      data: { estado: "liquidado", fechaLiquidacion: row.fechaLiquidacion ?? new Date() },
      include: { cliente: { select: { nombre: true, telefono: true } }, abonos: { select: { id: true } } },
    })
    revalidatePath("/dashboard/ventas")
    revalidatePath("/dashboard/historial-ventas")
    return { data: mapApartado(updated, todayYmd), error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "No se pudo liquidar el apartado" }
  }
}

export async function entregarApartado(apartadoId: string): Promise<ActionResult<ApartadoResumen>> {
  try {
    const gated = await assertApartadosEnabled()
    if (gated) return { data: null, error: gated }

    const tenantId = await getCurrentTallerId()
    const prisma = getPrismaClient()
    const tz = await getTenantTimezone(tenantId)
    const todayYmd = todayYmdInTimezone(tz)
    const row = await prisma.apartado.findFirst({
      where: { id: apartadoId, tenantId },
      include: { cliente: { select: { nombre: true, telefono: true } }, abonos: { select: { id: true } } },
    })
    if (!row) return { data: null, error: "Apartado no encontrado." }
    if (row.estado !== "liquidado") return { data: null, error: "Solo los apartados liquidados se pueden entregar." }
    if (money(row.saldo) > 0) return { data: null, error: "No puedes entregar un apartado con saldo pendiente." }

    const updated = await prisma.apartado.update({
      where: { id: row.id },
      data: { estado: "entregado", fechaLiquidacion: row.fechaLiquidacion ?? new Date() },
      include: { cliente: { select: { nombre: true, telefono: true } }, abonos: { select: { id: true } } },
    })
    revalidatePath("/dashboard/ventas")
    revalidatePath("/dashboard/historial-ventas")
    revalidatePath("/dashboard/clientes")
    return { data: mapApartado(updated, todayYmd), error: null }
  } catch (error) {
    console.error("[apartados] entregarApartado:", error)
    return { data: null, error: error instanceof Error ? error.message : "No se pudo marcar como entregado" }
  }
}

export async function cancelarApartado(input: CancelarApartadoInput): Promise<ActionResult<ApartadoResumen>> {
  try {
    const gated = await assertApartadosEnabled()
    if (gated) return { data: null, error: gated }
    if (!input.motivo.trim()) return { data: null, error: "Indica el motivo de cancelacion." }

    const tenantId = await getCurrentTallerId()
    const prisma = getPrismaClient()
    const tz = await getTenantTimezone(tenantId)
    const todayYmd = todayYmdInTimezone(tz)
    const result = await prisma.$transaction(async (tx: any) => {
      const apartado = await tx.apartado.findFirst({
        where: { id: input.apartado_id, tenantId },
        include: { cliente: { select: { nombre: true, telefono: true } } },
      })
      if (!apartado) throw new Error("Apartado no encontrado.")
      if (!ACTIVE_STATES.has(apartado.estado)) throw new Error("Solo se pueden cancelar apartados activos o vencidos.")

      await tx.producto.update({ where: { id: apartado.productoId }, data: { stockActual: { increment: apartado.cantidad } } })
      return tx.apartado.update({
        where: { id: apartado.id },
        data: {
          estado: "cancelado",
          fechaCancelacion: new Date(),
          motivoCancelacion: input.motivo.trim(),
        },
        include: { cliente: { select: { nombre: true, telefono: true } }, abonos: { select: { id: true } } },
      })
    }, { timeout: 15000 })

    revalidatePath("/dashboard/ventas")
    revalidatePath("/dashboard/corte")
    revalidatePath("/dashboard/historial-ventas")
    revalidatePath("/dashboard/inventario")
    revalidatePath("/dashboard/clientes")
    return { data: mapApartado(result, todayYmd), error: null }
  } catch (error) {
    console.error("[apartados] cancelarApartado:", error)
    return { data: null, error: error instanceof Error ? error.message : "No se pudo cancelar el apartado" }
  }
}
