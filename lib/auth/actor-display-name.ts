"use server"

import { getCurrentUser } from "@/lib/auth"

/**
 * Nombre visible para auditoria (historial de reparaciones, bitacora).
 * Prisma/Neon: obtiene el nombre del usuario autenticado via Auth.js.
 */
export async function getCurrentActorDisplayName(): Promise<string> {
  try {
    const user = await getCurrentUser()
    if (user?.name) return user.name
    if ((user as any)?.email) return (user as any).email
  } catch {
    // sin sesion Auth: devolver fallback
  }
  return "Usuario"
}
