"use client"

import dynamic from "next/dynamic"
import { forwardRef, useMemo } from "react"
import Image from "next/image"
import { Cpu, HardDrive, MemoryStick, Award } from "lucide-react"
const QRCodeSVG = dynamic(() => import("qrcode.react").then(m => m.QRCodeSVG), { ssr: false })
import type { ProductoRow } from "@/lib/actions/productos-prisma"
import { cn } from "@/lib/utils"
import { formatPosterMoney } from "@/lib/utils/currency"
import {
  computePrecioMayoreo,
  inferPosterTechSpecs,
  resolvePosterProductImageUrl,
  normalizeWhatsAppPhoneDigits,
  buildWhatsAppPosterMessage,
  buildWhatsAppApiSendUrl,
} from "@/lib/print/poster-exhibicion-utils"
import { getCodigoTelefono } from "@/lib/constants/paises"

/** Colores solo HEX/RGB - impresion y captura (sin oklch/lab). Paleta neutra para cualquier taller. */
const POSTER_ACCENT_BLUE = "#185FA5"
const POSTER_ACCENT_TEAL = "#0d9488"
const SLATE_900 = "#f8fafc"
const SLATE_800 = "#ffffff"
const SLATE_400 = "#94a3b8"
const SLATE_500 = "#64748b"
const SLATE_600 = "#475569"
const SLATE_200 = "#e2e8f0"
const SLATE_100 = "#f1f5f9"
const BLUE_50 = "#eff6ff"
const TEAL_800 = "#115e59"
const TEAL_900 = "#134e4a"
const RED_200 = "#fecaca"
const RED_600 = "#dc2626"
const WHITE = "#ffffff"

export interface PosterExhibicionProps {
  producto: ProductoRow
  precio_oferta?: number | null
  isOffer?: boolean
  format: "letter" | "square"
  businessName?: string
  logoUrl?: string | null
  /** Telefono del taller (configuracion); para QR y enlace api.whatsapp.com */
  tallerTelefono?: string | null
  /** Pais del taller (configuracion) para prefijar el telefono de WhatsApp correctamente. */
  tallerPais?: string | null
}

