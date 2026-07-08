"use server"

import { getPrismaClient } from "@/lib/prisma"
import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getInventoryPublicUrl } from "@/lib/storage"
import { parseChecklistIngreso } from "@/lib/reparaciones/checklist-ingreso"
import type { ChecklistIngreso } from "@/lib/reparaciones/checklist-ingreso"

// ─── Payload types ─────────────────────────────────────────────────────────────

export interface PrintRepairTicketPayload {
  business: {
    name: string
    phone: string
    logoUrl: string | null
    terminosGarantia: string
    mensajeDespedida: string
  }
  repair: {
    id: string
    folio: string
    customerName: string
    customerPhone: string
    deviceModel: string | null
    deviceBrand: string | null
    tipoEquipo: string | null
    imei: string | null
    color: string | null
    reportedFault: string | null
    estimatedPrice: number | null
    deposit: number | null
    createdAt: string
    checklistIngreso: ChecklistIngreso | null
  }
  servicios: Array<{ nombre: string; precio: number; cantidad: number }>
  showHealthCheckFuncional: boolean
}

export interface PrintSaleTicketPayload {
  venta: {
    id: string
    folio: string | null
    total: number
    descuento: number
    metodoPago: string
    montoEfectivo: number
    montoTarjeta: number
    montoTransferencia: number
    referenciaPago: string | null
    clienteNombre: string | null
    clienteTelefono: string | null
    clienteId: string | null
    items: Array<{
      id: string
      descripcion: string
      cantidad: number
      precioUnitario: number
      productoId: string | null
      marca: string | null
      modelo: string | null
      imeiSerie: string | null
      color: string | null
      condicion: string | null
      procesador: string | null
      ram: string | null
      almacenamiento: string | null
    }>
    createdAt: string
    cajaId: string | null
  }
  business: {
    name: string
    phone: string
    logoUrl: string | null
    terminosGarantia: string
    mensajeDespedida: string
  }
}

export interface PrintWarrantyPayload {
  folio: string
  marca: string | null
  modelo: string | null
  numeroSerie: string | null
  falla: string | null
  costoTotal: number
  anticipo: number
  fechaEntrega: string
  nombreTaller: string
  logoUrl: string | null
  direccion: string | null
  telefono: string | null
  terminosGarantia: string
  piePagina: string | null
  tamanoPapel: string
  pais: string | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "")
}

function normalizePhone(phone: string | null | undefined): string {
  return onlyDigits(phone ?? "")
}

async function getTenantId(): Promise<string | null> {
  try { return await getTenantIdOrThrow() } catch { return null }
}

async function getTallerSettings(prisma: ReturnType<typeof getPrismaClient>, tenantId: string) {
  const cfg = await prisma.configuracionTaller.findUnique({
    where: { tenantId },
  })
  if (!cfg) {
    return {
      nombre_taller: "Mi Taller",
      telefono: "",
      logo_url: null,
      terminos_garantia: "Garantía de 30 días en reparaciones",
      mensaje_despedida: "",
      tamano_papel: "80mm",
      pais: null as string | null,
    }
  }
  return {
    nombre_taller: cfg.nombreComercial || "Mi Taller",
    telefono: cfg.telefono || "",
    logo_url: cfg.logoUrl || null,
    terminos_garantia: cfg.terminosGarantia || "Garantía de 30 días en reparaciones",
    mensaje_despedida: cfg.mensajeDespedida || "",
    tamano_papel: cfg.paperSize || "80mm",
    pais: (cfg.pais ?? null) as string | null,
  }
}

// ─── Repair ticket ─────────────────────────────────────────────────────────────

export async function getRepairTicketPrintData(
  folio: string,
): Promise<{ data: PrintRepairTicketPayload | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantId()
    if (!tenantId) return { data: null, error: "No autenticado" }

    const rep = await prisma.reparacion.findFirst({
      where: { folio, tenantId },
      include: {
        cliente: { select: { nombre: true, telefono: true } },
        serviciosReparacion: {
          select: { nombreSnapshot: true, precioSnapshot: true, cantidad: true },
        },
      },
    })

    if (!rep) return { data: null, error: "Reparacion no encontrada." }

    const cfg = await getTallerSettings(prisma, tenantId)

    const flujo = await prisma.ajustesTaller.findUnique({
      where: { tenantId },
      select: { healthCheckRequired: true },
    })

    const servicios = (rep.serviciosReparacion ?? []).map((s) => ({
      nombre: s.nombreSnapshot,
      precio: Number(s.precioSnapshot),
      cantidad: s.cantidad,
    }))

    return {
      data: {
        business: {
          name: cfg.nombre_taller,
          phone: cfg.telefono,
          logoUrl: cfg.logo_url,
          terminosGarantia: cfg.terminos_garantia,
          mensajeDespedida: cfg.mensaje_despedida,
        },
        repair: {
          id: rep.id,
          folio: rep.folio,
          customerName: rep.cliente?.nombre ?? "Sin nombre",
          customerPhone: normalizePhone(rep.cliente?.telefono),
          deviceModel: rep.equipoModelo ?? null,
          deviceBrand: rep.equipoMarca ?? null,
          tipoEquipo: rep.tipoEquipo ?? null,
          imei: rep.numeroSerie ?? null,
          color: rep.color ?? null,
          reportedFault: rep.falla ?? null,
          estimatedPrice: rep.costoEstimado == null ? null : Number(rep.costoEstimado),
          deposit: rep.anticipo == null ? null : Number(rep.anticipo),
          createdAt: rep.createdAt.toISOString(),
          checklistIngreso: parseChecklistIngreso(rep.checklistIngreso),
        },
        servicios,
        showHealthCheckFuncional:
          flujo?.healthCheckRequired === true && rep.checklistIngreso != null,
      },
      error: null,
    }
  } catch (e) {
    console.error("[print-formatter] getRepairTicketPrintData:", e)
    return { data: null, error: "No se pudo cargar el ticket." }
  }
}

