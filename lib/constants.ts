export type InventarioCategoriaValue =
  | "EQUIPOS"
  | "REFACCIONES"
  | "ACCESORIOS"
  | "HERRAMIENTAS"
  | "PANTALLAS"
  | "BATERIAS"
  | "OTROS"

export interface InventarioCategoriaDef {
  value: InventarioCategoriaValue
  label: string
}

export const INVENTARIO_CATEGORIAS: InventarioCategoriaDef[] = [
  { value: "ACCESORIOS", label: "ACCESORIOS" },
  { value: "BATERIAS", label: "BATERIAS" },
  { value: "EQUIPOS", label: "EQUIPOS" },
  { value: "HERRAMIENTAS", label: "HERRAMIENTAS" },
  { value: "OTROS", label: "OTROS" },
  { value: "PANTALLAS", label: "PANTALLAS" },
  { value: "REFACCIONES", label: "REFACCIONES" },
]

/**
 * Constantes compartidas (sin "use server").
 * Importables desde cliente y servidor.
 */

/** Lista de permisos para el modal de roles personalizados (slug → etiqueta). */
export const PERMISOS_DISPONIBLES: { slug: string; label: string }[] = [
  { slug: "ver_inventario", label: "Ver Inventario" },
  { slug: "ver_compras", label: "Ver Compras" },
  { slug: "borrar_tickets", label: "Borrar Tickets" },
  { slug: "ver_utilidades", label: "Ver Utilidades y Reportes" },
  { slug: "gestionar_roles", label: "Gestionar Equipo y Roles" },
  { slug: "editar_inventario", label: "Editar Inventario" },
  { slug: "importar_inventario", label: "Importar Inventario" },
  { slug: "crear_reparaciones", label: "Crear Reparaciones" },
  { slug: "editar_reparaciones", label: "Editar Reparaciones" },
  { slug: "ver_reportes", label: "Ver Reportes" },
  { slug: "exportar_datos", label: "Exportar Datos" },
  { slug: "gestionar_clientes", label: "Gestionar Clientes" },
  { slug: "configuracion_taller", label: "Configuracion del Taller" },
  { slug: "ver_ventas", label: "Ver Ventas" },
  { slug: "registrar_ventas", label: "Registrar Ventas" },
]
