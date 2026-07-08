"use client"

import { forwardRef } from "react"
import { MONO } from "../shared"

export interface ProductSaleLabelTemplateData {
  kind: "product-sale-label"
  shopName?: string | null
  deviceName: string
  marca?: string | null
  modelo?: string | null
  imei?: string | null
  color?: string | null
  condicion?: string | null
  capacidad?: string | null
  procesador?: string | null
  ram?: string | null
  almacenamiento?: string | null
  precio: number
  folio?: string | null
}

interface Props {
  data: ProductSaleLabelTemplateData
  /** Fase 3 - visibilidad controlada desde Imprenta */
  mostrarPrecios?: boolean
}

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

/**
 * Etiqueta de equipo en venta - formato UNICO: 2x1" horizontal (50mm x 25mm landscape).
 * Etiqueta PRE-CORTADA: width y height son fijos e inamovibles.
 * @page CSS: size: 50mm 25mm; margin: 0;
 */
const ProductSaleLabelTemplate = forwardRef<HTMLDivElement, Props>(({ data, mostrarPrecios = true }, ref) => {
  // Specs comprimidas en una sola linea separadas por " · "
  const specParts: string[] = [
    data.ram          ? `RAM ${data.ram}`         : null,
    data.almacenamiento ? data.almacenamiento      : data.capacidad ?? null,
    data.color        ? data.color                 : null,
    data.condicion    ? data.condicion             : null,
  ].filter(Boolean) as string[]

  const specsLine = specParts.join(" · ")

  return (
    <div
      ref={ref}
      className="product-sale-label-template"
      style={{
        // ── CAMISA DE FUERZA - etiqueta pre-cortada 2x1" ──────────────────
        width: "50mm",
        height: "25mm",
        overflow: "hidden",
        // ──────────────────────────────────────────────────────────────────
        boxSizing: "border-box",
        padding: "3px 4px",
        background: "white",
        color: "black",
        fontFamily: MONO,
        fontSize: "7px",
        lineHeight: 1.2,
        WebkitFontSmoothing: "none",
        MozOsxFontSmoothing: "unset",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      } as React.CSSProperties}
    >
      {/* ── FILA 1: Taller | Folio ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "1px",
        }}
      >
        <span
          style={{
            fontSize: "7.5px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "62%",
          }}
        >
          {data.shopName || "ReparaHub"}
        </span>
        {data.folio && (
          <span
            style={{
              fontSize: "7px",
              fontWeight: 700,
              flexShrink: 0,
              opacity: 0.8,
            }}
          >
            #{data.folio}
          </span>
        )}
      </div>

      {/* ── DIVISOR ── */}
      <div style={{ borderTop: "1.5px solid black", marginBottom: "1px" }} />

      {/* ── FILA 2: Nombre del equipo ── */}
      <div
        style={{
          fontSize: "8px",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          marginBottom: "1px",
        }}
      >
        {data.deviceName || "-"}
      </div>

      {/* ── FILA 3: Specs comprimidas en 1 linea ── */}
      {specsLine && (
        <div
          style={{
            fontSize: "6.5px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: "1px",
            opacity: 0.85,
          }}
        >
          {specsLine}
        </div>
      )}

      {/* ── FILA 4: IMEI / Serie (si existe) ── */}
      {data.imei && (
        <div
          style={{
            fontSize: "6.5px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: "1px",
          }}
        >
          {data.imei.length === 15 ? `IMEI: ${data.imei}` : `S/N: ${data.imei}`}
        </div>
      )}

      {/* ── DIVISOR ── */}
      <div style={{ borderTop: "1.5px solid black", marginBottom: "1px" }} />

      {/* ── FILA 5: Precio - protagonista ── */}
      {mostrarPrecios && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "baseline",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            ${fmt(data.precio)}
          </span>
        </div>
      )}
    </div>
  )
})

ProductSaleLabelTemplate.displayName = "ProductSaleLabelTemplate"
export { ProductSaleLabelTemplate }
