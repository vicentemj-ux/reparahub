"use server"

import { revalidatePath } from "next/cache"
import { getPrismaClient } from "@/lib/prisma"
import { getCurrentTallerId } from "@/lib/auth/get-current-taller"
import { getCurrentActorDisplayName } from "@/lib/auth/actor-display-name"
import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getInventoryPublicUrl } from "@/lib/storage"
import { toCategorySlug } from "@/lib/inventory-categories"
import {
  getTallerSettings,
  getPosKioscoCapability,
  getPosKioscoSettings,
} from "@/lib/actions/settings-prisma"
import { sendCorteCajaEmail } from "@/lib/email/send"
import { resolveTallerEmailRecipient } from "@/lib/email/recipients"
import {
  isValidClienteTelefono,
  normalizeClienteTelefono,
  resolveClienteByTelefono,
} from "@/lib/actions/client-resolver-prisma"

export interface CajaRow {
  id: string
  taller_id: string
  monto_inicial: number
  monto_cierre: number | null
  fecha_apertura: string
  fecha_cierre: string | null
  estado: "abierta" | "cerrada"
  total_efectivo: number
  total_tarjeta: number
  total_transferencia: number
  total_ventas: number
  nota_cierre?: string | null
  numero_corte?: number | null
  /** Cobros de reparaciones/apartados que tambien afectan el turno */
  total_abonos_efectivo?: number
  total_abonos_tarjeta?: number
  total_abonos_transferencia?: number
  total_anulaciones_efectivo?: number
  total_anulaciones_tarjeta?: number
  total_anulaciones_transferencia?: number
  /** Suma de movimientos tipo gasto + gasto_reparacion */
  total_gastos?: number
  total_gastos_efectivo?: number
  total_gastos_tarjeta?: number
  total_gastos_transferencia?: number
}

export interface ProductoDisponible {
  id: string
  taller_id: string
  nombre: string
  sku: string | null
  categoria: string | null
  precio_venta: number
  costo: number
  stock_actual: number
  imagen_url: string | null
  es_equipo: boolean
  imei_serie: string | null
  color: string | null
  capacidad: string | null
  condicion: string | null
  marca: string | null
  modelo: string | null
  procesador: string | null
  ram: string | null
  almacenamiento: string | null
}

export type PosQuickMode = "dynamic_best_sellers" | "latest_added" | "manual"

export interface PosQuickItemsInput {
  limit?: number
  mode?: PosQuickMode
  manualQuickIds?: string[]
}

export interface PosItemsByCategoryInput {
  categoria: string
  limit?: number
  cursor?: string | null
}

export interface PosSearchItemsInput {
  q: string
  limit?: number
}
export interface PosCategoryOption {
  slug: string
  nombre: string
}

export interface DetalleVentaInput {
  producto_id?: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  costo_unitario: number
  es_especial: boolean
  referencia?: string
  imei_serie?: string
  color?: string
  condicion?: string
  marca?: string
  modelo?: string
  procesador?: string
  ram?: string
  almacenamiento?: string
  categoria?: string
}

export interface CrearVentaInput {
  caja_id?: string | null
  cliente_nombre?: string | null
  cliente_id?: string | null
  cliente_telefono?: string | null
  total: number
  descuento?: number
  metodo_pago: string
  monto_efectivo: number
  monto_tarjeta: number
  monto_transferencia: number
  cambio: number
  referencia_pago?: string
  items: DetalleVentaInput[]
}

export interface VentaCreada {
  id: string
  folio: string
  total: number
  descuento: number
  metodo_pago: string
  monto_efectivo: number
  monto_tarjeta: number
  monto_transferencia: number
  cambio: number
  referencia_pago?: string | null
  created_at: string
  items: DetalleVentaInput[]
  cliente_id?: string | null
  cliente_nombre?: string | null
  cliente_telefono?: string | null
}

export interface HistorialCajaItem {
  id: string
  taller_id: string
  numero_corte: number | null
  fecha_apertura: string
  fecha_cierre: string | null
  estado: "abierta" | "cerrada"
  monto_inicial: number
  monto_cierre: number | null
  nota_cierre: string | null
  total_efectivo: number
  total_tarjeta: number
  total_transferencia: number
  total_ventas: number
  saldo_final: number
}

export interface VentaDelCorte {
  id: string
  folio: string
  cliente_nombre: string | null
  total: number
  metodo_pago: string
  monto_efectivo: number
  monto_tarjeta: number
  monto_transferencia: number
  created_at: string
}

export interface MovimientoDelCorte {
  id: string
  tipo: string
  descripcion: string | null
  monto: number
  metodo_pago: string | null
  fecha: string
  folio: string | null
}

export interface DetalleCajaData {
  caja: HistorialCajaItem
  ventas: VentaDelCorte[]
  movimientos: MovimientoDelCorte[]
  tallerId: string
}

export interface CorteCobro {
  id: string
  tipo: string
  descripcion: string | null
  folio: string | null
  monto: number
  metodo_pago: string | null
  /** Fecha ISO del movimiento. */
  fecha: string
}

export interface CorteAnulacion {
  id: string
  descripcion: string | null
  folio: string | null
  monto: number
  metodo_pago: string | null
  fecha: string
}

export interface CorteGasto {
  id: string
  descripcion: string | null
  monto: number
  /** Metodo de pago con el que se registro el gasto. Null si el sistema
   *  no lo capturo (movimientos legacy). */
  metodo_pago: string | null
}

export interface CorteVentaLinea {
  id: string
  folio: string
  created_at: string
  total: number
  metodo_pago?: string
  descripcion?: string
}

export interface CorteVisita {
  id: string
  fecha_llegada: string
  fecha_salida: string | null
  estado: string
  motivo: string | null
  motivo_otro: string | null
  cliente_nombre: string | null
  cliente_telefono: string | null
  atendido_por: string | null
  notas: string | null
  reparacion_folio: string | null
  venta_folio: string | null
}

export interface CortePrintData {
  numero_corte: number
  fecha_apertura: string
  fecha_cierre: string
  monto_inicial: number
  total_ventas: number
  total_efectivo: number
  total_tarjeta: number
  total_transferencia: number
  total_abonos: number
  total_abonos_efectivo: number
  total_abonos_tarjeta: number
  total_abonos_transferencia: number
  total_gastos: number
  total_gastos_efectivo: number
  total_gastos_tarjeta: number
  total_gastos_transferencia: number
  total_anulaciones_efectivo: number
  total_anulaciones_tarjeta: number
  total_anulaciones_transferencia: number
  saldo_final: number
  monto_cierre?: number | null
  nota_cierre?: string
  cobrosRep: CorteCobro[]
  listaGastos: CorteGasto[]
  anulaciones: CorteAnulacion[]
  ventas: CorteVentaLinea[]
  totalVentasPdv: number
  totalAnulaciones: number
  visitasDelDia: CorteVisita[]
}

export interface AbrirCajaResult {
  caja: CajaRow | null
  error: string | null
  status: "opened" | "already_open" | "error"
}

export interface AbonoPrintData {
  movimientoId: string
  folio: string
  clienteNombre: string
  clienteTelefono: string
  dispositivo: string
  metodoPago: string
  monto: number
  totalAbonado: number
  presupuesto: number
  saldoRestante: number
  fecha: string
}

export interface CobroReparacionTicketData {
  folio: string
  cliente: string
  conceptos: string
  monto: number
  metodo_pago: string
  fechaIso: string
  tipoMov: "anticipo" | "liquidacion"
}

function mapCaja(c: {
  id: string
  tenantId: string
  montoInicial: { toNumber: () => number } | number
  montoCierre: { toNumber: () => number } | number | null
  fechaApertura: Date
  fechaCierre: Date | null
  estado: string
  totalEfectivo: { toNumber: () => number } | number
  totalTarjeta: { toNumber: () => number } | number
  totalTransferencia: { toNumber: () => number } | number
  totalVentas: number
  notaCierre: string | null
  numeroCorte: number | null
}): CajaRow {
  return {
    id: c.id,
    taller_id: c.tenantId,
    monto_inicial: Number(c.montoInicial),
    monto_cierre: c.montoCierre == null ? null : Number(c.montoCierre),
    fecha_apertura: c.fechaApertura.toISOString(),
    fecha_cierre: c.fechaCierre?.toISOString() ?? null,
    estado: c.estado === "cerrada" ? "cerrada" : "abierta",
    total_efectivo: Number(c.totalEfectivo),
    total_tarjeta: Number(c.totalTarjeta),
    total_transferencia: Number(c.totalTransferencia),
    total_ventas: Number(c.totalVentas),
    nota_cierre: c.notaCierre,
    numero_corte: c.numeroCorte,
  }
}