// ─── Sale ticket ───────────────────────────────────────────────────────────────

export async function getSaleTicketPrintData(
  ventaId: string,
): Promise<{ data: PrintSaleTicketPayload | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantId()
    if (!tenantId) return { data: null, error: "No autenticado" }

    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        detalles: {
          select: {
            id: true,
            descripcion: true,
            cantidad: true,
            precioUnitario: true,
            productoId: true,
            marca: true,
            modelo: true,
            imeiSerie: true,
            color: true,
            condicion: true,
            procesador: true,
            ram: true,
            almacenamiento: true,
          },
        },
      },
    })

    if (!venta) return { data: null, error: "Venta no encontrada." }

    const cfg = await getTallerSettings(prisma, tenantId)

    return {
      data: {
        venta: {
          id: venta.id,
          folio: venta.folio,
          total: Number(venta.total),
          descuento: Number(venta.descuento),
          metodoPago: venta.metodoPago,
          montoEfectivo: Number(venta.montoEfectivo),
          montoTarjeta: Number(venta.montoTarjeta),
          montoTransferencia: Number(venta.montoTransferencia),
          referenciaPago: venta.referenciaPago,
          clienteNombre: venta.clienteNombre,
          clienteTelefono: venta.clienteTelefono,
          clienteId: venta.clienteId,
          items: venta.detalles.map((i) => ({
            id: i.id,
            descripcion: i.descripcion,
            cantidad: i.cantidad,
            precioUnitario: Number(i.precioUnitario),
            productoId: i.productoId,
            marca: i.marca,
            modelo: i.modelo,
            imeiSerie: i.imeiSerie,
            color: i.color,
            condicion: i.condicion,
            procesador: i.procesador,
            ram: i.ram,
            almacenamiento: i.almacenamiento,
          })),
          createdAt: venta.createdAt.toISOString(),
          cajaId: venta.cajaId,
        },
        business: {
          name: cfg.nombre_taller,
          phone: cfg.telefono,
          logoUrl: cfg.logo_url,
          terminosGarantia: cfg.terminos_garantia,
          mensajeDespedida: cfg.mensaje_despedida,
        },
      },
      error: null,
    }
  } catch (e) {
    console.error("[print-formatter] getSaleTicketPrintData:", e)
    return { data: null, error: "No se pudo cargar el ticket de venta." }
  }
}

// ─── Warranty ticket ───────────────────────────────────────────────────────────

export async function getWarrantyPrintData(
  ticketId: string,
  last4: string,
): Promise<{ data: PrintWarrantyPayload | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()

    const rep = await prisma.reparacion.findUnique({
      where: { id: ticketId },
      include: { cliente: { select: { telefono: true } } },
    })

    if (!rep || !rep.cliente) return { data: null, error: "No encontrado" }

    const last4Db = normalizePhone(rep.cliente.telefono).slice(-4)
    if (last4Db !== last4.trim()) return { data: null, error: "No encontrado" }

    const estado = rep.estado?.trim().toUpperCase() ?? ""
    if (!estado.includes("ENTREG")) return { data: null, error: "No encontrado" }

    const tenantId = rep.tenantId
    const cfg = await getTallerSettings(prisma, tenantId)

    const costoTotal = rep.costoTotal != null ? Number(rep.costoTotal) : rep.costoEstimado != null ? Number(rep.costoEstimado) : 0
    const anticipo = rep.anticipo != null ? Number(rep.anticipo) : 0
    const fechaEntrega = rep.updatedAt.toISOString()

    return {
      data: {
        folio: rep.folio,
        marca: rep.equipoMarca ?? null,
        modelo: rep.equipoModelo ?? null,
        numeroSerie: rep.numeroSerie ?? null,
        falla: rep.falla ?? null,
        costoTotal,
        anticipo,
        fechaEntrega,
        nombreTaller: cfg.nombre_taller,
        logoUrl: cfg.logo_url,
        direccion: null,
        telefono: cfg.telefono || null,
        terminosGarantia: cfg.terminos_garantia,
        piePagina: null,
        tamanoPapel: cfg.tamano_papel,
        pais: cfg.pais ?? null,
      },
      error: null,
    }
  } catch (e) {
    console.error("[print-formatter] getWarrantyPrintData:", e)
    return { data: null, error: "No se pudo cargar la garantia." }
  }
}
