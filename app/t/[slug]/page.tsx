import { notFound } from "next/navigation"
import { getTiendaPorSlug } from "@/lib/actions/tienda-publica-prisma"
import { TiendaCatalogoView } from "./view"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const result = await getTiendaPorSlug(slug)
  if (!result.success) {
    return {
      title: "Tienda no encontrada",
      robots: { index: false, follow: false },
    }
  }
  const { tienda, productos } = result
  const description =
    tienda.slogan ||
    `Catalogo de ${productos.length} productos disponibles en ${tienda.nombreComercial}.`
  return {
    title: `${tienda.nombreComercial} | Mi Tienda`,
    description,
    openGraph: {
      type: "website",
      title: tienda.nombreComercial,
      description,
      siteName: "ReparaHub",
      images: tienda.logoUrl ? [{ url: tienda.logoUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: tienda.nombreComercial,
      description,
      images: tienda.logoUrl ? [tienda.logoUrl] : undefined,
    },
    alternates: { canonical: `/t/${tienda.slug}` },
  }
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const result = await getTiendaPorSlug(slug)
  if (!result.success) {
    notFound()
  }
  return <TiendaCatalogoView tienda={result.tienda} productos={result.productos} />
}
