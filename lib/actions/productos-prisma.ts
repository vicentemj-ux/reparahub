"use server"

import { revalidatePath } from "next/cache"
import { getCurrentTallerId } from "@/lib/auth/get-current-taller"
import { getPrismaClient } from "@/lib/prisma"
import { normalizeInventoryImagePathForDb, getInventoryPublicUrl, parseImagenUrls, getThumbnailPath } from "@/lib/storage"
import { sanitizeFileName, uploadFileToS3, deleteFromS3 } from "@/lib/r2"
import type { Prisma } from "@prisma/client"
import { ensureInventoryBaseCategoriesForTenant } from "@/lib/actions/inventory-categories-prisma"
import { EQUIPOS_CANONICAL_SLUG, normalizeCategoryName, toCategorySlug } from "@/lib/inventory-categories"
import { generateInventoryBarcode } from "@/lib/inventory-barcode"

// ─── Public types (snake_case for UI backward compat) ────────────────────────

export interface ProductoRow {
  id: string
  taller_id: string
  nombre: string
  sku: string | null
  codigo_barras: string | null
  imagen_url: string | null
  categoria: string | null
  descripcion: string | null
  marca?: string | null
  modelo?: string | null
  ubicacion?: string | null
  costo: number
  precio_venta: number
  stock_actual: number
  stock_minimo: number
  es_equipo: boolean
  imei_serie: string | null
  color: string | null
  capacidad?: string | null
  procesador?: string | null
  ram?: string | null
  almacenamiento?: string | null
  condicion: string | null
  publicado_en_tienda?: boolean
  descripcion_publica?: string | null
  apartado_activo?: boolean
  apartado_folio?: string | null
  created_at: string
}

export interface CreateProductoInput {
  id?: string
  nombre: string
  sku?: string
  codigo_barras?: string
  imagen_url?: string
  categoria?: string
  descripcion?: string
  marca?: string
  modelo?: string
  ubicacion?: string
  costo?: number
  precio_venta?: number
  stock_actual?: number
  stock_minimo?: number
  es_equipo?: boolean
  imei_serie?: string
  color?: string
  capacidad?: string
  procesador?: string
  ram?: string
  almacenamiento?: string
  condicion?: string
  publicado_en_tienda?: boolean
  descripcion_publica?: string | null
}

export interface BulkImportProductoInput {
  nombre: string
  sku?: string
  categoria?: string
  codigo_barras?: string
  descripcion?: string
  marca?: string
  modelo?: string
  ubicacion?: string
  costo?: number | string
  precio_venta?: number | string
  stock_actual?: number | string
  stock_minimo?: number | string
  es_equipo?: boolean | string | number
  imei_serie?: string
  color?: string
  capacidad?: string
  procesador?: string
  ram?: string
  almacenamiento?: string
  condicion?: string
  publicado_en_tienda?: boolean | string | number
  descripcion_publica?: string
}

export interface CreateEquiposLoteInput {
  nombre: string
  sku?: string
  categoria?: string
  descripcion?: string
  marca?: string
  modelo?: string
  ubicacion?: string
  costo?: number
  precio_venta?: number
  stock_minimo?: number
  color?: string
  capacidad?: string
  procesador?: string
  ram?: string
  almacenamiento?: string
  condicion?: string
  series: string[]
}

export interface CreateEquiposLoteResult {
  success: boolean
  createdCount: number
  productos: ProductoRow[]
  errors?: string[]
  error?: string
}

export type UploadProductImageResult =
  | { success: true; path: string }
  | { success: false; error: string; errorDebug?: unknown }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  return Number(v ?? 0)
}

function parseImportBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1
  const raw = String(value ?? "").trim().toLowerCase()
  return ["1", "si", "sí", "true", "yes", "y", "equipo", "pro"].includes(raw)
}

