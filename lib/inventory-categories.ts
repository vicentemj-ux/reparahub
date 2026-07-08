export const EQUIPOS_CANONICAL_SLUG = "equipos"
export const EQUIPOS_CANONICAL_NAME = "EQUIPOS"

const BASE_CATEGORY_NAMES = [
  "ACCESORIOS",
  "BATERIAS",
  "EQUIPOS",
  "HERRAMIENTAS",
  "OTROS",
  "PANTALLAS",
  "REFACCIONES",
] as const

export function inventoryBaseCategoryNames(): string[] {
  return [...BASE_CATEGORY_NAMES]
}

export function isReservedInventoryCategoryName(input: string): boolean {
  const normalized = normalizeCategoryName(input)
  return normalized === EQUIPOS_CANONICAL_NAME || BASE_CATEGORY_NAMES.includes(normalized as (typeof BASE_CATEGORY_NAMES)[number])
}

export function normalizeCategoryName(input: string): string {
  const raw = String(input ?? "").trim().replace(/\s+/g, " ")
  if (!raw) return ""
  const upper = raw.toUpperCase()
  if (upper === "EQUIPO" || upper === "EQUIPOS") return EQUIPOS_CANONICAL_NAME
  return upper
}

export function toCategorySlug(input: string): string {
  return normalizeCategoryName(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
}
