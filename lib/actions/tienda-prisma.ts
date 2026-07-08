"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { getPrismaClient } from "@/lib/prisma"
import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import {
  canPublishMoreProductos,
  getMercadoLimit,
  getRemainingSlots,
  isMercadoLimitReached,
} from "@/lib/limits/mercado-limits"
import { getEsUsuarioPro } from "@/lib/actions/auth-prisma"
import { sendTiendaActivadaEmail } from "@/lib/email/send"

export interface TiendaRedesInput {
  whatsapp?: string | null
  instagram?: string | null
  facebook?: string | null
  tiktok?: string | null
  website?: string | null
}

export interface TiendaConfig {
  activa: boolean
  slogan: string | null
  redes: TiendaRedesInput
  horarios: string | null
  slug: string
  nombreComercial: string
  logoUrl: string | null
}

export interface TiendaConfigFull extends TiendaConfig {
  publishedCount: number
  totalProductos: number
  limit: number
  remaining: number
  isPro: boolean
  inTrial: boolean
  activatedAt: Date | null
}

export interface TiendaProductoItem {
  id: string
  nombre: string
  precioVenta: number
  imagenUrl: string | null
  marca: string | null
  modelo: string | null
  categoria: string | null
  stockActual: number
  publicadoEnTienda: boolean
  ordenTienda: number
  descripcionPublica: string | null
}

export type TiendaActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

