"use server"

import { revalidatePath } from "next/cache"
import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"

function sanitizeImportField(value: unknown): string {
  if (value === null || value === undefined) return ""
  let str = String(value).trim()
  if (!str) return ""
  str = str.replace(/^[+=\-@\t\r]+/, "")
  return str
}

async function getTenantIdForImport(): Promise<string | null> {
  try { return await getTenantIdOrThrow() } catch { return null }
}

export async function uploadToStaging(data: any[], batchId: string) {
  const tenantId = await getTenantIdForImport()
  if (!tenantId) return { success: false, error: "No autenticado" }

  try {
    const prisma = getPrismaClient()
    const chunkSize = 100
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize)

      await prisma.stagingImportReparacion.createMany({
        data: chunk.map((row) => ({
          importBatchId: batchId,
          tenantId,
          folio: sanitizeImportField(row.folio) || "S/F",
          clienteNombre: sanitizeImportField(row.cliente_nombre) || "Cliente Importado",
          clienteTelefono: sanitizeImportField(row.cliente_telefono) || "",
          marca: sanitizeImportField(row.marca),
          modelo: sanitizeImportField(row.modelo),
          falla: sanitizeImportField(row.falla),
          costoTotal: parseFloat(row.costo_total) || 0,
          fechaRecepcionOriginal: row.fecha_recepcion_original ? new Date(row.fecha_recepcion_original) : null,
          fechaEntregaOriginal: row.fecha_entrega_original ? new Date(row.fecha_entrega_original) : null,
          estatusOriginal: sanitizeImportField(row.estatus_original) || "Entregado",
          tecnicoOriginal: sanitizeImportField(row.tecnico_original),
        })),
      })
    }

    revalidatePath("/dashboard/configuracion/importacion")
    return { success: true, count: data.length, batchId }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function processStagingToFinal(batchId: string) {
  const tenantId = await getTenantIdForImport()
  if (!tenantId) return { success: false, error: "No autenticado" }

  try {
    const prisma = getPrismaClient()

    const stagingRecords = await prisma.stagingImportReparacion.findMany({
      where: { importBatchId: batchId, procesado: false, tenantId },
    })

    if (stagingRecords.length === 0) return { success: true, processed: 0 }

    let count = 0

    for (const record of stagingRecords) {
      let finalClienteId: string | null = null

      if (record.clienteTelefono) {
        const existingClient = await prisma.cliente.findFirst({
          where: { tenantId, telefono: record.clienteTelefono },
          select: { id: true },
        })
        if (existingClient) {
          finalClienteId = existingClient.id
        }
      }

      if (!finalClienteId) {
        const newClient = await prisma.cliente.create({
          data: {
            tenantId,
            nombre: record.clienteNombre,
            telefono: record.clienteTelefono || "",
          },
          select: { id: true },
        })
        finalClienteId = newClient.id
      }

      try {
        await prisma.reparacion.create({
          data: {
            tenantId,
            clienteId: finalClienteId,
            folio: record.folio,
            estado: record.estatusOriginal || "Entregado",
            falla: record.falla || "",
            notasInternas: `Importacion masiva (Lote: ${batchId})`,
          },
        })

        await prisma.stagingImportReparacion.update({
          where: { id: record.id },
          data: { procesado: true },
        })
        count++
      } catch (repairErr) {
        console.error("[processStagingToFinal] repair insert error:", repairErr)
      }
    }

    revalidatePath("/dashboard/reparaciones")
    revalidatePath("/dashboard/configuracion/importacion")
    return { success: true, processed: count }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function clearProcessedStaging(batchId: string) {
  const tenantId = await getTenantIdForImport()
  if (!tenantId) return { success: false, error: "No autenticado" }

  try {
    const prisma = getPrismaClient()
    await prisma.stagingImportReparacion.deleteMany({
      where: { tenantId, importBatchId: batchId, procesado: true },
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
