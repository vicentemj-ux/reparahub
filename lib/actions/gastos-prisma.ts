"use server"

import { revalidatePath } from "next/cache"
import { getCurrentActorDisplayName } from "@/lib/auth/actor-display-name"
import { getCurrentTallerId } from "@/lib/auth/get-current-taller"
import { logRepairExpenseDeletionHistory, logRepairExpenseHistory } from "@/lib/actions/repair-history-prisma"
import { getPrismaClient } from "@/lib/prisma"
import { shouldAplicarGastoACaja } from "@/lib/gastos/gasto-caja"

export interface ReparacionGasto {
  id: string
  source?: "gasto" | "refaccion"
  reparacion_id: string
  concepto: string
  monto: number
  tipo: "mano_obra" | "refaccion" | "maquila" | "insumo" | "otro"
  producto_id: string | null
  cantidad?: number
  metodo_pago?: string | null
  caja_id?: string | null
  mostrar_cliente: boolean
  creado_por_nombre?: string
  created_at: string
}

export interface GastoOperativo {
  id: string
  concepto: string
  categoria: string
  monto: number
  metodo_pago: string
  fecha: string
  notas: string | null
  caja_id: string | null
  created_at: string
}

export interface AddGastoTicketInput {
  reparacion_id: string
  concepto: string
  monto: number
  tipo: "mano_obra" | "refaccion" | "maquila" | "insumo" | "otro"
  producto_id?: string | null
  metodo_pago?: string
  mostrar_cliente?: boolean
  aplicar_a_caja?: boolean
}

export interface AddGastoOperativoInput {
  concepto: string
  categoria: string
  monto: number
  metodo_pago: string
  fecha: string
  notas?: string | null
  aplicar_a_caja?: boolean
}

async function getCajaAbiertaId(tallerId: string): Promise<string | null> {
  const prisma = getPrismaClient()
  const caja = await prisma.caja.findFirst({
    where: { tenantId: tallerId, estado: "abierta" },
    orderBy: { fechaApertura: "desc" },
    select: { id: true },
  })
  return caja?.id ?? null
}

function mapGastoReparacion(r: {
  id: string
  source?: "gasto" | "refaccion"
  reparacionId: string
  concepto: string
  monto: { toNumber: () => number } | number
  tipo: string
  productoId: string | null
  cantidad?: number
  metodoPago?: string | null
  cajaId?: string | null
  mostrarCliente: boolean
  creadoPorNombre: string | null
  createdAt: Date
}): ReparacionGasto {
  return {
    id: r.id,
    source: r.source ?? "gasto",
    reparacion_id: r.reparacionId,
    concepto: r.concepto,
    monto: typeof r.monto === "number" ? r.monto : r.monto.toNumber(),
    tipo: r.tipo as ReparacionGasto["tipo"],
    producto_id: r.productoId,
    cantidad: r.cantidad ?? 1,
    metodo_pago: r.metodoPago ?? null,
    caja_id: r.cajaId ?? null,
    mostrar_cliente: r.mostrarCliente,
    creado_por_nombre: r.creadoPorNombre ?? undefined,
    created_at: r.createdAt.toISOString(),
  }
}

function mapGastoOperativo(r: {
  id: string
  concepto: string
  categoria: string
  monto: { toNumber: () => number } | number
  metodoPago: string
  fecha: Date
  notas: string | null
  cajaId: string | null
  createdAt: Date
}): GastoOperativo {
  return {
    id: r.id,
    concepto: r.concepto,
    categoria: r.categoria,
    monto: typeof r.monto === "number" ? r.monto : r.monto.toNumber(),
    metodo_pago: r.metodoPago,
    fecha: r.fecha.toISOString().split("T")[0],
    notas: r.notas,
    caja_id: r.cajaId ?? null,
    created_at: r.createdAt.toISOString(),
  }
}

