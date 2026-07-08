"use client"

import { forwardRef, type ReactNode } from "react"
import { TICKET_WIDTH, TICKET_PADDING, BLACK, FONT, SHARP } from "../shared/ThermalTokens"

export interface Ticket80mmLayoutProps {
  children: ReactNode
  /** ID para ref de impresion. @default "ticket" */
  id?: string
  /** Clases CSS adicionales. */
  className?: string
}

/**
 * Layout base para tickets termicos 80mm.
 *
 * - Area segura: 72mm (3mm padding cada lado en papel de 80mm).
 * - CSS aislado: solo se muestra en modo impresion (via body.print-ticket-mode).
 * - Inline styles para maxima compatibilidad con drivers de impresora.
 * - Usa forwardRef para permitir impresion via react-to-print o window.print().
 *
 * @example
 * <Ticket80mmLayout ref={ticketRef}>
 *   <BusinessHeader businessName="Mi Taller" />
 *   <Divider />
 *   <Row label="Cliente" value="Juan Perez" />
 * </Ticket80mmLayout>
 */
const Ticket80mmLayout = forwardRef<HTMLDivElement, Ticket80mmLayoutProps>(
  ({ children, id = "ticket", className = "" }, ref) => {
    return (
      <div
        ref={ref}
        id={id}
        className={`receipt-ticket ${className}`}
        style={{
          width: TICKET_WIDTH,
          maxWidth: TICKET_WIDTH,
          margin: "0 auto",
          padding: TICKET_PADDING,
          boxSizing: "border-box",
          background: "#ffffff",
          color: BLACK,
          fontFamily: FONT,
          fontSize: "11px",
          lineHeight: "1.25",
          overflow: "hidden",
          ...SHARP,
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        } as React.CSSProperties}
      >
        {children}
      </div>
    )
  }
)

Ticket80mmLayout.displayName = "Ticket80mmLayout"
export { Ticket80mmLayout }