export async function getMiTiendaConfig(): Promise<TiendaActionResult<TiendaConfigFull>> {
  try {
    const tallerId = await getTenantIdOrThrow()
    const prisma = getPrismaClient()
    const isPro = await getEsUsuarioPro()

    const tenant = await prisma.tenant.findUnique({
      where: { id: tallerId },
      select: {
        slug: true,
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
    if (!tenant) return { success: false, error: "Taller no encontrado" }

    const inTrial = !!tenant.trialEndsAt && tenant.trialEndsAt.getTime() > Date.now()
    const plan = tenant.plan

    const [publishedCount, totalProductos] = await Promise.all([
      prisma.producto.count({
        where: { tenantId: tallerId, publicadoEnTienda: true },
      }),
      prisma.producto.count({ where: { tenantId: tallerId } }),
    ])

    const redes = (tenant.tiendaRedes as TiendaRedesInput | null) ?? {}

    return {
      success: true,
      data: {
        activa: tenant.tiendaPublicaActiva,
        slogan: tenant.tiendaSlogan,
        redes,
        horarios: tenant.tiendaHorarios,
        slug: tenant.slug,
        nombreComercial: tenant.nombre,
        logoUrl: tenant.logoUrl,
        publishedCount,
        totalProductos,
        limit: getMercadoLimit(plan, inTrial),
        remaining: getRemainingSlots(publishedCount, plan, inTrial),
        isPro,
        inTrial,
        activatedAt: tenant.tiendaActivadaEn,
      },
    }
  } catch (e) {
    console.error("[tienda-prisma] getMiTiendaConfig:", e)
    const raw = e instanceof Error ? e.message : "Error desconocido"
    if (raw.includes("tienda_publica_activa") || raw.includes("tienda_slogan") || raw.includes("tienda_redes")) {
      return {
        success: false,
        error:
          "Falta aplicar la migracion de Mi Tienda en la base de datos. Ejecuta: pnpm prisma migrate deploy",
      }
    }
    return { success: false, error: `No se pudo cargar la configuracion: ${raw}` }
  }
}

export async function updateMiTiendaConfig(input: {
  activa: boolean
  slogan?: string | null
  redes?: TiendaRedesInput
  horarios?: string | null
}): Promise<TiendaActionResult> {
  try {
    const tallerId = await getTenantIdOrThrow()
    const prisma = getPrismaClient()

    const tenant = await prisma.tenant.findUnique({
      where: { id: tallerId },
      select: {
        slug: true,
        nombre: true,
        tiendaPublicaActiva: true,
        tiendaActivadaEn: true,
        plan: true,
        trialEndsAt: true,
      },
    })
    if (!tenant) return { success: false, error: "Taller no encontrado" }

    if (input.activa && !tenant.tiendaPublicaActiva) {
      const publishedCount = await prisma.producto.count({
        where: { tenantId: tallerId, publicadoEnTienda: true },
      })
      const inTrial = !!tenant.trialEndsAt && tenant.trialEndsAt.getTime() > Date.now()
      if (isMercadoLimitReached(publishedCount, tenant.plan, inTrial) && publishedCount > 0) {
        return {
          success: false,
          error: "Tienes productos publicados. Revisa que no excedas el limite del plan.",
        }
      }
    }

    await prisma.tenant.update({
      where: { id: tallerId },
      data: {
        tiendaPublicaActiva: input.activa,
        tiendaSlogan: input.slogan ?? null,
        tiendaRedes: input.redes
          ? (input.redes as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        tiendaHorarios: input.horarios ?? null,
        tiendaActivadaEn:
          input.activa && !tenant.tiendaActivadaEn ? new Date() : tenant.tiendaActivadaEn,
      },
    })

    if (input.activa && !tenant.tiendaPublicaActiva) {
      try {
        const ownerUser = await prisma.user.findFirst({
          where: { tenantId: tallerId, role: "OWNER" },
          select: { email: true },
        })
        if (ownerUser?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://reparahub.com"
          await sendTiendaActivadaEmail({
            to: ownerUser.email,
            tallerNombre: tenant.nombre,
            slug: tenant.slug,
            url: `${appUrl}/t/${tenant.slug}`,
          })
        }
      } catch (emailErr) {
        console.error("[tienda-prisma] email activacion fallo (no bloqueante):", emailErr)
      }
    }

    revalidatePath("/dashboard/mercado")
    revalidatePath(`/t/${tenant.slug}`)
    return { success: true }
  } catch (e) {
    console.error("[tienda-prisma] updateMiTiendaConfig:", e)
    return { success: false, error: "No se pudo guardar la configuracion" }
  }
}

export async function getProductosParaMiTienda(): Promise<
  TiendaActionResult<TiendaProductoItem[]>
> {
  try {
    const tallerId = await getTenantIdOrThrow()
    const prisma = getPrismaClient()
    const productos = await prisma.producto.findMany({
      where: { tenantId: tallerId },
      orderBy: [{ publicadoEnTienda: "desc" }, { ordenTienda: "asc" }, { nombre: "asc" }],
      select: {
        id: true,
        nombre: true,
        precioVenta: true,
        imagenUrl: true,
        marca: true,
        modelo: true,
        categoria: true,
        stockActual: true,
        publicadoEnTienda: true,
        ordenTienda: true,
        descripcionPublica: true,
      },
    })

    const items: TiendaProductoItem[] = productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precioVenta: Number(p.precioVenta),
      imagenUrl: p.imagenUrl,
      marca: p.marca,
      modelo: p.modelo,
      categoria: p.categoria,
      stockActual: p.stockActual,
      publicadoEnTienda: p.publicadoEnTienda,
      ordenTienda: p.ordenTienda,
      descripcionPublica: p.descripcionPublica,
    }))

    return { success: true, data: items }
  } catch (e) {
    console.error("[tienda-prisma] getProductosParaMiTienda:", e)
    const raw = e instanceof Error ? e.message : "Error desconocido"
    if (raw.includes("publicado_en_tienda") || raw.includes("descripcion_publica") || raw.includes("orden_tienda")) {
      return {
        success: false,
        error:
          "Falta aplicar la migracion de Mi Tienda en la base de datos. Ejecuta: pnpm prisma migrate deploy",
      }
    }
    return { success: false, error: `No se pudieron cargar los productos: ${raw}` }
  }
}

export async function toggleProductoEnTienda(
  productoId: string,
  publicar: boolean,
): Promise<TiendaActionResult<{ publishedCount: number; remaining: number }>> {
  try {
    const tallerId = await getTenantIdOrThrow()
    const prisma = getPrismaClient()

    const tenant = await prisma.tenant.findUnique({
      where: { id: tallerId },
      select: { plan: true, trialEndsAt: true, slug: true },
    })
    if (!tenant) return { success: false, error: "Taller no encontrado" }

    const inTrial = !!tenant.trialEndsAt && tenant.trialEndsAt.getTime() > Date.now()

    const producto = await prisma.producto.findFirst({
      where: { id: productoId, tenantId: tallerId },
      select: { id: true, publicadoEnTienda: true, precioVenta: true },
    })
    if (!producto) return { success: false, error: "Producto no encontrado" }

    if (publicar && Number(producto.precioVenta) <= 0) {
      return { success: false, error: "El producto debe tener precio de venta mayor a 0" }
    }

    if (publicar && !producto.publicadoEnTienda) {
      const publishedCount = await prisma.producto.count({
        where: { tenantId: tallerId, publicadoEnTienda: true },
      })
      if (!canPublishMoreProductos(publishedCount, tenant.plan, inTrial)) {
        return {
          success: false,
          error: "Alcanzaste el limite de productos publicados en tu tienda. Mejora a PRO para mas capacidad.",
        }
      }
      const maxOrden = await prisma.producto.aggregate({
        where: { tenantId: tallerId, publicadoEnTienda: true },
        _max: { ordenTienda: true },
      })
      await prisma.producto.update({
        where: { id: productoId },
        data: {
          publicadoEnTienda: true,
          ordenTienda: (maxOrden._max.ordenTienda ?? -1) + 1,
        },
      })
    } else if (!publicar && producto.publicadoEnTienda) {
      await prisma.producto.update({
        where: { id: productoId },
        data: { publicadoEnTienda: false },
      })
    }

    const publishedCount = await prisma.producto.count({
      where: { tenantId: tallerId, publicadoEnTienda: true },
    })

    revalidatePath("/dashboard/mercado")
    revalidatePath(`/t/${tenant.slug}`)

    return {
      success: true,
      data: {
        publishedCount,
        remaining: getRemainingSlots(publishedCount, tenant.plan, inTrial),
      },
    }
  } catch (e) {
    console.error("[tienda-prisma] toggleProductoEnTienda:", e)
    return { success: false, error: "No se pudo actualizar el producto" }
  }
}

export async function updateProductoTiendaDescripcion(
  productoId: string,
  descripcionPublica: string | null,
): Promise<TiendaActionResult> {
  try {
    const tallerId = await getTenantIdOrThrow()
    const prisma = getPrismaClient()
    const clean =
      descripcionPublica && descripcionPublica.trim().length > 0
        ? descripcionPublica.trim().slice(0, 500)
        : null
    await prisma.producto.updateMany({
      where: { id: productoId, tenantId: tallerId },
      data: { descripcionPublica: clean },
    })
    revalidatePath("/dashboard/mercado")
    return { success: true }
  } catch (e) {
    console.error("[tienda-prisma] updateProductoTiendaDescripcion:", e)
    return { success: false, error: "No se pudo actualizar la descripcion" }
  }
}