export async function getGastosTicket(reparacion_id: string): Promise<{ data: ReparacionGasto[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const [rows, refacciones] = await Promise.all([
      prisma.gastoReparacion.findMany({
        where: { tenantId: tallerId, reparacionId: reparacion_id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.reparacionRefaccion.findMany({
        where: {
          tenantId: tallerId,
          reparacionId: reparacion_id,
          estado: { notIn: ["cancelled", "returned"] },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])
    const movimientoRows = rows.length
      ? await prisma.movimientoCaja.findMany({
          where: {
            tenantId: tallerId,
            referenciaId: { in: rows.map((row) => row.id) },
            tipo: "gasto_reparacion",
          },
          select: {
            referenciaId: true,
            metodoPago: true,
            cajaId: true,
          },
        })
      : []

    const movimientosByReferencia = new Map(
      movimientoRows.map((movimiento) => [
        movimiento.referenciaId,
        { metodoPago: movimiento.metodoPago, cajaId: movimiento.cajaId },
      ]),
    )

    const mappedGastos = rows.map((row) =>
      mapGastoReparacion({
        ...row,
        source: "gasto",
        metodoPago: movimientosByReferencia.get(row.id)?.metodoPago ?? null,
        cajaId: movimientosByReferencia.get(row.id)?.cajaId ?? null,
      }),
    )

    const mappedRefacciones = refacciones.map((row) =>
      mapGastoReparacion({
        id: row.id,
        source: "refaccion",
        reparacionId: row.reparacionId,
        concepto: row.conceptoSnapshot,
        monto: Number(row.costoUnitario) * row.cantidad,
        tipo: "refaccion",
        productoId: row.productoId,
        cantidad: row.cantidad,
        metodoPago: null,
        cajaId: null,
        mostrarCliente: row.mostrarCliente,
        creadoPorNombre: row.creadoPorNombre,
        createdAt: row.createdAt,
      }),
    )

    return {
      data: [...mappedGastos, ...mappedRefacciones].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
      error: null,
    }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Error al cargar gastos" }
  }
}

export async function addGastoTicket(input: AddGastoTicketInput): Promise<{ data: ReparacionGasto | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()

    const concepto = input.concepto.trim()
    if (!concepto) return { data: null, error: "El concepto es obligatorio." }

    const monto = Number(input.monto)
    if (!Number.isFinite(monto) || monto <= 0) {
      return { data: null, error: "El monto debe ser mayor a 0." }
    }

    const metodoPago = (input.metodo_pago ?? "efectivo").trim().toLowerCase()
    const actor = await getCurrentActorDisplayName()

    const reparacion = await prisma.reparacion.findUnique({
      where: { id: input.reparacion_id, tenantId: tallerId },
      select: { folio: true },
    })
    const folio = reparacion?.folio ?? "?"

    const productoId = input.producto_id?.trim() || null
    const producto = productoId
      ? await prisma.producto.findFirst({
        where: { id: productoId, tenantId: tallerId },
        select: { id: true, nombre: true, sku: true, costo: true, precioVenta: true, stockActual: true },
      })
      : null

    if (productoId && !producto) {
      return { data: null, error: "El producto seleccionado no existe o ya no pertenece a este taller." }
    }
    if (producto && producto.stockActual < 1) {
      return { data: null, error: `No hay stock suficiente para ${producto.nombre}.` }
    }

    const aplicarACaja = producto ? false : input.aplicar_a_caja ?? true
    const cajaAbiertaId = await getCajaAbiertaId(tallerId)
    const cajaId = shouldAplicarGastoACaja(metodoPago, cajaAbiertaId, aplicarACaja) ? cajaAbiertaId : null

    if (aplicarACaja && !cajaId) {
      return { data: null, error: "No hay caja abierta. Desactiva el impacto en caja o abre una caja primero." }
    }

    const gasto = await prisma.$transaction(async (tx) => {
      if (producto) {
        const costoProducto = Number(producto.costo)
        const costoUnitario = costoProducto > 0 ? costoProducto : monto
        const stockAntes = producto.stockActual
        const stockDespues = stockAntes - 1

        await tx.producto.update({
          where: { id: producto.id, tenantId: tallerId },
          data: { stockActual: { decrement: 1 } },
        })

        const refaccion = await tx.reparacionRefaccion.create({
          data: {
            tenantId: tallerId,
            reparacionId: input.reparacion_id,
            productoId: producto.id,
            conceptoSnapshot: concepto || producto.nombre,
            skuSnapshot: producto.sku,
            cantidad: 1,
            costoUnitario,
            precioVentaSnapshot: producto.precioVenta,
            precioCliente: 0,
            priceMode: "included_in_service",
            estado: "consumed",
            mostrarCliente: input.mostrar_cliente ?? false,
            creadoPorNombre: actor || "Sistema",
            consumedAt: new Date(),
          },
        })

        await tx.inventarioMovimiento.create({
          data: {
            tenantId: tallerId,
            productoId: producto.id,
            tipo: "reparacion_consumo",
            referenciaTipo: "reparacion_refaccion",
            referenciaId: refaccion.id,
            cantidad: -1,
            stockAntes,
            stockDespues,
            costoUnitario,
            nota: `Consumo en folio #${folio}`,
            actorNombre: actor || "Sistema",
          },
        })

        return {
          id: refaccion.id,
          source: "refaccion" as const,
          reparacionId: refaccion.reparacionId,
          concepto: refaccion.conceptoSnapshot,
          monto: costoUnitario,
          tipo: "refaccion",
          productoId: refaccion.productoId,
          cantidad: refaccion.cantidad,
          metodoPago: null,
          cajaId: null,
          mostrarCliente: refaccion.mostrarCliente,
          creadoPorNombre: refaccion.creadoPorNombre,
          createdAt: refaccion.createdAt,
        }
      }

      const g = await tx.gastoReparacion.create({
        data: {
          tenantId: tallerId,
          reparacionId: input.reparacion_id,
          concepto,
          monto,
          tipo: input.tipo,
          productoId,
          mostrarCliente: input.mostrar_cliente ?? false,
          creadoPorNombre: actor || "Sistema",
        },
      })

      const tipoLabel = {
        mano_obra: "Mano de Obra",
        refaccion: "Refaccion",
        maquila: "Maquila/Externo",
        insumo: "Insumos",
        otro: "Otros",
      }[input.tipo]

      if (cajaId) {
        await tx.movimientoCaja.create({
          data: {
            tenantId: tallerId,
            cajaId,
            tipo: "gasto_reparacion",
            referenciaId: g.id,
            descripcion: `Inversion Folio #${folio} - ${tipoLabel}: ${concepto}`,
            monto: -Math.abs(monto),
            metodoPago,
            fecha: new Date(),
            vendedorNombre: actor || "Sistema",
          },
        })
      }

      return {
        ...g,
        source: "gasto" as const,
        metodoPago: cajaId ? metodoPago : null,
        cajaId,
      }
    }, { timeout: 10000 })

    try {
      await logRepairExpenseHistory({
        reparacionId: input.reparacion_id,
        tenantId: tallerId,
        concepto,
        monto: typeof gasto.monto === "number" ? gasto.monto : Number(gasto.monto),
        tipo: gasto.tipo as AddGastoTicketInput["tipo"],
        metodoPago: producto ? "inventario" : metodoPago,
      })
    } catch (historyError) {
      console.error("[gastos-prisma] logRepairExpenseHistory failed (non-fatal):", historyError)
    }

    // NOTA: NO decrementar caja.totalEfectivo aqui.
    // caja.totalEfectivo representa el TOTAL BRUTO de ventas POS en efectivo.
    // Los gastos ya se restan en el CORTE de caja desde los movimientos_caja
    // (tipo gasto / gasto_reparacion) — decrementarlos tambien aca producia
    // doble resta y mostraba "VENTAS EFECTIVO" en negativo.

    revalidatePath(`/dashboard/reparaciones/${input.reparacion_id}`)
    revalidatePath("/dashboard/ventas")
    if (producto) revalidatePath("/dashboard/inventario")

    return {
      data: mapGastoReparacion(gasto),
      error: null,
    }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Error al registrar gasto" }
  }
}

export async function deleteGastoTicket(input: { id: string; motivo: string }): Promise<{ error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const motivo = input.motivo.trim()

    if (motivo.length < 4) {
      return { error: "Captura un motivo mas claro para cancelar este movimiento." }
    }

    const refaccion = await prisma.reparacionRefaccion.findFirst({
      where: {
        id: input.id,
        tenantId: tallerId,
        estado: { notIn: ["cancelled", "returned"] },
      },
      select: {
        id: true,
        reparacionId: true,
        productoId: true,
        conceptoSnapshot: true,
        cantidad: true,
        costoUnitario: true,
        createdAt: true,
      },
    })

    if (refaccion) {
      await prisma.$transaction(async (tx) => {
        const producto = await tx.producto.findFirst({
          where: { id: refaccion.productoId, tenantId: tallerId },
          select: { id: true, stockActual: true },
        })
        if (!producto) throw new Error("El producto ligado ya no existe.")

        const stockAntes = producto.stockActual
        const stockDespues = stockAntes + refaccion.cantidad

        await tx.reparacionRefaccion.update({
          where: { id: refaccion.id },
          data: {
            estado: "cancelled",
            motivoCancelacion: motivo,
            returnedAt: new Date(),
          },
        })

        await tx.producto.update({
          where: { id: producto.id, tenantId: tallerId },
          data: { stockActual: { increment: refaccion.cantidad } },
        })

        await tx.inventarioMovimiento.create({
          data: {
            tenantId: tallerId,
            productoId: producto.id,
            tipo: "reparacion_devolucion",
            referenciaTipo: "reparacion_refaccion",
            referenciaId: refaccion.id,
            cantidad: refaccion.cantidad,
            stockAntes,
            stockDespues,
            costoUnitario: refaccion.costoUnitario,
            nota: motivo,
            actorNombre: await getCurrentActorDisplayName() || "Sistema",
          },
        })
      }, { timeout: 10000 })

      try {
        await logRepairExpenseDeletionHistory({
          reparacionId: refaccion.reparacionId,
          tenantId: tallerId,
          concepto: refaccion.conceptoSnapshot,
          monto: Number(refaccion.costoUnitario) * refaccion.cantidad,
          tipo: "refaccion",
          metodoPago: "inventario",
          motivo,
        })
      } catch (historyError) {
        console.error("[gastos-prisma] logRepairExpenseDeletionHistory failed (non-fatal):", historyError)
      }

      revalidatePath(`/dashboard/reparaciones/${refaccion.reparacionId}`)
      revalidatePath("/dashboard/ventas")
      revalidatePath("/dashboard/inventario")
      return { error: null }
    }

    const gasto = await prisma.gastoReparacion.findFirst({
      where: { id: input.id, tenantId: tallerId },
      select: {
        reparacionId: true,
        productoId: true,
        concepto: true,
        monto: true,
        tipo: true,
        createdAt: true,
      },
    })
    if (!gasto) return { error: "Gasto no encontrado" }

    const movimientoCaja = await prisma.movimientoCaja.findFirst({
      where: { tenantId: tallerId, referenciaId: input.id, tipo: "gasto_reparacion" },
      select: { metodoPago: true },
    })

    await prisma.$transaction(async (tx) => {
      await tx.gastoReparacion.delete({ where: { id: input.id } })
      if (gasto.productoId) {
        await tx.producto.update({
          where: { id: gasto.productoId, tenantId: tallerId },
          data: { stockActual: { increment: 1 } },
        })
      }
      await tx.movimientoCaja.deleteMany({
        where: { tenantId: tallerId, referenciaId: input.id, tipo: { in: ["gasto_reparacion", "gasto"] } },
      })
    }, { timeout: 10000 })

    try {
      await logRepairExpenseDeletionHistory({
        reparacionId: gasto.reparacionId,
        tenantId: tallerId,
        concepto: gasto.concepto,
        monto: Number(gasto.monto),
        tipo: gasto.tipo as AddGastoTicketInput["tipo"],
        metodoPago: movimientoCaja?.metodoPago ?? null,
        motivo,
      })
    } catch (historyError) {
      console.error("[gastos-prisma] logRepairExpenseDeletionHistory failed (non-fatal):", historyError)
    }

    revalidatePath(`/dashboard/reparaciones/${gasto.reparacionId}`)
    revalidatePath("/dashboard/ventas")
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error al eliminar gasto" }
  }
}

export async function searchProductosParaGasto(query: string): Promise<{ data: { id: string; nombre: string; sku: string | null; costo: number; precio_venta: number; stock_actual: number }[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const rows = await prisma.producto.findMany({
      where: {
        tenantId: tallerId,
        nombre: { contains: query, mode: "insensitive" },
      },
      select: { id: true, nombre: true, sku: true, costo: true, precioVenta: true, stockActual: true },
      orderBy: { nombre: "asc" },
      take: 8,
    })
    return {
      data: rows.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        sku: r.sku,
        costo: Number(r.costo),
        precio_venta: Number(r.precioVenta),
        stock_actual: r.stockActual,
      })),
      error: null,
    }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Error buscando productos" }
  }
}

export async function getGastosOperativos(opts?: { desde?: string; hasta?: string }): Promise<{ data: GastoOperativo[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()

    const where: Record<string, unknown> = { tenantId: tallerId }
    if (opts?.desde || opts?.hasta) {
      const fechaFilter: Record<string, Date> = {}
      if (opts?.desde) fechaFilter.gte = new Date(opts.desde)
      if (opts?.hasta) fechaFilter.lte = new Date(opts.hasta + "T23:59:59.999Z")
      where.fecha = fechaFilter
    }

    const rows = await prisma.gastoOperativo.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 200,
    })
    return { data: rows.map(mapGastoOperativo), error: null }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Error al cargar gastos operativos" }
  }
}

