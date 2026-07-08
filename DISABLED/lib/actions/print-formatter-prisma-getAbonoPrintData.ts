// ─── RETIRADO — ver /DISABLED/README.md ────────────────────────────────────────
// Fragmento extraido de lib/actions/print-formatter-prisma.ts (lineas 353-458)
// porque getAbonoPrintData + PrintAbonoPayload solo servian a la ruta
// /print-abono/[id] que no tiene callers en el SaaS. La impresion de abonos
// ocurre in-modal via useThermalTicketPrint en components/dashboard/abono-modal.tsx.
// Para reintroducir: restaurar el bloque en print-formatter-prisma.ts y
// re-vincular desde app/print-abono/[id]/page.tsx (tambien en /DISABLED/).
// ─────────────────────────────────────────────────────────────────────────────

// ─── Abono comprobante ──────────────────────────────────────────────────────────

export interface PrintAbonoPayload {
  business: {
    name: string
    phone: string
    logoUrl: string | null
    mensajeDespedida: string
  }
  abono: {
    folio: string
    customerName: string
    customerPhone: string
    deviceName: string
    metodoPago: string
    monto: number
    totalPagado: number
    presupuesto: number
    saldoRestante: number
    date: string
    /** Tipo de movimiento que origino el comprobante. */
    tipo: "anticipo_reparacion" | "liquidacion_reparacion"
  }
}

export async function getAbonoPrintData(
  movimientoId: string,
): Promise<{ data: PrintAbonoPayload | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantId()
    if (!tenantId) return { data: null, error: "No autenticado" }

    const movimiento = await prisma.movimientoCaja.findFirst({
      where: {
        id: movimientoId,
        tenantId,
        tipo: { in: ["anticipo_reparacion", "liquidacion_reparacion"] },
      },
    })

    if (!movimiento) return { data: null, error: "Movimiento no encontrado." }

    const repairId = movimiento.referenciaId
    if (!repairId) return { data: null, error: "Referencia de reparacion no encontrada." }

    const rep = await prisma.reparacion.findFirst({
      where: { id: repairId, tenantId },
      select: {
        folio: true,
        anticipo: true,
        costoEstimado: true,
        equipoMarca: true,
        equipoModelo: true,
        cliente: { select: { nombre: true, telefono: true } },
      },
    })

    if (!rep) return { data: null, error: "Reparacion no encontrada." }

    const cfg = await getTallerSettings(prisma, tenantId)

    const presupuesto = Number(rep.costoEstimado ?? 0)
    const totalPagado = Number(rep.anticipo ?? 0)
    const saldoRestante = Math.max(0, presupuesto - totalPagado)

    const d = new Date(movimiento.fecha)

    return {
      data: {
        business: {
          name: cfg.nombre_taller,
          phone: cfg.telefono,
          logoUrl: cfg.logo_url,
          mensajeDespedida: cfg.mensaje_despedida,
        },
        abono: {
          folio: rep.folio,
          customerName: rep.cliente?.nombre ?? "Sin nombre",
          customerPhone: normalizePhone(rep.cliente?.telefono),
          deviceName: `${rep.equipoMarca ?? ""} ${rep.equipoModelo ?? ""}`.trim() || "N/A",
          metodoPago: movimiento.metodoPago ?? "efectivo",
          monto: Number(movimiento.monto),
          totalPagado,
          presupuesto,
          saldoRestante,
          tipo:
            movimiento.tipo === "liquidacion_reparacion"
              ? "liquidacion_reparacion"
              : "anticipo_reparacion",
          date: d.toLocaleString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      },
      error: null,
    }
  } catch (e) {
    console.error("[print-formatter] getAbonoPrintData:", e)
    return { data: null, error: "No se pudo cargar el comprobante de abono." }
  }
}