function mapHistorialCajaItem(c: {
  id: string
  tenantId: string
  montoInicial: { toNumber: () => number } | number
  montoCierre: { toNumber: () => number } | number | null
  fechaApertura: Date
  fechaCierre: Date | null
  estado: string
  totalEfectivo: { toNumber: () => number } | number
  totalTarjeta: { toNumber: () => number } | number
  totalTransferencia: { toNumber: () => number } | number
  totalVentas: number
  notaCierre: string | null
  numeroCorte: number | null
}): HistorialCajaItem {
  const montoInicial = Number(c.montoInicial)
  const totalEfectivo = Number(c.totalEfectivo)
  return {
    id: c.id,
    taller_id: c.tenantId,
    numero_corte: c.numeroCorte,
    fecha_apertura: c.fechaApertura.toISOString(),
    fecha_cierre: c.fechaCierre?.toISOString() ?? null,
    estado: c.estado === "cerrada" ? "cerrada" : "abierta",
    monto_inicial: montoInicial,
    monto_cierre: c.montoCierre == null ? null : Number(c.montoCierre),
    nota_cierre: c.notaCierre,
    total_efectivo: totalEfectivo,
    total_tarjeta: Number(c.totalTarjeta),
    total_transferencia: Number(c.totalTransferencia),
    total_ventas: Number(c.totalVentas),
    saldo_final: montoInicial + totalEfectivo,
  }
}

function mapProductoDisponible(row: {
  id: string
  tenantId: string
  nombre: string
  sku: string | null
  categoria: string | null
  precioVenta: unknown
  costo: unknown
  stockActual: number
  imagenUrl: string | null
  esEquipo: boolean
  imeiSerie: string | null
  color: string | null
  capacidad: string | null
  condicion: string | null
  marca: string | null
  modelo: string | null
  procesador: string | null
  ram: string | null
  almacenamiento: string | null
}): ProductoDisponible {
  return {
    id: row.id,
    taller_id: row.tenantId,
    nombre: row.nombre,
    sku: row.sku,
    categoria: row.categoria,
    precio_venta: Number(row.precioVenta),
    costo: Number(row.costo),
    stock_actual: row.stockActual,
    imagen_url: getInventoryPublicUrl(row.imagenUrl),
    es_equipo: row.esEquipo,
    imei_serie: row.imeiSerie,
    color: row.color,
    capacidad: row.capacidad,
    condicion: row.condicion,
    marca: row.marca,
    modelo: row.modelo,
    procesador: row.procesador,
    ram: row.ram,
    almacenamiento: row.almacenamiento,
  }
}

export async function getCajaAbierta(): Promise<{ caja: CajaRow | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const caja = await prisma.caja.findFirst({
      where: { tenantId: tallerId, estado: "abierta" },
      orderBy: { fechaApertura: "desc" },
    })
    if (!caja) return { caja: null, error: null }

    const result = mapCaja(caja)

    // Aggregate movimientos_caja for comprehensive turno totals
    const movs = await prisma.movimientoCaja.groupBy({
      by: ["tipo", "metodoPago"],
      where: { cajaId: caja.id, tenantId: tallerId },
      _sum: { monto: true },
    })

    let totalAbonosEfectivo = 0
    let totalAbonosTarjeta = 0
    let totalAbonosTransferencia = 0
    let totalAnulacionesEfectivo = 0
    let totalAnulacionesTarjeta = 0
    let totalAnulacionesTransferencia = 0
    let totalGastos = 0
    let totalGastosEfectivo = 0
    let totalGastosTarjeta = 0
    let totalGastosTransferencia = 0

    for (const m of movs) {
      const monto = Number(m._sum.monto ?? 0)
      if (m.tipo === "gasto" || m.tipo === "gasto_reparacion") {
        const gasto = Math.abs(monto)
        totalGastos += gasto
        if (m.metodoPago === "efectivo") totalGastosEfectivo += gasto
        else if (m.metodoPago === "tarjeta") totalGastosTarjeta += gasto
        else if (m.metodoPago === "transferencia") totalGastosTransferencia += gasto
      } else if (m.tipo === "anticipo_reparacion" || m.tipo === "liquidacion_reparacion" || m.tipo === "liquidacion" || m.tipo === "apartado_abono") {
        if (m.metodoPago === "efectivo") totalAbonosEfectivo += monto
        else if (m.metodoPago === "tarjeta") totalAbonosTarjeta += monto
        else if (m.metodoPago === "transferencia") totalAbonosTransferencia += monto
      } else if (
        m.tipo === "anulacion_venta_pdv" ||
        m.tipo === "anulacion_reparacion_abono" ||
        m.tipo === "anulacion_apartado_abono"
      ) {
        if (m.metodoPago === "efectivo") totalAnulacionesEfectivo += Math.abs(monto)
        else if (m.metodoPago === "tarjeta") totalAnulacionesTarjeta += Math.abs(monto)
        else if (m.metodoPago === "transferencia") totalAnulacionesTransferencia += Math.abs(monto)
      }
    }

    return {
      caja: {
        ...result,
        total_abonos_efectivo: totalAbonosEfectivo,
        total_abonos_tarjeta: totalAbonosTarjeta,
        total_abonos_transferencia: totalAbonosTransferencia,
        total_anulaciones_efectivo: totalAnulacionesEfectivo,
        total_anulaciones_tarjeta: totalAnulacionesTarjeta,
        total_anulaciones_transferencia: totalAnulacionesTransferencia,
        total_gastos: totalGastos,
        total_gastos_efectivo: totalGastosEfectivo,
        total_gastos_tarjeta: totalGastosTarjeta,
        total_gastos_transferencia: totalGastosTransferencia,
      },
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al verificar caja"
    console.error("[ventas-prisma] getCajaAbierta:", message)
    return { caja: null, error: message }
  }
}

export async function requireCajaAbierta(): Promise<{ caja: CajaRow; error: null } | { caja: null; error: string }> {
  const { caja, error } = await getCajaAbierta()
  if (error) return { caja: null, error: `Error al verificar caja: ${error}` }
  if (!caja) return { caja: null, error: "No hay una caja abierta. Abre la caja antes de realizar esta operacion." }
  return { caja, error: null }
}

export async function abrirCaja(montoInicial: number): Promise<AbrirCajaResult> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()

    const caja = await prisma.$transaction(async (tx) => {
      const existingOpen = await tx.caja.findFirst({
        where: { tenantId: tallerId, estado: "abierta" },
        orderBy: { fechaApertura: "desc" },
      })
      if (existingOpen) return null

      const count = await tx.caja.count({ where: { tenantId: tallerId } })
      const numeroCorte = count + 1

      return tx.caja.create({
        data: {
          tenantId: tallerId,
          montoInicial,
          estado: "abierta",
          numeroCorte,
        },
      })
    }, { timeout: 10000 })

    if (!caja) {
      const existingOpen = await prisma.caja.findFirst({
        where: { tenantId: tallerId, estado: "abierta" },
        orderBy: { fechaApertura: "desc" },
      })
      return {
        status: "already_open",
        caja: existingOpen ? mapCaja(existingOpen) : null,
        error: "Ya hay una caja abierta.",
      }
    }

    return { status: "opened", caja: mapCaja(caja), error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al abrir caja"
    console.error("[ventas-prisma] abrirCaja:", message)
    return { status: "error", caja: null, error: message }
  }
}

export async function cerrarCaja(input: {
  cajaId: string
  montoCierre: number
  conteoFisicoConfirmado: boolean
}): Promise<{ error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()

    if (!input.conteoFisicoConfirmado) {
      return { error: "Confirma el conteo fisico antes de cerrar caja." }
    }

    const montoCierre = Number(input.montoCierre)
    if (!Number.isFinite(montoCierre) || montoCierre < 0) {
      return { error: "Ingresa el monto fisico contado en caja." }
    }

    const result = await prisma.caja.updateMany({
      where: { id: input.cajaId, tenantId: tallerId, estado: "abierta" },
      data: { estado: "cerrada", montoCierre, fechaCierre: new Date() },
    })
    if (result.count === 0) {
      return { error: "No hay una caja abierta para cerrar o ya fue cerrada." }
    }
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error al cerrar caja" }
  }
}

export async function getProductosDisponibles(): Promise<{ data: ProductoDisponible[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const rows = await prisma.producto.findMany({
      where: { tenantId: tallerId, stockActual: { gt: 0 } },
      select: POS_PRODUCT_SELECT,
      orderBy: { nombre: "asc" },
      take: 300,
    })
    return {
      data: rows.map(mapProductoDisponible),
      error: null,
    }
  } catch (error) {
    console.error("[ventas-prisma] getProductosDisponibles:", error)
    return { data: [], error: error instanceof Error ? error.message : "Error al cargar inventario" }
  }
}

const POS_PRODUCT_SELECT = {
  id: true,
  tenantId: true,
  nombre: true,
  sku: true,
  categoria: true,
  precioVenta: true,
  costo: true,
  stockActual: true,
  imagenUrl: true,
  esEquipo: true,
  imeiSerie: true,
  color: true,
  capacidad: true,
  condicion: true,
  marca: true,
  modelo: true,
  procesador: true,
  ram: true,
  almacenamiento: true,
  createdAt: true,
} as const

