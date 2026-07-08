"use client"

import { forwardRef } from "react"
import { Label2xLayout } from "../layouts"
import {
  w700,
  w900,
  SHARP,
  LABEL_FONT,
  MONO,
  BLACK,
  fmtMXN,
  fmtDate,
} from "../shared"

// ─── Data Types ───────────────────────────────────────────────────────────────────

export interface RepairOrderLabelData {
  /** Folio de la orden de reparacion. */
  folio: string
  /** Fecha de entrada (ISO string). */
  entryDate: string
  /** Nombre del cliente. */
  customerName: string
  /** Telefono del cliente. */
  customerPhone: string
  /** Descripcion del equipo (Marca + Modelo). */
  deviceDescription: string
  /** Falla reportada (se trunca a 1 linea). */
  reportedFault: string
  /** Contrasena de bloqueo / patron de desbloqueo. */
  accessCode?: string | null
  /** Presupuesto inicial autorizado / estimado. */
  estimatedBudget?: number | null
}

export interface RepairOrderLabelProps {
  data: RepairOrderLabelData
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────

/** Trunca texto a un maximo de caracteres con indicador "...". */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 3) + "..."
}

// ─── Component ────────────────────────────────────────────────────────────────────

/**
 * Etiqueta de identificacion de orden de reparacion (2x1" / 50.8mm x 25.4mm).
 *
 * Se imprime al recibir el dispositivo del cliente. Layout de 5 lineas compactas:
 *   Linea 1: #FOLIO               FECHA
 *   Linea 2: CLIENTE              TEL
 *   Linea 3: EQUIPO (Marca/Modelo)
 *   Linea 4: FALLA (truncada, 1 linea)
 *   Linea 5: LOCK:xxxx   PREP.$X,XXX  (paralelos)
 *
 * Optimizada para maximizar legibilidad en el menor espacio posible.
 *
 * @example
 * <RepairOrderLabel
 *   data={{
 *     folio: "R-2024-001",
 *     entryDate: "2024-06-15T10:30:00Z",
 *     customerName: "Juan Perez",
 *     customerPhone: "555-1234",
 *     deviceDescription: "Samsung Galaxy S24",
 *     reportedFault: "Pantalla rota, no enciende",
 *     accessCode: "1234",
 *     estimatedBudget: 2500,
 *   }}
 * />
 */
const RepairOrderLabel = forwardRef<HTMLDivElement, RepairOrderLabelProps>(
  ({ data }, ref) => {
    const hasAccess = !!data.accessCode
    const hasBudget =
      data.estimatedBudget != null && data.estimatedBudget > 0

    const deviceName = truncate(data.deviceDescription, 22)
    const faultLine = truncate(data.reportedFault, 28)
    const customerLine = truncate(data.customerName, 18)

    return (
      <Label2xLayout ref={ref}>
        {/* ── Linea 1: Folio + Fecha ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexShrink: 0,
            borderBottom: "1px solid black",
            paddingBottom: "0.3mm",
          }}
        >
          <span
            style={{
              ...w900,
              fontSize: "9px",
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
            }}
          >
            #{data.folio}
          </span>
          <span
            style={{
              ...w700,
              fontSize: "7.5px",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {fmtDate(data.entryDate)}
          </span>
        </div>

        {/* ── Linea 2: Cliente + Telefono ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexShrink: 0,
            gap: "1mm",
          }}
        >
          <span
            style={{
              ...w900,
              fontSize: "9px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
            }}
          >
            {customerLine}
          </span>
          <span
            style={{
              ...w700,
              fontSize: "8px",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {data.customerPhone}
          </span>
        </div>

        {/* ── Linea 3: Equipo (Marca/Modelo) ── */}
        <div
          style={{
            ...w900,
            fontSize: "9px",
            letterSpacing: "0.02em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexShrink: 0,
            lineHeight: 1.05,
          }}
        >
          {deviceName}
        </div>

        {/* ── Linea 4: Falla reportada (truncada estricta a 1 linea) ── */}
        <div
          style={{
            ...w700,
            fontSize: "8px",
            lineHeight: 1.05,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <span style={{ ...w900, fontSize: "7px", letterSpacing: "0.04em" }}>
            FALLA:{" "}
          </span>
          {faultLine || "Sin descripcion"}
        </div>

        {/* ── Linea 5: LOCK + PREP (paralelos para ahorrar espacio) ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
            gap: "1mm",
          }}
        >
          {/* LOCK (contrasena / patron) */}
          {hasAccess ? (
            <span
              style={{
                ...w900,
                fontSize: "8px",
                letterSpacing: "0.04em",
                border: `1px solid ${BLACK}`,
                padding: "0.2mm 0.6mm",
                lineHeight: 1,
                whiteSpace: "nowrap",
                background: "white",
                flexShrink: 0,
              }}
            >
              {data.accessCode}
            </span>
          ) : (
            <span />
          )}

          {/* PREP (presupuesto) */}
          {hasBudget ? (
            <span
              style={{
                ...SHARP,
                fontFamily: LABEL_FONT,
                fontWeight: 900,
                fontSize: "9px",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              PRESP. {fmtMXN(data.estimatedBudget!)}
            </span>
          ) : null}
        </div>
      </Label2xLayout>
    )
  }
)

RepairOrderLabel.displayName = "RepairOrderLabel"
export { RepairOrderLabel }
