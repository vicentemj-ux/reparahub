"use server"

import { getPrismaClient } from "@/lib/prisma"
import { getCurrentTallerId } from "@/lib/auth/get-current-taller"

export type HistorialTipoFiltro = "todos" | "mostrador" | "reparacion" | "apartado"

export type HistorialMetodoPagoCodigo = "efectivo" | "tarjeta" | "transferencia" | "mixto" | "otro"

export interface HistorialVentaRow {
  id: string
  source: "mostrador" | "reparacion" | "apartado"
  folio: string
  fechaIso: string
  tipoLabel: string
  cliente: string
  vendedor: string
  conceptos: string
  metodoPago: string
  metodoPagoCodigo: HistorialMetodoPagoCodigo
  montosMixto?: { efectivo: number; tarjeta: number; transferencia: number }
  total: number
  ventaEstado?: "activa" | "anulado"
  /** True cuando el cobro ya fue anulado (solo aplica a reparacion/apartado). */
  anulada?: boolean
}

export interface HistorialVentasTotales {
  efectivo: number
  tarjeta: number
  transferencia: number
  total: number
}

export interface GetHistorialVentasParams {
  startDate: string
  endDate: string
  tipo: HistorialTipoFiltro
  search?: string
  tzOffsetMin?: number
}

function utcDayRange(startDate: string, endDate: string, tzOffsetMin = 0): { from: string; to: string } | { error: string } {
  const s = startDate.trim()
  const e = endDate.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e)) return { error: "Las fechas deben estar en formato YYYY-MM-DD." }
  if (s > e) return { error: "La fecha inicial no puede ser posterior a la final." }

  const offsetMs = tzOffsetMin * 60 * 1000
  const from = new Date(Date.parse(`${s}T00:00:00.000Z`) + offsetMs).toISOString()
  const to = new Date(Date.parse(`${e}T23:59:59.999Z`) + offsetMs).toISOString()
  return { from, to }
}

function formatMetodoVenta(metodo: string, mE: number, mT: number, mTr: number): string {
  const m = (metodo || "").toLowerCase()
  if (m === "mixto") {
    const parts: string[] = []
    if (mE > 0) parts.push(`Ef. ${mE.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`)
    if (mT > 0) parts.push(`Tarj. ${mT.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`)
    if (mTr > 0) parts.push(`Transf. ${mTr.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`)
    return parts.length ? `Mixto (${parts.join(" · ")})` : "Mixto"
  }
  if (m === "efectivo") return "Efectivo"
  if (m === "tarjeta") return "Tarjeta"
  if (m === "transferencia") return "Transferencia"
  return metodo || "-"
}

function formatMetodoReparacion(raw: string | null): string {
  const x = (raw || "").toLowerCase()
  if (x === "efectivo") return "Efectivo"
  if (x === "tarjeta") return "Tarjeta"
  if (x === "transferencia") return "Transferencia"
  return raw?.trim() || "-"
}

function metodoVentaCodigo(metodo: string): HistorialMetodoPagoCodigo {
  const m = (metodo || "").toLowerCase()
  if (m === "mixto") return "mixto"
  if (m === "efectivo") return "efectivo"
  if (m === "tarjeta") return "tarjeta"
  if (m === "transferencia") return "transferencia"
  return "otro"
}

function metodoReparacionCodigo(raw: string | null): HistorialMetodoPagoCodigo {
  const x = (raw || "").toLowerCase()
  if (x === "efectivo") return "efectivo"
  if (x === "tarjeta") return "tarjeta"
  if (x === "transferencia") return "transferencia"
  return "otro"
}

