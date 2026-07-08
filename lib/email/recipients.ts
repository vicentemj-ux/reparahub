/**
 * Resolucion del destinatario de los emails automaticos de ReparaHub.
 *
 * Orden de prioridad (cascada):
 *   1. `responsableEmail` del local (persona responsable: dueno, gerente,
 *      encargado). Es el destinatario PREFERENTE: a el/ella se le envia
 *      el resumen operativo (corte de caja, alertas diarias).
 *   2. `emailContacto` del local ("email del mostrador"). Fallback cuando
 *      no hay responsable configurado.
 *   3. `email` del owner de la sesion actual. Fallback final.
 *   4. `null` (no envia, el caller decide que hacer).
 *
 * Ademas devuelve `responsableNombre` para que el saludo del correo sea
 * personalizado ("Hola Juan") en lugar del generico "Hola".
 *
 * Usado por:
 * - lib/actions/ventas-prisma.ts (corte de caja)
 * - lib/actions/alertas-prisma.ts (alertas diarias)
 *
 * El responsable es metadata PRIVADA del local: NO se imprime en tickets
 * ni en el reporte en carta (ver `app/dashboard/configuracion` ->
 * pestana "Taller" -> "Responsable del local").
 */

import { getPrismaClient } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type EmailRecipientSource = "responsable" | "taller" | "owner" | "none"

export interface ResolvedEmailRecipient {
  email: string | null
  source: EmailRecipientSource
  /** Nombre del responsable (si la fuente es `responsable`). Vacio en otro caso. */
  responsableNombre: string | null
}

export async function resolveTallerEmailRecipient(tallerId: string): Promise<ResolvedEmailRecipient> {
  const prisma = getPrismaClient()
  const config = await prisma.configuracionTaller.findUnique({
    where: { tenantId: tallerId },
    select: {
      responsableEmail: true,
      responsableNombre: true,
      emailContacto: true,
    },
  })

  const responsableEmail = config?.responsableEmail?.trim()
  if (responsableEmail && EMAIL_REGEX.test(responsableEmail)) {
    return {
      email: responsableEmail,
      source: "responsable",
      responsableNombre: config?.responsableNombre?.trim() || null,
    }
  }

  const tallerEmail = config?.emailContacto?.trim()
  if (tallerEmail && EMAIL_REGEX.test(tallerEmail)) {
    return { email: tallerEmail, source: "taller", responsableNombre: null }
  }

  try {
    const user = await getCurrentUser()
    const ownerEmail = (user as { email?: string | null } | null)?.email?.trim()
    if (ownerEmail && EMAIL_REGEX.test(ownerEmail)) {
      return { email: ownerEmail, source: "owner", responsableNombre: null }
    }
  } catch {
    /* sesion no disponible: caemos a `none` */
  }
  return { email: null, source: "none", responsableNombre: null }
}
