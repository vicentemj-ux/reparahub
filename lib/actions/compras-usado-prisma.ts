"use server"

import { getCurrentActorDisplayName } from "@/lib/auth/actor-display-name"
import { getCurrentTallerId } from "@/lib/auth/get-current-taller"
import { getPrismaClient } from "@/lib/prisma"

export interface CompraUsadaRow {
  id: string
  folio: string
  equipo_tipo: string
  marca: string
  modelo: string
  imei_serie: string | null
  capacidad: string | null
  condicion: string | null
  color: string | null
  costo_compra: number
  monto: number
  vendedor: string
  documento: string
  imei: string | null
  fecha: string
  proveedor_nombre: string | null
  fecha_compra: string
  notas: string | null
  created_at: string
}

export interface CompraUsadoInput {
  vendedor: string
  documento: string
  telefono?: string | null
  marca: string
  modelo: string
  serial?: string | null
  imei?: string | null
  capacidad?: string | null
  condicion?: string | null
  color?: string | null
  monto: number
  observaciones?: string | null
}

function extractTagValue(notas: string | null, tag: string): string {
  if (!notas) return "-"
  const match = notas.match(new RegExp(`${tag}:\\s*([^|]+)`))
  return match?.[1]?.trim() || "-"
}

export async function getComprasUsadas(): Promise<{ data: CompraUsadaRow[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const rows = await prisma.compraUsada.findMany({
      where: { tenantId: tallerId },
      orderBy: { createdAt: "desc" },
      take: 300,
    })

    return {
      data: rows.map((r) => ({
        id: r.id,
        folio: r.folio,
        equipo_tipo: "dispositivo",
        marca: r.marca,
        modelo: r.modelo,
        imei_serie: r.imei ?? r.serial,
        capacidad: r.capacidad,
        condicion: r.condicion,
        color: r.color,
        costo_compra: Number(r.monto),
        monto: Number(r.monto),
        vendedor: r.vendedor,
        documento: r.documento,
        imei: r.imei,
        fecha: r.fecha.toISOString(),
        proveedor_nombre: r.vendedor,
        fecha_compra: r.fecha.toISOString(),
        notas: r.observaciones,
        created_at: r.createdAt.toISOString(),
      })),
      error: null,
    }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Error al cargar compras usadas" }
  }
}

export async function registrarCompraUsado(input: CompraUsadoInput): Promise<{ success: boolean; error?: string; folio?: string }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getCurrentTallerId()
    const actor = await getCurrentActorDisplayName()

    const count = await prisma.compraUsada.count({
      where: { tenantId: tallerId },
    })
    const folio = `CU-${String(count + 1).padStart(5, "0")}`

    const telefono = input.telefono?.trim() || null
    const observaciones = input.observaciones?.trim() || null
    const notasBase = [
      input.documento?.trim() ? `Documento: ${input.documento.trim()}` : null,
      input.telefono?.trim() ? `Telefono: ${input.telefono.trim()}` : null,
      observaciones ? `Observaciones: ${observaciones}` : null,
    ]
      .filter((line): line is string => Boolean(line))
      .join(" | ")

    await prisma.compraUsada.create({
      data: {
        tenantId: tallerId,
        folio,
        vendedor: input.vendedor.trim(),
        documento: input.documento.trim(),
        telefono,
        marca: input.marca,
        modelo: input.modelo,
        serial: input.serial?.trim() || null,
        imei: input.imei?.trim() || null,
        capacidad: input.capacidad || null,
        condicion: input.condicion || null,
        color: input.color || null,
        monto: input.monto,
        observaciones: notasBase || null,
        actorNombre: actor,
      },
    })

    const cajaAbierta = await prisma.caja.findFirst({
      where: { tenantId: tallerId, estado: "abierta" },
      orderBy: { fechaApertura: "desc" },
    })

    if (cajaAbierta) {
      await prisma.movimientoCaja.create({
        data: {
          tenantId: tallerId,
          cajaId: cajaAbierta.id,
          tipo: "compra_usado",
          referenciaId: folio,
          descripcion: `Compra usado ${input.marca} ${input.modelo}`,
          monto: -Math.abs(input.monto),
          metodoPago: "efectivo",
          vendedorNombre: actor,
        },
      })
    }

    return { success: true, folio }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error registrando compra" }
  }
}