function mapToRow(p: {
  id: string
  tenantId: string
  nombre: string
  sku: string | null
  codigoBarras: string | null
  imagenUrl: string | null
  categoria: string | null
  descripcion: string | null
  marca: string | null
  modelo: string | null
  ubicacion: string | null
  costo: Prisma.Decimal
  precioVenta: Prisma.Decimal
  stockActual: number
  stockMinimo: number
  esEquipo: boolean
  imeiSerie: string | null
  color: string | null
  capacidad: string | null
  procesador: string | null
  ram: string | null
  almacenamiento: string | null
  condicion: string | null
  publicadoEnTienda: boolean
  descripcionPublica: string | null
  createdAt: Date
}, apartado?: { folio: string } | null): ProductoRow {
  return {
    id: p.id,
    taller_id: p.tenantId,
    nombre: p.nombre,
    sku: p.sku,
    codigo_barras: p.codigoBarras,
    imagen_url: (() => {
      const paths = parseImagenUrls(p.imagenUrl)
      if (paths.length === 0) return null
      if (paths.length === 1) return getInventoryPublicUrl(paths[0]) ?? paths[0]
      return JSON.stringify(paths.map((path) => getInventoryPublicUrl(path) ?? path))
    })(),
    categoria: p.categoria,
    descripcion: p.descripcion,
    marca: p.marca,
    modelo: p.modelo,
    ubicacion: p.ubicacion,
    costo: Number(p.costo),
    precio_venta: Number(p.precioVenta),
    stock_actual: p.stockActual,
    stock_minimo: p.stockMinimo,
    es_equipo: p.esEquipo,
    imei_serie: p.imeiSerie,
    color: p.color,
    capacidad: p.capacidad,
    procesador: p.procesador,
    ram: p.ram,
    almacenamiento: p.almacenamiento,
    condicion: p.condicion,
    publicado_en_tienda: p.publicadoEnTienda,
    descripcion_publica: p.descripcionPublica,
    apartado_activo: Boolean(apartado),
    apartado_folio: apartado?.folio ?? null,
    created_at: p.createdAt.toISOString(),
  }
}

async function resolveCanonicalCategoryName(inputCategoria: string | undefined, tenantId: string): Promise<string | null> {
  const normalized = normalizeCategoryName(inputCategoria || "")
  if (!normalized) return null
  const slug = toCategorySlug(normalized)
  if (!slug) return null
  const prisma = getPrismaClient()
  await ensureInventoryBaseCategoriesForTenant(tenantId)
  const aliasMatch = await prisma.inventarioCategoriaAlias.findFirst({
    where: { tenantId, aliasSlug: slug },
    select: { categoria: { select: { nombre: true } } },
  })
  if (aliasMatch?.categoria?.nombre) return aliasMatch.categoria.nombre

  const exactMatch = await prisma.inventarioCategoria.findFirst({
    where: {
      tenantId,
      OR: [{ slug }, { nombre: normalized }],
    },
    select: { nombre: true },
  })
  if (exactMatch?.nombre) return exactMatch.nombre

  const cat = await prisma.inventarioCategoria.create({
    data: {
      tenantId,
      slug,
      nombre: normalized,
      tipo: slug === EQUIPOS_CANONICAL_SLUG ? "special_equipo" : "custom",
      activo: true,
      sortOrder: slug === EQUIPOS_CANONICAL_SLUG ? 3 : 200,
    },
    select: { nombre: true },
  })
  return cat.nombre
}

