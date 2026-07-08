"use server"

import { getPrismaClient } from "@/lib/prisma"
import { uploadFileToS3 } from "@/lib/r2"

export async function saveFirmaSignatureBase64(
  token: string,
  imageBase64: string,
): Promise<{ success: boolean; error?: string }> {
  if (!token || !imageBase64) {
    return { success: false, error: "Datos incompletos." }
  }

  try {
    const prisma = getPrismaClient()

    const row = await prisma.firmaDigitalToken.findUnique({
      where: { token },
      select: { id: true, tenantId: true, reparacionId: true, expiresAt: true, usedAt: true },
    })

    if (!row) {
      return { success: false, error: "Enlace invalido o expirado." }
    }

    if (row.usedAt) {
      return { success: false, error: "Esta firma ya fue registrada." }
    }

    if (new Date(row.expiresAt).getTime() < Date.now()) {
      return { success: false, error: "El enlace de firma expiro." }
    }

    const tallerId = row.tenantId
    const repairId = row.reparacionId

    const raw = imageBase64.includes(",") ? imageBase64.split(",")[1] ?? "" : imageBase64
    let buffer: Buffer
    try {
      buffer = Buffer.from(raw, "base64")
    } catch {
      return { success: false, error: "Imagen no valida." }
    }

    if (buffer.length < 50 || buffer.length > 5 * 1024 * 1024) {
      return { success: false, error: "El archivo de firma no es valido." }
    }

    const key = `firmas/${tallerId}/${repairId}/firma-${Date.now()}.png`

    await uploadFileToS3({ key, body: buffer, contentType: "image/png" })

    await prisma.reparacion.update({
      where: { id: repairId },
      data: { firmaIngresoPath: key },
    })

    await prisma.firmaDigitalToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    })

    return { success: true }
  } catch (err) {
    console.error("[saveFirmaSignatureBase64]", err)
    return { success: false, error: "No se pudo guardar la firma." }
  }
}
