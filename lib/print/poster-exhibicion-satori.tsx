import type { ProductoRow } from "@/lib/actions/productos-prisma"
import { formatPosterMoney } from "@/lib/utils/currency"
import {
  computePrecioMayoreo,
  inferPosterTechSpecs,
} from "@/lib/print/poster-exhibicion-utils"

/** Colores HEX/RGBA - compatibles con Satori (sin oklch/lab). */
const POSTER_ACCENT_BLUE = "#185FA5"
const POSTER_ACCENT_TEAL = "#0d9488"
const SLATE_900 = "#f8fafc"
const SLATE_800 = "#ffffff"
const SLATE_400 = "#94a3b8"
const SLATE_500 = "#64748b"
const SLATE_200 = "#e2e8f0"
const SLATE_100 = "#f1f5f9"
const BLUE_50 = "#eff6ff"
const TEAL_50 = "#f0fdfa"
const TEAL_200 = "#99f6e4"
const TEAL_700 = "#0f766e"
const TEAL_800 = "#115e59"
const TEAL_900 = "#134e4a"
const RED_200 = "#fecaca"
const RED_600 = "#dc2626"
const WHITE = "#ffffff"

/** 1:1 - Feed Facebook / Instagram (px). */
export const POSTER_SQUARE_PX = 1080
/** 9:16 - Estados WhatsApp / Stories (px). */
export const POSTER_VERTICAL_WIDTH = 1080
export const POSTER_VERTICAL_HEIGHT = 1920

/** @deprecated Usar POSTER_SQUARE_PX */
export const POSTER_SOCIAL_SIZE = POSTER_SQUARE_PX

export type PosterImageFormat = "square" | "vertical"

export interface PosterExhibicionSatoriProps {
  producto: ProductoRow
  precio_oferta?: number | null
  isOffer?: boolean
  /** Nombre comercial del taller (configuracion). */
  businessName?: string
  logoDataUrl?: string | null
  productImageDataUrl?: string | null
  format?: PosterImageFormat
}

function computeDerived(
  producto: ProductoRow,
  precio_oferta: number | null | undefined,
  isOffer: boolean
) {
  const specs = inferPosterTechSpecs(producto)
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
  const title = (producto.nombre || "Producto").slice(0, 180)
  return {
    specs,
    precioRegular,
    usarPrecioOferta,
    modoOferta,
    precioMenudeo,
    precioMayoreo,
    title,
  }
}

/** Escala diseno original 1200 → 1080. */
const S = POSTER_SQUARE_PX / 1200
function sc(n: number): number {
  return Math.round(n * S)
}

/**
 * Plantilla 1:1 (1080x1080). Solo Flexbox - sin Grid (requisito Satori).
 */
export function PosterExhibicionSatoriTemplate(props: PosterExhibicionSatoriProps) {
  const format = props.format ?? "square"
  if (format === "vertical") {
    return PosterExhibicionSatoriTemplateVertical(props)
  }
  return PosterExhibicionSatoriTemplateSquare(props)
}

