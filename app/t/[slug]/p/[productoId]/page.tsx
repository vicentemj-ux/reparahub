import { notFound } from "next/navigation"
import { getProductoPublicoPorId } from "@/lib/actions/tienda-publica-prisma"
import { TiendaProductoView } from "./view"

interface PageProps {
  params: Promise<{ slug: string; productoId: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, productoId } = await params
  const result = await getProductoPublicoPorId(slug, productoId)
  if (!result.success) {
    return {
      title: "Producto no disponible",
      robots: { index: false, follow: false },
    }
  }
  const { tienda, producto } = result
  const description =
    producto.descripcionPublica ||
    `${producto.nombre} - ${formatPricePlain(producto.precioVenta)} en ${tienda.nombreComercial}`
  return {
    title: `${producto.nombre} | ${tienda.nombreComercial}`,
    description,
    openGraph: {
      type: "website",
      title: producto.nombre,
      description,
      siteName: "ReparaHub",
      images: producto.imagenUrl ? [{ url: producto.imagenUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: producto.nombre,
      description,
      images: producto.imagenUrl ? [producto.imagenUrl] : undefined,
    },
    alternates: { canonical: `/t/${tienda.slug}/p/${producto.id}` },
  }
}

function formatPricePlain(n: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n)
}

export default async function Page({ params }: PageProps) {
  const { slug, productoId } = await params
  const result = await getProductoPublicoPorId(slug, productoId)
  if (!result.success) {
    notFound()
  }
  return <TiendaProductoView tienda={result.tienda} producto={result.producto} />
}
