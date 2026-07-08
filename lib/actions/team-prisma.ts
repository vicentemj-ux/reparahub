"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"
import { issueMemberVerificationPin } from "@/lib/actions/email-verification"
import { TEAM_ROLES, type EquipoMiembroRow, type EquipoOwnerRow, type RolOption } from "@/lib/team-types"
import { ensureTeamPhoneColumns } from "@/lib/team-phone-schema"

const MVP_LIMIT = 5
const MVP_LIMIT_MSG = `Has alcanzado el limite de ${MVP_LIMIT} usuarios para la fase MVP. Contacta a soporte para mas detalles.`


function findRoleById(rolId: string) {
  return TEAM_ROLES.find((r) => r.id === rolId) ?? null
}

function findRoleByTeamRole(teamRole: string) {
  return TEAM_ROLES.find((r) => r.teamRole === teamRole) ?? null
}


/**
 * Obtiene el owner del taller + miembros activos/inactivos + catalogo de roles.
 * Todo en una sola query eficiente con include.
 */
export async function getEquipoPageData(): Promise<{
  owner: EquipoOwnerRow | null
  miembros: EquipoMiembroRow[]
  roles: RolOption[]
  error: string | null
}> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    await ensureTeamPhoneColumns(prisma)

    // Query unica: owner + miembros en paralelo via include
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          orderBy: { createdAt: "asc" },
        },
        colaboradoresOperativos: {
          orderBy: [{ activo: "desc" }, { nombre: "asc" }],
        },
        configuracion: {
          select: { nombreComercial: true },
        },
      },
    })

    if (!tenant) {
      return { owner: null, miembros: [], roles: [], error: "No se pudo cargar el taller." }
    }

    // Owner = primer usuario con role=OWNER (el que se crea en el registro)
    const ownerUser = tenant.users.find((u) => u.role === "OWNER")
    const owner: EquipoOwnerRow | null = ownerUser
      ? {
          nombre: ownerUser.nombre || ownerUser.email,
          email: ownerUser.email,
          nombreTaller: tenant.configuracion?.nombreComercial?.trim() || tenant.nombre,
        }
      : null

    // Miembros = todos los usuarios excepto el owner
    const userMembers: EquipoMiembroRow[] = tenant.users
      .filter((u) => u.role !== "OWNER")
      .map((u) => {
        const roleInfo = findRoleByTeamRole(u.teamRole ?? "TECNICO")
        return {
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          activo: u.activo,
          emailVerified: u.emailVerified,
          rolId: roleInfo?.id ?? "tecnico_estandar",
          rolNombre: roleInfo?.nombre ?? "Tecnico",
          telefono: u.telefono ?? null,
          telefonoPais: u.telefonoPais ?? null,
          source: "user",
        }
      })
    const externalMembers: EquipoMiembroRow[] = tenant.colaboradoresOperativos.map((c) => ({
      id: `colaborador:${c.id}`,
      nombre: c.nombre,
      email: "",
      activo: c.activo,
      emailVerified: true,
      rolId: "reparador",
      rolNombre: "Tec. Externo",
      telefono: c.telefono ?? null,
      telefonoPais: c.telefonoPais ?? null,
      source: "colaborador",
    }))
    const miembros: EquipoMiembroRow[] = [...userMembers, ...externalMembers]

    // Roles = catalogo constante
    const roles: RolOption[] = TEAM_ROLES.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      slug: r.slug,
      categoria: r.categoria,
    }))

    return { owner, miembros, roles, error: null }
  } catch (error) {
    // Don't catch Next.js redirect errors
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    console.error("[getEquipoPageData] fatal:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      owner: null,
      miembros: [],
      roles: [],
      error: `Error: ${errorMessage}`,
    }
  }
}

/**
 * Crea un nuevo miembro del equipo.
 * Valida limite MVP (5 activos), email unico, y rol valido.
 */
