"use client"

import { DIVIDER_DASH, FONT, w900 } from "./ThermalTokens"

export interface DividerProps {
  /** Texto del separador. @default DIVIDER_DASH */
  text?: string
  /** Estilos adicionales para el contenedor. */
  style?: React.CSSProperties
}

/**
 * Separador visual para tickets 80mm.
 * Renderiza una linea de guiones centrada.
 *
 * @example
 * <Divider />
 * <Divider text="- - - - - - -" />
 */
export function Divider({ text = DIVIDER_DASH, style }: DividerProps) {
  return (
    <div
      style={{
        textAlign: "center",
        fontSize: "9px",
        color: "#000000",
        margin: "3px 0",
        letterSpacing: "0.04em",
        fontFamily: FONT,
        ...w900,
        ...style,
      }}
      aria-hidden
    >
      {text}
    </div>
  )
}