async function fetchVentasMostrador(tallerId: string, from: string, to: string, q: string): Promise<HistorialVentaRow[]> {
  const prisma = getPrismaClient()

  const searchFilter = q.trim()
    ? {
        OR: [
          { folio: { contains: q, mode: "insensitive" as const } },
          { clienteNombre: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {}

  const ventas = await prisma.venta.findMany({
    where: {
      tenantId: tallerId,
      estado: { in: ["activa", "anulado"] },
      createdAt: {
        gte: new Date(from),
        lte: new Date(to),
      },
      ...searchFilter,
    },
    include: {
      detalles: {
        orderBy: { createdAt: "asc" },
        select: {
          descripcion: true,
          cantidad: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  })

  return ventas.map((v) => {
    const conceptos = v.detalles.length
      ? v.detalles.map((d) => `${d.cantidad > 1 ? `${d.cantidad}x ` : ""}${d.descripcion}`).join(", ")
      : "-"

    const metodo = v.metodoPago ?? ""
    const mE = Number(v.montoEfectivo ?? 0)
    const mT = Number(v.montoTarjeta ?? 0)
    const mTr = Number(v.montoTransferencia ?? 0)
    const codigo = metodoVentaCodigo(metodo)

    return {
      id: `pdv-${v.id}`,
      source: "mostrador",
      folio: v.folio,
      fechaIso: v.createdAt.toISOString(),
      tipoLabel: "Mostrador",
      cliente: (v.clienteNombre ?? "").trim() || "-",
      vendedor: (v.vendedorNombre ?? "").trim() || "-",
      conceptos,
      metodoPago: formatMetodoVenta(metodo, mE, mT, mTr),
      metodoPagoCodigo: codigo,
      montosMixto: codigo === "mixto" ? { efectivo: mE, tarjeta: mT, transferencia: mTr } : undefined,
      total: Number(v.total ?? 0),
      ventaEstado: v.estado === "anulado" ? "anulado" : "activa",
    }
  })
}

async function fetchCobrosReparacion(tallerId: string, from: string, to: string, q: string): Promise<HistorialVentaRow[]> {
  const prisma = getPrismaClient()

  const movs = await prisma.movimientoCaja.findMany({
    where: {
      tenantId: tallerId,
      tipo: { in: ["anticipo_reparacion", "liquidacion_reparacion"] },
      fecha: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    orderBy: { fecha: "desc" },
    take: 500,
  })

  const repIds = [...new Set(movs.map((m) => m.referenciaId).filter((id): id is string => Boolean(id)))]
  const repById = new Map<string, { id: string; folio: string | null; clienteNombre: string | null; equipoMarca: string | null; equipoModelo: string | null }>()

  if (repIds.length > 0) {
    const searchFilter = q.trim()
      ? {
          OR: [
            { folio: { contains: q, mode: "insensitive" as const } },
            { cliente: { nombre: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}

    const reps = await prisma.reparacion.findMany({
      where: {
        tenantId: tallerId,
        id: { in: repIds },
        ...searchFilter,
      },
      include: {
        cliente: {
          select: {
            nombre: true,
          },
        },
      },
    })

    for (const rep of reps) {
      repById.set(rep.id, {
        id: rep.id,
        folio: rep.folio,
        clienteNombre: rep.cliente?.nombre ?? null,
        equipoMarca: rep.equipoMarca,
        equipoModelo: rep.equipoModelo,
      })
    }
  }

  const rows: HistorialVentaRow[] = []
  for (const m of movs) {
    const rid = m.referenciaId
    const rep = rid ? repById.get(rid) : undefined
    if (q.trim() && rid && !rep) continue

    const movFolio = m.folio ?? null
    const folio = movFolio ?? (rep?.folio ? `A-${rep.folio}` : "-")
    const cliente = (rep?.clienteNombre ?? "").trim() || "-"
    const equipo = `${(rep?.equipoMarca ?? "").trim()} ${(rep?.equipoModelo ?? "").trim()}`.trim()
    const tipoMov = m.tipo === "liquidacion_reparacion" ? "Liquidacion" : "Anticipo"
    const descripcion = (m.descripcion ?? "").trim()
    const conceptos = [tipoMov, equipo ? `· ${equipo}` : "", descripcion ? `· ${descripcion}` : ""]
      .filter(Boolean)
      .join(" ")

    rows.push({
      id: `rep-${m.id}`,
      source: "reparacion",
      folio,
      fechaIso: m.fecha.toISOString(),
      tipoLabel: "Reparacion",
      cliente,
      vendedor: (m.vendedorNombre ?? "").trim() || "-",
      conceptos: conceptos || "-",
      metodoPago: formatMetodoReparacion(m.metodoPago),
      metodoPagoCodigo: metodoReparacionCodigo(m.metodoPago),
      total: Number(m.monto ?? 0),
    })
  }

  return rows
}

async function fetchCobrosApartados(tallerId: string, from: string, to: string, q: string): Promise<HistorialVentaRow[]> {
  const prisma = getPrismaClient()

  const movs = await prisma.movimientoCaja.findMany({
    where: {
      tenantId: tallerId,
      tipo: "apartado_abono",
      fecha: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    orderBy: { fecha: "desc" },
    take: 500,
  })

  const apartadoIds = [...new Set(movs.map((m) => m.referenciaId).filter((id): id is string => Boolean(id)))]
  const apartadoById = new Map<string, {
    id: string
    folio: string
    productoNombre: string
    productoSku: string | null
    cliente: { nombre: string; telefono: string | null }
  }>()

  if (apartadoIds.length > 0) {
    const searchFilter = q.trim()
      ? {
          OR: [
            { folio: { contains: q, mode: "insensitive" as const } },
            { productoNombre: { contains: q, mode: "insensitive" as const } },
            { productoSku: { contains: q, mode: "insensitive" as const } },
            { cliente: { nombre: { contains: q, mode: "insensitive" as const } } },
            { cliente: { telefono: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}

    const apartados = await prisma.apartado.findMany({
      where: {
        tenantId: tallerId,
        id: { in: apartadoIds },
        ...searchFilter,
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            telefono: true,
          },
        },
      },
    })

    for (const apartado of apartados) {
      apartadoById.set(apartado.id, {
        id: apartado.id,
        folio: apartado.folio,
        productoNombre: apartado.productoNombre,
        productoSku: apartado.productoSku,
        cliente: apartado.cliente,
      })
    }
  }

  const rows: HistorialVentaRow[] = []
  for (const m of movs) {
    const aid = m.referenciaId
    const apartado = aid ? apartadoById.get(aid) : undefined
    if (q.trim() && aid && !apartado) continue

    const folio = m.folio ?? apartado?.folio ?? "-"
    const cliente = (apartado?.cliente.nombre ?? "").trim() || "-"
    const producto = (apartado?.productoNombre ?? "").trim()
    const sku = (apartado?.productoSku ?? "").trim()
    const descripcion = (m.descripcion ?? "").trim()
    const conceptos = [
      "Abono apartado",
      producto ? `- ${producto}` : "",
      sku ? `- SKU ${sku}` : "",
      !producto && descripcion ? `- ${descripcion}` : "",
    ].filter(Boolean).join(" ")

    rows.push({
      id: `apt-${m.id}`,
      source: "apartado",
      folio,
      fechaIso: m.fecha.toISOString(),
      tipoLabel: "Apartado",
      cliente,
      vendedor: (m.vendedorNombre ?? "").trim() || "-",
      conceptos: conceptos || "-",
      metodoPago: formatMetodoReparacion(m.metodoPago),
      metodoPagoCodigo: metodoReparacionCodigo(m.metodoPago),
      total: Number(m.monto ?? 0),
    })
  }

  return rows
}

export async function getHistorialVentas(params: GetHistorialVentasParams): Promise<{ rows: HistorialVentaRow[]; error: string | null }> {
  const range = utcDayRange(params.startDate, params.endDate, params.tzOffsetMin ?? 0)
  if ("error" in range) return { rows: [], error: range.error }

  const { from, to } = range
  const q = (params.search ?? "").trim()
  const tipo = params.tipo
  const tallerId = await getCurrentTallerId()

  try {
    const prisma = getPrismaClient()

    // IDs de movimientos de reparacion / apartado que ya fueron anulados en
    // el rango. Se usa para marcar las filas originales con `anulada: true`
    // y ocultar el boton de anular en la UI.
    const anulacionesRepApt = await prisma.movimientoCaja.findMany({
      where: {
        tenantId: tallerId,
        tipo: { in: ["anulacion_reparacion_abono", "anulacion_apartado_abono"] },
        fecha: { gte: new Date(from), lte: new Date(to) },
      },
      select: { referenciaId: true },
    })
    const anuladosSet = new Set(
      anulacionesRepApt.map((a) => a.referenciaId).filter((id): id is string => Boolean(id)),
    )

    const [ventasRows, cobrosRows, apartadosRows] = await Promise.all([
      tipo === "todos" || tipo === "mostrador" ? fetchVentasMostrador(tallerId, from, to, q) : Promise.resolve<HistorialVentaRow[]>([]),
      tipo === "todos" || tipo === "reparacion" ? fetchCobrosReparacion(tallerId, from, to, q) : Promise.resolve<HistorialVentaRow[]>([]),
      tipo === "todos" || tipo === "apartado" ? fetchCobrosApartados(tallerId, from, to, q) : Promise.resolve<HistorialVentaRow[]>([]),
    ])

    for (const r of cobrosRows) if (anuladosSet.has(r.id.slice(4))) r.anulada = true
    for (const r of apartadosRows) if (anuladosSet.has(r.id.slice(4))) r.anulada = true

    const rowsOut = [...ventasRows, ...cobrosRows, ...apartadosRows].sort((a, b) => (a.fechaIso < b.fechaIso ? 1 : a.fechaIso > b.fechaIso ? -1 : 0))
    return { rows: rowsOut, error: null }
  } catch (e) {
    console.error("[getHistorialVentas] unexpected:", e)
    return { rows: [], error: e instanceof Error ? e.message : "Error al cargar historial" }
  }
}
