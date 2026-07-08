import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://reparahub.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/software-taller-celulares",
          "/sistema-reparaciones",
          "/punto-de-venta-taller",
          "/inventario-apartados-taller",
          "/t/*",
          "/track/*",
          "/terminos",
          "/privacidad",
        ],
        disallow: ["/api/*", "/dashboard/*", "/auth/*", "/admin/*", "/_next/*"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
