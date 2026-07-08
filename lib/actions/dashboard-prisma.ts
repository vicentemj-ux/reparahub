"use server"

import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { REPAIR_URGENCY_MS } from "@/lib/constants/repair-urgency"
import { getPrismaClient } from "@/lib/prisma"
import type { Order } from "@/components/dashboard/orders-table"

export interface DashboardPrismaStats {
  reparacionesTotales: number
  recibidas: number
  diagnostico: number
  enReparacion: number
  esperandoRefaccion: number
  listas: number
  entregadas: number
  urgentes: number
  ingresosBasicosMes: number
}

export interface DashboardCashSummary {
  cajaAbierta: boolean
  ventasDia: number
  operacionesDia: number
  efectivoEnCaja: number
  apertura: number
}

export interface DashboardFirstSteps {
  settingsReady: boolean
  cashReady: boolean
  inventoryReady: boolean
  repairReady: boolean
  clientOrVisitReady: boolean
  communicationReady: boolean
}

const TERMINAL_REPAIR_STATUSES = ["Entregado", "Cancelado", "Sin Reparacion"]
const DASHBOARD_AGENDA_EXCLUDED_STATUSES = [...TERMINAL_REPAIR_STATUSES, "Listo"]

function toOrderStatus(status: string): Order["status"] {
  if (status === "Recibido" || status === "Diagnostico" || status === "En Reparacion" || status === "Esperando Refaccion" || status === "Listo" || status === "Entregado") {
    return status
  }
  return "Recibido"
}

function toMxDate(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
}

function zonedDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "01"
  return `${get("year")}-${get("month")}-${get("day")}`
}

function dbDateFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`)
}

function nextDbDate(date: Date) {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + 1)
  return copy
}

const EMPTY_STATS: DashboardPrismaStats = {
  reparacionesTotales: 0,
  recibidas: 0,
  diagnostico: 0,
  enReparacion: 0,
  esperandoRefaccion: 0,
  listas: 0,
  entregadas: 0,
  urgentes: 0,
  ingresosBasicosMes: 0,
}

const EMPTY_CASH_SUMMARY: DashboardCashSummary = {
  cajaAbierta: false,
  ventasDia: 0,
  operacionesDia: 0,
  efectivoEnCaja: 0,
  apertura: 0,
}

export async function getDashboardMvpData() {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const now = new Date()
    const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1)
    const inicioDia = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dosDiasAtras = new Date(now.getTime() - REPAIR_URGENCY_MS)
    const cfg = await prisma.configuracionTaller.findUnique({
      where: { tenantId },
      select: {
        nombreComercial: true,
        telefono: true,
        timezone: true,
        fondoCajaInicial: true,
        whatsapp: true,
        printSettings: true,
      },
    })
    const timeZone = cfg?.timezone && cfg.timezone !== "UTC" ? cfg.timezone : "America/Mexico_City"
    const todayDbDate = dbDateFromKey(zonedDateKey(now, timeZone))
    const tomorrowDbDate = nextDbDate(todayDbDate)

    const [statusGroups, total, urgentes, ingresoMes, ventasDia, orders, agenda, productCount, clientCount, visitCount, cajaAbierta] = await Promise.all([
      prisma.reparacion.groupBy({
        by: ["estado"],
        where: { tenantId },
        _count: true,
      }),
      prisma.reparacion.count({ where: { tenantId } }),
      prisma.reparacion.count({
        where: {
          tenantId,
          OR: [
            {
              estado: { in: ["Diagnostico", "En Reparacion", "Recibido"] },
              updatedAt: { lte: dosDiasAtras },
            },
            {
              estado: "Esperando Refaccion",
              esperaRefaccionEta: { lt: now },
            },
          ],
        },
      }),
      prisma.reparacion.aggregate({
        where: {
          tenantId,
          createdAt: { gte: primerDiaMes },
          costoEstimado: { not: null },
        },
        _sum: { costoEstimado: true },
      }),
      prisma.venta.aggregate({
        where: {
          tenantId,
          estado: "activa",
          createdAt: { gte: inicioDia },
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.reparacion.findMany({
        where: { tenantId },
        select: {
          id: true,
          folio: true,
          estado: true,
          tipoEquipo: true,
          equipoMarca: true,
          equipoModelo: true,
          falla: true,
          tecnico: true,
          costoEstimado: true,
          createdAt: true,
          cliente: { select: { nombre: true, telefono: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.reparacion.findMany({
        where: {
          tenantId,
          estado: { notIn: DASHBOARD_AGENDA_EXCLUDED_STATUSES },
          OR: [
            { fechaPromesaEntrega: { gte: todayDbDate, lt: tomorrowDbDate } },
            {
              estado: "Esperando Refaccion",
              esperaRefaccionEta: { gte: todayDbDate, lt: tomorrowDbDate },
            },
          ],
        },
        select: {
          id: true,
          folio: true,
          estado: true,
          tipoEquipo: true,
          equipoMarca: true,
          equipoModelo: true,
          falla: true,
          tecnico: true,
          costoEstimado: true,
          createdAt: true,
          fechaPromesaEntrega: true,
          esperaRefaccionEta: true,
          cliente: { select: { nombre: true, telefono: true } },
        },
        orderBy: [{ fechaPromesaEntrega: "asc" }, { createdAt: "desc" }],
        take: 8,
      }),
      prisma.producto.count({ where: { tenantId } }),
      prisma.cliente.count({ where: { tenantId } }),
      prisma.visita.count({ where: { tenantId } }),
      prisma.caja.findFirst({
        where: { tenantId, estado: "abierta" },
        orderBy: { fechaApertura: "desc" },
        select: {
          id: true,
          montoInicial: true,
          totalEfectivo: true,
        },
      }),
    ])

    let totalAbonosEfectivo = 0
    let totalGastosEfectivo = 0
    let totalAnulacionesEfectivo = 0
    if (cajaAbierta) {
      const movimientosCaja = await prisma.movimientoCaja.findMany({
        where: { cajaId: cajaAbierta.id, tenantId },
        select: { tipo: true, metodoPago: true, monto: true },
      })
      for (const movimiento of movimientosCaja) {
        if (movimiento.metodoPago !== "efectivo") continue
        const monto = Math.abs(Number(movimiento.monto))
        if (movimiento.tipo === "gasto" || movimiento.tipo === "gasto_reparacion") totalGastosEfectivo += monto
        if (movimiento.tipo === "anticipo_reparacion" || movimiento.tipo === "liquidacion_reparacion" || movimiento.tipo === "liquidacion" || movimiento.tipo === "apartado_abono") totalAbonosEfectivo += monto
        if (movimiento.tipo === "anulacion_venta_pdv" || movimiento.tipo === "anulacion_reparacion_abono" || movimiento.tipo === "anulacion_apartado_abono") totalAnulacionesEfectivo += monto
      }
    }

    const statusMap = new Map(statusGroups.map((g) => [g.estado, g._count]))

    const stats: DashboardPrismaStats = {
      reparacionesTotales: total,
      recibidas: statusMap.get("Recibido") ?? 0,
      diagnostico: statusMap.get("Diagnostico") ?? 0,
      enReparacion: statusMap.get("En Reparacion") ?? 0,
      esperandoRefaccion: statusMap.get("Esperando Refaccion") ?? 0,
      listas: statusMap.get("Listo") ?? 0,
      entregadas: statusMap.get("Entregado") ?? 0,
      urgentes,
      ingresosBasicosMes: Number(ingresoMes._sum.costoEstimado ?? 0),
    }
    const apertura = Number(cajaAbierta?.montoInicial ?? 0)
    const cashSummary: DashboardCashSummary = {
      cajaAbierta: Boolean(cajaAbierta),
      ventasDia: Number(ventasDia._sum.total ?? 0),
      operacionesDia: ventasDia._count,
      efectivoEnCaja: cajaAbierta
        ? apertura + Number(cajaAbierta.totalEfectivo) + totalAbonosEfectivo - totalGastosEfectivo - totalAnulacionesEfectivo
        : 0,
      apertura,
    }

    const orderRows: Order[] = orders.map((r) => ({
      id: r.id,
      folio: r.folio,
      customer: r.cliente?.nombre ?? "Sin nombre",
      phone: r.cliente?.telefono ?? "",
      device: `${r.equipoMarca || ""} ${r.equipoModelo || ""}`.trim() || "Equipo",
      tipo_equipo: r.tipoEquipo || "Equipo",
      status: toOrderStatus(r.estado),
      date: toMxDate(r.createdAt),
      problem: r.falla || "Sin falla reportada",
      price: r.costoEstimado == null ? "Pendiente" : `$${Number(r.costoEstimado).toLocaleString("es-MX")}`,
      technician: r.tecnico || "Sin asignar",
    }))

    const agendaRows: Order[] = agenda.map((r) => ({
      id: r.id,
      folio: r.folio,
      customer: r.cliente?.nombre ?? "Sin nombre",
      phone: r.cliente?.telefono ?? "",
      device: `${r.equipoMarca || ""} ${r.equipoModelo || ""}`.trim() || "Equipo",
      tipo_equipo: r.tipoEquipo || "Equipo",
      status: toOrderStatus(r.estado),
      date: r.fechaPromesaEntrega ? toMxDate(r.fechaPromesaEntrega) : toMxDate(r.createdAt),
      problem: r.estado === "Esperando Refaccion" && r.esperaRefaccionEta
        ? `Pendiente hasta ${toMxDate(r.esperaRefaccionEta)}`
        : r.falla || "Entrega prometida",
      price: r.costoEstimado == null ? "Pendiente" : `$${Number(r.costoEstimado).toLocaleString("es-MX")}`,
      technician: r.tecnico || "Sin asignar",
    }))

    const firstSteps: DashboardFirstSteps = {
      settingsReady: Boolean(cfg?.nombreComercial?.trim() && cfg?.telefono?.trim() && cfg?.timezone && cfg.timezone !== "UTC"),
      cashReady: Boolean(cfg?.fondoCajaInicial != null || cajaAbierta),
      inventoryReady: productCount > 0,
      repairReady: total > 0,
      clientOrVisitReady: clientCount > 0 || visitCount > 0,
      communicationReady: Boolean(cfg?.whatsapp?.trim() || cfg?.printSettings),
    }

    return { stats, orders: orderRows, agenda: agendaRows, firstSteps, cashSummary }
  } catch (error) {
    console.error("[dashboard] failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return {
      stats: { ...EMPTY_STATS },
      orders: [],
      agenda: [],
      cashSummary: { ...EMPTY_CASH_SUMMARY },
      firstSteps: {
        settingsReady: false,
        cashReady: false,
        inventoryReady: false,
        repairReady: false,
        clientOrVisitReady: false,
        communicationReady: false,
      },
    }
  }
}
