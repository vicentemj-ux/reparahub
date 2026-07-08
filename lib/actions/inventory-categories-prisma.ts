"use server"

import { getCurrentTallerId } from "@/lib/auth/get-current-taller"
import { getPrismaClient } from "@/lib/prisma"
import {
  EQUIPOS_CANONICAL_NAME,
  EQUIPOS_CANONICAL_SLUG,
  inventoryBaseCategoryNames,
  isReservedInventoryCategoryName,
  normalizeCategoryName,
  toCategorySlug,
} from "@/lib/inventory-categories"

export interface InventoryCategoryRow {
  id: string
  slug: string
  nombre: string
  icono: string | null
  tipo: "base" | "custom" | "special_equipo"
  activo: boolean
  sort_order: number
  aliases: string[]
}

type InventoryCategoryQueryRow = {
  id: string
  slug: string
  nombre: string
  icono: string | null
  tipo: string
  activo: boolean
  sortOrder: number
  aliases?: { alias: string }[]
}

const BASE_CATEGORY_ICONS: Record<string, string> = {
  ACCESORIOS: "Tag",
  BATERIAS: "Battery",
  EQUIPOS: "Smartphone",
  HERRAMIENTAS: "Wrench",
  OTROS: "MoreHorizontal",
  PANTALLAS: "Monitor",
  REFACCIONES: "Cpu",
}

function sortOrderForBaseName(name: string): number {
  const order = inventoryBaseCategoryNames()
  const idx = order.indexOf(name)
  return idx >= 0 ? idx + 1 : 100
}

function normalizeCategoryAliases(input?: string[] | string | null): string[] {
  const values = Array.isArray(input)
    ? input
    : String(input ?? "")
        .split(",")
        .map((v) => v.trim())
  return Array.from(
    new Set(
      values
        .map((value) => normalizeCategoryName(value))
        .map((value) => toCategorySlug(value))
        .filter((value) => value.length > 0 && value !== EQUIPOS_CANONICAL_SLUG),
    ),
  )
}

async function ensureAliasAvailability(prisma: ReturnType<typeof getPrismaClient>, tenantId: string, aliasSlugs: string[], categoryId: string) {
  if (!aliasSlugs.length) return
  const conflicts = await prisma.inventarioCategoriaAlias.findMany({
    where: { tenantId, aliasSlug: { in: aliasSlugs }, NOT: { categoriaId: categoryId } },
    select: { aliasSlug: true },
  })
  if (conflicts.length > 0) {
    const conflict = conflicts[0]?.aliasSlug ?? "alias"
    throw new Error(`El alias "${conflict}" ya esta en uso por otra categoria.`)
  }
}

async function syncCategoryAliases(
  prisma: ReturnType<typeof getPrismaClient>,
  tenantId: string,
  categoryId: string,
  aliasSlugs: string[],
) {
  await prisma.inventarioCategoriaAlias.deleteMany({
    where: { tenantId, categoriaId: categoryId },
  })
  if (!aliasSlugs.length) return
  await prisma.inventarioCategoriaAlias.createMany({
    data: aliasSlugs.map((aliasSlug) => ({
      tenantId,
      categoriaId: categoryId,
      alias: aliasSlug,
      aliasSlug,
    })),
    skipDuplicates: true,
  })
}

function mapCategoryRow(row: InventoryCategoryQueryRow): InventoryCategoryRow {
  return {
    id: row.id,
    slug: row.slug,
    nombre: row.nombre,
    icono: row.icono,
    tipo: row.tipo as InventoryCategoryRow["tipo"],
    activo: row.activo,
    sort_order: row.sortOrder,
    aliases: ((row as typeof row & { aliases?: { alias: string }[] }).aliases ?? []).map((alias) => alias.alias).filter(Boolean),
  }
}