export async function createMiembro(input: {
  nombre: string
  email: string
  password: string
  rolId: string
  telefono?: string
  telefonoPais?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    await ensureTeamPhoneColumns(prisma)

    const nombre = (input.nombre || "").trim()
    const email = (input.email || "").trim().toLowerCase()
    const password = input.password || ""
    const rolId = (input.rolId || "").trim()
    const telefono = (input.telefono || "").replace(/\D/g, "")
    const telefonoPais = (input.telefonoPais || "").trim() || null

    // Validaciones
    if (!nombre) return { success: false, error: "El nombre es obligatorio." }
    if (!rolId) return { success: false, error: "Debes seleccionar un puesto/rol." }

    // Validar rol
    const roleInfo = findRoleById(rolId)
    if (!roleInfo) {
      return { success: false, error: "El rol seleccionado no es valido." }
    }
    if (roleInfo.teamRole === "REPARADOR") {
      try {
        await prisma.colaboradorOperativo.create({
          data: {
            tenantId,
            nombre,
            tipo: "maquila",
            telefono: telefono || null,
            telefonoPais,
            activo: true,
            notas: "Alta desde Mi Equipo como tecnico externo sin acceso al sistema.",
          },
        })
      } catch (error) {
        const prismaCode = (error as { code?: string }).code
        if (prismaCode === "P2002") {
          return { success: false, error: "Ese tecnico externo ya existe en este taller." }
        }
        throw error
      }
      revalidatePath("/dashboard/equipo")
      revalidatePath("/dashboard/reparaciones")
      return { success: true }
    }

    if (!email) return { success: false, error: "El email es obligatorio." }
    if (!password || password.length < 6) {
      return { success: false, error: "La contrasena debe tener al menos 6 caracteres." }
    }

    // Verificar limite MVP
    const activeCount = await prisma.user.count({
      where: { tenantId, activo: true, role: { not: "OWNER" } },
    })
    if (activeCount >= MVP_LIMIT) {
      return { success: false, error: MVP_LIMIT_MSG }
    }

    // Verificar email unico en el tenant
    const existingInTenant = await prisma.user.findFirst({
      where: { tenantId, email },
      select: { id: true, activo: true, emailVerified: true },
    })
    if (existingInTenant) {
      if (!existingInTenant.activo) {
        return {
          success: false,
          error: "Este correo existe en Mi Equipo pero esta inactivo. Reactivalo o eliminalo permanentemente antes de volver a crearlo.",
        }
      }
      return {
        success: false,
        error: existingInTenant.emailVerified
          ? "Ese correo ya esta registrado en este taller. Edita el miembro o desactiva su acceso si ya no trabaja aqui."
          : "Ese correo ya esta pendiente de verificacion. Reenvia la invitacion o desactiva el acceso si fue un alta duplicada.",
      }
    }

    const existingGlobal = await prisma.user.findFirst({
      where: { email },
      select: { id: true, tenantId: true },
    })
    if (existingGlobal) {
      return {
        success: false,
        error: "Este correo ya pertenece a otro taller. Por ahora usa otro correo para este miembro.",
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Crear usuario (emailVerified=false: el miembro debera confirmar el
    // PIN de 6 digitos que se envia a continuacion antes de poder iniciar
    // sesion; ver lib/auth.ts -> authorize).
    const nuevo = await prisma.user.create({
      data: {
        tenantId,
        email,
        nombre,
        passwordHash,
        role: "STAFF",
        teamRole: roleInfo.teamRole as "ADMINISTRADOR" | "TECNICO" | "RECEPCIONISTA" | "REPARADOR",
        telefono: telefono || null,
        telefonoPais,
        activo: true,
        emailVerified: false,
      },
    })

    // Enviar PIN de verificacion. Si el envio falla, la cuenta ya existe
    // y la UI lo mostrara para que el dueno pueda reenviar.
    const pinRes = await issueMemberVerificationPin({
      userId: nuevo.id,
      tallerId: tenantId,
      email: nuevo.email,
      nombre: nuevo.nombre?.trim() || nombre,
    })
    if (!pinRes.success) {
      console.error("[createMiembro] fallo envio de PIN:", pinRes.error)
    }

    revalidatePath("/dashboard/equipo")
    return { success: true, error: pinRes.error }
  } catch (error) {
    console.error("[createMiembro] fatal:", error)
    const prismaCode = (error as { code?: string }).code
    if (prismaCode === "P2002") {
      return { success: false, error: "Ese correo ya esta registrado." }
    }
    return {
      success: false,
      error: "No se pudo crear el miembro. Verifica configuracion del servidor y vuelve a intentar.",
    }
  }
}

/**
 * Reenvia el PIN de verificacion a un miembro ya registrado pero aun
 * sin verificar. No-op si el miembro ya esta verificado o inactivo.
 */
export async function resendMiembroInvitacion(miembroId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    await ensureTeamPhoneColumns(prisma)

    const miembro = await prisma.user.findFirst({
      where: { id: miembroId, tenantId, role: "STAFF" },
      select: { id: true, email: true, nombre: true, emailVerified: true, activo: true },
    })
    if (!miembro) return { success: false, error: "Miembro no encontrado." }
    if (miembro.emailVerified) {
      return { success: false, error: "Este miembro ya verifico su correo." }
    }
    if (!miembro.activo) {
      return { success: false, error: "Activa al miembro antes de reenviar la invitacion." }
    }

    const pinRes = await issueMemberVerificationPin({
      userId: miembro.id,
      tallerId: tenantId,
      email: miembro.email,
      nombre: miembro.nombre?.trim() || "Usuario",
    })
    if (!pinRes.success) {
      return { success: false, error: pinRes.error || "No se pudo reenviar la invitacion." }
    }

    revalidatePath("/dashboard/equipo")
    return { success: true }
  } catch (error) {
    console.error("[resendMiembroInvitacion] fatal:", error)
    return { success: false, error: "No se pudo reenviar la invitacion." }
  }
}

/**
 * Actualiza nombre, rol y opcionalmente contrasena de un miembro.
 */
export async function updateMiembro(input: {
  miembroId: string
  nombre: string
  rolId: string
  password?: string
  telefono?: string
  telefonoPais?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    await ensureTeamPhoneColumns(prisma)

    const miembroId = (input.miembroId || "").trim()
    const nombre = (input.nombre || "").trim()
    const rolId = (input.rolId || "").trim()
    const password = (input.password || "").trim()
    const telefono = (input.telefono || "").replace(/\D/g, "")
    const telefonoPais = (input.telefonoPais || "").trim() || null

    if (!miembroId) return { success: false, error: "Miembro invalido." }
    if (!nombre) return { success: false, error: "El nombre es obligatorio." }
    if (!rolId) return { success: false, error: "Debes seleccionar un puesto/rol." }
    if (password && password.length < 6) {
      return { success: false, error: "La contrasena debe tener al menos 6 caracteres." }
    }

    // Validar rol
    const roleInfo = findRoleById(rolId)
    if (!roleInfo) {
      return { success: false, error: "El rol seleccionado no es valido." }
    }

    if (miembroId.startsWith("colaborador:")) {
      const colaboradorId = miembroId.replace("colaborador:", "")
      if (roleInfo.teamRole !== "REPARADOR") {
        return { success: false, error: "Los tecnicos externos deben conservar el rol Tec. Externo." }
      }
      const existing = await prisma.colaboradorOperativo.findFirst({
        where: { id: colaboradorId, tenantId },
        select: { id: true },
      })
      if (!existing) return { success: false, error: "No se encontro el tecnico externo para editar." }
      await prisma.colaboradorOperativo.update({
        where: { id: colaboradorId },
        data: {
          nombre,
          telefono: telefono || null,
          telefonoPais,
        },
      })
      revalidatePath("/dashboard/equipo")
      revalidatePath("/dashboard/reparaciones")
      return { success: true }
    }

    // Verificar que el miembro existe y pertenece al tenant
    const member = await prisma.user.findFirst({
      where: { id: miembroId, tenantId, role: { not: "OWNER" } },
      select: { id: true, role: true },
    })
    if (!member) {
      return { success: false, error: "No se encontro el miembro para editar." }
    }

    // Preparar datos de actualizacion
    const updateData: {
      nombre: string
      teamRole: "ADMINISTRADOR" | "TECNICO" | "RECEPCIONISTA" | "REPARADOR"
      telefono: string | null
      telefonoPais: string | null
      passwordHash?: string
    } = {
      nombre,
      teamRole: roleInfo.teamRole as "ADMINISTRADOR" | "TECNICO" | "RECEPCIONISTA" | "REPARADOR",
      telefono: telefono || null,
      telefonoPais,
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12)
    }

    await prisma.user.update({
      where: { id: miembroId },
      data: updateData,
    })

    revalidatePath("/dashboard/equipo")
    revalidatePath("/dashboard/reparaciones")
    return { success: true }
  } catch (error) {
    console.error("[updateMiembro] fatal:", error)
    return {
      success: false,
      error: "No se pudo actualizar el miembro. Verifica configuracion del servidor y vuelve a intentar.",
    }
  }
}

/**
 * Elimina un miembro del equipo (soft delete via activo=false).
 * No elimina el registro para mantener integridad referencial con reparaciones asignadas.
 */
export async function deleteMiembro(miembroId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const id = (miembroId || "").trim()
    if (!id) return { success: false, error: "Miembro invalido." }

    // Verificar que el miembro existe y pertenece al tenant
    const member = await prisma.user.findFirst({
      where: { id, tenantId, role: { not: "OWNER" } },
      select: { id: true, role: true },
    })
    if (!member) {
      return { success: false, error: "No se encontro el miembro para eliminar." }
    }

    // Soft delete: marcar como inactivo en lugar de eliminar
    // Esto preserva el historial de reparaciones asignadas
    await prisma.user.update({
      where: { id },
      data: { activo: false },
    })

    return { success: true }
  } catch (error) {
    console.error("[deleteMiembro] fatal:", error)
    return {
      success: false,
      error: "No se pudo eliminar el miembro. Verifica configuracion del servidor y vuelve a intentar.",
    }
  }
}

