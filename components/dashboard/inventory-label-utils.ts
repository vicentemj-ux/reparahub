import type { ProductoRow } from "@/lib/actions/productos-prisma"

/**
 * Etiqueta de exhibicion: categoria de equipo (telefonos, etc.).
 * En BD suele usarse "EQUIPOS"; se acepta tambien "EQUIPO" por compatibilidad.
 */
export function isEquipoExhibitionCategory(producto: { categoria?: string | null }): boolean {
  const c = producto.categoria?.trim().toUpperCase() ?? ""
  return c === "EQUIPO" || c === "EQUIPOS"
}

/** Modelo comercial: nombre del articulo en inventario. */
export function getProductoModelo(producto: Pick<ProductoRow, "nombre">): string {
  return (producto.nombre ?? "").trim() || "-"
}

/** Almacenamiento / capacidad (prioriza columna nueva `almacenamiento`). */
export function getProductoCapacidad(producto: Pick<ProductoRow, "capacidad" | "almacenamiento">): string {
  const a = (producto.almacenamiento ?? "").trim()
  if (a) return a
  return (producto.capacidad ?? "").trim()
}

/** Linea descripcion / estado: condicion + descripcion (sin IMEI ni serie). */
export function getProductoDescripcionEstado(
  producto: Pick<ProductoRow, "descripcion" | "condicion">
): string {
  const parts = [producto.condicion?.trim(), producto.descripcion?.trim()].filter(Boolean) as string[]
  return parts.join(" ? ") || "-"
}

const MAX_CARTEL_FEATURES = 10

/**
 * Lista corta de vinetas para el cartel de exhibicion (4x6).
 * Prioriza datos estructurados y parte la descripcion libre en lineas.
 */
export function buildCartelFeatures(producto: ProductoRow): string[] {
  const out: string[] = []

  if (producto.categoria?.trim()) {
    out.push(producto.categoria.trim())
  }
  if (producto.es_equipo) {
    if (producto.marca?.trim()) out.push(`Marca: ${producto.marca.trim()}`)
    if (producto.modelo?.trim()) out.push(`Modelo: ${producto.modelo.trim()}`)
    if (producto.color?.trim()) out.push(`Color: ${producto.color.trim()}`)
    if (producto.procesador?.trim()) out.push(`Procesador: ${producto.procesador.trim()}`)
    if (producto.ram?.trim()) out.push(`RAM: ${producto.ram.trim()}`)
    const cap = getProductoCapacidad(producto)
    if (cap) out.push(`Almacenamiento: ${cap}`)
    if (producto.condicion?.trim()) out.push(`Condicion: ${producto.condicion.trim()}`)
  }
  if (producto.sku?.trim()) {
    out.push(`SKU: ${producto.sku.trim()}`)
  }

  const desc = producto.descripcion?.trim()
  if (desc) {
    const chunks = desc
      .split(/(?:\r?\n|[??;])+/)
      .map((s) => s.trim())
      .filter(Boolean)
    for (const c of chunks) {
      if (out.length >= MAX_CARTEL_FEATURES) break
      if (!out.includes(c)) out.push(c)
    }
  }

  if (out.length === 0) {
    out.push("Especificaciones disponibles en tienda")
  }

  return out.slice(0, MAX_CARTEL_FEATURES)
}

