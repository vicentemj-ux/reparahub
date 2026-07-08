"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Facebook,
  Filter,
  Instagram,
  MessageCircle,
  Package,
  Search,
  Tag,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { TiendaPublicHeader } from "@/components/public/tienda-public-header"
import { TiendaPublicFooter } from "@/components/public/tienda-public-footer"
import { formatCurrency } from "@/lib/utils/currency"
import { getThumbnailPath } from "@/lib/storage"
import { registrarVistaTienda } from "@/lib/actions/tienda-publica-prisma"
import type {
  TiendaPublicaInfo,
  TiendaPublicaProducto,
} from "@/lib/actions/tienda-publica-prisma"

interface TiendaCatalogoViewProps {
  tienda: TiendaPublicaInfo
  productos: TiendaPublicaProducto[]
}

export function TiendaCatalogoView({ tienda, productos }: TiendaCatalogoViewProps) {
  const [search, setSearch] = useState("")
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null)

  useEffect(() => {
    void registrarVistaTienda(tienda.slug, "visita_catalogo")
  }, [tienda.slug])

  const categorias = useMemo(() => {
    const set = new Set<string>()
    for (const p of productos) {
      if (p.categoria) set.add(p.categoria)
    }
    return Array.from(set).sort()
  }, [productos])

  const filtrados = useMemo(() => {
    const q = search.toLowerCase().trim()
    return productos.filter((p) => {
      if (categoriaActiva && p.categoria !== categoriaActiva) return false
      if (!q) return true
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.marca?.toLowerCase().includes(q) ?? false) ||
        (p.modelo?.toLowerCase().includes(q) ?? false) ||
        (p.descripcionPublica?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [productos, search, categoriaActiva])

  const whatsappLink = useMemo(() => {
    const phoneRaw = tienda.redes.whatsapp?.replace(/[^\d+]/g, "") ?? ""
    if (!phoneRaw) return null
    return `https://api.whatsapp.com/send?phone=${phoneRaw}&text=${encodeURIComponent(
      `Hola ${tienda.nombreComercial}, vi tu catalogo en Mi Tienda y quiero mas informacion.`,
    )}`
  }, [tienda.redes.whatsapp, tienda.nombreComercial])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header agresivo: ReparaHub fijo + tenant compacto */}
      <TiendaPublicHeader tenant={{ nombreComercial: tienda.nombreComercial }} />

      {/* Info strip del tenant: slogan + redes (sin horarios ni sitio web) */}
      {(tienda.slogan ||
        whatsappLink ||
        tienda.redes.instagram ||
        tienda.redes.facebook) && (
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 text-[11px] text-slate-500 sm:px-6 sm:text-xs lg:px-8">
            {tienda.slogan && (
              <span className="inline-flex items-center gap-1.5 font-semibold italic text-slate-700">
                {tienda.slogan}
              </span>
            )}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline"
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
                className="inline-flex items-center gap-1.5 text-pink-600 hover:underline"
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
                className="inline-flex items-center gap-1.5 text-blue-700 hover:underline"
              >
                <Facebook className="h-3.5 w-3.5" aria-hidden /> Facebook
              </a>
            )}
          </div>
        </section>
      )}

      {/* Search & filters */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos..."
              className="h-11 pl-9"
            />
          </div>
          {categorias.length > 0 && (
            <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1">
              <button
                onClick={() => setCategoriaActiva(null)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  categoriaActiva === null
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <Filter className="h-3.5 w-3.5" aria-hidden /> Todos ({productos.length})
              </button>
              {categorias.map((cat) => {
                const count = productos.filter((p) => p.categoria === cat).length
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoriaActiva(cat)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      categoriaActiva === cat
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Tag className="h-3.5 w-3.5" aria-hidden /> {cat} ({count})
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Catalogo */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {filtrados.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-300" aria-hidden />
            <p className="mt-4 text-sm font-semibold text-slate-700">
              {search || categoriaActiva
                ? "No encontramos productos con esos filtros."
                : "Esta tienda aun no tiene productos publicados."}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
            {filtrados.map((p) => (
              <ProductoCard key={p.id} producto={p} slug={tienda.slug} />
            ))}
          </ul>
        )}
      </main>

      <TiendaPublicFooter />
    </div>
  )
}

function ProductoCard({ producto, slug }: { producto: TiendaPublicaProducto; slug: string }) {
  const fullUrl = producto.imagenUrls[0] ?? producto.imagenUrl ?? null
  const thumbUrl = fullUrl ? getThumbnailPath(fullUrl) : null
  const [imageSrc, setImageSrc] = useState<string | null>(thumbUrl || fullUrl)

  useEffect(() => {
    setImageSrc(thumbUrl || fullUrl)
  }, [thumbUrl, fullUrl])

  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <Link
        href={`/t/${slug}/p/${producto.id}`}
        className="relative aspect-square w-full overflow-hidden bg-slate-100"
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={producto.nombre}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition group-hover:scale-105"
            onError={() => {
              setImageSrc((current) => (current !== fullUrl ? fullUrl : null))
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-slate-400">
            sin imagen
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <Link
          href={`/t/${slug}/p/${producto.id}`}
          className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-blue-600 sm:text-base"
        >
          {producto.nombre}
        </Link>
        <p className="text-xs text-slate-500 sm:text-sm">
          {[producto.marca, producto.modelo].filter(Boolean).join(" · ") || "—"}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="text-base font-extrabold text-slate-900 sm:text-lg">
            {formatCurrency(producto.precioVenta)}
          </p>
          <Link
            href={`/t/${slug}/p/${producto.id}`}
            className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            Ver detalle
          </Link>
        </div>
      </div>
    </li>
  )
}