/**
 * Elimina definitivamente un miembro ya inactivo.
 * Solo se permite para STAFF del mismo tenant; nunca para OWNER ni usuarios activos.
 * Esto libera el correo para corregir altas duplicadas o capturas equivocadas.
 */
export async function deleteMiembroPermanente(miembroId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const id = (miembroId || "").trim()
    if (!id) return { success: false, error: "Miembro invalido." }

    const member = await prisma.user.findFirst({
      where: { id, tenantId, role: "STAFF" },
      select: { id: true, activo: true },
    })
    if (!member) {
      return { success: false, error: "No se encontro un miembro eliminable en este taller." }
    }
    if (member.activo) {
      return {
        success: false,
        error: "Primero desactiva el acceso. Solo los miembros inactivos pueden eliminarse permanentemente.",
      }
    }

    await prisma.user.delete({ where: { id } })

    revalidatePath("/dashboard/equipo")
    return { success: true }
  } catch (error) {
    console.error("[deleteMiembroPermanente] fatal:", error)
    return {
      success: false,
      error: "No se pudo eliminar permanentemente el miembro.",
    }
  }
}

/**
 * Suspender o reactivar un miembro (toggle activo).
 */
export async function toggleMiembroActivo(miembroId: string): Promise<{ success: boolean; activo?: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const id = (miembroId || "").trim()
    if (!id) return { success: false, error: "Miembro invalido." }

    const member = await prisma.user.findFirst({
      where: { id, tenantId, role: { not: "OWNER" } },
      select: { id: true, activo: true },
    })
    if (!member) {
      return { success: false, error: "No se encontro el miembro." }
    }

    const nuevoEstado = !member.activo

    // Si se reactiva, verificar limite MVP
    if (nuevoEstado) {
      const activeCount = await prisma.user.count({
        where: { tenantId, activo: true, role: { not: "OWNER" } },
      })
      if (activeCount >= MVP_LIMIT) {
        return { success: false, error: MVP_LIMIT_MSG }
      }
    }

    await prisma.user.update({
      where: { id },
      data: { activo: nuevoEstado },
    })

    return { success: true, activo: nuevoEstado }
  } catch (error) {
    console.error("[toggleMiembroActivo] fatal:", error)
    return {
      success: false,
      error: "No se pudo cambiar el estado del miembro.",
    }
  }
}

/**
 * Obtiene el listado de tecnicos activos para asignacion en reparaciones.
 * Incluye owner + miembros activos.
 */
export async function getAssignableStaff(): Promise<{
  staff: Array<{ id: string; nombre: string; role: string }>
  error: string | null
}> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const users = await prisma.user.findMany({
      where: { tenantId, activo: true },
      select: { id: true, nombre: true, role: true },
      orderBy: { nombre: "asc" },
    })

    // Owner siempre primero
    const owner = users.find((u) => u.role === "OWNER")
    const staff = users.filter((u) => u.role !== "OWNER")

    const result = owner ? [owner, ...staff] : staff

    return {
      staff: result.map((u) => ({
        id: u.id,
        nombre: u.nombre || "Sin nombre",
        role: u.role,
      })),
      error: null,
    }
  } catch (error) {
    console.error("[getAssignableStaff] fatal:", error)
    return { staff: [], error: "No se pudieron cargar tecnicos." }
  }
}
