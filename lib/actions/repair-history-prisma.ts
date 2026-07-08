"use server"

import { getCurrentActorDisplayName } from "@/lib/auth/actor-display-name"
import { getPrismaClient } from "@/lib/prisma"

export type RepairHistoryTipo =
  | "creacion"
  | "estado"
  | "abono"
  | "presupuesto"
  | "tecnico"
  | "gasto"
  | "otro"

export async function logRepairHistory(input: {
  reparacionId: string
  tenantId: string
  tipo: RepairHistoryTipo
  descripcion: string
  valorAnterior?: string | null
  valorNuevo?: string | null
  nota?: string | null
}) {
  try {
    const prisma = getPrismaClient()
    const actorNombre = await getCurrentActorDisplayName()
    await prisma.historialReparacion.create({
      data: {
        tenantId: input.tenantId,
        reparacionId: input.reparacionId,
        tipo: input.tipo,
        descripcion: input.descripcion,
        valorAnterior: input.valorAnterior ?? null,
        valorNuevo: input.valorNuevo ?? null,
        actorNombre,
        nota: input.nota ?? null,
      },
    })
  } catch (err) {
    console.error("[repair-history-prisma] logRepairHistory failed (non-fatal):", err)
  }
}

export async function logRepairExpenseHistory(input: {
  reparacionId: string
  tenantId: string
  concepto: string
  monto: number
  tipo: "mano_obra" | "refaccion" | "maquila" | "insumo" | "otro"
  metodoPago: string
}) {
  const tipoLabel = {
    mano_obra: "Mano de obra",
    refaccion: "Refaccion",
    maquila: "Maquila / externo",
    insumo: "Insumo",
    otro: "Otro",
  }[input.tipo]

  const metodoLabel = {
    efectivo: "efectivo",
    tarjeta: "tarjeta",
    transferencia: "transferencia",
  }[input.metodoPago.trim().toLowerCase()] ?? input.metodoPago

  await logRepairHistory({
    reparacionId: input.reparacionId,
    tenantId: input.tenantId,
    tipo: "gasto",
    descripcion: `${tipoLabel}: ${input.concepto} - $${input.monto.toFixed(2)} (${metodoLabel})`,
  })
}

export async function logRepairExpenseDeletionHistory(input: {
  reparacionId: string
  tenantId: string
  concepto: string
  monto: number
  tipo: "mano_obra" | "refaccion" | "maquila" | "insumo" | "otro"
  metodoPago?: string | null
  motivo: string
}) {
  const tipoLabel = {
    mano_obra: "Mano de obra",
    refaccion: "Refaccion",
    maquila: "Maquila / externo",
    insumo: "Insumo",
    otro: "Otro",
  }[input.tipo]

  const metodoLabel = input.metodoPago
    ? ({
        efectivo: "efectivo",
        tarjeta: "tarjeta",
        transferencia: "transferencia",
      }[input.metodoPago.trim().toLowerCase()] ?? input.metodoPago)
    : null

  await logRepairHistory({
    reparacionId: input.reparacionId,
    tenantId: input.tenantId,
    tipo: "gasto",
    descripcion: `Movimiento eliminado: ${tipoLabel}: ${input.concepto} - $${input.monto.toFixed(2)}${metodoLabel ? ` (${metodoLabel})` : ""}`,
    valorAnterior: input.concepto,
    valorNuevo: "eliminado",
    nota: input.motivo,
  })
}