export async function getPosQuickItems(input: PosQuickItemsInput = {}): Promise<{ data: ProductoDisponible[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const limit = Math.max(6, Math.min(20, Number(input.limit ?? 12)))
    // dynamic_best_sellers: ahora delega a latest_added (single query, sin escanear detalle_ventas)
    const rawMode: PosQuickMode = input.mode ?? "latest_added"
    const mode: PosQuickMode = rawMode === "dynamic_best_sellers" ? "latest_added" : rawMode

    if (mode === "manual" && input.manualQuickIds?.length) {
      const manualIds = Array.from(new Set(input.manualQuickIds)).slice(0, 80)
      const rows = await prisma.producto.findMany({
        where: { tenantId: tallerId, id: { in: manualIds }, stockActual: { gt: 0 } },
        select: POS_PRODUCT_SELECT,
      })
      const rank = new Map(manualIds.map((id, i) => [id, i]))
      const ordered = rows.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999)).slice(0, limit)
      return { data: ordered.map(mapProductoDisponible), error: null }
    }

    const now = new Date()
    const since14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const since3d = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    if (mode === "latest_added") {
      const latest = await prisma.producto.findMany({
        where: { tenantId: tallerId, stockActual: { gt: 0 } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: POS_PRODUCT_SELECT,
      })
      return { data: latest.map(mapProductoDisponible), error: null }
    }

    // Top-down approach: find candidate products from sales data + recent additions
    const [topSales14, topSales3, recentProductIds] = await Promise.all([
      prisma.detalleVenta.groupBy({
        by: ["productoId"],
        where: {
          esEspecial: false,
          venta: { tenantId: tallerId, estado: "activa", createdAt: { gte: since14d } },
        },
        _sum: { cantidad: true },
        orderBy: { _sum: { cantidad: "desc" } },
        take: 80,
      }),
      prisma.detalleVenta.groupBy({
        by: ["productoId"],
        where: {
          esEspecial: false,
          venta: { tenantId: tallerId, estado: "activa", createdAt: { gte: since3d } },
        },
        _sum: { cantidad: true },
        orderBy: { _sum: { cantidad: "desc" } },
        take: 80,
      }),
      prisma.producto.findMany({
        where: { tenantId: tallerId, stockActual: { gt: 0 }, createdAt: { gte: since7d } },
        select: { id: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ])

    const candidateIdSet = new Set<string>()
    for (const r of topSales14) if (r.productoId) candidateIdSet.add(r.productoId)
    for (const r of topSales3) if (r.productoId) candidateIdSet.add(r.productoId)
    for (const r of recentProductIds) candidateIdSet.add(r.id)

    if (candidateIdSet.size === 0) {
      const fallback = await prisma.producto.findMany({
        where: { tenantId: tallerId, stockActual: { gt: 0 } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: POS_PRODUCT_SELECT,
      })
      return { data: fallback.map(mapProductoDisponible), error: null }
    }

    const candidateIds = Array.from(candidateIdSet)
    const products = await prisma.producto.findMany({
      where: { id: { in: candidateIds }, tenantId: tallerId, stockActual: { gt: 0 } },
      select: POS_PRODUCT_SELECT,
    })

    if (!products.length) return { data: [], error: null }

    const count14 = new Map<string, number>()
    const count3 = new Map<string, number>()
    for (const r of topSales14) if (r.productoId) count14.set(r.productoId, Number(r._sum.cantidad ?? 0))
    for (const r of topSales3) if (r.productoId) count3.set(r.productoId, Number(r._sum.cantidad ?? 0))

    const max14 = Math.max(1, ...Array.from(count14.values(), (v) => (v > 0 ? v : 0)))
    const max3 = Math.max(1, ...Array.from(count3.values(), (v) => (v > 0 ? v : 0)))

    const ranked = products
      .map((p) => {
        const v14 = count14.get(p.id) ?? 0
        const v3 = count3.get(p.id) ?? 0
        const createdFresh = p.createdAt >= since7d ? 1 : 0
        const score = 0.6 * (v14 / max14) + 0.25 * (v3 / max3) + 0.15 * createdFresh
        return { p, score, v14, v3 }
      })
      .sort((a, b) => (b.score !== a.score ? b.score - a.score : b.v3 !== a.v3 ? b.v3 - a.v3 : b.v14 - a.v14))

    const top = ranked.slice(0, limit).map((x) => x.p)
    return { data: top.map(mapProductoDisponible), error: null }
  } catch (error) {
    console.error("[ventas-prisma] getPosQuickItems:", error)
    return { data: [], error: error instanceof Error ? error.message : "Error al cargar acceso rapido POS" }
  }
}

export async function getPosItemsByCategory(input: PosItemsByCategoryInput): Promise<{ data: ProductoDisponible[]; nextCursor: string | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const categoriaSlug = toCategorySlug(String(input.categoria ?? ""))
    const limit = Math.max(20, Math.min(120, Number(input.limit ?? 80)))
    if (!categoriaSlug) return { data: [], nextCursor: null, error: "Categoria invalida." }
    const categoria = await prisma.inventarioCategoria.findUnique({
      where: { tenantId_slug: { tenantId: tallerId, slug: categoriaSlug } },
      select: { nombre: true },
    })
    if (!categoria?.nombre) return { data: [], nextCursor: null, error: null }

    const rows = await prisma.producto.findMany({
      where: { tenantId: tallerId, categoria: categoria.nombre, stockActual: { gt: 0 } },
      select: POS_PRODUCT_SELECT,
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      take: limit + 1,
    })
    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null
    return { data: page.map(mapProductoDisponible), nextCursor, error: null }
  } catch (error) {
    console.error("[ventas-prisma] getPosItemsByCategory:", error)
    return { data: [], nextCursor: null, error: error instanceof Error ? error.message : "Error al cargar categoria POS" }
  }
}

export async function searchPosItems(input: PosSearchItemsInput): Promise<{ data: ProductoDisponible[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const q = String(input.q ?? "").trim()
    const limit = Math.max(10, Math.min(120, Number(input.limit ?? 80)))
    if (!q) return { data: [], error: null }

    const aliasMatches = await prisma.inventarioCategoriaAlias.findMany({
      where: { tenantId: tallerId, aliasSlug: { contains: toCategorySlug(q) } },
      select: { categoria: { select: { nombre: true } } },
      take: 8,
    })
    const aliasCategoryNames = Array.from(new Set(aliasMatches.map((m) => m.categoria.nombre)))

    const rows = await prisma.producto.findMany({
      where: {
        tenantId: tallerId,
        stockActual: { gt: 0 },
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { categoria: { contains: q, mode: "insensitive" } },
          { imeiSerie: { contains: q, mode: "insensitive" } },
          { codigoBarras: { equals: q, mode: "insensitive" } },
          ...(aliasCategoryNames.length > 0 ? [{ categoria: { in: aliasCategoryNames } }] : []),
        ],
      },
      select: POS_PRODUCT_SELECT,
      orderBy: [{ nombre: "asc" }],
      take: limit,
    })
    return { data: rows.map(mapProductoDisponible), error: null }
  } catch (error) {
    console.error("[ventas-prisma] searchPosItems:", error)
    return { data: [], error: error instanceof Error ? error.message : "Error al buscar productos POS" }
  }
}

export async function getPosQuickCategories(limit = 8): Promise<{ data: string[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const activeCategories = await prisma.inventarioCategoria.findMany({
      where: { tenantId: tallerId, activo: true },
      orderBy: [{ sortOrder: "asc" }, { nombre: "asc" }],
      select: { nombre: true, slug: true },
    })
    const top = activeCategories.slice(0, Math.max(4, Math.min(12, Number(limit))))
    return { data: top.map((r) => r.slug), error: null }
  } catch (error) {
    console.error("[ventas-prisma] getPosQuickCategories:", error)
    return { data: [], error: error instanceof Error ? error.message : "Error al cargar categorias POS" }
  }
}

export async function getPosCategoryCatalog(): Promise<{ data: PosCategoryOption[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const rows = await prisma.inventarioCategoria.findMany({
      where: { tenantId: tallerId, activo: true },
      orderBy: [{ sortOrder: "asc" }, { nombre: "asc" }],
      select: { slug: true, nombre: true },
    })
    return { data: rows, error: null }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Error al cargar catalogo de categorias POS" }
  }
}

export interface PosMountData {
  settings: {
    taller_id?: string
    nombre_taller?: string
    telefono?: string
    tamano_papel?: string
    logo_url?: string | null
    terminos_garantia?: string
    mensaje_despedida?: string
    impresora_ticket?: string | null
    direccion?: string
    pais?: string | null
    impresion_config?: Record<string, unknown> | null
  } | null
  kioscoCapability: { canUsePosKiosco: boolean; planTipo: string; isPro: boolean }
  kioscoConfig: import("@/lib/actions/settings-prisma").PosKioscoConfig | null
  productos: ProductoDisponible[]
  quickCategories: string[]
  categoryCatalog: PosCategoryOption[]
  error: string | null
}

/**
 * Carga unificada para el mount de la pantalla POS.
 * Ejecuta internamente todas las queries en paralelo (Promise.all) para que el
 * cliente haga UN solo round-trip de Server Action en lugar de seis.
 * Reemplaza el init() previo que disparaba 6 RPCs independientes.
 */
export async function loadPosMountData(): Promise<PosMountData> {
  try {
    const [settingsRes, cap, cfg, quickRes, catRes, catCatalogRes] = await Promise.all([
      getTallerSettings(),
      getPosKioscoCapability(),
      getPosKioscoSettings(),
      getPosQuickItems({ limit: 12, mode: "latest_added" }),
      getPosQuickCategories(8),
      getPosCategoryCatalog(),
    ])

    const configuredQuickCategories = (cfg.config?.quick_categories ?? []).filter(Boolean) as string[]
    const quickCategories = configuredQuickCategories.length > 0 ? configuredQuickCategories : catRes.data

    return {
      settings: (settingsRes.settings as PosMountData["settings"]) ?? null,
      kioscoCapability: cap,
      kioscoConfig: cfg.config,
      productos: quickRes.data,
      quickCategories,
      categoryCatalog: catCatalogRes.data,
      error: quickRes.error ?? catRes.error ?? catCatalogRes.error ?? null,
    }
  } catch (error) {
    console.error("[ventas-prisma] loadPosMountData:", error)
    return {
      settings: null,
      kioscoCapability: { canUsePosKiosco: false, planTipo: "suspendido", isPro: false },
      kioscoConfig: null,
      productos: [],
      quickCategories: [],
      categoryCatalog: [],
      error: error instanceof Error ? error.message : "Error al cargar datos del POS",
    }
  }
}

export async function crearVenta(input: CrearVentaInput): Promise<{ venta: VentaCreada | null; error: string | null }> {
  const cajaCheck = await requireCajaAbierta()
  if (cajaCheck.error || !cajaCheck.caja) return { venta: null, error: cajaCheck.error ?? "No hay caja abierta" }
  if (!input.items?.length) return { venta: null, error: "El carrito esta vacio" }

  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const actorNombre = await getCurrentActorDisplayName()

    const ventaCount = await prisma.venta.count({ where: { tenantId: tallerId } })
    const folio = `VTA-${String(ventaCount + 1).padStart(6, "0")}`

    const result = await prisma.$transaction(async (tx) => {
      let resolvedClienteId = input.cliente_id?.trim() || null
      let resolvedClienteNombre = input.cliente_nombre?.trim() || null
      let resolvedClienteTelefono = normalizeClienteTelefono(input.cliente_telefono)

      if (resolvedClienteTelefono && isValidClienteTelefono(resolvedClienteTelefono)) {
        const resolved = await resolveClienteByTelefono({
          tenantId: tallerId,
          clienteId: resolvedClienteId,
          telefono: resolvedClienteTelefono,
          nombre: resolvedClienteNombre,
          notasOrigen: "Creado desde venta POS",
        }, tx)
        if (resolved.client) {
          resolvedClienteId = resolved.client.id
          resolvedClienteNombre = resolvedClienteNombre || resolved.client.nombre
          resolvedClienteTelefono = resolved.client.telefono
        }
      } else {
        resolvedClienteTelefono = ""
      }

      const ventaDb = await tx.venta.create({
        data: {
          tenantId: tallerId,
          cajaId: input.caja_id ?? null,
          folio,
          clienteNombre: resolvedClienteNombre,
          clienteId: resolvedClienteId,
          clienteTelefono: resolvedClienteTelefono || null,
          total: input.total,
          descuento: input.descuento ?? 0,
          metodoPago: input.metodo_pago,
          montoEfectivo: input.monto_efectivo,
          montoTarjeta: input.monto_tarjeta,
          montoTransferencia: input.monto_transferencia,
          cambio: input.cambio,
          referenciaPago: input.referencia_pago ?? null,
          vendedorNombre: actorNombre,
        },
      })

      const stockItems = input.items.filter((item) => item.producto_id && !item.es_especial)

      await tx.detalleVenta.createMany({
        data: input.items.map((item) => ({
          ventaId: ventaDb.id,
          productoId: item.producto_id ?? null,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precioUnitario: item.precio_unitario,
          costoUnitario: item.costo_unitario,
          subtotal: item.precio_unitario * item.cantidad,
          esEspecial: item.es_especial,
          referencia: item.referencia ?? null,
          imeiSerie: item.imei_serie ?? null,
          color: item.color ?? null,
          condicion: item.condicion ?? null,
          marca: item.marca ?? null,
          modelo: item.modelo ?? null,
          categoria: item.categoria ?? null,
          procesador: item.procesador ?? null,
          ram: item.ram ?? null,
          almacenamiento: item.almacenamiento ?? null,
        })),
      })

      if (stockItems.length > 0) {
        await Promise.all(
          stockItems.map((item) =>
            tx.producto.update({
              where: { id: item.producto_id!, tenantId: tallerId },
              data: { stockActual: { decrement: item.cantidad } },
            })
          )
        )
      }

      if (input.caja_id) {
        await tx.caja.update({
          where: { id: input.caja_id },
          data: {
            totalEfectivo: { increment: input.monto_efectivo - input.cambio },
            totalTarjeta: { increment: input.monto_tarjeta },
            totalTransferencia: { increment: input.monto_transferencia },
            totalVentas: { increment: 1 },
          },
        })

        await tx.movimientoCaja.create({
          data: {
            tenantId: tallerId,
            cajaId: input.caja_id,
            tipo: "venta_pdv",
            referenciaId: ventaDb.id,
            descripcion: `Venta ${folio}${resolvedClienteNombre ? ` - ${resolvedClienteNombre}` : ""}`,
            monto: input.total,
            metodoPago: input.metodo_pago,
            fecha: new Date(),
          },
        })
      }

      return ventaDb
    }, { timeout: 15000 })

    revalidatePath("/dashboard/historial-ventas")

    return {
      venta: {
        id: result.id,
        folio,
        total: input.total,
        descuento: input.descuento ?? 0,
        metodo_pago: input.metodo_pago,
        monto_efectivo: input.monto_efectivo,
        monto_tarjeta: input.monto_tarjeta,
        monto_transferencia: input.monto_transferencia,
        cambio: input.cambio,
        created_at: result.createdAt.toISOString(),
        referencia_pago: input.referencia_pago ?? null,
        items: input.items,
        cliente_id: result.clienteId,
        cliente_nombre: result.clienteNombre,
        cliente_telefono: result.clienteTelefono,
      },
      error: null,
    }
  } catch (error) {
    console.error("[ventas-prisma] crearVenta:", error instanceof Error ? error.message : String(error))
    return { venta: null, error: error instanceof Error ? error.message : "Error al crear venta" }
  }
}