export async function addGastoOperativo(input: AddGastoOperativoInput): Promise<{ data: GastoOperativo | null; error: string | null; cajaAplicada?: boolean }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const actor = await getCurrentActorDisplayName()

    // Decidir si el gasto se aplica a la caja:
    //   - metodo_pago === "efectivo" Y hay caja abierta -> se crea movimientoCaja tipo "gasto"
    //   - en cualquier otro caso -> NO se crea movimientoCaja (gasto queda fuera del Corte del dia)
    // El GastoOperativo SIEMPRE se crea, porque utilidad-prisma lo cuenta sin filtrar por cajaId.
    const cajaAbiertaId = await getCajaAbiertaId(tallerId)
    const cajaId = shouldAplicarGastoACaja(input.metodo_pago, cajaAbiertaId, input.aplicar_a_caja ?? true)
      ? cajaAbiertaId
      : null

    // Wrap gasto + movimientoCaja in a single transaction for atomicity.
    const result = await prisma.$transaction(async (tx) => {
      const g = await tx.gastoOperativo.create({
        data: {
          tenantId: tallerId,
          concepto: input.concepto.trim(),
          categoria: input.categoria,
          monto: input.monto,
          metodoPago: input.metodo_pago,
          fecha: new Date(input.fecha),
          notas: input.notas?.trim() || null,
        },
      })

      let applied = Boolean(cajaId)
      if (cajaId) {
        await tx.movimientoCaja.create({
          data: {
            tenantId: tallerId,
            cajaId,
            tipo: "gasto",
            descripcion: input.concepto.trim(),
            monto: -Math.abs(input.monto),
            metodoPago: input.metodo_pago,
            fecha: new Date(input.fecha),
            vendedorNombre: actor || "Sistema",
          },
        })
      }

      return { gasto: g, cajaAplicada: applied }
    }, { timeout: 10000 })

    // NOTA: NO decrementar caja.totalEfectivo aqui. Ver addGastoReparacion.

    return { data: mapGastoOperativo(result.gasto), error: null, cajaAplicada: result.cajaAplicada }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Error al registrar gasto operativo", cajaAplicada: false }
  }
}

/**
 * Devuelve el id de la caja abierta del taller (o null). Usado por la UI
 * para mostrar el callout contextual "se aplicara a caja" vs "no se aplicara".
 * Tenant-scoped via getCurrentTallerId().
 */
export async function getCajaAbiertaStatus(): Promise<{ cajaId: string | null; error: string | null }> {
  try {
    const tallerId = await getCurrentTallerId()
    const cajaId = await getCajaAbiertaId(tallerId)
    return { cajaId, error: null }
  } catch (e) {
    return { cajaId: null, error: e instanceof Error ? e.message : "Error al consultar caja" }
  }
}

export async function deleteGastoOperativo(id: string): Promise<{ error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()

    const gasto = await prisma.gastoOperativo.findFirst({
      where: { id, tenantId: tallerId },
      select: { id: true },
    })
    if (!gasto) return { error: "Gasto no encontrado" }

    // Wrap in transaction for atomicity.
    await prisma.$transaction(async (tx) => {
      await tx.gastoOperativo.delete({ where: { id } })
      await tx.movimientoCaja.deleteMany({
        where: { tenantId: tallerId, referenciaId: id, tipo: "gasto" },
      })
    }, { timeout: 10000 })

    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error al eliminar gasto operativo" }
  }
}
