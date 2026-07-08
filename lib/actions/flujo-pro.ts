"use server"

import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"

export interface AjustesTallerFlujoPro {
  health_check_required: boolean
  firma_required: boolean
  fotos_required: boolean
}

const DEFAULTS: AjustesTallerFlujoPro = {
  health_check_required: false,
  firma_required: false,
  fotos_required: false,
}

function mapRow(row: { healthCheckRequired: boolean; firmaRequired: boolean; fotosRequired: boolean } | null): AjustesTallerFlujoPro {
  if (!row) return { ...DEFAULTS }
  return {
    health_check_required: row.healthCheckRequired,
    firma_required: row.firmaRequired,
    fotos_required: row.fotosRequired,
  }
}

export async function getAjustesTallerFlujoPro(): Promise<{
  ajustes: AjustesTallerFlujoPro
  error: string | null
}> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const row = await prisma.ajustesTaller.findUnique({
      where: { tenantId },
      select: { healthCheckRequired: true, firmaRequired: true, fotosRequired: true },
    })

    return { ajustes: mapRow(row), error: null }
  } catch (e) {
    console.error("getAjustesTallerFlujoPro:", e)
    return { ajustes: { ...DEFAULTS }, error: e instanceof Error ? e.message : "Error al cargar ajustes" }
  }
}

export async function updateAjustesTallerFlujoPro(
  input: Partial<AjustesTallerFlujoPro>
): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const data: any = {}
    if (input.health_check_required !== undefined) data.healthCheckRequired = input.health_check_required
    if (input.firma_required !== undefined) data.firmaRequired = input.firma_required
    if (input.fotos_required !== undefined) data.fotosRequired = input.fotos_required

    await prisma.ajustesTaller.upsert({
      where: { tenantId },
      create: {
        tenantId,
        healthCheckRequired: data.healthCheckRequired ?? DEFAULTS.health_check_required,
        firmaRequired: data.firmaRequired ?? DEFAULTS.firma_required,
        fotosRequired: data.fotosRequired ?? DEFAULTS.fotos_required,
      },
      update: data,
    })

    return { success: true }
  } catch (e) {
    console.error("updateAjustesTallerFlujoPro:", e)
    return { success: false, error: e instanceof Error ? e.message : "Error al guardar ajustes" }
  }
}
