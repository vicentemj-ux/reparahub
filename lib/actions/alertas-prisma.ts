"use server"

/**
 * Motor de "Reportes y Alertas" (Configuracion > Reportes y Alertas).
 *
 * Punto de entrada: `runDailyAlertsCheck()`. Esta funcion es idempotente:
 * corre una sola vez por dia por tenant, respetando la zona horaria del
 * taller (no en UTC). Se invoca desde `app/dashboard/layout.tsx` cada
 * vez que el usuario entra al dashboard; la primera visita del dia
 * dispara los emails y las visitas siguientes son no-ops.
 *
 * Disparadores soportados:
 *  - `alertasStockBajo`   -> sendAlertaStockBajoEmail
 *  - `alertaUrgentes`     -> sendAlertaEstancadasEmail
 *  - `reportesCierreCaja` -> sendReporteDiarioEmail (resumen ejecutivo)
 *
 * Los emails solo se envian si:
 *  1) El tenant es PRO o esta en trial activo (ver `getReportesAlertasCapability`).
 *  2) El toggle correspondiente esta `true` en ConfiguracionTaller.
 *  3) Hay destinatario valido (`resolveTallerEmailRecipient`).
 *
 * Cada envio se registra en `AlertaEnviada` para auditoria y soporte.
 *
 * Para escalar a un cron real (Vercel Cron, Supabase pg_cron, etc.),
 * basta con llamar `runDailyAlertsCheck({ force: true })` desde el cron
 * para un lote de tenants.
 */

import { getPrismaClient } from "@/lib/prisma"
import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { resolveTallerEmailRecipient } from "@/lib/email/recipients"
import {
  sendAlertaEstancadasEmail,
  sendAlertaStockBajoEmail,
  sendReporteDiarioEmail,
} from "@/lib/email/send"
import type {
  AlertaEstancadasItem,
  AlertaStockBajoItem,
  ReporteDiarioResumen,
} from "@/lib/email/types"
import { REPAIR_URGENCY_DAYS, REPAIR_URGENCY_MS } from "@/lib/constants/repair-urgency"
import { isSameLocalDay } from "@/lib/utils/date-day"

const ESTADOS_ACTIVOS_REPARACION = ["Recibido", "Diagnostico", "En Reparacion", "Listo"]

export interface RunDailyAlertsCheckOptions {
  /** Forzar la ejecucion aunque ya haya corrido hoy. Solo para crons. */
  force?: boolean
  /** Tenant especifico (uso interno). Si se omite usa la sesion actual. */
  tallerId?: string
}

export interface RunDailyAlertsCheckResult {
  ran: boolean
  reason?: "no-session" | "no-capability" | "already-ran-today" | "no-config" | "no-recipient"
  enviados: { tipo: string; count: number; destinatario: string }[]
  errores: { tipo: string; error: string }[]
}

/**
 * Determina si el tenant es PRO o esta en trial activo. Si no, no se
 * ejecutan alertas (los toggles quedan como UI settings inertes).
 */
async function tenantHasReportesCapability(tenantId: string): Promise<boolean> {
  const tenant = await getPrismaClient().tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, trialEndsAt: true },
  })
  if (!tenant) return false
  if (tenant.plan === "PRO") return true
  if (tenant.trialEndsAt && tenant.trialEndsAt.getTime() >= Date.now()) return true
  return false
}

/**
 * Claim atomico: actualiza `lastDailyAlertsAt = NOW()` solo si:
 *  - es null, o
 *  - no es hoy en la zona horaria del tenant.
 * Devuelve `true` si gano el claim (debe ejecutar), `false` si ya
 * corrio hoy o si otro caller gano primero (control de concurrencia
 * optimista via `updateMany` + filtro sobre el valor previo esperado).
 */
