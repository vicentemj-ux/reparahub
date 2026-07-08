"use client"

import { forwardRef } from "react"

/** Azul institucional y grises (impresion); datos del taller via props. */
const BLUE = "#185FA5"
const SLATE_50 = "#f8fafc"
const SLATE_200 = "#e2e8f0"
const SLATE_500 = "#64748b"
const SLATE_800 = "#ffffff"

export interface CartelExhibicionTemplateProps {
  /** Nombre comercial del producto */
  nombreProducto: string
  /** Vinetas (categoria, color, bullets de descripcion, etc.) */
  features: string[]
  /** Precio de contado ya formateado (MXN) */
  precioContadoFormatted: string
  /** Nombre del negocio (configuracion del taller) */
  businessName: string
  /** Logo del taller (URL absoluta o de Supabase) */
  logoUrl?: string | null
}

/**
 * Cartel tipo postal 4" x 6" (vertical) para exhibicion en mostrador.
 * Solo estilos inline: colores literales HEX / RGBA (sin Tailwind, sin lab/oklch) para captura con html2canvas/html-to-image.
 */
const CartelExhibicionTemplate = forwardRef<HTMLDivElement, CartelExhibicionTemplateProps>(
  ({ nombreProducto, features, precioContadoFormatted, businessName, logoUrl }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: "4in",
          minHeight: "6in",
          boxSizing: "border-box",
          background: "#ffffff",
          color: SLATE_800,
          fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "0.32in",
          display: "flex",
          flexDirection: "column",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        {/* Franja superior institucional */}
        <div
          style={{
            borderBottom: `2px solid ${BLUE}`,
            paddingBottom: "0.14in",
            marginBottom: "0.2in",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.15in" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {logoUrl ? (
                <>
                  <img
                    src={logoUrl}
                    alt=""
                    crossOrigin="anonymous"
                    style={{
                      maxHeight: "0.52in",
                      maxWidth: "2.2in",
                      width: "auto",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                  <div
                    style={{
                      marginTop: "0.06in",
                      fontSize: "7.5pt",
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: SLATE_500,
                    }}
                  >
                    {businessName}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    fontSize: "14pt",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: BLUE,
                    lineHeight: 1.15,
                  }}
                >
                  {businessName}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Titulo producto */}
        <h1
          style={{
            margin: 0,
            fontSize: "17pt",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            color: SLATE_800,
            marginBottom: "0.18in",
          }}
        >
          {nombreProducto.trim() || "Producto"}
        </h1>

        {/* Bloque caracteristicas */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            background: SLATE_50,
            border: `1px solid ${SLATE_200}`,
            borderRadius: "10px",
            padding: "0.14in 0.16in",
            marginBottom: "0.2in",
          }}
        >
          <div
            style={{
              fontSize: "7pt",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: BLUE,
              marginBottom: "0.1in",
            }}
          >
            Caracteristicas
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "0.18in",
              fontSize: "9.5pt",
              lineHeight: 1.45,
              color: SLATE_800,
            }}
          >
            {features.map((line, i) => (
              <li key={i} style={{ marginBottom: "0.05in", paddingLeft: "0.02in" }}>
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* Precio contado */}
        <div
          style={{
            marginTop: "auto",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #185FA5 0%, #2563eb 100%)",
            color: "#ffffff",
            padding: "0.16in 0.2in",
            textAlign: "center",
            boxShadow: "0 4px 14px rgba(24, 95, 165, 0.35)",
          }}
        >
          <div
            style={{
              fontSize: "8pt",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(255, 255, 255, 0.95)",
              marginBottom: "0.04in",
            }}
          >
            Precio de contado
          </div>
          <div
            style={{
              fontSize: "26pt",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              color: "#ffffff",
            }}
          >
            {precioContadoFormatted}
          </div>
          <div
            style={{
              marginTop: "0.08in",
              fontSize: "7pt",
              color: "rgba(255, 255, 255, 0.9)",
            }}
          >
            MXN · Incluye IVA cuando aplique · Sujeto a disponibilidad
          </div>
        </div>
      </div>
    )
  }
)

CartelExhibicionTemplate.displayName = "CartelExhibicionTemplate"

export { CartelExhibicionTemplate }