export async function vincularVentaClientePorTelefono(input: {
  ventaId: string
  telefono: string
  nombre?: string | null
}): Promise<{ venta: Pick<VentaCreada, "cliente_id" | "cliente_nombre" | "cliente_telefono"> | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const venta = await prisma.venta.findFirst({
      where: { id: input.ventaId, tenantId: tallerId },
      select: { id: true, clienteId: true, clienteNombre: true, clienteTelefono: true },
    })

    if (!venta) return { venta: null, error: "Venta no encontrada" }

    const resolved = await resolveClienteByTelefono({
      tenantId: tallerId,
      clienteId: venta.clienteId,
      telefono: input.telefono,
      nombre: input.nombre || venta.clienteNombre || null,
      notasOrigen: "Capturado desde ticket digital POS",
    })

    if (!resolved.client) return { venta: null, error: resolved.error ?? "No se pudo vincular cliente" }

    const updated = await prisma.venta.update({
      where: { id: venta.id },
      data: {
        clienteId: resolved.client.id,
        clienteNombre: venta.clienteNombre || resolved.client.nombre,
        clienteTelefono: resolved.client.telefono,
      },
      select: { clienteId: true, clienteNombre: true, clienteTelefono: true },
    })

    revalidatePath("/dashboard/historial-ventas")
    revalidatePath("/dashboard/clientes")

    return {
      venta: {
        cliente_id: updated.clienteId,
        cliente_nombre: updated.clienteNombre,
        cliente_telefono: updated.clienteTelefono,
      },
      error: null,
    }
  } catch (error) {
    console.error("[ventas-prisma] vincularVentaClientePorTelefono:", error)
    return { venta: null, error: error instanceof Error ? error.message : "No se pudo vincular cliente" }
  }
}