async function tryClaimDailyRun(configId: string, timezone: string, now: Date, force: boolean): Promise<boolean> {
  if (force) return true
  const prisma = getPrismaClient()

  const row = await prisma.configuracionTaller.findUnique({
    where: { id: configId },
    select: { lastDailyAlertsAt: true },
  })
  if (!row) return false

  // Si ya corrio hoy (en tz del tenant), no-op.
  if (row.lastDailyAlertsAt && isSameLocalDay(row.lastDailyAlertsAt, now, timezone)) {
    return false
  }

  // Concurrencia optimista: el `where` exige que el valor siga siendo
  // el que leimos. Si otro caller ya lo actualizo, count sera 0.
  const result = await prisma.configuracionTaller.updateMany({
    where: row.lastDailyAlertsAt
      ? { id: configId, lastDailyAlertsAt: row.lastDailyAlertsAt }
      : { id: configId, lastDailyAlertsAt: null },
    data: { lastDailyAlertsAt: now },
  })
  return result.count > 0
}

async function logAlertaEnviada(input: {
  configId: string
  tipo: string
  destinatario: string
  resumen: string | null
  messageId: string | null
  estado: "ok" | "error"
  detalleError: string | null
}) {
  try {
    await getPrismaClient().alertaEnviada.create({
      data: {
        configId: input.configId,
        tipo: input.tipo,
        destinatario: input.destinatario,
        resumen: input.resumen,
        resendMessageIds: input.messageId,
        estado: input.estado,
        detalleError: input.detalleError,
      },
    })
  } catch (e) {
    console.error("[alertas] No se pudo registrar en bitacora:", e)
  }
}

async function checkLowStock(tenantId: string): Promise<AlertaStockBajoItem[]> {
  const prisma = getPrismaClient()
  // `stockMinimo > 0` evita falsos positivos en productos sin minimo
  // definido; el dueno puede ajustar el minimo desde Inventario.
  const rows = await prisma.producto.findMany({
    where: {
      tenantId,
      stockMinimo: { gt: 0 },
      stockActual: { lte: 0 },
    },
    select: {
      id: true,
      nombre: true,
      sku: true,
      stockActual: true,
      stockMinimo: true,
      categoria: true,
    },
    orderBy: [{ stockActual: "asc" }, { nombre: "asc" }],
    take: 50,
  })
  return rows.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    sku: p.sku,
    stockActual: p.stockActual,
    stockMinimo: p.stockMinimo,
    categoria: p.categoria,
  }))
}

async function checkStalledRepairs(tenantId: string): Promise<AlertaEstancadasItem[]> {
  const prisma = getPrismaClient()
  const limiteMs = Date.now() - REPAIR_URGENCY_MS
  const rows = await prisma.reparacion.findMany({
    where: {
      tenantId,
      estado: { in: ESTADOS_ACTIVOS_REPARACION },
      updatedAt: { lt: new Date(limiteMs) },
    },
    select: {
      id: true,
      folio: true,
      tipoEquipo: true,
      equipoMarca: true,
      equipoModelo: true,
      estado: true,
      updatedAt: true,
      cliente: { select: { nombre: true } },
    },
    orderBy: { updatedAt: "asc" },
    take: 50,
  })
  const ahora = Date.now()
  return rows.map((r) => ({
    id: r.id,
    folio: r.folio,
    tipoEquipo: r.tipoEquipo,
    marca: r.equipoMarca,
    modelo: r.equipoModelo,
    estado: r.estado,
    clienteNombre: r.cliente?.nombre ?? null,
    diasSinMovimiento: Math.max(0, Math.floor((ahora - r.updatedAt.getTime()) / (24 * 60 * 60 * 1000))),
  }))
}

