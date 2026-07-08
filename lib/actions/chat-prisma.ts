"use server"

import { getCurrentUser } from "@/lib/auth"
import { getCurrentActorDisplayName } from "@/lib/auth/actor-display-name"
import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"
import type { ChatMember, ChatUser, WorkshopMessage } from "@/components/dashboard/chat/types"

function roleLabel(role: string, teamRole: string | null): string {
  if (role === "OWNER") return "Propietario"
  if (role === "ADMIN") return "Administrador"
  if (teamRole === "ADMINISTRADOR") return "Administrador"
  if (teamRole === "TECNICO") return "Técnico Estándar"
  if (teamRole === "RECEPCIONISTA") return "Vendedor / Recepción"
  if (teamRole === "REPARADOR") return "Tec. Externo"
  return "Equipo"
}

export async function getChatMembers(): Promise<{ data: ChatMember[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const users = await prisma.user.findMany({
      where: { tenantId, activo: true },
      select: { id: true, nombre: true, role: true, teamRole: true },
    })

    const data: ChatMember[] = users.map((u) => ({
      id: u.id,
      name: u.nombre || "Usuario",
      role: roleLabel(u.role, u.teamRole),
      online: true,
    }))

    return { data, error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : "Error al obtener miembros del chat" }
  }
}

export async function getChatCurrentUser(): Promise<{ data: ChatUser | null; error: string | null }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { data: null, error: "No hay sesion activa" }

    const userId = (user as any).id as string
    const name = user.name || (user as any).email || "Usuario"
    return { data: { id: userId, name }, error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Error al obtener usuario actual" }
  }
}

export async function getWorkshopMessages(
  peerId?: string | null,
): Promise<{ data: WorkshopMessage[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const user = await getCurrentUser()
    if (!user) return { data: [], error: "No hay sesion activa" }

    const tenantId = await getTenantIdOrThrow()
    const actorId = (user as any).id as string

    const rows = await prisma.workshopMessage.findMany({
      where: {
        tenantId,
        ...(peerId
          ? {
              OR: [
                { senderId: actorId, recipientId: peerId },
                { senderId: peerId, recipientId: actorId },
              ],
            }
          : { recipientId: null }),
      },
      orderBy: { createdAt: "asc" },
      take: 500,
    })

    const data: WorkshopMessage[] = rows.map((r) => ({
      id: r.id,
      content: r.content,
      sender_id: r.senderId ?? "",
      sender_name: r.senderName,
      recipient_id: r.recipientId ?? null,
      created_at: r.createdAt.toISOString(),
    }))

    return { data, error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : "Error al cargar mensajes" }
  }
}

export async function sendWorkshopMessage(
  contentRaw: string,
  recipientId?: string | null,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const content = contentRaw.trim()
    if (!content) return { success: false, error: "El mensaje no puede estar vacio." }

    const prisma = getPrismaClient()
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "No hay sesion activa" }

    const tenantId = await getTenantIdOrThrow()
    const actorName = await getCurrentActorDisplayName()
    const senderId = (user as any).id as string

    await prisma.workshopMessage.create({
      data: {
        tenantId,
        senderId,
        senderName: actorName || "Tecnico",
        recipientId: recipientId || null,
        content,
      },
    })

    return { success: true, error: null }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al enviar mensaje" }
  }
}

export async function debugChatMembers(): Promise<{ data: unknown; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true, nombre: true, role: true, teamRole: true, activo: true },
    })

    return { data: { tenantId, members: users }, error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Error al depurar miembros" }
  }
}
