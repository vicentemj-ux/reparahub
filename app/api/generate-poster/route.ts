import { readFile } from "fs/promises"
import path from "path"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import satori from "satori"
import { Resvg } from "@resvg/resvg-js"
import type { ProductoRow } from "@/lib/actions/productos-prisma"
import { getPrismaClient } from "@/lib/prisma"
import {
  PosterExhibicionSatoriTemplate,
  POSTER_SQUARE_PX,
  POSTER_VERTICAL_WIDTH,
  POSTER_VERTICAL_HEIGHT,
  type PosterImageFormat,
} from "@/lib/print/poster-exhibicion-satori"
import type { SatoriFont } from "@/lib/print/poster-satori-fonts"
import { resolvePosterProductImageUrl } from "@/lib/print/poster-exhibicion-utils"
import { BUCKETS, getPublicUrl } from "@/lib/storage"

export const dynamic = "force-static"
export const runtime = "nodejs"

const LOG = "[api/generate-poster]"

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

/** Copia los bytes a un ArrayBuffer dedicado (evita vistas sobre el pool de Buffer). */
function cloneArrayBuffer(ab: ArrayBuffer): ArrayBuffer {
  const src = new Uint8Array(ab)
  const dst = new Uint8Array(src.byteLength)
  dst.set(src)
  return dst.buffer
}

/** Fuentes servidas en produccion como /fonts/*.woff (tambien en public/fonts). */
const POSTER_FONT_FILES: { file: string; weight: 400 | 600 | 700 | 900 }[] = [
  { file: "inter-latin-400-normal.woff", weight: 400 },
  { file: "inter-latin-600-normal.woff", weight: 600 },
  { file: "inter-latin-700-normal.woff", weight: 700 },
  { file: "inter-latin-900-normal.woff", weight: 900 },
]

/**
 * Carga robusta: primero fetch desde el sitio publico; si falla, lectura local (Vercel incluye `public/`).
 */
async function loadPosterFonts(): Promise<SatoriFont[]> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://reparahub.com").replace(/\/$/, "")
  const fonts: SatoriFont[] = []

  for (const { file, weight } of POSTER_FONT_FILES) {
    let data: ArrayBuffer | null = null
    let fetchError: Error | null = null

    try {
      const fontUrl = new URL(`/fonts/${file}`, `${baseUrl}/`)
      const fontRes = await fetch(fontUrl, { cache: "no-store" })
      if (!fontRes.ok) {
        throw new Error(`Fallo la carga de fuente: ${fontRes.status} ${fontRes.statusText}`)
      }
      data = await fontRes.arrayBuffer()
      if (data.byteLength === 0) throw new Error("La fuente esta vacia")
    } catch (e) {
      fetchError = e instanceof Error ? e : new Error(String(e))
      const diskPath = path.join(process.cwd(), "public", "fonts", file)
      try {
        const buf = await readFile(diskPath)
        data = bufferToArrayBuffer(buf)
        if (data.byteLength === 0) throw new Error("La fuente en disco esta vacia")
      } catch {
        const msg = fetchError.message
        throw new Error(`Error al cargar recursos estaticos: ${msg}`)
      }
    }

    const fontData = cloneArrayBuffer(data!)
    fonts.push({
      name: "Inter",
      data: fontData,
      weight,
      style: "normal",
    })
  }

  return fonts
}

type FetchImageStep = "fetch-images:logo" | "fetch-images:product"

