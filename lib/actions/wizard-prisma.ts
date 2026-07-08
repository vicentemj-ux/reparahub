"use server"

import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"

export async function checkWizardNeeded(): Promise<boolean> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const cfg = await prisma.configuracionTaller.findUnique({
      where: { tenantId },
      select: { wizardCompletado: true },
    })
    return cfg?.wizardCompletado === false
  } catch {
    return false
  }
}

export async function getWizardSettings() {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const cfg = await prisma.configuracionTaller.findUnique({
      where: { tenantId },
      select: { nombreComercial: true, telefono: true, timezone: true, pais: true },
    })
    return {
      nombreTaller: cfg?.nombreComercial || "",
      telefono: cfg?.telefono || "",
      pais: cfg?.pais ?? "",
      zonaHoraria: cfg?.timezone || "America/Mexico_City",
    }
  } catch {
    return { nombreTaller: "", telefono: "", pais: "", zonaHoraria: "America/Mexico_City" }
  }
}

export async function completeWizard(data: {
  nombreTaller: string
  telefono: string
  pais: string
  zonaHoraria: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const nombre = data.nombreTaller.trim()
    if (!nombre || nombre.length < 2) {
      return { success: false, error: "El nombre del taller debe tener al menos 2 caracteres" }
    }
    const tel = data.telefono.trim()
    if (!tel) {
      return { success: false, error: "El telefono es obligatorio" }
    }
    const pais = (data.pais ?? "").trim()
    if (!pais) {
      return { success: false, error: "Selecciona tu pais para continuar" }
    }

    await prisma.configuracionTaller.upsert({
      where: { tenantId },
      create: {
        tenantId,
        nombreComercial: nombre,
        telefono: tel,
        pais,
        timezone: data.zonaHoraria,
        wizardCompletado: true,
      },
      update: {
        nombreComercial: nombre,
        telefono: tel,
        pais,
        timezone: data.zonaHoraria,
        wizardCompletado: true,
      },
    })

    return { success: true }
  } catch (e) {
    console.error("[wizard] completeWizard error:", e)
    return { success: false, error: "Error al guardar configuracion" }
  }
}