function PosterExhibicionSatoriTemplateSquare({
  producto,
  precio_oferta,
  isOffer = false,
  businessName = "Mi Taller",
  logoDataUrl,
  productImageDataUrl,
}: PosterExhibicionSatoriProps) {
  const d = computeDerived(producto, precio_oferta, isOffer)

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: sc(48),
        boxSizing: "border-box",
        fontFamily: "Inter",
        background: `linear-gradient(to bottom, #f8fafc 0%, ${WHITE} 100%)`,
        color: SLATE_900,
      }}
    >
      {d.modoOferta ? (
        <div
          style={{
            marginBottom: sc(20),
            marginLeft: -4,
            marginRight: -4,
            paddingTop: sc(14),
            paddingBottom: sc(14),
            paddingLeft: sc(12),
            paddingRight: sc(12),
            borderRadius: sc(8),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: WHITE,
            fontSize: sc(22),
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            background: "linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #dc2626 100%)",
          }}
        >
          ¡Oferta de la semana!
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingBottom: sc(16),
          borderBottomWidth: 2,
          borderBottomStyle: "solid",
          borderBottomColor: POSTER_ACCENT_BLUE,
        }}
      >
        {logoDataUrl ? (
          <img
            src={logoDataUrl}
            alt=""
            width={sc(200)}
            height={sc(80)}
            style={{ height: sc(72), width: "auto", maxWidth: sc(280), objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              fontSize: sc(40),
              fontWeight: 900,
              color: POSTER_ACCENT_BLUE,
              letterSpacing: -0.5,
              textAlign: "center",
            }}
          >
            {businessName}
          </div>
        )}
        {logoDataUrl ? (
          <div
            style={{
              marginTop: sc(8),
              fontSize: sc(18),
              fontWeight: 600,
              color: SLATE_500,
              textTransform: "uppercase",
              letterSpacing: 3,
              textAlign: "center",
            }}
          >
            {businessName}
          </div>
        ) : null}
        <div
          style={{
            marginTop: sc(10),
            fontSize: sc(16),
            fontWeight: 600,
            color: POSTER_ACCENT_TEAL,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          Exhibicion de mostrador
        </div>
      </div>

      <div style={{ marginTop: sc(28), display: "flex", flexDirection: "column", flex: 1, gap: sc(28) }}>
        <div
          style={{
            fontSize: sc(44),
            fontWeight: 900,
            color: SLATE_900,
            textAlign: "center",
            lineHeight: 1.15,
            letterSpacing: -0.5,
          }}
        >
          {String(d.title)}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: sc(28),
          }}
        >
          <div
            style={{
              width: sc(560),
              maxWidth: "100%",
              height: sc(420),
              borderRadius: sc(16),
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: SLATE_200,
              backgroundColor: SLATE_100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {productImageDataUrl ? (
              <img
                src={productImageDataUrl}
                alt=""
                width={sc(560)}
                height={sc(420)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: sc(18), fontWeight: 600, color: SLATE_400 }}>Sin foto</span>
            )}
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: sc(18),
              borderRadius: sc(16),
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: SLATE_200,
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              padding: sc(28),
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div
              style={{
                fontSize: sc(16),
                fontWeight: 700,
                color: SLATE_400,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Ficha tecnica
            </div>

            <SpecRow
              label="Procesador"
              value={String(d.specs.cpu ?? "")}
              accent={POSTER_ACCENT_BLUE}
              chipBg={BLUE_50}
              chip="CPU"
              scale={S}
            />
            <SpecRow
              label="Memoria RAM"
              value={String(d.specs.ram ?? "")}
              accent={TEAL_700}
              chipBg={TEAL_50}
              chip="RAM"
              scale={S}
            />
            <SpecRow
              label="Almacenamiento"
              value={String(d.specs.ssd ?? "")}
              accent={SLATE_800}
              chipBg={SLATE_100}
              chip="SSD"
              scale={S}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: sc(12),
                marginTop: sc(8),
                paddingTop: sc(14),
                paddingBottom: sc(14),
                paddingLeft: sc(16),
                paddingRight: sc(16),
                borderRadius: sc(10),
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: TEAL_200,
                backgroundColor: "rgba(240, 253, 250, 0.95)",
              }}
            >
              <span style={{ fontSize: sc(22), color: TEAL_700 }} aria-hidden>
                ★
              </span>
              <span
                style={{
                  fontSize: sc(20),
                  fontWeight: 900,
                  color: TEAL_900,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                Certificado Grado A
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: sc(20), marginTop: "auto" }}>
          <div
            style={{
              borderRadius: sc(16),
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: d.modoOferta ? RED_200 : SLATE_200,
              backgroundColor: WHITE,
              padding: sc(28),
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div
              style={{
                fontSize: sc(16),
                fontWeight: 700,
                color: SLATE_400,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Precio menudeo
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "baseline",
                gap: sc(12),
                marginTop: sc(8),
              }}
            >
              {d.usarPrecioOferta ? (
                <span
                  style={{
                    fontSize: sc(28),
                    fontWeight: 600,
                    color: SLATE_400,
                    textDecoration: "line-through",
                  }}
                >
                  {formatPosterMoney(d.precioRegular)}
                </span>
              ) : null}
              <span
                style={{
                  fontSize: sc(52),
                  fontWeight: 900,
                  color: d.modoOferta ? RED_600 : POSTER_ACCENT_BLUE,
                  letterSpacing: -1,
                }}
              >
                {formatPosterMoney(d.precioMenudeo)}
              </span>
            </div>
          </div>

          <div
            style={{
              borderRadius: sc(16),
              borderWidth: 2,
              borderStyle: "solid",
              borderColor: POSTER_ACCENT_TEAL,
              paddingTop: sc(22),
              paddingBottom: sc(22),
              paddingLeft: sc(24),
              paddingRight: sc(24),
              textAlign: "center",
              background: `linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, ${WHITE} 100%)`,
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div
              style={{
                fontSize: sc(16),
                fontWeight: 700,
                color: TEAL_800,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Precio mayoreo (5+ piezas)
            </div>
            <div style={{ marginTop: sc(10), fontSize: sc(44), fontWeight: 900, color: TEAL_900, letterSpacing: -1 }}>
              {formatPosterMoney(d.precioMayoreo)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Plantilla 9:16 (1080x1920) - estados / stories. Logo y nombre del taller dinamicos.
 */
function PosterExhibicionSatoriTemplateVertical({
  producto,
  precio_oferta,
  isOffer = false,
  businessName = "Mi Taller",
  logoDataUrl,
  productImageDataUrl,
}: PosterExhibicionSatoriProps) {
  const d = computeDerived(producto, precio_oferta, isOffer)
  const pad = 40
  const innerW = POSTER_VERTICAL_WIDTH - pad * 2

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        paddingLeft: pad,
        paddingRight: pad,
        paddingTop: pad,
        paddingBottom: pad,
        boxSizing: "border-box",
        fontFamily: "Inter",
        background: `linear-gradient(180deg, #f8fafc 0%, ${WHITE} 35%, #f1f5f9 100%)`,
        color: SLATE_900,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingBottom: 24,
          borderBottomWidth: 2,
          borderBottomStyle: "solid",
          borderBottomColor: POSTER_ACCENT_BLUE,
        }}
      >
        {logoDataUrl ? (
          <img
            src={logoDataUrl}
            alt=""
            width={280}
            height={112}
            style={{ height: 96, width: "auto", maxWidth: innerW, objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: POSTER_ACCENT_BLUE,
              letterSpacing: -0.5,
              textAlign: "center",
              maxWidth: innerW,
            }}
          >
            {businessName}
          </div>
        )}
        {logoDataUrl ? (
          <div
            style={{
              marginTop: 10,
              fontSize: 20,
              fontWeight: 700,
              color: SLATE_500,
              textTransform: "uppercase",
              letterSpacing: 3,
              textAlign: "center",
            }}
          >
            {businessName}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 12,
            fontSize: 15,
            fontWeight: 600,
            color: POSTER_ACCENT_TEAL,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          Exhibicion de mostrador
        </div>
      </div>

      {d.modoOferta ? (
        <div
          style={{
            marginTop: 20,
            paddingTop: 12,
            paddingBottom: 12,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: WHITE,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
            background: "linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #dc2626 100%)",
          }}
        >
          ¡Oferta de la semana!
        </div>
      ) : null}

      <div
        style={{
          marginTop: 24,
          fontSize: 38,
          fontWeight: 900,
          color: SLATE_900,
          textAlign: "center",
          lineHeight: 1.15,
          letterSpacing: -0.5,
        }}
      >
        {String(d.title)}
      </div>

      <div
        style={{
          marginTop: 28,
          width: innerW,
          height: 780,
          alignSelf: "center",
          borderRadius: 16,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: SLATE_200,
          backgroundColor: SLATE_100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {productImageDataUrl ? (
          <img
            src={productImageDataUrl}
            alt=""
            width={innerW}
            height={780}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: 20, fontWeight: 600, color: SLATE_400 }}>Sin foto</span>
        )}
      </div>

      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: SLATE_400, textTransform: "uppercase", letterSpacing: 2 }}>
          Ficha tecnica
        </div>
        <SpecRow
          label="Procesador"
          value={String(d.specs.cpu ?? "")}
          accent={POSTER_ACCENT_BLUE}
          chipBg={BLUE_50}
          chip="CPU"
          scale={S * 0.85}
        />
        <SpecRow
          label="Memoria RAM"
          value={String(d.specs.ram ?? "")}
          accent={TEAL_700}
          chipBg={TEAL_50}
          chip="RAM"
          scale={S * 0.85}
        />
        <SpecRow
          label="Almacenamiento"
          value={String(d.specs.ssd ?? "")}
          accent={SLATE_800}
          chipBg={SLATE_100}
          chip="SSD"
          scale={S * 0.85}
        />
      </div>

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: d.modoOferta ? RED_200 : SLATE_200,
            backgroundColor: WHITE,
            padding: 24,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: SLATE_400, textTransform: "uppercase", letterSpacing: 2 }}>
            Precio menudeo
          </div>
          <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: 12, marginTop: 8 }}>
            {d.usarPrecioOferta ? (
              <span style={{ fontSize: 26, fontWeight: 600, color: SLATE_400, textDecoration: "line-through" }}>
                {formatPosterMoney(d.precioRegular)}
              </span>
            ) : null}
            <span
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: d.modoOferta ? RED_600 : POSTER_ACCENT_BLUE,
                letterSpacing: -1,
              }}
            >
              {formatPosterMoney(d.precioMenudeo)}
            </span>
          </div>
        </div>

        <div
          style={{
            borderRadius: 16,
            borderWidth: 2,
            borderStyle: "solid",
            borderColor: POSTER_ACCENT_TEAL,
            padding: 22,
            textAlign: "center",
            background: `linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, ${WHITE} 100%)`,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: TEAL_800, textTransform: "uppercase", letterSpacing: 2 }}>
            Precio mayoreo (5+ piezas)
          </div>
          <div style={{ marginTop: 8, fontSize: 44, fontWeight: 900, color: TEAL_900, letterSpacing: -1 }}>
            {formatPosterMoney(d.precioMayoreo)}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 28,
          paddingTop: 20,
          borderTopWidth: 1,
          borderTopStyle: "solid",
          borderTopColor: SLATE_200,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: POSTER_ACCENT_BLUE, letterSpacing: 1 }}>{businessName}</div>
      </div>
    </div>
  )
}

function SpecRow({
  label,
  value,
  accent,
  chipBg,
  chip,
  scale,
}: {
  label: string
  value: string
  accent: string
  chipBg: string
  chip: string
  /** Escala sobre tamanos base (diseno 1200px); sin funciones - Satori no soporta bien props funcion. */
  scale: number
}) {
  const sz = (n: number) => Math.round(n * scale)
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: sz(14) }}>
      <div
        style={{
          width: sz(40),
          height: sz(40),
          borderRadius: sz(10),
          backgroundColor: chipBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: sz(11), fontWeight: 800, color: accent }}>{chip}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: sz(14),
            fontWeight: 600,
            color: SLATE_400,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: sz(22), fontWeight: 700, color: SLATE_800, lineHeight: 1.25 }}>{value}</span>
      </div>
    </div>
  )
}