async function fetchAsDataUrl(
  url: string,
  step: FetchImageStep
): Promise<{ success: true; dataUrl: string } | { success: false; reason: string }> {
  const trimmed = url.trim()
  if (!trimmed) return { success: false, reason: "URL vacia" }
  if (trimmed.startsWith("data:image/")) {
    return { success: true, dataUrl: trimmed }
  }
  if (trimmed.startsWith("blob:")) {
    return { success: false, reason: "blob: no disponible en el servidor" }
  }

  try {
    const res = await fetch(trimmed, {
      cache: "no-store",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "ReparaHubPoster/1.0 (+https://reparahub.com)",
      },
    })
    if (!res.ok) {
      return { success: false, reason: `HTTP ${res.status} ${res.statusText}` }
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0) {
      return { success: false, reason: "Respuesta vacia" }
    }
    const ct = res.headers.get("content-type") || "image/jpeg"
    const mime = ct.startsWith("image/") ? ct.split(";")[0].trim() : "image/jpeg"
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`
    return { success: true, dataUrl }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(LOG, step, "fetch error", { urlPreview: trimmed.slice(0, 80), error: msg })
    return { success: false, reason: msg }
  }
}

function resolveTallerLogoUrl(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null
  const s = String(raw).trim()
  if (s.startsWith("http://") || s.startsWith("https://")) return s
  if (s.startsWith("data:")) return s
  return getPublicUrl(BUCKETS.TALLER, s.replace(/^\/+/, ""))
}

function parseIsOffer(v: string | null | undefined): boolean {
  if (!v) return false
  const t = v.toLowerCase()
  return t === "1" || t === "true" || t === "yes"
}

function parsePrecioOferta(v: string | null | undefined): number | null {
  if (v == null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function parseFormat(v: string | null | undefined): PosterImageFormat {
  const t = (v || "").trim().toLowerCase()
  if (t === "vertical" || t === "story" || t === "stories" || t === "9:16") return "vertical"
  return "square"
}

function jsonError(
  status: number,
  payload: {
    error: string
    step?: string
    code?: string
    details?: string
    cause?: string
  }
) {
  return NextResponse.json(payload, { status })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")?.trim()
  if (!id) {
    return NextResponse.json({ error: "Falta parametro id" }, { status: 400 })
  }
  const isOffer = parseIsOffer(searchParams.get("isOffer"))
  const precioOferta = parsePrecioOferta(searchParams.get("precioOferta"))
  const format = parseFormat(searchParams.get("format"))
  return generatePosterResponse(id, isOffer, precioOferta, format)
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 })
  }
  const id = typeof body.id === "string" ? body.id.trim() : ""
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 })
  }
  const isOffer =
    body.isOffer === true || body.isOffer === "true" || body.isOffer === 1 || body.isOffer === "1"
  const precioRaw = body.precioOferta
  let precioOferta: number | null = null
  if (typeof precioRaw === "number" && Number.isFinite(precioRaw)) {
    precioOferta = precioRaw
  } else if (typeof precioRaw === "string" && precioRaw.trim() !== "") {
    const n = Number(precioRaw)
    precioOferta = Number.isFinite(n) ? n : null
  }
  const format =
    typeof body.format === "string" ? parseFormat(body.format) : parseFormat(null)
  return generatePosterResponse(id, isOffer, precioOferta, format)
}

async function generatePosterResponse(
  productId: string,
  isOffer: boolean,
  precioOferta: number | null,
  format: PosterImageFormat,
): Promise<NextResponse> {
  let step = "init"
  try {
    step = "cookies"
    const cookieStore = await cookies()
    const tallerId = cookieStore.get("tallerId")?.value
    if (!tallerId?.trim()) {
      return jsonError(401, { error: "No autorizado: falta cookie de sesion (tallerId) o sesion expirada.", step })
    }

    step = "plan-check"
    const prisma = getPrismaClient()
    const tenant = await prisma.tenant.findUnique({
      where: { id: tallerId },
      select: { plan: true, trialEndsAt: true },
    })
    const inTrial = Boolean(tenant?.trialEndsAt && tenant.trialEndsAt.getTime() >= Date.now())
    const isProTaller = tenant?.plan === "PRO" || inTrial

    if (format === "vertical" && !isProTaller) {
      return jsonError(403, {
        code: "PLAN_PRO_REQUIRED",
        error:
          "El formato vertical (WhatsApp / Stories) esta disponible en el Plan Pro. Actualiza tu plan en Configuracion para descargarlo.",
        step,
      })
    }

    step = "db-producto"
    const producto = await prisma.producto.findFirst({
      where: { id: productId, tenantId: tallerId },
    })
    if (!producto) {
      return jsonError(404, {
        error: "Producto no encontrado o sin acceso.",
        step,
      })
    }

    step = "db-config"
    const cfg = await prisma.configuracionTaller.findUnique({
      where: { tenantId: tallerId },
      select: { nombreComercial: true, logoUrl: true },
    })

    const businessName = String(cfg?.nombreComercial || "Mi Taller").trim() || "Mi Taller"
    const logoUrl = resolveTallerLogoUrl(cfg?.logoUrl ?? null)
    const rowProducto: ProductoRow = {
      id: producto.id,
      taller_id: producto.tenantId,
      nombre: producto.nombre,
      sku: producto.sku,
      codigo_barras: producto.codigoBarras,
      imagen_url: producto.imagenUrl,
      categoria: producto.categoria,
      descripcion: producto.descripcion,
      marca: producto.marca,
      modelo: producto.modelo,
      ubicacion: producto.ubicacion,
      costo: Number(producto.costo),
      precio_venta: Number(producto.precioVenta),
      stock_actual: producto.stockActual,
      stock_minimo: producto.stockMinimo,
      es_equipo: producto.esEquipo,
      imei_serie: producto.imeiSerie,
      color: producto.color,
      capacidad: producto.capacidad,
      procesador: producto.procesador,
      ram: producto.ram,
      almacenamiento: producto.almacenamiento,
      condicion: producto.condicion,
      created_at: producto.createdAt.toISOString(),
    }
    const productImgUrl = resolvePosterProductImageUrl(rowProducto)

    step = "fetch-images"
    const [logoResult, productResult] = await Promise.all([
      logoUrl ? fetchAsDataUrl(logoUrl, "fetch-images:logo") : Promise.resolve(null),
      productImgUrl ? fetchAsDataUrl(productImgUrl, "fetch-images:product") : Promise.resolve(null),
    ])

    const logoDataUrl = logoResult?.success ? logoResult.dataUrl : undefined
    const productImageDataUrl = productResult?.success ? productResult.dataUrl : undefined

    if (logoUrl && logoResult && !logoResult.success) {
      console.warn(LOG, "logo fetch skipped", { reason: logoResult.reason })
    }
    if (productImgUrl && productResult && !productResult.success) {
      console.warn(LOG, "product image fetch skipped", { reason: productResult.reason })
    }

    step = "fonts"
    let fonts: SatoriFont[]
    try {
      fonts = await loadPosterFonts()
    } catch (fontErr) {
      const msg = fontErr instanceof Error ? fontErr.message : String(fontErr)
      console.error(LOG, step, msg)
      return jsonError(500, {
        error: msg.startsWith("Error al cargar recursos estaticos:")
          ? msg
          : `Error al cargar recursos estaticos: ${msg}`,
        step,
      })
    }

    const width = format === "vertical" ? POSTER_VERTICAL_WIDTH : POSTER_SQUARE_PX
    const height = format === "vertical" ? POSTER_VERTICAL_HEIGHT : POSTER_SQUARE_PX

    step = "satori"
    const svg = await satori(
      PosterExhibicionSatoriTemplate({
        producto: rowProducto,
        precio_oferta: precioOferta,
        isOffer,
        businessName,
        logoDataUrl: logoDataUrl ?? undefined,
        productImageDataUrl: productImageDataUrl ?? undefined,
        format,
      }),
      {
        width,
        height,
        fonts: fonts.map((f) => ({
          name: f.name,
          data: f.data,
          weight: f.weight,
          style: f.style,
        })),
      }
    )

    step = "resvg"
    const resvg = new Resvg(svg, {
      background: "#ffffff",
    })
    const pngBuffer = resvg.render().asPng()

    const row = rowProducto
    const sku = row.sku || productId
    const safeName = String(sku).replace(/[^a-zA-Z0-9-_]/g, "_")
    const suffix = format === "vertical" ? "whatsapp-stories" : "facebook-1080"
    const filename = `poster-${suffix}-${safeName}.png`

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    const full = stack ? `${message}\n\n${stack}` : message
    console.error(LOG, "FAIL", { step, message, stack })

    return jsonError(500, {
      error: message || "Error al generar el poster",
      step,
      details: full,
      cause: err instanceof Error ? err.name : undefined,
    })
  }
}
