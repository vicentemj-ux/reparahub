"use client"

import { LABEL_STYLE, w700 } from "./ThermalTokens"

export interface RowProps {
  /** Label izquierdo (en mayusculas, bold). */
  label: string
  /** Valor derecho. */
  value: string
  /** Tamano de fuente del valor. @default "11px" */
  valSz?: string
}

/**
 * Fila de dos columnas: ETIQUETA (izq, 900) — valor (der, 700).
 * Usada para mostrar datos clave-valor en tickets.
 *
 * @example
 * <Row label="Cliente" value="Juan Perez" />
 * <Row label="IMEI" value="123456789" valSz="10px" />
 */
export function Row({ label, value, valSz = "11px" }: RowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "6px",
        marginBottom: "1px",
      }}
    >
      <span style={LABEL_STYLE}>{label}</span>
      <span
        style={{
          ...w700,
          fontSize: valSz,
          textAlign: "right",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
        }}
      >
        {value}
      </span>
    </div>
  )
}
