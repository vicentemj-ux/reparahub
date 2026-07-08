"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { getCurrentActorDisplayName } from "@/lib/auth/actor-display-name"
import { getCurrentTallerId } from "@/lib/auth/get-current-taller"
import { getPrismaClient } from "@/lib/prisma"
import { shouldAplicarGastoACaja } from "@/lib/gastos/gasto-caja"

export type LiquidacionTipo = "mano_obra" | "maquila"
export type LiquidacionMetodoPago = "efectivo" | "tarjeta" | "transferencia"
export type ColaboradorTipo = "tecnico" | "maquila"

export interface ColaboradorOperativoOption {
  id: string
  nombre: string
  tipo: ColaboradorTipo
  tarifa_default: number | null
  activo: boolean
  source: "usuario" | "colaborador"
}

export interface LiquidacionPreviewItem {
  repairId: string
  folio: string
  cliente: string
  equipo: string
  estado: string
  tecnico: string
  fechaTerminado: string
  presupuesto: number
  gastosTipoTotal: number
  yaLiquidado: boolean
  liquidadoDetalle: string | null
  montoSugerido: number
}

export interface LiquidacionResumen {
  id: string
  colaborador_nombre: string
  tipo: LiquidacionTipo
  metodo_pago: string
  monto_total: number
  periodo_desde: string
  periodo_hasta: string
  items: number
  created_at: string
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function moneyNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return 0
  return typeof value === "number" ? value : Number(value)
}

function parsePeriod(desde: string, hasta: string) {
  const desdeDate = new Date(`${desde}T00:00:00`)
  const hastaDate = new Date(`${hasta}T23:59:59.999`)
  if (Number.isNaN(desdeDate.getTime()) || Number.isNaN(hastaDate.getTime())) {
    throw new Error("Selecciona un periodo valido.")
  }
  if (desdeDate > hastaDate) {
    throw new Error("La fecha inicial no puede ser mayor a la final.")
  }
  return { desdeDate, hastaDate }
}

async function getCajaAbiertaId(tallerId: string) {
  const prisma = getPrismaClient()
  const caja = await prisma.caja.findFirst({
    where: { tenantId: tallerId, estado: "abierta" },
    orderBy: { fechaApertura: "desc" },
    select: { id: true },
  })
  return caja?.id ?? null
}

export async function getColaboradoresLiquidacion(): Promise<{
  data: ColaboradorOperativoOption[]
  error: string | null
}> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    const [users, colaboradores] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId, activo: true },
        select: { id: true, nombre: true, teamRole: true, role: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.colaboradorOperativo.findMany({
        where: { tenantId },
        orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      }),
    ])

    const userOptions: ColaboradorOperativoOption[] = users.map((u) => ({
      id: `user:${u.id}`,
      nombre: u.nombre || "Sin nombre",
      tipo: u.teamRole === "REPARADOR" || u.teamRole === "TECNICO" || u.role === "OWNER" ? "tecnico" : "tecnico",
      tarifa_default: null,
      activo: true,
      source: "usuario",
    }))

    const collaboratorOptions: ColaboradorOperativoOption[] = colaboradores.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      tipo: c.tipo === "maquila" ? "maquila" : "tecnico",
      tarifa_default: c.tarifaDefault == null ? null : Number(c.tarifaDefault),
      activo: c.activo,
      source: "colaborador",
    }))

    return { data: [...userOptions, ...collaboratorOptions], error: null }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "No se pudieron cargar colaboradores." }
  }
}