async function buildData(input: CreateProductoInput, tenantId: string) {
  const esEquipo = Boolean(input.es_equipo)
  const almacStr = (input.almacenamiento || input.capacidad || "").trim() || null
  const categoriaCanonica = await resolveCanonicalCategoryName(input.categoria, tenantId)
  return {
    tenantId,
    nombre: (input.nombre || "").trim(),
    sku: (input.sku || "").trim() || null,
    codigoBarras: (input.codigo_barras || "").trim() || null,
    imagenUrl: normalizeInventoryImagePathForDb(input.imagen_url),
    categoria: categoriaCanonica,
    descripcion: (input.descripcion || "").trim() || null,
    marca: (input.marca || "").trim() || null,
    modelo: (input.modelo || "").trim() || null,
    ubicacion: (input.ubicacion || "").trim() || null,
    costo: Number.isFinite(Number(input.costo)) ? Math.max(0, Number(input.costo)) : 0,
    precioVenta: Number.isFinite(Number(input.precio_venta)) ? Math.max(0, Number(input.precio_venta)) : 0,
    stockActual: input.stock_actual != null ? Math.max(0, Math.floor(Number(input.stock_actual))) : 1,
    stockMinimo: input.stock_minimo != null ? Math.max(0, Math.floor(Number(input.stock_minimo))) : 5,
    esEquipo,
    imeiSerie: esEquipo && (input.imei_serie || "").trim() ? (input.imei_serie || "").trim() : null,
    color: esEquipo && (input.color || "").trim() ? (input.color || "").trim() : null,
    procesador: esEquipo && (input.procesador || "").trim() ? (input.procesador || "").trim() : null,
    ram: esEquipo && (input.ram || "").trim() ? (input.ram || "").trim() : null,
    almacenamiento: esEquipo ? almacStr : null,
    capacidad: esEquipo ? almacStr : null,
    condicion: (input.condicion || "").trim() || null,
    publicadoEnTienda: Boolean(input.publicado_en_tienda),
    descripcionPublica:
      input.descripcion_publica != null && (input.descripcion_publica || "").trim().length > 0
        ? input.descripcion_publica!.trim().slice(0, 500)
        : null,
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getProductos(
  page = 0,
  pageSize = 50,
  search = "",
): Promise<{ data: ProductoRow[]; error: string | null; total: number }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    const q = search.trim()
    const where: Prisma.ProductoWhereInput = { tenantId }
    if (q) {
      where.OR = [
        { nombre: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { codigoBarras: { contains: q, mode: "insensitive" } },
        { descripcion: { contains: q, mode: "insensitive" } },
        { categoria: { contains: q, mode: "insensitive" } },
      ]
    }

    const [data, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: page * pageSize,
        take: pageSize,
      }),
      prisma.producto.count({ where }),
    ])

    const productIds = data.map((p) => p.id)
    const apartados = productIds.length
      ? await prisma.apartado.findMany({
          where: {
            tenantId,
            productoId: { in: productIds },
            estado: { in: ["activo", "vencido"] },
          },
          select: { productoId: true, folio: true },
          orderBy: { createdAt: "desc" },
        })
      : []
    const apartadoByProduct = new Map(apartados.map((a) => [a.productoId, { folio: a.folio }]))

    return { data: data.map((p) => mapToRow(p, apartadoByProduct.get(p.id))), error: null, total }
  } catch (error) {
    console.error("[productos-prisma] getProductos:", error)
    return { data: [], error: error instanceof Error ? error.message : "Error al cargar inventario", total: 0 }
  }
}

export async function getInventoryOperationalKpis(): Promise<{
  valorEnRiesgo: number
  rotacionDiasPromedio: number
  error: string | null
}> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()

    const rows = await prisma.$queryRawUnsafe<Array<{ valor: number }>>(
      `SELECT COALESCE(SUM(COALESCE(costo,0) * COALESCE(stock_actual,0)),0)::float8 AS valor
       FROM productos
       WHERE taller_id = $1 AND COALESCE(stock_actual,0) <= COALESCE(stock_minimo,0)`,
      tenantId,
    )

    return { valorEnRiesgo: Number(rows[0]?.valor ?? 0), rotacionDiasPromedio: 0, error: null }
  } catch (error) {
    return { valorEnRiesgo: 0, rotacionDiasPromedio: 0, error: error instanceof Error ? error.message : "Error KPI" }
  }
}

export async function loadInventarioMountData(page: number, pageSize: number, search: string) {
  const categoriesPromise = import("@/lib/actions/inventory-categories-prisma").then((m) =>
    m.listInventoryCategories({ includeInactive: true }),
  )
  const [productos, kpis, categorias] = await Promise.all([
    getProductos(page, pageSize, search),
    getInventoryOperationalKpis(),
    categoriesPromise,
  ])
  return { productos, kpis, categorias }
}