export async function ensureInventoryBaseCategoriesForTenant(tenantId?: string): Promise<void> {
  const prisma = getPrismaClient()
  const resolvedTenantId = tenantId ?? (await getCurrentTallerId())
  const base = inventoryBaseCategoryNames().map((nombre) => {
    const slug = nombre === EQUIPOS_CANONICAL_NAME ? EQUIPOS_CANONICAL_SLUG : toCategorySlug(nombre)
    const tipo = nombre === EQUIPOS_CANONICAL_NAME ? "special_equipo" : "base"
    return { nombre, slug, tipo, sortOrder: sortOrderForBaseName(nombre), icono: BASE_CATEGORY_ICONS[nombre] ?? null }
  })

  await Promise.all(
    base.map((cat) =>
      prisma.inventarioCategoria.upsert({
        where: { tenantId_slug: { tenantId: resolvedTenantId, slug: cat.slug } },
        create: {
          tenantId: resolvedTenantId,
          slug: cat.slug,
          nombre: cat.nombre,
          icono: cat.icono,
          tipo: cat.tipo,
          activo: true,
          sortOrder: cat.sortOrder,
        },
        update: {
          nombre: cat.nombre,
          icono: cat.icono,
          tipo: cat.tipo,
          activo: true,
          sortOrder: cat.sortOrder,
        },
      }),
    ),
  )
}

export async function listInventoryCategories(input?: {
  includeInactive?: boolean
}): Promise<{ data: InventoryCategoryRow[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    await ensureInventoryBaseCategoriesForTenant(tenantId)
    const rows = await prisma.inventarioCategoria.findMany({
      where: { tenantId, ...(input?.includeInactive ? {} : { activo: true }) },
      orderBy: [{ sortOrder: "asc" }, { nombre: "asc" }],
      include: {
        aliases: {
          select: { alias: true },
          orderBy: { alias: "asc" },
        },
      },
    })
    return {
      data: rows.map((r) => mapCategoryRow(r)),
      error: null,
    }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "No se pudo cargar categorias" }
  }
}

export async function createInventoryCategory(
  nombreInput: string,
  icono?: string,
  aliasesInput?: string[] | string,
): Promise<{ category: InventoryCategoryRow | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    const nombre = normalizeCategoryName(nombreInput)
    if (!nombre) return { category: null, error: "Nombre de categoria invalido." }

    await ensureInventoryBaseCategoriesForTenant(tenantId)

    const slug = toCategorySlug(nombre)
    if (!slug) return { category: null, error: "Slug de categoria invalido." }

    const aliases = normalizeCategoryAliases(aliasesInput)
    if (aliases.includes(slug)) {
      throw new Error("El nombre de la categoria no puede ser igual a uno de sus alias.")
    }

    const existing = await prisma.inventarioCategoria.findFirst({
      where: { tenantId, slug },
      select: { id: true },
    })
    if (aliases.length > 0) {
      const conflicts = await prisma.inventarioCategoriaAlias.findMany({
        where: { tenantId, aliasSlug: { in: aliases } },
        select: { aliasSlug: true, categoriaId: true },
      })
      const conflicting = conflicts.find((conflict) => !existing || conflict.categoriaId !== existing.id)
      if (conflicting) {
        return { category: null, error: `El alias "${conflicting.aliasSlug}" ya esta en uso por otra categoria.` }
      }
    }

    const row = await prisma.inventarioCategoria.upsert({
      where: { tenantId_slug: { tenantId, slug } },
      create: {
        tenantId,
        slug,
        nombre,
        icono: icono ?? null,
        tipo: slug === EQUIPOS_CANONICAL_SLUG ? "special_equipo" : "custom",
        activo: true,
        sortOrder: slug === EQUIPOS_CANONICAL_SLUG ? 3 : 200,
      },
      update: {
        activo: true,
        nombre,
        icono: icono ?? null,
      },
      include: {
        aliases: {
          select: { alias: true },
          orderBy: { alias: "asc" },
        },
      },
    })

    if (aliases.length > 0 && row.tipo === "custom") {
      await syncCategoryAliases(prisma, tenantId, row.id, aliases)
      const refreshed = await prisma.inventarioCategoria.findUnique({
        where: { id: row.id },
        include: { aliases: { select: { alias: true }, orderBy: { alias: "asc" } } },
      })
      if (refreshed) {
        return { category: mapCategoryRow(refreshed), error: null }
      }
    }

    return {
      category: mapCategoryRow(row),
      error: null,
    }
  } catch (error) {
    return { category: null, error: error instanceof Error ? error.message : "No se pudo crear categoria" }
  }
}

