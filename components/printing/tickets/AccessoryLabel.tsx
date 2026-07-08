"use client"

import { forwardRef, useRef, useEffect } from "react"
import JsBarcode from "jsbarcode"
import { Label2xLayout } from "../layouts"
import {
  w700,
  w900,
  SHARP,
  LABEL_FONT,
  MONO,
  BLACK,
} from "../shared"

// ─── Data Types ───────────────────────────────────────────────────────────────────

export interface AccessoryLabelData {
  productName: string
  sku: string
  price: number
  currency?: string
  category?: string | null
  condition?: string | null
  barcode?: string | null
  showPrice?: boolean
}

export interface AccessoryLabelProps {
  data: AccessoryLabelData
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 3) + "..."
}

function fmtPrice(n: number): string {
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Component ────────────────────────────────────────────────────────────────────

const AccessoryLabel = forwardRef<HTMLDivElement, AccessoryLabelProps>(
  ({ data }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null)
    const productName = (data.productName ?? "").trim()
    const priceStr = fmtPrice(data.price)
    const showPrice = data.showPrice !== false
    const barcodeValue = (data.barcode ?? "").trim()
    const condition = (data.condition ?? "").trim().toUpperCase()

    useEffect(() => {
      if (!svgRef.current || !barcodeValue) return
      try {
        JsBarcode(svgRef.current, barcodeValue, {
          format: barcodeValue.length === 13 ? "EAN13" : barcodeValue.length === 12 ? "EAN13" : "CODE128",
          width: 2.2,
          height: 44,
          displayValue: false,
          margin: 0,
          background: "transparent",
          lineColor: "#000000",
        })
      } catch {
        // Codigo invalido para barcode
      }
    }, [barcodeValue])

    return (
      <Label2xLayout ref={ref}>
        {/* ── Nombre del producto (hasta 2 lineas) ── */}
        <div
          style={{
            ...w900,
            fontSize: "11px",
            letterSpacing: "0.01em",
            lineHeight: 1.15,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
            flexShrink: 0,
            marginBottom: "0.3mm",
          }}
        >
          {productName || "\u2014"}
        </div>

        {/* ── Linea solida ── */}
        <div
          style={{
            width: "100%",
            height: "1.5px",
            background: BLACK,
            flexShrink: 0,
            marginBottom: "0.3mm",
          }}
        />

        {/* ── Codigo de barras (SVG via JsBarcode, ocupa espacio central) ── */}
        {barcodeValue && (
          <div
            style={{
              textAlign: "center",
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <svg
              ref={svgRef}
              style={{
                width: "44mm",
                maxHeight: "14mm",
              }}
            />
          </div>
        )}

        {/* ── Numero del codigo debajo ── */}
        {barcodeValue && (
          <div
            style={{
              fontFamily: MONO,
              fontWeight: 400,
              fontSize: "5.5px",
              letterSpacing: "0.15em",
              textAlign: "center",
              lineHeight: 1,
              flexShrink: 0,
              marginTop: "0.2mm",
              marginBottom: "0.3mm",
              ...SHARP,
            }}
          >
            {barcodeValue}
          </div>
        )}

        {/* ── Condicion + Precio (misma fila) ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexShrink: 0,
            lineHeight: 1.1,
          }}
        >
          <div
            style={{
              ...w900,
              fontSize: "9px",
              letterSpacing: "0.02em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
            }}
          >
            {condition && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.6mm" }}>
                <span style={{ fontSize: "9px" }}>&#9670;</span>
                {truncate(condition, 18)}
              </span>
            )}
          </div>
          {showPrice && (
            <div
              style={{
                ...SHARP,
                fontFamily: LABEL_FONT,
                fontWeight: 900,
                fontSize: "11px",
                lineHeight: 1,
                textAlign: "right",
                flexShrink: 0,
                marginLeft: "2mm",
              }}
            >
              {priceStr}
            </div>
          )}
        </div>
      </Label2xLayout>
    )
  }
)

AccessoryLabel.displayName = "AccessoryLabel"
export { AccessoryLabel }
