import type { MetadataRoute } from "next"
import { getPrismaClient } from "@/lib/prisma"

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://reparahub.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const prisma = getPrismaClient()
  const baseEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...[
      "software-taller-celulares",
      "sistema-reparaciones",
      "punto-de-venta-taller",
      "inventario-apartados-taller",
    ].map((path) => ({
      url: `${SITE_URL}/${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${SITE_URL}/terminos`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacidad`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ]

  try {
    const tiendas = await prisma.tenant.findMany({
      where: { tiendaPublicaActiva: true },
      select: {
        slug: true,
        tiendaActivadaEn: true,
        productos: {
          where: { publicadoEnTienda: true },
          select: { id: true, updatedAt: true },
        },
      },
    })

    const tiendaEntries: MetadataRoute.Sitemap = tiendas.map((t) => ({
      url: `${SITE_URL}/t/${t.slug}`,
      lastModified: t.tiendaActivadaEn || new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    }))

    const productoEntries: MetadataRoute.Sitemap = tiendas.flatMap((t) =>
      t.productos.map((p) => ({
        url: `${SITE_URL}/t/${t.slug}/p/${p.id}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    )

    return [...baseEntries, ...tiendaEntries, ...productoEntries]
  } catch (e) {
    console.error("[sitemap] failed to query tiendas:", e)
    return baseEntries
  }
}
