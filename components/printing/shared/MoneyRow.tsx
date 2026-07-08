"use client"

import { SHARP, FONT, MONO, w700 } from "./ThermalTokens"

export interface MoneyRowProps {
  /** Label izquierdo. */
  label: string
  /** Valor monetario formateado (ej: "$1,234.56"). */
  value: string
  /** Peso de fuente del label. @default 700 */
  labelW?: number
  /** Tamano de fuente. @default "11px" */
  valSz?: string
}

/**
 * Fila de importes: etiqueta (izq) — monto monospace (der).
 * Usa fuente monoespaciada para alinear montos verticalmente.
 *
 * @example
 * <MoneyRow label="Subtotal:" value="$1,234.56" />
 * <MoneyRow label="IVA:" value="$197.53" labelW={700} valSz="10px" />
 */
export function MoneyRow({ label, value, labelW = 700, valSz = "11px" }: MoneyRowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: "1px",
      }}
    >
      <span
        style={{
          ...SHARP,
          fontFamily: FONT,
          fontWeight: labelW,
          fontSize: valSz,
        }}
      >
        {label}
      </span>
      <span
        style={{
          ...SHARP,
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: valSz,
        }}
      >
        {value}
      </span>
    </div>
  )
}