export async function getProductosInventarioExport(): Promise<{ data: ProductoRow[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    const data = await prisma.producto.findMany({
      where: { tenantId },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    })
    return { data: data.map((p) => mapToRow(p)), error: null }
  } catch (error) {
    console.error("[productos-prisma] getProductosInventarioExport:", error)
    return { data: [], error: error instanceof Error ? error.message : "No se pudo exportar inventario" }
  }
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createProducto(
  input: CreateProductoInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    const nombre = (input.nombre || "").trim()
    if (!nombre) return { success: false, error: "El nombre del producto es obligatorio." }

    const data = await buildData(input, tenantId)

    if (input.id?.trim()) {
      await prisma.producto.upsert({
        where: { id: input.id.trim() },
        create: { id: input.id.trim(), ...data },
        update: data,
      })
    } else {
      await prisma.producto.create({ data })
    }

    revalidatePath("/dashboard/inventario")
    revalidatePath("/dashboard/ventas")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function createEquiposLote(input: CreateEquiposLoteInput): Promise<CreateEquiposLoteResult> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, trialEndsAt: true },
    })
    const inTrial = Boolean(tenant?.trialEndsAt && tenant.trialEndsAt.getTime() >= Date.now())
    const isPro = tenant?.plan === "PRO" || inTrial
    if (!isPro) {
      return {
        success: false,
        createdCount: 0,
        productos: [],
        error: "Alta por lote esta disponible para PLAN PRO o Trial activo.",
      }
    }

    const nombre = (input.nombre || "").trim()
    if (!nombre) {
      return { success: false, createdCount: 0, productos: [], error: "El nombre base del equipo es obligatorio." }
    }

    const normalizedSeries = input.series
      .map((serie) => serie.trim())
      .filter(Boolean)
    if (normalizedSeries.length === 0) {
      return { success: false, createdCount: 0, productos: [], error: "Ingresa al menos una serie." }
    }
    if (normalizedSeries.length > 100) {
      return { success: false, createdCount: 0, productos: [], error: "Por seguridad, el maximo por lote es de 100 equipos." }
    }

    const errors: string[] = []
    const seen = new Set<string>()
    const duplicatedInBatch = new Set<string>()
    for (const serie of normalizedSeries) {
      const key = serie.toLowerCase()
      if (seen.has(key)) duplicatedInBatch.add(serie)
      seen.add(key)
      if (serie.length < 5) errors.push(`Serie "${serie}": minimo 5 caracteres.`)
    }
    for (const serie of duplicatedInBatch) {
      errors.push(`Serie duplicada en este lote: ${serie}`)
    }

    const existingSeries = normalizedSeries.length
      ? await prisma.producto.findMany({
          where: {
            tenantId,
            imeiSerie: { in: normalizedSeries },
          },
          select: { imeiSerie: true },
        })
      : []
    for (const row of existingSeries) {
      if (row.imeiSerie) errors.push(`La serie ya existe en inventario: ${row.imeiSerie}`)
    }

    if (errors.length > 0) {
      return { success: false, createdCount: 0, productos: [], errors }
    }

    const categoriaCanonica = await resolveCanonicalCategoryName(input.categoria || "Equipos", tenantId)
    const almacStr = (input.almacenamiento || input.capacidad || "").trim() || null
    const barcodePrefix = `200${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}`
    const existingCodesToday = await prisma.producto.findMany({
      where: {
        tenantId,
        codigoBarras: { startsWith: barcodePrefix },
      },
      select: { codigoBarras: true },
    })
    const blockedCodes = new Set(existingCodesToday.map((row) => row.codigoBarras).filter(Boolean) as string[])
    const generatedCodes: string[] = []
    const generatedSet = new Set<string>()
    for (let i = 0; i < normalizedSeries.length; i += 1) {
      let code = generateInventoryBarcode()
      let attempts = 0
      while ((generatedSet.has(code) || blockedCodes.has(code)) && attempts < 100) {
        code = generateInventoryBarcode()
        attempts += 1
      }
      if (generatedSet.has(code) || blockedCodes.has(code)) {
        return {
          success: false,
          createdCount: 0,
          productos: [],
          error: "No se pudo generar un codigo unico para el lote. Intenta de nuevo.",
        }
      }
      generatedSet.add(code)
      generatedCodes.push(code)
    }

    const created = await prisma.$transaction(async (tx) => {
      const rows = []
      for (let i = 0; i < normalizedSeries.length; i += 1) {
        const serie = normalizedSeries[i]
        const row = await tx.producto.create({
          data: {
            tenantId,
            nombre,
            sku: (input.sku || "").trim() || null,
            codigoBarras: generatedCodes[i],
            imagenUrl: null,
            categoria: categoriaCanonica,
            descripcion: (input.descripcion || "").trim() || null,
            marca: (input.marca || "").trim() || null,
            modelo: (input.modelo || "").trim() || null,
            ubicacion: (input.ubicacion || "").trim() || null,
            costo: Number.isFinite(Number(input.costo)) ? Math.max(0, Number(input.costo)) : 0,
            precioVenta: Number.isFinite(Number(input.precio_venta)) ? Math.max(0, Number(input.precio_venta)) : 0,
            stockActual: 1,
            stockMinimo: Math.max(0, Math.floor(Number(input.stock_minimo ?? 1))),
            esEquipo: true,
            imeiSerie: serie,
            color: (input.color || "").trim() || null,
            procesador: (input.procesador || "").trim() || null,
            ram: (input.ram || "").trim() || null,
            almacenamiento: almacStr,
            capacidad: almacStr,
            condicion: (input.condicion || "").trim() || null,
            publicadoEnTienda: false,
            descripcionPublica: null,
          },
        })
        rows.push(row)
      }
      return rows
    }, { timeout: 15000 })

    revalidatePath("/dashboard/inventario")
    revalidatePath("/dashboard/ventas")

    return {
      success: true,
      createdCount: created.length,
      productos: created.map((row) => mapToRow(row)),
    }
  } catch (err) {
    return {
      success: false,
      createdCount: 0,
      productos: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function uploadProductImage(
  base64Image: string,
  productId: string,
  mimeType?: string,
  slot?: number,
): Promise<UploadProductImageResult> {
  try {
    if (!base64Image?.trim()) return { success: false, error: "No hay imagen" }
    const tenantId = await getCurrentTallerId()
    const base64 = base64Image.startsWith("data:image") ? base64Image.split(",")[1] : base64Image
    if (!base64) return { success: false, error: "Formato de imagen no valido" }

    const buffer = Buffer.from(base64, "base64")
    const effectiveMime = mimeType || "image/webp"
    const ext = effectiveMime.includes("jpeg") || effectiveMime.includes("jpg")
      ? "jpg"
      : effectiveMime.includes("png")
        ? "png"
        : "webp"
    const slotSuffix = slot && slot > 1 ? `_${slot}` : ""
    const versionSuffix = Date.now()
    const fileName = sanitizeFileName(`${productId}${slotSuffix}-${versionSuffix}.${ext}`)
    const key = `inventario/${tenantId}/${fileName}`

    await uploadFileToS3({ key, body: buffer, contentType: effectiveMime })

    // Generate and upload thumbnail (300px server-side via sharp)
    try {
      const sharp = (await import("sharp")).default
      const thumbBuffer = await sharp(buffer)
        .resize(300, 300, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer()
      const thumbKey = getThumbnailPath(key)
      await uploadFileToS3({ key: thumbKey, body: thumbBuffer, contentType: "image/webp" })
    } catch {
      // Thumbnail generation is non-critical; main image already uploaded
    }

    return { success: true, path: key }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al subir imagen", errorDebug: e }
  }
}

export async function bulkImportProductos(
  rows: BulkImportProductoInput[],
): Promise<{
  success: boolean
  insertedCount: number
  skippedCount: number
  totalCostoCarga: number
  errors?: string[]
}> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()
    let insertedCount = 0
    let totalCostoCarga = 0
    const errors: string[] = []

    const validRows: { row: BulkImportProductoInput; index: number }[] = []
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      const nombre = (row.nombre || "").trim()
      if (!nombre) {
        errors.push(`Fila ${i + 1}: el nombre es obligatorio.`)
        continue
      }
      validRows.push({ row, index: i })
    }

    if (validRows.length === 0) {
      return {
        success: false,
        insertedCount: 0,
        skippedCount: rows.length,
        totalCostoCarga: 0,
        errors: errors.length ? errors : undefined,
      }
    }

    await ensureInventoryBaseCategoriesForTenant(tenantId)

    const uniqueCats = [...new Set(validRows.map((v) => (v.row.categoria || "").trim()).filter(Boolean))]
    const catMap = new Map<string, string>()
    if (uniqueCats.length > 0) {
      const catResults = await Promise.all(
        uniqueCats.map(async (cat) => {
          const slug = toCategorySlug(normalizeCategoryName(cat))
          if (!slug) return [cat, cat] as const
          const upserted = await prisma.inventarioCategoria.upsert({
            where: { tenantId_slug: { tenantId, slug } },
            create: { tenantId, slug, nombre: cat, tipo: slug === "equipos" ? "special_equipo" : "custom", activo: true, sortOrder: slug === "equipos" ? 3 : 200 },
            update: { nombre: cat, activo: true },
          })
          return [cat, upserted.nombre] as const
        }),
      )
      for (const [input, resolved] of catResults) catMap.set(input, resolved)
    }

    const BATCH = 100
    for (let b = 0; b < validRows.length; b += BATCH) {
      const chunk = validRows.slice(b, b + BATCH)
      const data = chunk.map(({ row }) => {
        const nombre = (row.nombre || "").trim()
        const cat = (row.categoria || "").trim()
        const categoriaCanonica = catMap.get(cat) ?? null
        const costo = Number.isFinite(Number(row.costo)) ? Math.max(0, Number(row.costo)) : 0
        const stock = Math.max(0, Math.floor(Number(row.stock_actual ?? 1)))
        const esEquipo = parseImportBoolean(row.es_equipo) || Boolean((row.imei_serie || "").trim())
        return {
          tenantId,
          nombre,
          sku: (row.sku || "").trim() || null,
          codigoBarras: (row.codigo_barras || "").trim() || null,
          categoria: categoriaCanonica,
          descripcion: (row.descripcion || "").trim() || null,
          marca: (row.marca || "").trim() || null,
          modelo: (row.modelo || "").trim() || null,
          ubicacion: (row.ubicacion || "").trim() || null,
          costo,
          precioVenta: Number.isFinite(Number(row.precio_venta)) ? Math.max(0, Number(row.precio_venta)) : 0,
          stockActual: stock,
          stockMinimo: Math.max(0, Math.floor(Number(row.stock_minimo ?? 5))),
          esEquipo,
          imeiSerie: (row.imei_serie || "").trim() || null,
          color: (row.color || "").trim() || null,
          capacidad: (row.capacidad || "").trim() || null,
          procesador: (row.procesador || "").trim() || null,
          ram: (row.ram || "").trim() || null,
          almacenamiento: (row.almacenamiento || "").trim() || null,
          condicion: (row.condicion || "").trim() || null,
          publicadoEnTienda: parseImportBoolean(row.publicado_en_tienda),
          descripcionPublica: (row.descripcion_publica || "").trim() || null,
        }
      })
      const result = await prisma.producto.createMany({ data, skipDuplicates: true })
      insertedCount += result.count
      for (const { row } of chunk) {
        const costo = Number.isFinite(Number(row.costo)) ? Math.max(0, Number(row.costo)) : 0
        const stock = Math.max(0, Math.floor(Number(row.stock_actual ?? 1)))
        totalCostoCarga += costo * stock
      }
    }

    revalidatePath("/dashboard/inventario")
    return {
      success: insertedCount > 0,
      insertedCount,
      skippedCount: rows.length - insertedCount,
      totalCostoCarga,
      errors: errors.length ? errors : undefined,
    }
  } catch (err) {
    return {
      success: false,
      insertedCount: 0,
      skippedCount: rows.length,
      totalCostoCarga: 0,
      errors: [err instanceof Error ? err.message : String(err)],
    }
  }
}

async function deleteProductoImagesFromR2(imagenUrlRaw: string | null): Promise<void> {
  if (!imagenUrlRaw) return
  const paths = parseImagenUrls(imagenUrlRaw)
  const r2Keys = paths
    .map((p) => normalizeInventoryImagePathForDb(p))
    .filter((p): p is string => Boolean(p && p.startsWith("inventario/")))
    .flatMap((p) => [p, getThumbnailPath(p)])
  await Promise.allSettled(r2Keys.map((key) => deleteFromS3(key)))
}

export async function deleteProductImageAction(path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPath = normalizeInventoryImagePathForDb(path)
    if (!normalizedPath || !normalizedPath.startsWith("inventario/")) {
      return { success: false, error: "Ruta de imagen no valida" }
    }
    await deleteProductoImagesFromR2(normalizedPath)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function deleteProducto(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getCurrentTallerId()

    const producto = await prisma.producto.findFirst({
      where: { id, tenantId },
      select: { imagenUrl: true },
    })
    if (producto?.imagenUrl) {
      await deleteProductoImagesFromR2(producto.imagenUrl)
    }

    await prisma.producto.deleteMany({ where: { id, tenantId } })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
