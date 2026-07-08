"use client"

import { forwardRef } from "react"
import { FONT, MONO, BLACK, SHARP, fmtMXN } from "../shared"

export interface TicketCompraData {
  folio: string
  fecha: string
  vendedor: string
  documento: string
  marca: string
  modelo: string
  serial: string
  imei: string
  monto: number
  condicion: string
  color: string
  capacidad: string
  observaciones?: string
}

interface TicketCompraTemplateProps {
  data: TicketCompraData
  businessName?: string
  businessPhone?: string
  businessAddress?: string
  logoUrl?: string | null
  declaracionJurat?: string
  mensajeDespedida?: string
  mostrarLogo?: boolean
}

function interpolateJurat(template: string, data: TicketCompraData): string {
  return template
    .replace(/\{\{vendedor\}\}/g, data.vendedor)
    .replace(/\{\{documento\}\}/g, data.documento)
    .replace(/\{\{marca\}\}/g, data.marca)
    .replace(/\{\{modelo\}\}/g, data.modelo)
    .replace(/\{\{serial\}\}/g, data.serial)
    .replace(/\{\{imei\}\}/g, data.imei)
    .replace(/\{\{monto\}\}/g, data.monto.toLocaleString("es-MX"))
}

const TicketCompraTemplate = forwardRef<HTMLDivElement, TicketCompraTemplateProps>(
  ({ data, businessName = "Mi Taller", businessPhone = "", businessAddress = "", logoUrl, declaracionJurat, mensajeDespedida, mostrarLogo = true }, ref) => {
    const juratText = declaracionJurat
      ? interpolateJurat(declaracionJurat, data)
      : `Yo, ${data.vendedor}, identificado con ${data.documento}, declaro que el equipo ${data.marca} ${data.modelo} con serial ${data.serial} e IMEI ${data.imei} es de mi propiedad, me funciona correctamente y lo vendo libre de adeudos por la cantidad de ${fmtMXN(data.monto)}.`

    return (
      <div
        ref={ref}
        id="ticket-compra"
        className="receipt-ticket"
        style={{
          width: "210mm",
          maxWidth: "210mm",
          margin: "0 auto",
          padding: "10mm",
          boxSizing: "border-box",
          background: "#ffffff",
          color: BLACK,
          fontFamily: FONT,
          fontSize: "12px",
          lineHeight: 1.4,
          overflow: "hidden",
          WebkitFontSmoothing: "none",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeSpeed",
          imageRendering: "pixelated",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        } as React.CSSProperties}
      >
        {/* ── ENCABEZADO ── */}
        <div style={{ textAlign: "center", marginBottom: "6mm" }}>
          {mostrarLogo && logoUrl && (
            <img
              src={logoUrl}
              alt=""
              style={{ maxHeight: "40px", objectFit: "contain", display: "block", margin: "0 auto 4px", imageRendering: "pixelated" }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
            />
          )}
          <div style={{ ...SHARP, fontWeight: 900, fontSize: "18px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {businessName}
          </div>
          {businessPhone && (
            <div style={{ ...SHARP, fontWeight: 700, fontSize: "11px", marginTop: "2px" }}>
              Tel: {businessPhone}
            </div>
          )}
          {businessAddress && (
            <div style={{ ...SHARP, fontWeight: 600, fontSize: "10px", marginTop: "1px" }}>
              {businessAddress}
            </div>
          )}
        </div>

        {/* ── TITULO ── */}
        <div style={{ textAlign: "center", marginBottom: "6mm", borderBottom: `2px solid ${BLACK}`, paddingBottom: "3mm" }}>
          <div style={{ ...SHARP, fontWeight: 900, fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Comprobante de Adquisicion
          </div>
          <div style={{ ...SHARP, fontWeight: 700, fontSize: "11px", marginTop: "2px" }}>
            Folio: <span style={{ fontFamily: MONO, fontWeight: 900 }}>{data.folio}</span> · {data.fecha}
          </div>
        </div>

        {/* ── DATOS DEL VENDEDOR ── */}
        <div style={{ marginBottom: "6mm" }}>
          <div style={{ ...SHARP, fontWeight: 900, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2mm", padding: "2mm 3mm" }}>
            Datos del vendedor
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2mm 4mm", padding: "0 3mm" }}>
            <div><span style={{ fontWeight: 700 }}>Nombre:</span> {data.vendedor}</div>
            <div><span style={{ fontWeight: 700 }}>Documento:</span> {data.documento}</div>
          </div>
        </div>

        {/* ── DATOS DEL EQUIPO ── */}
        <div style={{ marginBottom: "6mm" }}>
          <div style={{ ...SHARP, fontWeight: 900, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2mm", padding: "2mm 3mm" }}>
            Datos del equipo adquirido
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2mm 4mm", padding: "0 3mm" }}>
            <div><span style={{ fontWeight: 700 }}>Marca:</span> {data.marca}</div>
            <div><span style={{ fontWeight: 700 }}>Modelo:</span> {data.modelo}</div>
            <div><span style={{ fontWeight: 700 }}>Serial:</span> <span style={{ fontFamily: MONO }}>{data.serial}</span></div>
            <div><span style={{ fontWeight: 700 }}>IMEI:</span> <span style={{ fontFamily: MONO }}>{data.imei}</span></div>
            <div><span style={{ fontWeight: 700 }}>Color:</span> {data.color}</div>
            <div><span style={{ fontWeight: 700 }}>Capacidad:</span> {data.capacidad}</div>
            <div><span style={{ fontWeight: 700 }}>Condicion:</span> {data.condicion}</div>
            <div><span style={{ fontWeight: 700 }}>Monto:</span> <span style={{ fontFamily: MONO, fontWeight: 900 }}>{fmtMXN(data.monto)}</span></div>
          </div>
        </div>

        {/* ── OBSERVACIONES ── */}
        {data.observaciones && (
          <div style={{ marginBottom: "6mm", padding: "0 3mm" }}>
            <div style={{ ...SHARP, fontWeight: 700, fontSize: "10px", marginBottom: "1mm" }}>Observaciones:</div>
            <div style={{ ...SHARP, fontWeight: 600, fontSize: "11px", lineHeight: 1.4 }}>
              {data.observaciones}
            </div>
          </div>
        )}

        {/* ── DECLARACION JURADA ── */}
        <div style={{ marginBottom: "8mm", border: `1.5px solid ${BLACK}`, padding: "4mm" }}>
          <div style={{ ...SHARP, fontWeight: 900, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2mm", textAlign: "center" }}>
            Declaracion bajo protesta de decir verdad
          </div>
          <p style={{ ...SHARP, fontWeight: 600, fontSize: "11px", lineHeight: 1.5, margin: 0, textAlign: "justify" }}>
            {juratText}
          </p>
        </div>

        {/* ── FIRMAS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10mm", marginBottom: "6mm", padding: "0 8mm" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderBottom: `1px solid ${BLACK}`, height: "12mm", marginBottom: "2mm" }} />
            <div style={{ ...SHARP, fontWeight: 700, fontSize: "10px" }}>Firma del vendedor</div>
            <div style={{ ...SHARP, fontWeight: 600, fontSize: "9px" }}>{data.vendedor}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderBottom: `1px solid ${BLACK}`, height: "12mm", marginBottom: "2mm" }} />
            <div style={{ ...SHARP, fontWeight: 700, fontSize: "10px" }}>Firma del comprador</div>
            <div style={{ ...SHARP, fontWeight: 600, fontSize: "9px" }}>{businessName}</div>
          </div>
        </div>

        {/* ── DESPEDIDA ── */}
        {mensajeDespedida && (
          <div style={{ textAlign: "center", ...SHARP, fontWeight: 700, fontSize: "10px", marginTop: "4mm", borderTop: `1px dashed ${BLACK}`, paddingTop: "3mm" }}>
            {mensajeDespedida}
          </div>
        )}
      </div>
    )
  }
)

TicketCompraTemplate.displayName = "TicketCompraTemplate"
export { TicketCompraTemplate }
export type { TicketCompraTemplateProps }