export async function updateInventoryCategory(input: {
  id: string
  nombre: string
  icono?: string | null
  aliases?: string[] | string
}): Promise<{ category: InventoryCategoryRow | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    await ensureInventoryBaseCategoriesForTenant(tenantId)

    const current = await prisma.inventarioCategoria.findFirst({
      where: { id: input.id, tenantId },
      include: { aliases: { select: { alias: true }, orderBy: { alias: "asc" } } },
    })
    if (!current) return { category: null, error: "Categoria no encontrada." }
    if (current.tipo === "special_equipo" || isReservedInventoryCategoryName(current.nombre)) {
      return { category: null, error: "La categoria EQUIPOS y las categorias base no se pueden modificar aqui." }
    }

    const nextNombre = normalizeCategoryName(input.nombre)
    if (!nextNombre) return { category: null, error: "Nombre de categoria invalido." }
    const nextSlug = toCategorySlug(nextNombre)
    const aliases = normalizeCategoryAliases(input.aliases)
    if (aliases.includes(nextSlug)) {
      return { category: null, error: "El nombre no puede coincidir con un alias." }
    }

    const conflict = await prisma.inventarioCategoria.findFirst({
      where: { tenantId, slug: nextSlug, NOT: { id: current.id } },
      select: { id: true },
    })
    if (conflict) {
      return { category: null, error: "Ya existe otra categoria con ese nombre." }
    }

    await ensureAliasAvailability(prisma, tenantId, aliases, current.id)

    const transactionSteps = [
      prisma.inventarioCategoria.update({
        where: { id: current.id },
        data: {
          nombre: nextNombre,
          slug: nextSlug,
          icono: input.icono ?? null,
        },
        include: { aliases: { select: { alias: true }, orderBy: { alias: "asc" } } },
      }),
      prisma.producto.updateMany({
        where: { tenantId, categoria: current.nombre },
        data: { categoria: nextNombre },
      }),
      prisma.inventarioCategoriaAlias.deleteMany({
        where: { tenantId, categoriaId: current.id },
      }),
      ...(aliases.length > 0
        ? [
            prisma.inventarioCategoriaAlias.createMany({
              data: aliases.map((aliasSlug) => ({
                tenantId,
                categoriaId: current.id,
                alias: aliasSlug,
                aliasSlug,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]

    const txResult = await prisma.$transaction(transactionSteps)
    const row = txResult[0] as InventoryCategoryQueryRow

    const refreshed = await prisma.inventarioCategoria.findUnique({
      where: { id: row.id },
      include: { aliases: { select: { alias: true }, orderBy: { alias: "asc" } } },
    })
    return { category: refreshed ? mapCategoryRow(refreshed) : mapCategoryRow(row), error: null }
  } catch (error) {
    return { category: null, error: error instanceof Error ? error.message : "No se pudo actualizar la categoria" }
  }
}

export async function setInventoryCategoryActive(input: {
  id: string
  active: boolean
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    await ensureInventoryBaseCategoriesForTenant(tenantId)

    const current = await prisma.inventarioCategoria.findFirst({
      where: { id: input.id, tenantId },
      select: { nombre: true, tipo: true },
    })
    if (!current) return { success: false, error: "Categoria no encontrada." }
    if (current.tipo === "special_equipo" || isReservedInventoryCategoryName(current.nombre)) {
      return { success: false, error: "La categoria EQUIPOS y las categorias base no se pueden archivar." }
    }

    await prisma.inventarioCategoria.update({
      where: { id: input.id },
      data: { activo: Boolean(input.active) },
    })
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo actualizar estado de la categoria" }
  }
}

export async function deleteInventoryCategory(categoryId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    await ensureInventoryBaseCategoriesForTenant(tenantId)

    const current = await prisma.inventarioCategoria.findFirst({
      where: { id: categoryId, tenantId },
      select: { id: true, nombre: true, tipo: true },
    })
    if (!current) return { success: false, error: "Categoria no encontrada." }
    if (current.tipo === "special_equipo" || isReservedInventoryCategoryName(current.nombre)) {
      return { success: false, error: "La categoria EQUIPOS y las categorias base no se pueden borrar." }
    }

    const productsCount = await prisma.producto.count({
      where: { tenantId, categoria: current.nombre },
    })
    if (productsCount > 0) {
      return { success: false, error: "No puedes borrar una categoria con productos asignados. Reasignalos primero." }
    }

    await prisma.$transaction([
      prisma.inventarioCategoriaAlias.deleteMany({ where: { tenantId, categoriaId: current.id } }),
      prisma.inventarioCategoria.delete({ where: { id: categoryId } }),
    ])

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo borrar la categoria" }
  }
}
