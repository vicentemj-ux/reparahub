"use server"

import { headers } from "next/headers"
import { getPrismaClient } from "@/lib/prisma"
import { getInventoryPublicUrl, getInventoryPublicUrls } from "@/lib/storage"

export interface TiendaPublicaProducto {
  id: string
  nombre: string
  precioVenta: number
  imagenUrl: string | null
  imagenUrls: string[]
  marca: string | null
  modelo: string | null
  categoria: string | null
  descripcionPublica: string | null
  stockDisponible: boolean
}

export interface TiendaPublicaInfo {
  slug: string
  nombreComercial: string
  logoUrl: string | null
  slogan: string | null
  horarios: string | null
  redes: {
    whatsapp?: string | null
    instagram?: string | null
    facebook?: string | null
    website?: string | null
  }
  isPro: boolean
  activatedAt: Date | null
}

export type GetTiendaResult =
  | { success: true; tienda: TiendaPublicaInfo; productos: TiendaPublicaProducto[] }
  | { success: false; error: "no_encontrada" | "desactivada" }

export type GetProductoResult =
  | { success: true; tienda: TiendaPublicaInfo; producto: TiendaPublicaProducto }
  | { success: false; error: "no_encontrado" | "desactivado" }

export async function getTiendaPorSlug(slug: string): Promise<GetTiendaResult> {
  const safeSlug = (slug || "").trim().toLowerCase()
  if (!safeSlug || !/^[a-z0-9-]{3,40}$/.test(safeSlug)) {
    return { success: false, error: "no_encontrada" }
  }
  try {
    const prisma = getPrismaClient()
    const tenant = await prisma.tenant.findUnique({
      where: { slug: safeSlug },
      select: {
        id: true,
        nombre: true,
        logoUrl: true,
        tiendaPublicaActiva: true,
        tiendaSlogan: true,
        tiendaRedes: true,
        tiendaHorarios: true,
        tiendaActivadaEn: true,
        plan: true,
        trialEndsAt: true,
      },
    })
    if (!tenant) return { success: false, error: "no_encontrada" }
    if (!tenant.tiendaPublicaActiva) return { success: false, error: "desactivada" }

    const productos = await prisma.producto.findMany({
      where: { tenantId: tenant.id, publicadoEnTienda: true },
      orderBy: [{ ordenTienda: "asc" }, { nombre: "asc" }],
      select: {
        id: true,
        nombre: true,
        precioVenta: true,
        imagenUrl: true,
        marca: true,
        modelo: true,
        categoria: true,
        descripcionPublica: true,
        stockActual: true,
      },
    })

    const tienda: TiendaPublicaInfo = {
      slug: safeSlug,
      nombreComercial: tenant.nombre,
      logoUrl: tenant.logoUrl,
      slogan: tenant.tiendaSlogan,
      horarios: tenant.tiendaHorarios,
      redes: (tenant.tiendaRedes as TiendaPublicaInfo["redes"]) ?? {},
      isPro: tenant.plan === "PRO" || (!!tenant.trialEndsAt && tenant.trialEndsAt.getTime() > Date.now()),
      activatedAt: tenant.tiendaActivadaEn,
    }

    const items: TiendaPublicaProducto[] = productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precioVenta: Number(p.precioVenta),
      imagenUrl: getInventoryPublicUrl(p.imagenUrl),
      imagenUrls: getInventoryPublicUrls(p.imagenUrl),
      marca: p.marca,
      modelo: p.modelo,
      categoria: p.categoria,
      descripcionPublica: p.descripcionPublica,
      stockDisponible: p.stockActual > 0,
    }))

    return { success: true, tienda, productos: items }
  } catch (e) {
    console.error("[tienda-publica] getTiendaPorSlug:", e)
    return { success: false, error: "no_encontrada" }
  }
}

export async function getProductoPublicoPorId(
  slug: string,
  productoId: string,
): Promise<GetProductoResult> {
  const safeSlug = (slug || "").trim().toLowerCase()
  const safeId = (productoId || "").trim()
  if (!safeSlug || !safeId) return { success: false, error: "no_encontrado" }
  try {
    const prisma = getPrismaClient()
    const tenant = await prisma.tenant.findUnique({
      where: { slug: safeSlug },
      select: {
        id: true,
        nombre: true,
        logoUrl: true,
        tiendaPublicaActiva: true,
        tiendaSlogan: true,
        tiendaRedes: true,
        tiendaHorarios: true,
        tiendaActivadaEn: true,
        plan: true,
        trialEndsAt: true,
      },
    })
    if (!tenant) return { success: false, error: "no_encontrado" }
    if (!tenant.tiendaPublicaActiva) return { success: false, error: "desactivado" }

    const p = await prisma.producto.findFirst({
      where: { id: safeId, tenantId: tenant.id, publicadoEnTienda: true },
      select: {
        id: true,
        nombre: true,
        precioVenta: true,
        imagenUrl: true,
        marca: true,
        modelo: true,
        categoria: true,
        descripcionPublica: true,
        stockActual: true,
      },
    })
    if (!p) return { success: false, error: "no_encontrado" }

    const tienda: TiendaPublicaInfo = {
      slug: safeSlug,
      nombreComercial: tenant.nombre,
      logoUrl: tenant.logoUrl,
      slogan: tenant.tiendaSlogan,
      horarios: tenant.tiendaHorarios,
      redes: (tenant.tiendaRedes as TiendaPublicaInfo["redes"]) ?? {},
      isPro: tenant.plan === "PRO" || (!!tenant.trialEndsAt && tenant.trialEndsAt.getTime() > Date.now()),
      activatedAt: tenant.tiendaActivadaEn,
    }

    const producto: TiendaPublicaProducto = {
      id: p.id,
      nombre: p.nombre,
      precioVenta: Number(p.precioVenta),
      imagenUrl: getInventoryPublicUrl(p.imagenUrl),
      imagenUrls: getInventoryPublicUrls(p.imagenUrl),
      marca: p.marca,
      modelo: p.modelo,
      categoria: p.categoria,
      descripcionPublica: p.descripcionPublica,
      stockDisponible: p.stockActual > 0,
    }

    return { success: true, tienda, producto }
  } catch (e) {
    console.error("[tienda-publica] getProductoPublicoPorId:", e)
    return { success: false, error: "no_encontrado" }
  }
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{3,40}$/.test(slug)
}

export async function registrarVistaTienda(
  slug: string,
  tipo: "visita_catalogo" | "visita_producto" | "clic_whatsapp",
  productoId?: string | null,
): Promise<void> {
  const safeSlug = (slug || "").trim().toLowerCase()
  if (!isValidSlug(safeSlug)) return
  try {
    const prisma = getPrismaClient()
    const tenant = await prisma.tenant.findUnique({
      where: { slug: safeSlug },
      select: { id: true },
    })
    if (!tenant) return

    const h = await headers()
    const userAgent = h.get("user-agent")?.slice(0, 500) ?? null
    const referrer = h.get("referer")?.slice(0, 500) ?? null

    await prisma.tiendaEvento.create({
      data: {
        tenantId: tenant.id,
        tipo,
        productoId: productoId ?? null,
        userAgent,
        referrer,
      },
    })
  } catch (e) {
    console.error("[tienda-publica] registrarVistaTienda (no bloqueante):", e)
  }
}
