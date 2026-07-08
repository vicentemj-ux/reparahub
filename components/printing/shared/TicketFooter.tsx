"use client"

import { w700, w900, SHARP, FONT } from "./ThermalTokens"

export interface TicketFooterProps {
  /** Mensaje de despedida personalizado. */
  mensajeDespedida?: string
  /** Redes sociales del taller. */
  redesSociales?: {
    facebook?: string | null
    instagram?: string | null
    tiktok?: string | null
    whatsapp?: string | null
  }
  /** Si es true, muestra las redes sociales. @default false */
  mostrarRedesSociales?: boolean
}

/**
 * Pie de pagina estandar para tickets 80mm.
 * Muestra mensaje de despedida + redes sociales (opcionales).
 *
 * @example
 * <TicketFooter
 *   mensajeDespedida="Gracias por su preferencia"
 *   mostrarRedesSociales
 *   redesSociales={{ facebook: "reparahub", whatsapp: "52551234" }}
 * />
 */
export function TicketFooter({
  mensajeDespedida,
  redesSociales,
  mostrarRedesSociales = false,
}: TicketFooterProps) {
  return (
    <>
      {/* Mensaje de despedida */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            ...w900,
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginTop: "4px",
          }}
        >
          {mensajeDespedida || "Gracias por su preferencia"}
        </div>
      </div>

      {/* Redes sociales */}
      {mostrarRedesSociales && redesSociales && (
        <div
          style={{
            textAlign: "center",
            ...w700,
            fontSize: "9px",
            lineHeight: 1.4,
            marginTop: "4px",
          }}
        >
          {redesSociales.facebook && <div>FB: {redesSociales.facebook}</div>}
          {redesSociales.instagram && <div>IG: {redesSociales.instagram}</div>}
          {redesSociales.tiktok && <div>TK: {redesSociales.tiktok}</div>}
          {redesSociales.whatsapp && <div>WA: {redesSociales.whatsapp}</div>}
        </div>
      )}
    </>
  )
}
