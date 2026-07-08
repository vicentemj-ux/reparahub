"use client"

import { w700, w900, SHARP, FONT } from "./ThermalTokens"

export interface BusinessHeaderProps {
  /** Nombre comercial del taller. */
  businessName: string
  /** Telefono del taller. */
  businessPhone?: string
  /** URL del logo. Si es null o vacio, no se muestra. */
  logoUrl?: string | null
  /** Si es false, oculta el logo incluso si existe. @default true */
  mostrarLogo?: boolean
  /** Titulo debajo del nombre (ej: "ORDEN DE SERVICIO"). */
  title?: string
}

/**
 * Encabezado estandar para tickets 80mm.
 * Muestra logo (opcional) + nombre del taller + telefono + titulo.
 *
 * @example
 * <BusinessHeader
 *   businessName="ReparaHub"
 *   businessPhone="555-1234"
 *   logoUrl="/logo.png"
 *   title="ORDEN DE SERVICIO"
 * />
 */
export function BusinessHeader({
  businessName,
  businessPhone,
  logoUrl,
  mostrarLogo = true,
  title,
}: BusinessHeaderProps) {
  return (
    <div style={{ textAlign: "center", marginBottom: "4px" }}>
      {mostrarLogo && logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          style={{
            maxHeight: "30px",
            objectFit: "contain",
            display: "block",
            margin: "0 auto 2px",
            imageRendering: "pixelated",
          }}
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = "none"
          }}
        />
      ) : (
        <div
          style={{
            ...SHARP,
            fontFamily: FONT,
            fontSize: "16px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}
        >
          {businessName}
        </div>
      )}

      {title && (
        <div
          style={{
            ...SHARP,
            fontFamily: FONT,
            fontSize: "10px",
            fontWeight: 700,
            marginTop: "2px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {title}
        </div>
      )}

      {businessPhone && (
        <div
          style={{
            ...SHARP,
            fontFamily: FONT,
            fontSize: "10px",
            fontWeight: 700,
            marginTop: "2px",
          }}
        >
          {businessPhone}
        </div>
      )}
    </div>
  )
}