export async function createColaboradorOperativo(input: {
  nombre: string
  tipo: ColaboradorTipo
  tarifa_default?: number | null
  notas?: string | null
}): Promise<{ data: ColaboradorOperativoOption | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    const nombre = input.nombre.trim()
    const tipo = input.tipo === "maquila" ? "maquila" : "tecnico"
    const tarifa = input.tarifa_default == null || Number.isNaN(Number(input.tarifa_default))
      ? null
      : new Prisma.Decimal(Number(input.tarifa_default))

    if (nombre.length < 2) return { data: null, error: "Captura el nombre del colaborador." }

    const row = await prisma.colaboradorOperativo.create({
      data: {
        tenantId,
        nombre,
        tipo,
        tarifaDefault: tarifa,
        notas: input.notas?.trim() || null,
      },
    })

    revalidatePath("/dashboard/reparaciones/liquidacion")
    return {
      data: {
        id: row.id,
        nombre: row.nombre,
        tipo: row.tipo === "maquila" ? "maquila" : "tecnico",
        tarifa_default: row.tarifaDefault == null ? null : Number(row.tarifaDefault),
        activo: row.activo,
        source: "colaborador",
      },
      error: null,
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { data: null, error: "Ese colaborador ya existe con ese tipo." }
    }
    return { data: null, error: error instanceof Error ? error.message : "No se pudo crear el colaborador." }
  }
}

export async function getLiquidacionPreview(input: {
  colaboradorNombre: string
  tipo: LiquidacionTipo
  desde: string
  hasta: string
  montoDefault: number
}): Promise<{ data: LiquidacionPreviewItem[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    const colaboradorNombre = input.colaboradorNombre.trim()
    const colaboradorKey = normalizeKey(colaboradorNombre)
    const tipo = input.tipo === "maquila" ? "maquila" : "mano_obra"
    const montoDefault = Number(input.montoDefault)
    const { desdeDate, hastaDate } = parsePeriod(input.desde, input.hasta)

    if (!colaboradorNombre) return { data: [], error: "Selecciona un colaborador." }
    if (!Number.isFinite(montoDefault) || montoDefault <= 0) {
      return { data: [], error: "Captura un monto a pagar por folio." }
    }

    const historial = await prisma.historialReparacion.findMany({
      where: {
        tenantId,
        tipo: "estado",
        valorNuevo: { in: ["Listo", "Entregado"] },
        createdAt: { gte: desdeDate, lte: hastaDate },
      },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        valorNuevo: true,
        reparacion: {
          select: {
            id: true,
            folio: true,
            estado: true,
            tecnico: true,
            tipoEquipo: true,
            equipoMarca: true,
            equipoModelo: true,
            costoEstimado: true,
            cliente: { select: { nombre: true } },
            gastosReparacion: {
              where: { tipo },
              select: { monto: true },
            },
          },
        },
      },
    })

    const byRepair = new Map<string, (typeof historial)[number]>()
    for (const row of historial) {
      const rep = row.reparacion
      if (!rep) continue
      if (normalizeKey(rep.tecnico || "") !== colaboradorKey) continue
      if (!byRepair.has(rep.id)) byRepair.set(rep.id, row)
    }

    const repairIds = Array.from(byRepair.keys())
    const existing = repairIds.length
      ? await prisma.liquidacionTrabajoItem.findMany({
          where: {
            tenantId,
            reparacionId: { in: repairIds },
            colaboradorKey,
            tipo,
            dedupeKey: "principal",
            estado: "confirmada",
          },
          select: {
            reparacionId: true,
            monto: true,
            createdAt: true,
            liquidacion: { select: { id: true, createdAt: true } },
          },
        })
      : []
    const existingByRepair = new Map(existing.map((item) => [item.reparacionId, item]))

    const data = Array.from(byRepair.values()).map((row) => {
      const rep = row.reparacion
      const existingItem = existingByRepair.get(rep.id)
      const device = [rep.tipoEquipo, rep.equipoMarca, rep.equipoModelo].filter(Boolean).join(" ") || "Equipo"
      const gastosTipoTotal = rep.gastosReparacion.reduce((sum, gasto) => sum + Number(gasto.monto), 0)
      return {
        repairId: rep.id,
        folio: rep.folio,
        cliente: rep.cliente.nombre,
        equipo: device,
        estado: rep.estado,
        tecnico: rep.tecnico || "Sin asignar",
        fechaTerminado: row.createdAt.toISOString(),
        presupuesto: moneyNumber(rep.costoEstimado),
        gastosTipoTotal,
        yaLiquidado: Boolean(existingItem),
        liquidadoDetalle: existingItem
          ? `$${Number(existingItem.monto).toFixed(2)} el ${existingItem.createdAt.toLocaleDateString("es-MX")}`
          : null,
        montoSugerido: montoDefault,
      }
    })

    return { data, error: null }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "No se pudo calcular la liquidacion." }
  }
}

