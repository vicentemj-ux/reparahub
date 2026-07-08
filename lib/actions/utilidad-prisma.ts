"use server"

import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"

export interface TransaccionItem {
  id: string
  fecha: string
  descripcion: string
  monto: number
  tipo: "venta" | "reparacion" | "gasto"
}

export interface UtilidadData {
  ingresosPos: number
  costoStockPos: number
  utilidadPos: number
  ingresosRep: number
  inversionRep: number
  utilidadRep: number
  gastos: TransaccionItem[]
  totalGastos: number
  ingresosItems: TransaccionItem[]
  egresosItems: TransaccionItem[]
  ventasBrutas: number
  costoDeVenta: number
  margenBruto: number
  utilidadNeta: number
  contactosOperacion: {
    total: number
    llamadas: number
    cotizaciones: number
    pendientes: number
  }
}

export async function getUtilidadData(
  desde: string,
  hasta: string,
): Promise<{ data: UtilidadData | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const desdeTs = new Date(`${desde}T00:00:00`)
    const hastaTs = new Date(`${hasta}T23:59:59.999`)

    const [ventas, reparaciones, gastosOperativos, visitas] = await Promise.all([
      prisma.venta.findMany({
        where: { tenantId, createdAt: { gte: desdeTs, lte: hastaTs }, estado: { not: "anulado" } },
        select: { id: true, folio: true, total: true, createdAt: true, detalles: { select: { costoUnitario: true, cantidad: true } } },
      }),
      prisma.reparacion.findMany({
        where: { tenantId, estado: "Entregado", createdAt: { gte: desdeTs, lte: hastaTs } },
        select: { id: true, folio: true, costoTotal: true, createdAt: true },
      }),
      prisma.gastoOperativo.findMany({
        where: { tenantId, fecha: { gte: desdeTs, lte: hastaTs } },
        select: { id: true, concepto: true, monto: true, fecha: true },
        orderBy: { fecha: "desc" },
        take: 200,
      }),
      prisma.visita.findMany({
        where: { tenantId, fechaLlegada: { gte: desdeTs, lte: hastaTs } },
        select: { motivo: true, eventoTipo: true, estado: true },
      }),
    ])

    const [gastosReparacion, refaccionesReparacion] = reparaciones.length > 0
      ? await Promise.all([
          prisma.gastoReparacion.findMany({
            where: { tenantId, reparacionId: { in: reparaciones.map((r) => r.id) } },
            select: { monto: true },
          }),
          prisma.reparacionRefaccion.findMany({
            where: {
              tenantId,
              reparacionId: { in: reparaciones.map((r) => r.id) },
              estado: { notIn: ["cancelled", "returned"] },
            },
            select: { costoUnitario: true, cantidad: true },
          }),
        ])
      : [[], []]

    const ingresosPos = ventas.reduce((s, v) => s + Number(v.total), 0)
    const costoStockPos = ventas.reduce((s, v) => {
      return s + v.detalles.reduce((ds, d) => ds + Number(d.costoUnitario ?? 0) * Number(d.cantidad ?? 1), 0)
    }, 0)
    const utilidadPos = ingresosPos - costoStockPos

    const ingresosRep = reparaciones.reduce((s, r) => s + Number(r.costoTotal ?? 0), 0)
    const inversionRep =
      gastosReparacion.reduce((s, g) => s + Number(g.monto), 0) +
      refaccionesReparacion.reduce((s, r) => s + Number(r.costoUnitario) * Number(r.cantidad ?? 1), 0)
    const utilidadRep = ingresosRep - inversionRep

    const totalGastos = gastosOperativos.reduce((s, g) => s + Number(g.monto), 0)

    const ingresosItems: TransaccionItem[] = [
      ...ventas.map((v) => ({
        id: v.id,
        fecha: v.createdAt.toISOString().slice(0, 10),
        descripcion: `Venta Directa #${v.folio || v.id}`,
        monto: Number(v.total),
        tipo: "venta" as const,
      })),
      ...reparaciones.map((r) => ({
        id: r.id,
        fecha: r.createdAt.toISOString().slice(0, 10),
        descripcion: `Reparacion #${r.folio || r.id}`,
        monto: Number(r.costoTotal ?? 0),
        tipo: "reparacion" as const,
      })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha))

    const egresosItems: TransaccionItem[] = gastosOperativos.map((g) => ({
      id: g.id,
      fecha: g.fecha.toISOString().slice(0, 10),
      descripcion: g.concepto,
      monto: Number(g.monto),
      tipo: "gasto" as const,
    }))

    const ventasBrutas = ingresosPos + ingresosRep
    const costoDeVenta = costoStockPos + inversionRep
    const margenBruto = ventasBrutas - costoDeVenta
    const utilidadNeta = margenBruto - totalGastos
    const contactosOperacion = {
      total: visitas.length,
      llamadas: visitas.filter((v) => v.eventoTipo === "telefono" || v.motivo === "llamada").length,
      cotizaciones: visitas.filter((v) => v.motivo === "cotizacion").length,
      pendientes: visitas.filter((v) => v.estado === "pendiente").length,
    }

    return {
      data: {
        ingresosPos,
        costoStockPos,
        utilidadPos,
        ingresosRep,
        inversionRep,
        utilidadRep,
        gastos: egresosItems,
        totalGastos,
        ingresosItems,
        egresosItems,
        ventasBrutas,
        costoDeVenta,
        margenBruto,
        utilidadNeta,
        contactosOperacion,
      },
      error: null,
    }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Error al cargar datos de utilidad" }
  }
}