export async function getHistorialCaja(page = 0, pageSize = 30): Promise<{ data: HistorialCajaItem[]; error: string | null; total: number }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const from = page * pageSize

    const rows = await prisma.caja.findMany({
      where: { tenantId: tallerId, estado: "cerrada" },
      orderBy: { fechaApertura: "desc" },
      skip: from,
      take: pageSize,
    })

    const total = await prisma.caja.count({
      where: { tenantId: tallerId, estado: "cerrada" },
    })

    // Aggregate movimientos_caja per caja to include abonos/gastos in saldo_final
    const cajaIds = rows.map((r) => r.id)
    const movs = await prisma.movimientoCaja.groupBy({
      by: ["cajaId", "tipo", "metodoPago"],
      where: { cajaId: { in: cajaIds }, tenantId: tallerId },
      _sum: { monto: true },
    })

    const abonoMap = new Map<string, number>()
    const gastoEfectivoMap = new Map<string, number>()
    const anulacionMap = new Map<string, number>()
    for (const m of movs) {
      const cid = m.cajaId
      if (!cid) continue
      const monto = Number(m._sum.monto ?? 0)
      if (m.tipo === "anticipo_reparacion" || m.tipo === "liquidacion_reparacion" || m.tipo === "liquidacion" || m.tipo === "apartado_abono") {
        if (m.metodoPago === "efectivo") {
          abonoMap.set(cid, (abonoMap.get(cid) ?? 0) + monto)
        }
      } else if (m.tipo === "gasto" || m.tipo === "gasto_reparacion") {
        if (m.metodoPago === "efectivo") {
          gastoEfectivoMap.set(cid, (gastoEfectivoMap.get(cid) ?? 0) + Math.abs(monto))
        }
      } else if (
        (m.tipo === "anulacion_venta_pdv" ||
          m.tipo === "anulacion_reparacion_abono" ||
          m.tipo === "anulacion_apartado_abono") &&
        m.metodoPago === "efectivo"
      ) {
        anulacionMap.set(cid, (anulacionMap.get(cid) ?? 0) + Math.abs(monto))
      }
    }

    return {
      data: rows.map((r) => {
        const base = mapHistorialCajaItem(r)
        const abonosEfectivo = abonoMap.get(r.id) ?? 0
        const gastosEfectivo = gastoEfectivoMap.get(r.id) ?? 0
        const anulacionesEfectivo = anulacionMap.get(r.id) ?? 0
        return {
          ...base,
          saldo_final: base.monto_inicial + base.total_efectivo + abonosEfectivo - gastosEfectivo - anulacionesEfectivo,
        }
      }),
      error: null,
      total,
    }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Error historial caja", total: 0 }
  }
}