export async function confirmarLiquidacionTrabajo(input: {
  colaboradorId?: string | null
  colaboradorNombre: string
  tipo: LiquidacionTipo
  metodoPago: LiquidacionMetodoPago
  desde: string
  hasta: string
  items: Array<{
    repairId: string
    folio: string
    concepto: string
    monto: number
    fechaTerminado: string
    permitirDuplicado?: boolean
    motivoExcepcion?: string | null
  }>
}): Promise<{ data: { liquidacionId: string; total: number; items: number } | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    const actor = await getCurrentActorDisplayName()
    const colaboradorNombre = input.colaboradorNombre.trim()
    const colaboradorKey = normalizeKey(colaboradorNombre)
    const tipo = input.tipo === "maquila" ? "maquila" : "mano_obra"
    const metodoPago = input.metodoPago
    const { desdeDate, hastaDate } = parsePeriod(input.desde, input.hasta)
    const validItems = input.items
      .map((item) => ({ ...item, monto: Number(item.monto), concepto: item.concepto.trim() }))
      .filter((item) => item.repairId && item.concepto && Number.isFinite(item.monto) && item.monto > 0)

    if (!colaboradorNombre) return { data: null, error: "Selecciona un colaborador." }
    if (!["efectivo", "tarjeta", "transferencia"].includes(metodoPago)) {
      return { data: null, error: "Metodo de pago no valido." }
    }
    if (validItems.length === 0) return { data: null, error: "Selecciona al menos un folio a liquidar." }

    const invalidException = validItems.find((item) => item.permitirDuplicado && !item.motivoExcepcion?.trim())
    if (invalidException) {
      return { data: null, error: "Captura motivo para las excepciones duplicadas." }
    }

    const cajaAbiertaId = await getCajaAbiertaId(tenantId)
    const cajaId = shouldAplicarGastoACaja(metodoPago, cajaAbiertaId, true) ? cajaAbiertaId : null
    if (!cajaId) {
      return { data: null, error: "No hay caja abierta. Abre caja para registrar la salida en corte." }
    }

    const repairIds = validItems.map((item) => item.repairId)
    const repairs = await prisma.reparacion.findMany({
      where: { tenantId, id: { in: repairIds } },
      select: { id: true, folio: true, tecnico: true },
    })
    const repairsById = new Map(repairs.map((repair) => [repair.id, repair]))
    const notOwned = validItems.find((item) => !repairsById.has(item.repairId))
    if (notOwned) return { data: null, error: "Uno de los folios ya no existe o no pertenece al taller." }

    const existing = await prisma.liquidacionTrabajoItem.findMany({
      where: {
        tenantId,
        reparacionId: { in: repairIds },
        colaboradorKey,
        tipo,
        dedupeKey: "principal",
        estado: "confirmada",
      },
      select: { reparacionId: true },
    })
    const existingSet = new Set(existing.map((item) => item.reparacionId))
    const duplicated = validItems.find((item) => existingSet.has(item.repairId) && !item.permitirDuplicado)
    if (duplicated) {
      return { data: null, error: `El folio #${duplicated.folio} ya fue liquidado. Marca excepcion para pagarlo otra vez.` }
    }

    const total = validItems.reduce((sum, item) => sum + item.monto, 0)
    const collaboratorId = input.colaboradorId && !input.colaboradorId.startsWith("user:") ? input.colaboradorId : null

    const result = await prisma.$transaction(async (tx) => {
      const liquidacion = await tx.liquidacionTrabajo.create({
        data: {
          tenantId,
          colaboradorId: collaboratorId,
          colaboradorNombre,
          colaboradorKey,
          tipo,
          metodoPago,
          periodoDesde: desdeDate,
          periodoHasta: hastaDate,
          montoTotal: total,
          creadoPorNombre: actor || "Sistema",
        },
      })

      for (const item of validItems) {
        const repair = repairsById.get(item.repairId)!
        const dedupeKey = item.permitirDuplicado ? `excepcion:${randomUUID()}` : "principal"
        const fechaTerminado = new Date(item.fechaTerminado)
        const tipoLabel = tipo === "maquila" ? "Maquila" : "Mano de obra"
        const concepto = `Liquidacion ${tipoLabel}: ${colaboradorNombre} - ${item.concepto}`

        const liquidacionItem = await tx.liquidacionTrabajoItem.create({
          data: {
            tenantId,
            liquidacionId: liquidacion.id,
            reparacionId: item.repairId,
            colaboradorKey,
            colaboradorNombre,
            tipo,
            dedupeKey,
            motivoExcepcion: item.permitirDuplicado ? item.motivoExcepcion?.trim() || null : null,
            concepto: item.concepto,
            monto: item.monto,
            fechaTerminado: Number.isNaN(fechaTerminado.getTime()) ? new Date() : fechaTerminado,
          },
        })

        const gasto = await tx.gastoReparacion.create({
          data: {
            tenantId,
            reparacionId: item.repairId,
            liquidacionItemId: liquidacionItem.id,
            concepto,
            monto: item.monto,
            tipo,
            mostrarCliente: false,
            creadoPorNombre: actor || "Sistema",
          },
        })

        await tx.movimientoCaja.create({
          data: {
            tenantId,
            cajaId,
            tipo: "gasto_reparacion",
            referenciaId: gasto.id,
            descripcion: `Liquidacion ${tipoLabel} Folio #${repair.folio} - ${colaboradorNombre}`,
            monto: -Math.abs(item.monto),
            metodoPago,
            fecha: new Date(),
            vendedorNombre: actor || "Sistema",
          },
        })

        await tx.historialReparacion.create({
          data: {
            tenantId,
            reparacionId: item.repairId,
            tipo: "gasto",
            descripcion: `Liquidacion ${tipoLabel}: ${colaboradorNombre} - $${item.monto.toFixed(2)} (${metodoPago})`,
            valorAnterior: null,
            valorNuevo: String(item.monto),
            actorNombre: actor || "Sistema",
            nota: item.permitirDuplicado ? item.motivoExcepcion?.trim() || null : null,
          },
        })
      }

      return liquidacion
    }, { timeout: 15000 })

    revalidatePath("/dashboard/reparaciones/liquidacion")
    revalidatePath("/dashboard/reparaciones")
    revalidatePath("/dashboard/ventas")
    for (const item of validItems) revalidatePath(`/dashboard/reparaciones/${item.repairId}`)

    return { data: { liquidacionId: result.id, total, items: validItems.length }, error: null }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { data: null, error: "Uno de los folios ya fue liquidado. Actualiza la vista previa." }
    }
    return { data: null, error: error instanceof Error ? error.message : "No se pudo confirmar la liquidacion." }
  }
}

export async function getLiquidacionesRecientes(): Promise<{ data: LiquidacionResumen[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    const rows = await prisma.liquidacionTrabajo.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { _count: { select: { items: true } } },
    })
    return {
      data: rows.map((row) => ({
        id: row.id,
        colaborador_nombre: row.colaboradorNombre,
        tipo: row.tipo === "maquila" ? "maquila" : "mano_obra",
        metodo_pago: row.metodoPago,
        monto_total: Number(row.montoTotal),
        periodo_desde: row.periodoDesde.toISOString(),
        periodo_hasta: row.periodoHasta.toISOString(),
        items: row._count.items,
        created_at: row.createdAt.toISOString(),
      })),
      error: null,
    }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "No se pudieron cargar liquidaciones." }
  }
}