export const PosterExhibicion = forwardRef<HTMLDivElement, PosterExhibicionProps>(
  function PosterExhibicion(
    {
      producto,
      precio_oferta,
      isOffer = false,
      format,
      businessName = "Mi Taller",
      logoUrl,
      tallerTelefono,
      tallerPais,
    },
    ref
  ) {
    const specs = inferPosterTechSpecs(producto)
    const imgUrl = resolvePosterProductImageUrl(producto)
    const precioRegular = Number(producto.precio_venta ?? 0)
    const rawOferta =
      precio_oferta != null && Number.isFinite(Number(precio_oferta))
        ? Number(precio_oferta)
        : null
    const modoOferta = Boolean(isOffer)
    const usarPrecioOferta =
      modoOferta &&
      rawOferta != null &&
      rawOferta > 0 &&
      precioRegular > 0 &&
      rawOferta < precioRegular
    const precioMenudeo = usarPrecioOferta ? rawOferta! : precioRegular
    const precioMayoreo = computePrecioMayoreo(precioMenudeo)

    const precioMenudeoFmt = formatPosterMoney(precioMenudeo)
    const waPhone = normalizeWhatsAppPhoneDigits(tallerTelefono ?? null, getCodigoTelefono(tallerPais ?? null))
    const whatsappSendUrl = useMemo(() => {
      if (!waPhone) return null
      const msg = buildWhatsAppPosterMessage(
        businessName,
        producto.nombre || "Producto",
        precioMenudeoFmt
      )
      return buildWhatsAppApiSendUrl(waPhone, msg)
    }, [waPhone, businessName, producto.nombre, precioMenudeoFmt])

    const letter = format === "letter"
    const titleClass = letter
      ? "text-2xl sm:text-3xl font-black tracking-tight leading-tight"
      : "text-3xl font-black tracking-tight text-center leading-tight"

    return (
      <div
        ref={ref}
        className={cn(
          "box-border antialiased",
          letter
            ? "flex w-[8.5in] min-h-[11in] flex-col p-[0.45in] print:w-[8.5in] print:min-h-[11in] print:p-[0.45in]"
            : "flex aspect-square w-full max-w-[min(92vw,420px)] flex-col p-5 sm:max-w-[480px] sm:p-7"
        )}
        style={{ backgroundColor: WHITE, color: SLATE_900 }}
      >
        {modoOferta ? (
          <div
            className={cn(
              "-mx-1 mb-3 flex items-center justify-center rounded-md px-2 py-2 text-center text-[11px] font-black uppercase tracking-[0.2em] sm:text-xs",
              letter ? "mb-4" : "mb-4 text-sm tracking-[0.25em]"
            )}
            style={{
              color: WHITE,
              background: "linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #dc2626 100%)",
              boxShadow:
                "0 0 0 1px rgba(255, 255, 255, 0.2), 0 0 24px rgba(255, 0, 60, 0.55)",
            }}
          >
            ¡Oferta de la semana!
          </div>
        ) : null}

        <header
          className={cn("flex items-start gap-3 border-b-2 pb-3", !letter && "flex-col items-center text-center")}
          style={{ borderColor: POSTER_ACCENT_BLUE }}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt=""
              width={160}
              height={64}
              className={cn("h-10 w-auto object-contain object-left sm:h-12", !letter && "mx-auto h-14 sm:h-16")}
              unoptimized
              crossOrigin="anonymous"
            />
          ) : (
            <div className="text-xl font-black tracking-tight sm:text-2xl" style={{ color: POSTER_ACCENT_BLUE }}>
              {businessName}
            </div>
          )}
          <div className={cn("min-w-0 flex-1", !letter && "w-full text-center")}>
            {logoUrl ? (
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-[11px]"
                style={{ color: SLATE_500 }}
              >
                {businessName}
              </p>
            ) : null}
            <p
              className="mt-1 text-[9px] font-medium uppercase tracking-wider sm:text-[10px]"
              style={{ color: POSTER_ACCENT_TEAL }}
            >
              Exhibicion de mostrador
            </p>
          </div>
        </header>

        <div className={cn("mt-4 flex flex-1 flex-col gap-4", letter && "mt-5 gap-5")}>
          <h1 className={titleClass} style={{ color: SLATE_900 }}>
            {producto.nombre || "Producto"}
          </h1>

          <div
            className={cn(
              "grid gap-4",
              letter ? "grid-cols-[minmax(0,1fr)_140px] sm:grid-cols-[minmax(0,1fr)_160px]" : "grid-cols-1"
            )}
          >
            <div
              className={cn("flex flex-col gap-3 rounded-xl border p-4", !letter && "order-2")}
              style={{
                borderColor: SLATE_200,
                backgroundColor: WHITE,
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: SLATE_400 }}
              >
                Ficha tecnica
              </p>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: BLUE_50, color: POSTER_ACCENT_BLUE }}
                  >
                    <Cpu className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: SLATE_400 }}>
                      Procesador
                    </p>
                    <p className="text-sm font-semibold" style={{ color: SLATE_800 }}>
                      {specs.cpu}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: BLUE_50, color: POSTER_ACCENT_BLUE }}
                  >
                    <MemoryStick className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: SLATE_400 }}>
                      Memoria RAM
                    </p>
                    <p className="text-sm font-semibold" style={{ color: SLATE_800 }}>
                      {specs.ram}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: BLUE_50, color: POSTER_ACCENT_BLUE }}
                  >
                    <HardDrive className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: SLATE_400 }}>
                      Almacenamiento
                    </p>
                    <p className="text-sm font-semibold" style={{ color: SLATE_800 }}>
                      {specs.ssd}
                    </p>
                  </div>
                </li>
              </ul>

              <div
                className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2"
                style={{
                  borderColor: POSTER_ACCENT_BLUE,
                  backgroundColor: BLUE_50,
                }}
              >
                <Award className="h-5 w-5 shrink-0" style={{ color: POSTER_ACCENT_BLUE }} aria-hidden />
                <span
                  className="text-center text-[11px] font-black uppercase tracking-[0.12em]"
                  style={{ color: POSTER_ACCENT_BLUE }}
                >
                  Certificado Grado A
                </span>
              </div>
            </div>

            <div
              className={cn(
                "relative overflow-hidden rounded-xl border",
                letter ? "aspect-square max-h-[160px]" : "order-1 aspect-[4/3] max-h-[220px] w-full max-w-[280px] mx-auto"
              )}
              style={{ borderColor: SLATE_200, backgroundColor: WHITE }}
            >
              {imgUrl ? (
                <Image
                  src={imgUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 480px) 90vw, 280px"
                  unoptimized
                  crossOrigin="anonymous"
                />
              ) : (
                <div
                  className="flex h-full min-h-[120px] w-full items-center justify-center text-[10px] font-medium"
                  style={{ color: SLATE_400 }}
                >
                  Sin foto
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: modoOferta ? RED_200 : SLATE_200,
                backgroundColor: WHITE,
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: SLATE_400 }}>
                Precio menudeo
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                {usarPrecioOferta ? (
                  <span className="text-lg font-semibold line-through decoration-2" style={{ color: SLATE_400 }}>
                    {formatPosterMoney(precioRegular)}
                  </span>
                ) : null}
                <span
                  className="text-3xl font-black tabular-nums tracking-tight sm:text-4xl"
                  style={{ color: modoOferta ? RED_600 : POSTER_ACCENT_BLUE }}
                >
                  {precioMenudeoFmt}
                </span>
              </div>
            </div>

            <div
              className={cn("flex gap-3", letter ? "items-end" : "items-end")}
            >
              <div
                className="min-w-0 flex-1 rounded-xl border-2 px-4 py-3 text-center"
                style={{
                  borderColor: POSTER_ACCENT_TEAL,
                  background: `linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, ${WHITE} 100%)`,
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: TEAL_800 }}>
                  Precio mayoreo (5+ piezas)
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums sm:text-3xl" style={{ color: TEAL_900 }}>
                  {formatPosterMoney(precioMayoreo)}
                </p>
              </div>

              {whatsappSendUrl ? (
                <div
                  className="flex w-[108px] shrink-0 flex-col items-center justify-end sm:w-[118px]"
                  style={{ color: SLATE_500 }}
                >
                  <div
                    className="rounded-md border bg-white p-1 shadow-sm"
                    style={{ borderColor: SLATE_200, lineHeight: 0 }}
                  >
                    <QRCodeSVG
                      value={whatsappSendUrl}
                      size={letter ? 88 : 100}
                      level="H"
                      marginSize={0}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                  <p
                    className="mt-1.5 max-w-[7.5rem] text-center text-[7px] font-semibold leading-tight sm:text-[8px]"
                    style={{ color: SLATE_600 }}
                  >
                    ¿Dudas? ¡Escaneame y envianos WhatsApp!
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

PosterExhibicion.displayName = "PosterExhibicion"