async function buildDailyResumen(tenantId: string): Promise<ReporteDiarioResumen> {
  const prisma = getPrismaClient()
  const [config, ventasHoy, reparacionesActivas, productosStockBajo, cajaAbierta] = await Promise.all([
    prisma.configuracionTaller.findUnique({
      where: { tenantId },
      select: { moneda: true },
    }),
    prisma.venta.aggregate({
      where: {
        tenantId,
        estado: "activa",
        createdAt: { gte: startOfTodayUtc() },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.reparacion.count({
      where: {
        tenantId,
        estado: { in: ESTADOS_ACTIVOS_REPARACION },
      },
    }),
    prisma.producto.count({
      where: {
        tenantId,
        stockMinimo: { gt: 0 },
        stockActual: { lte: 0 },
      },
    }),
    prisma.caja.findFirst({
      where: { tenantId, estado: "abierta" },
      select: {
        id: true,
        numeroCorte: true,
        montoInicial: true,
        totalEfectivo: true,
        totalTarjeta: true,
        totalTransferencia: true,
      },
    }),
  ])

  const urgentes = await prisma.reparacion.count({
    where: {
      tenantId,
      estado: { in: ESTADOS_ACTIVOS_REPARACION },
      updatedAt: { lt: new Date(Date.now() - REPAIR_URGENCY_MS) },
    },
  })

  // Saldo esperado de la caja abierta: montoInicial + efectivo - gastos
  // en efectivo (los gastos via MovimientoCaja con tipo gasto/gasto_reparacion).
  let cajaSaldoEsperado: number | null = null
  if (cajaAbierta) {
    const gastosEfectivo = await prisma.movimientoCaja.aggregate({
      where: {
        cajaId: cajaAbierta.id,
        tipo: { in: ["gasto", "gasto_reparacion"] },
      },
      _sum: { monto: true },
    })
    cajaSaldoEsperado =
      Number(cajaAbierta.montoInicial) +
      Number(cajaAbierta.totalEfectivo) -
      Math.abs(Number(gastosEfectivo._sum.monto ?? 0))
  }

  return {
    ventasTotal: Number(ventasHoy._sum.total ?? 0),
    ventasCantidad: ventasHoy._count._all,
    reparacionesActivas,
    reparacionesUrgentes: urgentes,
    productosStockBajo,
    cajaAbierta: Boolean(cajaAbierta),
    cajaNumero: cajaAbierta?.numeroCorte ?? null,
    cajaSaldoEsperado,
    moneda: (config?.moneda ?? "MXN").toUpperCase(),
  }
}

function startOfTodayUtc(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function runDailyAlertsCheck(
  options: RunDailyAlertsCheckOptions = {},
): Promise<RunDailyAlertsCheckResult> {
  const result: RunDailyAlertsCheckResult = {
    ran: false,
    enviados: [],
    errores: [],
  }

  let tallerId: string
  try {
    tallerId = options.tallerId ?? (await getTenantIdOrThrow())
  } catch {
    return { ...result, ran: false, reason: "no-session" }
  }

  if (!(await tenantHasReportesCapability(tallerId))) {
    return { ...result, ran: false, reason: "no-capability" }
  }

  const prisma = getPrismaClient()
  const config = await prisma.configuracionTaller.findUnique({
    where: { tenantId: tallerId },
    select: {
      id: true,
      timezone: true,
      moneda: true,
      nombreComercial: true,
      alertasStockBajo: true,
      alertaUrgentes: true,
      reportesCierreCaja: true,
    },
  })
  if (!config) {
    return { ...result, ran: false, reason: "no-config" }
  }

  const now = new Date()
  const timezone = config.timezone || "America/Mexico_City"

  // Claim atomico: si ya corrio hoy, no-op.
  const claimed = await tryClaimDailyRun(config.id, timezone, now, options.force ?? false)
  if (!claimed) {
    return { ...result, ran: false, reason: "already-ran-today" }
  }

  // Resolver destinatario una sola vez para todos los envios.
  const recipient = await resolveTallerEmailRecipient(tallerId)
  if (!recipient.email) {
    return { ...result, ran: false, reason: "no-recipient" }
  }
  const destinatario = recipient.email
  const tallerNombre = (config.nombreComercial ?? "").trim() || "Tu taller"

  // 1) Stock bajo
  if (config.alertasStockBajo !== false) {
    try {
      const items = await checkLowStock(tallerId)
      const res = await sendAlertaStockBajoEmail({
        to: destinatario,
        tallerNombre,
        items,
        moneda: (config.moneda ?? "MXN").toUpperCase(),
      })
      await logAlertaEnviada({
        configId: config.id,
        tipo: "stock_bajo",
        destinatario,
        resumen: JSON.stringify({ count: items.length, items: items.slice(0, 20) }),
        messageId: res.success ? res.messageId ?? null : null,
        estado: res.success ? "ok" : "error",
        detalleError: res.success ? null : res.error ?? "unknown",
      })
      if (res.success) {
        result.enviados.push({ tipo: "stock_bajo", count: items.length, destinatario })
      } else {
        result.errores.push({ tipo: "stock_bajo", error: res.error ?? "unknown" })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown"
      result.errores.push({ tipo: "stock_bajo", error: msg })
      await logAlertaEnviada({
        configId: config.id,
        tipo: "stock_bajo",
        destinatario,
        resumen: null,
        messageId: null,
        estado: "error",
        detalleError: msg,
      })
    }
  }

  // 2) Reparaciones estancadas
  if (config.alertaUrgentes !== false) {
    try {
      const items = await checkStalledRepairs(tallerId)
      const res = await sendAlertaEstancadasEmail({
        to: destinatario,
        tallerNombre,
        items,
        umbralDias: REPAIR_URGENCY_DAYS,
      })
      await logAlertaEnviada({
        configId: config.id,
        tipo: "estancadas",
        destinatario,
        resumen: JSON.stringify({ count: items.length, umbralDias: REPAIR_URGENCY_DAYS, items: items.slice(0, 20) }),
        messageId: res.success ? res.messageId ?? null : null,
        estado: res.success ? "ok" : "error",
        detalleError: res.success ? null : res.error ?? "unknown",
      })
      if (res.success) {
        result.enviados.push({ tipo: "estancadas", count: items.length, destinatario })
      } else {
        result.errores.push({ tipo: "estancadas", error: res.error ?? "unknown" })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown"
      result.errores.push({ tipo: "estancadas", error: msg })
      await logAlertaEnviada({
        configId: config.id,
        tipo: "estancadas",
        destinatario,
        resumen: null,
        messageId: null,
        estado: "error",
        detalleError: msg,
      })
    }
  }

  // 3) Reporte diario (resumen ejecutivo)
  if (config.reportesCierreCaja !== false) {
    try {
      const resumen = await buildDailyResumen(tallerId)
      const res = await sendReporteDiarioEmail({
        to: destinatario,
        tallerNombre,
        resumen,
      })
      await logAlertaEnviada({
        configId: config.id,
        tipo: "reporte_diario",
        destinatario,
        resumen: JSON.stringify(resumen),
        messageId: res.success ? res.messageId ?? null : null,
        estado: res.success ? "ok" : "error",
        detalleError: res.success ? null : res.error ?? "unknown",
      })
      if (res.success) {
        result.enviados.push({ tipo: "reporte_diario", count: 1, destinatario })
      } else {
        result.errores.push({ tipo: "reporte_diario", error: res.error ?? "unknown" })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown"
      result.errores.push({ tipo: "reporte_diario", error: msg })
      await logAlertaEnviada({
        configId: config.id,
        tipo: "reporte_diario",
        destinatario,
        resumen: null,
        messageId: null,
        estado: "error",
        detalleError: msg,
      })
    }
  }

  result.ran = true
  return result
}

/**
 * Devuelve un resumen del historial reciente de alertas enviadas. Usado
 * por la pestana "Reportes y Alertas" para mostrar al usuario "cuando
 * se envio la ultima" y darle confianza de que el motor esta vivo.
 */
export async function getAlertasRecientes(limit = 10): Promise<
  Array<{
    id: string
    tipo: string
    destinatario: string
    estado: string
    detalleError: string | null
    createdAt: string
  }>
> {
  try {
    const tenantId = await getTenantIdOrThrow()
    const config = await getPrismaClient().configuracionTaller.findUnique({
      where: { tenantId },
      select: { id: true },
    })
    if (!config) return []
    const rows = await getPrismaClient().alertaEnviada.findMany({
      where: { configId: config.id },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(1, limit), 50),
    })
    return rows.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      destinatario: r.destinatario,
      estado: r.estado,
      detalleError: r.detalleError,
      createdAt: r.createdAt.toISOString(),
    }))
  } catch (e) {
    console.error("[alertas] getAlertasRecientes:", e)
    return []
  }
}
