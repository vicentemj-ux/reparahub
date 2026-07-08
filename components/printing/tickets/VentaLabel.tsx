"use client"

import { forwardRef } from "react"
import { SHARP, LABEL_FONT, MONO, BLACK, w600, w700, w900, fmtMXN } from "../shared"

export interface VentaLabelData {
  kind: "venta-label"
  id?: string
  folio?: string
  clienteNombre?: string | null
  items?: Array<{ descripcion: string; cantidad: number; precio_unitario: number }>
  total?: number
  fecha?: string
}

interface VentaLabelProps {
  data: VentaLabelData
}

const VentaLabel = forwardRef<HTMLDivElement, VentaLabelProps>(({ data }, ref) => {
  const folio = data.folio ?? data.id ?? "-"
  const cliente = (data.clienteNombre ?? null) || "VENTA GENERAL"
  const items = data.items ?? []
  const total = data.total ?? 0
  const fecha = data.fecha
    ? new Date(data.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "2-digit" })
    : ""

  const visibleItems = items.slice(0, 3)
  const extraCount = items.length - visibleItems.length

  return (
    <div
      ref={ref}
      className="venta-label"
      style={{
        width: "50mm",
        height: "25mm",
        boxSizing: "border-box",
        padding: "2mm",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        background: "white",
        color: BLACK,
        fontFamily: LABEL_FONT,
        lineHeight: 1.05,
        ...SHARP,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      } as React.CSSProperties}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ ...w900, fontSize: "9px", letterSpacing: "0.06em", lineHeight: 1 }}>
          #{folio}
        </span>
        <span style={{ ...w600, fontSize: "7px" }}>{fecha}</span>
      </div>

      <div
        style={{
          ...w600,
          fontSize: "7px",
          lineHeight: 1.1,
          borderTop: `0.5px solid ${BLACK}`,
          paddingTop: "1mm",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {cliente}
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {visibleItems.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              ...w600,
              fontSize: "6.5px",
              lineHeight: 1.15,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                paddingRight: "2mm",
              }}
            >
              {item.cantidad}x {item.descripcion}
            </span>
            <span style={{ flexShrink: 0, ...w700 }}>
              {fmtMXN(item.precio_unitario * item.cantidad)}
            </span>
          </div>
        ))}
        {extraCount > 0 && (
          <div style={{ ...w600, fontSize: "6px" }}>+{extraCount} mas</div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          borderTop: `1px solid ${BLACK}`,
          paddingTop: "1mm",
        }}
      >
        <span style={{ ...w700, fontSize: "7px", letterSpacing: "0.1em" }}>TOTAL</span>
        <span style={{ ...w900, fontSize: "9px", lineHeight: 1, fontFamily: MONO }}>{fmtMXN(total)}</span>
      </div>
    </div>
  )
})

VentaLabel.displayName = "VentaLabel"
export { VentaLabel }
