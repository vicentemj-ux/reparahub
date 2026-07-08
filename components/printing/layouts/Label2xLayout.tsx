"use client"

import { forwardRef, type ReactNode } from "react"
import {
  LABEL_WIDTH,
  LABEL_HEIGHT,
  LABEL_PADDING,
  LABEL_FONT,
  BLACK,
  SHARP,
} from "../shared/ThermalTokens"

export interface Label2xLayoutProps {
  children: ReactNode
  /** ID para ref de impresion. @default "etiqueta" */
  id?: string
  /** Clases CSS adicionales. */
  className?: string
}

/**
 * Layout base para etiquetas termicas 2x1" (50.8mm x 25.4mm).
 *
 * - Padding derecho (1.5mm) reserva zona no imprimible de impresoras termicas.
 * - Contenido util: 48.8mm de ancho.
 * - Usa display flex column para distribuir contenido en 5 lineas.
 * - Altura fija para cortar exacto en la impresora.
 *
 * @example
 * <Label2xLayout ref={labelRef}>
 *   <div>Linea 1: Taller + Folio</div>
 *   <div>Linea 2: Cliente + Fecha</div>
 *   <div>Linea 3: Dispositivo</div>
 *   <div>Linea 4-5: Falla + Precio</div>
 * </Label2xLayout>
 */
const Label2xLayout = forwardRef<HTMLDivElement, Label2xLayoutProps>(
  ({ children, id = "etiqueta", className = "" }, ref) => {
    return (
      <div
        ref={ref}
        id={id}
        className={`label-repair-template ${className}`}
        style={{
          position: "relative",
          width: LABEL_WIDTH,
          height: LABEL_HEIGHT,
          padding: LABEL_PADDING,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
          background: "white",
          color: "black",
          fontFamily: LABEL_FONT,
          lineHeight: 1.05,
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

Label2xLayout.displayName = "Label2xLayout"
export { Label2xLayout }
