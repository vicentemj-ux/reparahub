/**
 * Roles predefinidos del equipo. Reemplaza la tabla `roles_taller` de Supabase.
 * Se mantienen como constantes en código para evitar queries innecesarias en serverless.
 * Separado de team-prisma.ts para evitar conflicto con "use server" directive.
 */
export const TEAM_ROLES: Array<{
  id: string
  nombre: string
  slug: string
  categoria: "estandar" | "especial"
  teamRole: "ADMINISTRADOR" | "TECNICO" | "RECEPCIONISTA" | "REPARADOR"
}> = [
  {
    id: "administrador",
    nombre: "Administrador",
    slug: "administrador",
    categoria: "estandar",
    teamRole: "ADMINISTRADOR",
  },
  {
    id: "tecnico_estandar",
    nombre: "Tecnico Estandar",
    slug: "tecnico_estandar",
    categoria: "estandar",
    teamRole: "TECNICO",
  },
  {
    id: "vendedor_recepcion",
    nombre: "Vendedor / Recepcion",
    slug: "vendedor_recepcion",
    categoria: "estandar",
    teamRole: "RECEPCIONISTA",
  },
  {
    id: "reparador",
    nombre: "Tec. Externo",
    slug: "reparador",
    categoria: "especial",
    teamRole: "REPARADOR",
  },
]

export interface EquipoMiembroRow {
  id: string
  nombre: string
  email: string
  activo: boolean
  emailVerified: boolean
  rolId: string
  rolNombre: string
  telefono?: string | null
  telefonoPais?: string | null
  source?: "user" | "colaborador"
}

export interface EquipoOwnerRow {
  nombre: string
  email: string
  nombreTaller: string
}

export interface RolOption {
  id: string
  nombre: string
  slug?: string
  categoria?: "estandar" | "especial"
}
