"use client"

import { forwardRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Label2xLayout } from "../layouts"
import { SHARP, LABEL_FONT, BLACK, w700, w900 } from "../shared"

// ─── Data Types ───────────────────────────────────────────────────────────────────

export interface DeviceInventoryLabelData {
  brand: string
  model: string
  serialNumber: string
  folio: string
  barcode?: string
  status?: string
  price?: number
  showPrice?: boolean
  storage?: string | null
  sku?: string
  description?: string | null
}

interface DeviceInventoryLabelProps {
  data: DeviceInventoryLabelData
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 3) + "..."
}

function fmtPrice(n: number): string {
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ─── Component ────────────────────────────────────────────────────────────────────

const DeviceInventoryLabel = forwardRef<HTMLDivElement, DeviceInventoryLabelProps>(
  ({ data }, ref) => {
    const deviceName = truncate(`${data.brand} ${data.model}`.trim(), 28)
    const showPrice = data.showPrice !== false
    const price = data.price ?? 0
    const priceStr = fmtPrice(price)
    const status = (data.status ?? "").trim().toUpperCase()
    const description = (data.description ?? "").trim()
    const qrValue = (data.barcode ?? data.sku ?? "").trim()

    return (
      <Label2xLayout ref={ref}>
        {/* ── Nombre del dispositivo (grande, bold) ── */}
        <div
          style={{
            ...w900,
            fontSize: "13px",
            letterSpacing: "0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.15,
            flexShrink: 0,
          }}
        >
          {deviceName || "\u2014"}
        </div>

        {/* ── Linea solida ── */}
        <div
          style={{
            width: "100%",
            height: "1.5px",
            background: BLACK,
            flexShrink: 0,
            marginTop: "0.5mm",
            marginBottom: "0.4mm",
          }}
        />

        {/* ── Seccion media: Specs (izq) + QR (der) ── */}
        <div
          style={{
            display: "flex",
            gap: "1.5mm",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Izquierda: Descripcion */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              overflow: "hidden",
            }}
          >
            {description && (
              <div
                style={{
                  ...w700,
                  fontSize: "8px",
                  lineHeight: 1.25,
                  letterSpacing: "0.01em",
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  wordBreak: "break-word",
                }}
              >
                {description}
              </div>
            )}
          </div>

          {/* Derecha: QR code */}
          {qrValue && (
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
              }}
            >
              <QRCodeSVG
                value={qrValue}
                size={88}
                bgColor="transparent"
                fgColor="#000000"
                level="M"
                style={{
                  width: "14mm",
                  height: "14mm",
                }}
              />
            </div>
          )}
        </div>

        {/* ── Condicion + Precio ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexShrink: 0,
            lineHeight: 1.1,
            marginTop: "0.2mm",
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
            {status && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.6mm" }}>
                <span style={{ fontSize: "9px" }}>&#9670;</span>
                {truncate(status, 18)}
              </span>
            )}
          </div>
          {showPrice && price > 0 && (
            <div
              style={{
                ...SHARP,
                fontFamily: LABEL_FONT,
                fontWeight: 900,
                fontSize: "12px",
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

DeviceInventoryLabel.displayName = "DeviceInventoryLabel"
export { DeviceInventoryLabel }
