"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  Clock,
  Facebook,
  Globe,
  Instagram,
  MessageCircle,
  PackageCheck,
  Tag,
} from "lucide-react"
import { TiendaPublicHeader } from "@/components/public/tienda-public-header"
import { TiendaPublicFooter } from "@/components/public/tienda-public-footer"
import { formatCurrency } from "@/lib/utils/currency"
import { getThumbnailPath } from "@/lib/storage"
import {
  registrarVistaTienda,
  type TiendaPublicaInfo,
  type TiendaPublicaProducto,
} from "@/lib/actions/tienda-publica-prisma"

interface TiendaProductoViewProps {
  tienda: TiendaPublicaInfo
  producto: TiendaPublicaProducto
}

export function TiendaProductoView({ tienda, producto }: TiendaProductoViewProps) {
  const [activeImg, setActiveImg] = useState(0)
  const images = producto.imagenUrls.length > 0 ? producto.imagenUrls : producto.imagenUrl ? [producto.imagenUrl] : []

  useEffect(() => {
    void registrarVistaTienda(tienda.slug, "visita_producto", producto.id)
  }, [tienda.slug, producto.id])

  const whatsappLink = useMemo(() => {
    const phoneRaw = tienda.redes.whatsapp?.replace(/[^\d+]/g, "") ?? ""
    if (!phoneRaw) return null
    const msg = `Hola ${tienda.nombreComercial}, me interesa el producto "${producto.nombre}" que vi en tu tienda.`
    return `https://api.whatsapp.com/send?phone=${phoneRaw}&text=${encodeURIComponent(msg)}`
  }, [tienda.redes.whatsapp, tienda.nombreComercial, producto.nombre])

  const handleWhatsAppClick = () => {
    if (whatsappLink) {
      void registrarVistaTienda(tienda.slug, "clic_whatsapp", producto.id)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header agresivo: ReparaHub fijo + tenant compacto */}
      <TiendaPublicHeader tenant={{ nombreComercial: tienda.nombreComercial }} />

      {/* Back strip */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href={`/t/${tienda.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 sm:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Volver al catalogo
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          {/* Imagenes */}
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="relative aspect-square w-full bg-slate-100">
                {images.length > 0 ? (
                  <Image
                    src={images[activeImg] || images[0]}
                    alt={producto.nombre}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase text-slate-400">
                    sin imagen
                  </div>
                )}
              </div>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <ProductThumbButton
                    key={i}
                    img={img}
                    alt={`${producto.nombre} ${i + 1}`}
                    active={i === activeImg}
                    onClick={() => setActiveImg(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-4 lg:py-2">
            {producto.categoria && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <Tag className="h-3.5 w-3.5" aria-hidden /> {producto.categoria}
              </span>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {producto.nombre}
            </h1>
            {(producto.marca || producto.modelo) && (
              <p className="text-sm text-slate-600 sm:text-base">
                {[producto.marca, producto.modelo].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {formatCurrency(producto.precioVenta)}
            </p>

            {producto.descripcionPublica ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 sm:text-base">
                {producto.descripcionPublica}
              </div>
            ) : null}

            {producto.stockDisponible ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                <PackageCheck className="h-3.5 w-3.5" aria-hidden /> Disponible
              </span>
            ) : (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800">
                Consultar disponibilidad
              </span>
            )}

            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <MessageCircle className="h-5 w-5" aria-hidden /> Pedir por WhatsApp
              </a>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                El taller no configuro un numero de WhatsApp. Contacta directamente al local.
              </p>
            )}

            {/* Info del taller */}
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Sobre el taller
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-900">{tienda.nombreComercial}</p>
              {tienda.slogan && (
                <p className="mt-1 text-xs text-slate-600">{tienda.slogan}</p>
              )}
              {tienda.horarios && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" aria-hidden /> {tienda.horarios}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
                  </a>
                )}
                {tienda.redes.instagram && (
                  <a
                    href={
                      tienda.redes.instagram.startsWith("http")
                        ? tienda.redes.instagram
                        : `https://instagram.com/${tienda.redes.instagram.replace(/^@/, "")}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-pink-600 hover:underline"
                  >
                    <Instagram className="h-3.5 w-3.5" aria-hidden /> Instagram
                  </a>
                )}
                {tienda.redes.facebook && (
                  <a
                    href={
                      tienda.redes.facebook.startsWith("http")
                        ? tienda.redes.facebook
                        : `https://facebook.com/${tienda.redes.facebook}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                  >
                    <Facebook className="h-3.5 w-3.5" aria-hidden /> Facebook
                  </a>
                )}
                {tienda.redes.website && (
                  <a
                    href={
                      tienda.redes.website.startsWith("http")
                        ? tienda.redes.website
                        : `https://${tienda.redes.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-700 hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" aria-hidden /> Web
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <TiendaPublicFooter />
    </div>
  )
}

function ProductThumbButton({
  img,
  alt,
  active,
  onClick,
}: {
  img: string
  alt: string
  active: boolean
  onClick: () => void
}) {
  const thumb = getThumbnailPath(img)
  const [src, setSrc] = useState<string | null>(thumb)

  useEffect(() => {
    setSrc(thumb)
  }, [thumb])

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-100 transition ${
        active ? "border-blue-600" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="64px"
          className="object-cover"
          onError={() => setSrc((current) => (current !== img ? img : null))}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-black uppercase tracking-wider text-slate-400">
          Foto
        </div>
      )}
    </button>
  )
}