export async function getDetalleCaja(cajaId: string): Promise<{ data: DetalleCajaData | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()

    const [caja, ventas, movimientos] = await Promise.all([
      prisma.caja.findFirst({
        where: { id: cajaId, tenantId: tallerId },
      }),
      prisma.venta.findMany({
        where: { cajaId, tenantId: tallerId, estado: "activa" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          folio: true,
          clienteNombre: true,
          total: true,
          metodoPago: true,
          montoEfectivo: true,
          montoTarjeta: true,
          montoTransferencia: true,
          createdAt: true,
        },
      }),
      prisma.movimientoCaja.findMany({
        where: { cajaId, tenantId: tallerId },
        orderBy: { fecha: "asc" },
        select: {
          id: true,
          tipo: true,
          descripcion: true,
          monto: true,
          metodoPago: true,
          fecha: true,
          folio: true,
        },
      }),
    ])

    if (!caja) return { data: null, error: "Caja no encontrada" }

    const cajaMapped = mapHistorialCajaItem(caja)

    // Compute saldo_final including abonos/gastos from movimientos
    const abonosEfectivo = movimientos
      .filter((m) => (m.tipo === "anticipo_reparacion" || m.tipo === "liquidacion_reparacion" || m.tipo === "liquidacion" || m.tipo === "apartado_abono") && m.metodoPago === "efectivo")
      .reduce((s, m) => s + Math.abs(Number(m.monto)), 0)
    const gastosEfectivo = movimientos
      .filter((m) => (m.tipo === "gasto" || m.tipo === "gasto_reparacion") && m.metodoPago === "efectivo")
      .reduce((s, m) => s + Math.abs(Number(m.monto)), 0)
    const anulacionesEfectivo = movimientos
      .filter((m) => (m.tipo === "anulacion_venta_pdv" || m.tipo === "anulacion_reparacion_abono" || m.tipo === "anulacion_apartado_abono") && m.metodoPago === "efectivo")
      .reduce((s, m) => s + Math.abs(Number(m.monto)), 0)

    return {
      data: {
        caja: {
          ...cajaMapped,
          saldo_final: cajaMapped.monto_inicial + cajaMapped.total_efectivo + abonosEfectivo - gastosEfectivo - anulacionesEfectivo,
        },
        ventas: ventas.map((v) => ({
          id: v.id,
          folio: v.folio,
          cliente_nombre: v.clienteNombre,
          total: Number(v.total),
          metodo_pago: v.metodoPago,
          monto_efectivo: Number(v.montoEfectivo),
          monto_tarjeta: Number(v.montoTarjeta),
          monto_transferencia: Number(v.montoTransferencia),
          created_at: v.createdAt.toISOString(),
        })),
        movimientos: movimientos.map((m) => ({
          id: m.id,
          tipo: m.tipo,
          descripcion: m.descripcion,
          monto: Number(m.monto),
          metodo_pago: m.metodoPago,
          fecha: m.fecha.toISOString(),
          folio: m.folio,
        })),
        tallerId,
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Error detalle caja" }
  }
}

export async function getAbonoById(movimientoId: string): Promise<{ data: AbonoPrintData | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()

    const mov = await prisma.movimientoCaja.findFirst({
      where: { id: movimientoId, tenantId: tallerId },
    })
    if (!mov) return { data: null, error: "Movimiento no encontrado." }

    const rep = await prisma.reparacion.findFirst({
      where: { id: String(mov.referenciaId ?? ""), tenantId: tallerId },
      select: {
        folio: true,
        cliente: { select: { nombre: true, telefono: true } },
        tipoEquipo: true,
        equipoMarca: true,
        equipoModelo: true,
        costoEstimado: true,
        anticipo: true,
      },
    })
    if (!rep) return { data: null, error: "Reparacion no encontrada." }

    const presupuesto = Number(rep.costoEstimado ?? 0)
    const totalAbonado = Number(rep.anticipo ?? 0)

    return {
      data: {
        movimientoId: mov.id,
        folio: rep.folio,
        clienteNombre: rep.cliente?.nombre ?? "",
        clienteTelefono: rep.cliente?.telefono ?? "",
        dispositivo: `${rep.tipoEquipo ?? ""} ${rep.equipoMarca ?? ""} ${rep.equipoModelo ?? ""}`.trim(),
        metodoPago: mov.metodoPago ?? "efectivo",
        monto: Number(mov.monto),
        totalAbonado,
        presupuesto,
        saldoRestante: Math.max(0, presupuesto - totalAbonado),
        fecha: mov.fecha.toISOString(),
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Error al obtener abono" }
  }
}

export async function getCajaConDetalle(cajaId: string): Promise<{ data: CortePrintData | null; error: string | null }> {
  const detalle = await getDetalleCaja(cajaId)
  if (!detalle.data || detalle.error) return { data: null, error: detalle.error ?? "Corte no encontrado." }
  const c = detalle.data.caja
  const movimientos = detalle.data.movimientos
  const ventas = detalle.data.ventas.map((v) => ({ id: v.id, folio: v.folio, created_at: v.created_at, total: v.total, metodo_pago: v.metodo_pago }))

  const prisma = getPrismaClient()
  const fechaCierre = c.fecha_cierre ?? new Date().toISOString()
  const visitasRows = await prisma.visita.findMany({
    where: {
      tenantId: c.taller_id,
      fechaLlegada: {
        gte: new Date(c.fecha_apertura),
        lte: new Date(fechaCierre),
      },
    },
    orderBy: { fechaLlegada: "asc" },
    select: {
      id: true,
      fechaLlegada: true,
      fechaSalida: true,
      estado: true,
      motivo: true,
      motivoOtro: true,
      clienteNombre: true,
      clienteTelefono: true,
      atendidoPor: true,
      notas: true,
      reparacionFolio: true,
      ventaFolio: true,
    },
  })

  const visitasDelDia: CorteVisita[] = visitasRows.map((v) => ({
    id: v.id,
    fecha_llegada: v.fechaLlegada.toISOString(),
    fecha_salida: v.fechaSalida?.toISOString() ?? null,
    estado: v.estado,
    motivo: v.motivo,
    motivo_otro: v.motivoOtro,
    cliente_nombre: v.clienteNombre,
    cliente_telefono: v.clienteTelefono,
    atendido_por: v.atendidoPor,
    notas: v.notas,
    reparacion_folio: v.reparacionFolio,
    venta_folio: v.ventaFolio,
  }))

  const gastosMovs = movimientos.filter(
    (m) => m.tipo === "gasto" || m.tipo === "gasto_reparacion",
  )
  const totalGastos = gastosMovs.reduce((s, m) => s + Math.abs(m.monto), 0)
  const totalGastosEfectivo = gastosMovs.filter((m) => m.metodo_pago === "efectivo").reduce((s, m) => s + Math.abs(m.monto), 0)
  const totalGastosTarjeta = gastosMovs.filter((m) => m.metodo_pago === "tarjeta").reduce((s, m) => s + Math.abs(m.monto), 0)
  const totalGastosTransferencia = gastosMovs.filter((m) => m.metodo_pago === "transferencia").reduce((s, m) => s + Math.abs(m.monto), 0)
  const listaGastos: CorteGasto[] = gastosMovs.map((m) => ({
    id: m.id,
    descripcion: m.descripcion ?? "Gasto",
    monto: Math.abs(m.monto),
    metodo_pago: m.metodo_pago ?? null,
  }))

  const cobrosMovs = movimientos.filter(
    (m) => m.tipo === "anticipo_reparacion" || m.tipo === "liquidacion_reparacion" || m.tipo === "liquidacion" || m.tipo === "apartado_abono",
  )
  const cobrosRep: CorteCobro[] = cobrosMovs.map((m) => ({
    id: m.id,
    tipo: m.tipo,
    descripcion: m.descripcion ?? null,
    folio: m.folio ?? null,
    monto: Math.abs(m.monto),
    metodo_pago: m.metodo_pago ?? null,
    fecha: m.fecha,
  }))

  const anulacionesMovs = movimientos.filter(
    (m) => m.tipo === "anulacion_venta_pdv" || m.tipo === "anulacion_reparacion_abono" || m.tipo === "anulacion_apartado_abono",
  )
  const anulaciones: CorteAnulacion[] = anulacionesMovs.map((m) => ({
    id: m.id,
    descripcion: m.descripcion ?? null,
    folio: m.folio ?? null,
    monto: Math.abs(m.monto),
    metodo_pago: m.metodo_pago ?? null,
    fecha: m.fecha,
  }))
  const totalAnulaciones = anulaciones.reduce((s, a) => s + a.monto, 0)
  const totalAnulacionesEfectivo = anulaciones.filter((a) => a.metodo_pago === "efectivo").reduce((s, a) => s + a.monto, 0)
  const totalAnulacionesTarjeta = anulaciones.filter((a) => a.metodo_pago === "tarjeta").reduce((s, a) => s + a.monto, 0)
  const totalAnulacionesTransferencia = anulaciones.filter((a) => a.metodo_pago === "transferencia").reduce((s, a) => s + a.monto, 0)

  const totalAbonos = cobrosRep.reduce((s, c) => s + c.monto, 0)
  const totalAbonosEfectivo = cobrosRep.filter((c) => c.metodo_pago === "efectivo").reduce((s, c) => s + c.monto, 0)
  const totalAbonosTarjeta = cobrosRep.filter((c) => c.metodo_pago === "tarjeta").reduce((s, c) => s + c.monto, 0)
  const totalAbonosTransferencia = cobrosRep.filter((c) => c.metodo_pago === "transferencia").reduce((s, c) => s + c.monto, 0)

  return {
    data: {
      numero_corte: c.numero_corte ?? 0,
      fecha_apertura: c.fecha_apertura,
      fecha_cierre: c.fecha_cierre ?? new Date().toISOString(),
      monto_inicial: c.monto_inicial,
      total_ventas: c.total_ventas,
      total_efectivo: c.total_efectivo,
      total_tarjeta: c.total_tarjeta,
      total_transferencia: c.total_transferencia,
      total_abonos: totalAbonos,
      total_abonos_efectivo: totalAbonosEfectivo,
      total_abonos_tarjeta: totalAbonosTarjeta,
      total_abonos_transferencia: totalAbonosTransferencia,
      total_gastos: totalGastos,
      total_gastos_efectivo: totalGastosEfectivo,
      total_gastos_tarjeta: totalGastosTarjeta,
      total_gastos_transferencia: totalGastosTransferencia,
      total_anulaciones_efectivo: totalAnulacionesEfectivo,
      total_anulaciones_tarjeta: totalAnulacionesTarjeta,
      total_anulaciones_transferencia: totalAnulacionesTransferencia,
      saldo_final: c.monto_inicial + c.total_efectivo + totalAbonosEfectivo - totalGastosEfectivo - totalAnulacionesEfectivo,
      monto_cierre: c.monto_cierre,
      nota_cierre: c.nota_cierre ?? undefined,
      cobrosRep,
      listaGastos,
      anulaciones,
      ventas,
      totalVentasPdv: ventas.reduce((sum, v) => sum + v.total, 0),
      totalAnulaciones,
      visitasDelDia,
    },
    error: null,
  }
}

export async function canAnularVentas(): Promise<boolean> {
  // Always return true for authenticated users. Previously was a no-op
  // that always returned true anyway. Kept for backward compatibility.
  try {
    await getCurrentTallerId()
    return true
  } catch {
    return false
  }
}

export async function getVentaParaTicket(ventaId: string): Promise<{ venta: VentaCreada | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()

    const venta = await prisma.venta.findFirst({
      where: { id: ventaId, tenantId: tallerId },
      include: {
        detalles: {
          select: {
            productoId: true,
            descripcion: true,
            cantidad: true,
            precioUnitario: true,
            costoUnitario: true,
            esEspecial: true,
            imeiSerie: true,
            color: true,
            condicion: true,
            marca: true,
            modelo: true,
            procesador: true,
            ram: true,
            almacenamiento: true,
          },
        },
      },
    })

    if (!venta) return { venta: null, error: "Venta no encontrada." }
    if (venta.estado === "anulado") return { venta: null, error: "Esta venta fue anulada." }

    return {
      venta: {
        id: venta.id,
        folio: venta.folio,
        total: Number(venta.total),
        descuento: Number(venta.descuento),
        metodo_pago: venta.metodoPago,
        monto_efectivo: Number(venta.montoEfectivo),
        monto_tarjeta: Number(venta.montoTarjeta),
        monto_transferencia: Number(venta.montoTransferencia),
        cambio: Number(venta.cambio),
        referencia_pago: venta.referenciaPago,
        created_at: venta.createdAt.toISOString(),
        items: venta.detalles.map((d) => ({
          producto_id: d.productoId ?? undefined,
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          precio_unitario: Number(d.precioUnitario),
          costo_unitario: Number(d.costoUnitario),
          es_especial: d.esEspecial,
          imei_serie: d.imeiSerie ?? undefined,
          color: d.color ?? undefined,
          condicion: d.condicion ?? undefined,
          marca: d.marca ?? undefined,
          modelo: d.modelo ?? undefined,
          procesador: d.procesador ?? undefined,
          ram: d.ram ?? undefined,
          almacenamiento: d.almacenamiento ?? undefined,
        })),
        cliente_id: venta.clienteId,
        cliente_nombre: venta.clienteNombre,
        cliente_telefono: venta.clienteTelefono,
      },
      error: null,
    }
  } catch (error) {
    return { venta: null, error: error instanceof Error ? error.message : "Error al obtener venta" }
  }
}

export async function getCobroReparacionParaTicket(movimientoId: string): Promise<{ data: CobroReparacionTicketData | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()

    const mov = await prisma.movimientoCaja.findFirst({
      where: { id: movimientoId, tenantId: tallerId },
    })
    if (!mov) return { data: null, error: "Movimiento no encontrado." }

    const tipo = mov.tipo
    if (tipo !== "anticipo_reparacion" && tipo !== "liquidacion_reparacion") {
      return { data: null, error: "Este movimiento no es un cobro de reparacion." }
    }

    let folio = "-"
    let cliente = "-"
    const rid = mov.referenciaId
    if (rid) {
      const rep = await prisma.reparacion.findFirst({
        where: { id: rid, tenantId: tallerId },
        select: {
          folio: true,
          cliente: { select: { nombre: true } },
        },
      })
      if (rep) {
        folio = rep.folio
        cliente = rep.cliente?.nombre ?? "-"
      }
    }

    return {
      data: {
        folio,
        cliente,
        conceptos: tipo === "liquidacion_reparacion" ? "Liquidacion" : "Anticipo",
        monto: Number(mov.monto),
        metodo_pago: mov.metodoPago ?? "efectivo",
        fechaIso: mov.fecha.toISOString(),
        tipoMov: tipo === "liquidacion_reparacion" ? "liquidacion" : "anticipo",
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Error al obtener cobro" }
  }
}

export async function anularVenta(ventaId: string, motivo?: string | null): Promise<{ success: boolean; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()

    const venta = await prisma.venta.findFirst({
      where: { id: ventaId, tenantId: tallerId, estado: "activa" },
      select: {
        id: true,
        folio: true,
        cajaId: true,
        total: true,
        metodoPago: true,
        montoEfectivo: true,
        montoTarjeta: true,
        montoTransferencia: true,
        cambio: true,
        detalles: {
          select: {
            productoId: true,
            cantidad: true,
            esEspecial: true,
          },
        },
      },
    })

    if (!venta) {
      return { success: false, error: "Venta no encontrada o ya anulada." }
    }

    const cajaAbierta = await prisma.caja.findFirst({
      where: { tenantId: tallerId, estado: "abierta" },
      orderBy: { fechaApertura: "desc" },
      select: { id: true },
    })

    if (!cajaAbierta) {
      return { success: false, error: "No hay una caja abierta para registrar la salida de la anulacion." }
    }

    await prisma.$transaction(async (tx) => {
      // Restore stock for all non-special items. Let errors propagate —
      // previously .catch() swallowed failures silently, causing the
      // transaction to commit with incorrect stock.
      const stockUpdates = venta.detalles
        .filter((d) => d.productoId && !d.esEspecial && d.cantidad > 0)
        .map((d) =>
          tx.producto.update({
            where: { id: d.productoId!, tenantId: tallerId },
            data: { stockActual: { increment: d.cantidad } },
          })
        )
      await Promise.all(stockUpdates)

      await tx.venta.update({
        where: { id: venta.id },
        data: { estado: "anulado" },
      })

      if (venta.cajaId) {
        await tx.caja.update({
          where: { id: venta.cajaId },
          data: { totalVentas: { decrement: 1 } },
        })
      }

      await tx.movimientoCaja.create({
        data: {
          tenantId: tallerId,
          cajaId: cajaAbierta.id,
          tipo: "anulacion_venta_pdv",
          referenciaId: venta.id,
          descripcion: `Anulacion Venta ${venta.folio}${motivo ? ` - ${motivo}` : ""}`.slice(0, 250),
          monto: -Number(venta.total),
          metodoPago: venta.metodoPago,
          fecha: new Date(),
          folio: venta.folio,
        },
      })
    }, { timeout: 15000 })

    revalidatePath("/dashboard/historial-ventas")
    revalidatePath("/dashboard/corte")
    revalidatePath("/dashboard/ventas")
    revalidatePath("/dashboard/inventario")

    return { success: true, error: null }
  } catch (error) {
    console.error("[anularVenta] fatal:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : "Error al anular venta" }
  }
}

export async function cancelarVentaMostrador(ventaId: string) {
  return anularVenta(ventaId, null)
}

// ─── Anular cobros de reparacion (anticipo / liquidacion) ─────────────────────
// Genera un movimiento_caja reverso (tipo anulacion_reparacion_abono) y
// decrementa reparacion.anticipo. El cobro original sigue en historial como
// evidencia, pero la suma neta en caja queda en cero.
export async function anularCobroReparacion(
  movimientoId: string,
  motivo?: string | null,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()

    const mov = await prisma.movimientoCaja.findFirst({
      where: {
        id: movimientoId,
        tenantId: tallerId,
        tipo: { in: ["anticipo_reparacion", "liquidacion_reparacion"] },
      },
      select: {
        id: true,
        tenantId: true,
        cajaId: true,
        tipo: true,
        referenciaId: true,
        folio: true,
        monto: true,
        metodoPago: true,
        fecha: true,
        descripcion: true,
      },
    })

    if (!mov) {
      return { success: false, error: "Cobro de reparacion no encontrado." }
    }

    if (mov.tipo === "anticipo_reparacion") {
      const yaAnulado = await prisma.movimientoCaja.findFirst({
        where: {
          tenantId: tallerId,
          tipo: "anulacion_reparacion_abono",
          referenciaId: mov.id,
        },
        select: { id: true },
      })
      if (yaAnulado) {
        return { success: false, error: "Este cobro ya fue anulado." }
      }
    }

    const cajaAbierta = await prisma.caja.findFirst({
      where: { tenantId: tallerId, estado: "abierta" },
      orderBy: { fechaApertura: "desc" },
      select: { id: true },
    })
    if (!cajaAbierta) {
      return { success: false, error: "No hay una caja abierta para registrar la salida de la anulacion." }
    }

    const rid = mov.referenciaId
    const monto = Number(mov.monto)

    await prisma.$transaction(async (tx) => {
      if (rid) {
        const rep = await tx.reparacion.findFirst({
          where: { id: rid, tenantId: tallerId },
          select: { id: true, anticipo: true, costoEstimado: true, estado: true },
        })
        if (rep) {
          const nuevoAnticipo = Math.max(0, Number(rep.anticipo ?? 0) - monto)
          const nuevoEstado =
            rep.estado === "Entregado" && nuevoAnticipo < Number(rep.costoEstimado ?? 0)
              ? "Listo"
              : rep.estado
          await tx.reparacion.update({
            where: { id: rep.id },
            data: { anticipo: nuevoAnticipo, estado: nuevoEstado },
          })
        }
      }

      await tx.movimientoCaja.create({
        data: {
          tenantId: tallerId,
          cajaId: cajaAbierta.id,
          tipo: "anulacion_reparacion_abono",
          referenciaId: mov.id,
          folio: mov.folio ?? null,
          descripcion: `Anulacion ${mov.tipo === "liquidacion_reparacion" ? "liquidacion" : "anticipo"} reparacion #${mov.folio ?? ""}${motivo ? ` - ${motivo}` : ""}`.slice(0, 250),
          monto: -monto,
          metodoPago: mov.metodoPago,
          fecha: new Date(),
        },
      })
    }, { timeout: 15000 })

    revalidatePath("/dashboard/historial-ventas")
    revalidatePath("/dashboard/corte")
    revalidatePath("/dashboard/reparaciones")

    return { success: true, error: null }
  } catch (error) {
    console.error("[anularCobroReparacion] fatal:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : "Error al anular cobro de reparacion" }
  }
}

// ─── Anular abonos de apartado ─────────────────────────────────────────────────
// Crea un movimiento_caja reverso (anulacion_apartado_abono), decrementa
// apartado.totalAbonado y aumenta apartado.saldo. Si el apartado ya estaba
// liquidado, regresa a estado "activo".
export async function anularCobroApartado(
  movimientoId: string,
  motivo?: string | null,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()

    const mov = await prisma.movimientoCaja.findFirst({
      where: {
        id: movimientoId,
        tenantId: tallerId,
        tipo: "apartado_abono",
      },
      select: {
        id: true,
        tenantId: true,
        cajaId: true,
        tipo: true,
        referenciaId: true,
        folio: true,
        monto: true,
        metodoPago: true,
        fecha: true,
        descripcion: true,
      },
    })

    if (!mov) {
      return { success: false, error: "Abono de apartado no encontrado." }
    }

    const yaAnulado = await prisma.movimientoCaja.findFirst({
      where: {
        tenantId: tallerId,
        tipo: "anulacion_apartado_abono",
        referenciaId: mov.id,
      },
      select: { id: true },
    })
    if (yaAnulado) {
      return { success: false, error: "Este cobro ya fue anulado." }
    }

    const cajaAbierta = await prisma.caja.findFirst({
      where: { tenantId: tallerId, estado: "abierta" },
      orderBy: { fechaApertura: "desc" },
      select: { id: true },
    })
    if (!cajaAbierta) {
      return { success: false, error: "No hay una caja abierta para registrar la salida de la anulacion." }
    }

    const monto = Number(mov.monto)
    const apartadoId = mov.referenciaId

    await prisma.$transaction(async (tx) => {
      if (apartadoId) {
        const apt = await tx.apartado.findFirst({
          where: { id: apartadoId, tenantId: tallerId },
          select: { id: true, totalAbonado: true, saldo: true, precioAcordado: true, estado: true },
        })
        if (apt) {
          const nuevoTotalAbonado = Math.max(0, Number(apt.totalAbonado ?? 0) - monto)
          const nuevoSaldo = Math.max(0, Number(apt.saldo ?? 0) + monto)
          const nuevoEstado =
            nuevoTotalAbonado < Number(apt.precioAcordado ?? 0) ? "activo" : apt.estado
          await tx.apartado.update({
            where: { id: apt.id },
            data: {
              totalAbonado: nuevoTotalAbonado,
              saldo: nuevoSaldo,
              estado: nuevoEstado,
            },
          })
        }
      }

      await tx.movimientoCaja.create({
        data: {
          tenantId: tallerId,
          cajaId: cajaAbierta.id,
          tipo: "anulacion_apartado_abono",
          referenciaId: mov.id,
          folio: mov.folio ?? null,
          descripcion: `Anulacion abono apartado #${mov.folio ?? ""}${motivo ? ` - ${motivo}` : ""}`.slice(0, 250),
          monto: -monto,
          metodoPago: mov.metodoPago,
          fecha: new Date(),
        },
      })
    }, { timeout: 15000 })

    revalidatePath("/dashboard/historial-ventas")
    revalidatePath("/dashboard/corte")

    return { success: true, error: null }
  } catch (error) {
    console.error("[anularCobroApartado] fatal:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : "Error al anular cobro de apartado" }
  }
}

export async function reenviarCorteEmail(cajaId: string): Promise<{ success: boolean; sentTo?: string; error?: string }> {
  try {
    const tallerId = await getTenantIdOrThrow()
    const detalle = await getCajaConDetalle(cajaId)
    if (!detalle.data) {
      return { success: false, error: detalle.error ?? "Corte no encontrado." }
    }
    const data = detalle.data
    if (data.numero_corte == null) {
      return { success: false, error: "Corte sin numero asignado." }
    }

    const recipient = await resolveTallerEmailRecipient(tallerId)
    if (!recipient.email) {
      return {
        success: false,
        error: "No hay correo de contacto configurado. Configura el email del taller en Configuracion > Mi Cuenta o el email del propietario debe estar registrado.",
      }
    }

    const settings = await getPrismaClient().configuracionTaller.findUnique({
      where: { tenantId: tallerId },
      select: { reportesCierreCaja: true, nombreComercial: true },
    })
    if (settings && settings.reportesCierreCaja === false) {
      return {
        success: false,
        error: "Los reportes por correo estan desactivados. Activalos en Configuracion > Reportes y Alertas.",
      }
    }

    const fechaApertura = data.fecha_apertura
    const fechaCierre = data.fecha_cierre
    if (!fechaCierre) {
      return { success: false, error: "El corte no tiene fecha de cierre." }
    }

    const montoCierre = data.monto_cierre ?? null
    const diferencia =
      montoCierre != null ? montoCierre - data.saldo_final : null

    const result = await sendCorteCajaEmail({
      to: recipient.email,
      tallerNombre: settings?.nombreComercial?.trim() || "Tu taller",
      numeroCorte: data.numero_corte,
      fechaApertura,
      fechaCierre,
      montoInicial: data.monto_inicial,
      totalEfectivo: data.total_efectivo,
      totalTarjeta: data.total_tarjeta,
      totalTransferencia: data.total_transferencia,
      totalAbonos: data.total_abonos,
      totalAbonosEfectivo: data.total_abonos_efectivo,
      totalAbonosTarjeta: data.total_abonos_tarjeta,
      totalAbonosTransferencia: data.total_abonos_transferencia,
      totalGastos: data.total_gastos,
      totalGastosEfectivo: data.total_gastos_efectivo,
      totalGastosTarjeta: data.total_gastos_tarjeta,
      totalGastosTransferencia: data.total_gastos_transferencia,
      totalAnulaciones: data.totalAnulaciones,
      totalAnulacionesEfectivo: data.total_anulaciones_efectivo,
      totalAnulacionesTarjeta: data.total_anulaciones_tarjeta,
      totalAnulacionesTransferencia: data.total_anulaciones_transferencia,
      saldoFinal: data.saldo_final,
      montoCierre,
      diferencia,
      notaCierre: data.nota_cierre ?? null,
      totalVentas: data.total_ventas,
      ventas: data.ventas.map((v) => ({
        fecha: v.created_at,
        descripcion: `${v.folio ?? v.id}`.trim(),
        monto: v.total,
        metodoPago: v.metodo_pago ?? null,
      })),
      cobrosRep: data.cobrosRep.map((c) => ({
        fecha: c.fecha ?? fechaCierre,
        descripcion: (c.tipo === "anticipo_reparacion" ? "Anticipo " : c.tipo === "liquidacion" ? "Liquidacion " : "Cobro ") + (c.descripcion ?? c.folio ?? ""),
        monto: c.monto,
        metodoPago: c.metodo_pago ?? null,
      })),
      gastos: data.listaGastos.map((g) => ({
        fecha: fechaCierre,
        descripcion: g.descripcion ?? "Gasto",
        monto: g.monto,
        metodoPago: g.metodo_pago ?? null,
      })),
      anulaciones: data.anulaciones.map((a) => ({
        fecha: a.fecha,
        descripcion: `Anulacion ${a.folio ?? a.id}`.trim(),
        monto: a.monto,
        metodoPago: a.metodo_pago ?? null,
      })),
      visitas: data.visitasDelDia.map((v) => ({
        fechaLlegada: v.fecha_llegada,
        fechaSalida: v.fecha_salida,
        cliente: v.cliente_nombre || "-",
        motivo: v.motivo === "otro" ? (v.motivo_otro || "Otro") : (v.motivo || "-"),
        estado: v.estado,
        atendidoPor: v.atendido_por,
      })),
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }
    return { success: true, sentTo: result.sentTo ?? recipient.email }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al reenviar el corte por correo.",
    }
  }
}

export async function enviarCorteCajaEmailAction(input: {
  cortes: CortePrintData
  tallerNombre: string
  montoCierre: number | null
}): Promise<{ success: boolean; sentTo?: string; error?: string }> {
  try {
    const tallerId = await getTenantIdOrThrow()
    const data = input.cortes
    if (data.numero_corte == null) {
      return { success: false, error: "Corte sin numero asignado." }
    }
    if (!data.fecha_cierre) {
      return { success: false, error: "El corte no tiene fecha de cierre." }
    }

    const recipient = await resolveTallerEmailRecipient(tallerId)
    if (!recipient.email) {
      return {
        success: false,
        error: "No hay correo de contacto configurado. Configura el email del taller en Configuracion > Mi Cuenta o el email del propietario debe estar registrado.",
      }
    }

    const settings = await getPrismaClient().configuracionTaller.findUnique({
      where: { tenantId: tallerId },
      select: { reportesCierreCaja: true },
    })
    if (settings && settings.reportesCierreCaja === false) {
      return {
        success: false,
        error: "Los reportes por correo estan desactivados. Activalos en Configuracion > Reportes y Alertas.",
      }
    }

    const diferencia =
      input.montoCierre != null ? input.montoCierre - data.saldo_final : null

    const result = await sendCorteCajaEmail({
      to: recipient.email,
      tallerNombre: input.tallerNombre || "Tu taller",
      numeroCorte: data.numero_corte,
      fechaApertura: data.fecha_apertura,
      fechaCierre: data.fecha_cierre,
      montoInicial: data.monto_inicial,
      totalEfectivo: data.total_efectivo,
      totalTarjeta: data.total_tarjeta,
      totalTransferencia: data.total_transferencia,
      totalAbonos: data.total_abonos,
      totalAbonosEfectivo: data.total_abonos_efectivo,
      totalAbonosTarjeta: data.total_abonos_tarjeta,
      totalAbonosTransferencia: data.total_abonos_transferencia,
      totalGastos: data.total_gastos,
      totalGastosEfectivo: data.total_gastos_efectivo,
      totalGastosTarjeta: data.total_gastos_tarjeta,
      totalGastosTransferencia: data.total_gastos_transferencia,
      totalAnulaciones: data.totalAnulaciones,
      totalAnulacionesEfectivo: data.total_anulaciones_efectivo,
      totalAnulacionesTarjeta: data.total_anulaciones_tarjeta,
      totalAnulacionesTransferencia: data.total_anulaciones_transferencia,
      saldoFinal: data.saldo_final,
      montoCierre: input.montoCierre,
      diferencia,
      notaCierre: data.nota_cierre ?? null,
      totalVentas: data.total_ventas,
      ventas: data.ventas.map((v) => ({
        fecha: v.created_at,
        descripcion: `${v.folio ?? v.id}`.trim(),
        monto: v.total,
        metodoPago: v.metodo_pago ?? null,
      })),
      cobrosRep: data.cobrosRep.map((c) => ({
        fecha: data.fecha_cierre ?? new Date().toISOString(),
        descripcion: (c.tipo === "anticipo_reparacion" ? "Anticipo " : c.tipo === "liquidacion" ? "Liquidacion " : "Cobro ") + (c.descripcion ?? c.folio ?? ""),
        monto: c.monto,
        metodoPago: c.metodo_pago ?? null,
      })),
      gastos: data.listaGastos.map((g) => ({
        fecha: data.fecha_cierre ?? new Date().toISOString(),
        descripcion: g.descripcion ?? "Gasto",
        monto: g.monto,
        metodoPago: g.metodo_pago ?? null,
      })),
      anulaciones: data.anulaciones.map((a) => ({
        fecha: a.fecha,
        descripcion: `Anulacion ${a.folio ?? a.id}`.trim(),
        monto: a.monto,
        metodoPago: a.metodo_pago ?? null,
      })),
      visitas: data.visitasDelDia.map((v) => ({
        fechaLlegada: v.fecha_llegada,
        fechaSalida: v.fecha_salida,
        cliente: v.cliente_nombre || "-",
        motivo: v.motivo === "otro" ? (v.motivo_otro || "Otro") : (v.motivo || "-"),
        estado: v.estado,
        atendidoPor: v.atendido_por,
      })),
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }
    return { success: true, sentTo: result.sentTo ?? recipient.email }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al enviar el corte por correo.",
    }
  }
}

