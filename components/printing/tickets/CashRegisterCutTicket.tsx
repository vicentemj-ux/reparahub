"use client"

import { forwardRef } from "react"
import { Ticket80mmLayout } from "../layouts"
import {
  BusinessHeader,
  Divider,
  Row,
  MoneyRow,
  TicketFooter,
  w700,
  w900,
  SHARP,
  FONT,
  MONO,
  BLACK,
  fmtMXN,
  fmtDate,
} from "../shared"

// ─── Data Types ───────────────────────────────────────────────────────────────────

export interface CashRegisterCutData {
  /** ID o numero de la caja. */
  cajaId: string
  /** Nombre del cajero que cierra. */
  cajeroName: string
  /** Fecha/hora de apertura (ISO string). */
  openedAt: string
  /** Fecha/hora de cierre (ISO string). */
  closedAt: string
  /** Fondo inicial de la caja. */
  fondoInicial: number

  /** Ingresos agrupados por metodo de pago. */
  ingresos: {
    efectivo: number
    tarjeta: number
    transferencia: number
  }

  /** Desglose: ingresos por POS (ventas directas). */
  posSales: number
  /** Desglose: ingresos por reparaciones (abonos + entregas). */
  repairIncome: number

  /** Egresos / salidas de caja. */
  egresos: { concepto: string; monto: number }[]
  /** Total de egresos. */
  totalEgresos: number

  /** Total esperado en caja (fondo + ingresos - egresos). */
  totalEsperado: number
  /** Total real contado fisicamente. */
  totalReal: number
  /** Diferencia (real - esperado). Positivo = sobrante, negativo = faltante. */
  diferencia: number
}

export interface CashRegisterCutTicketProps {
  data: CashRegisterCutData
  business: {
    name: string
    phone: string
    logoUrl: string | null
    mensajeDespedida?: string
  }
  options?: {
    mostrarLogo?: boolean
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 3) + "..."
}

// ─── Component ────────────────────────────────────────────────────────────────────

/**
 * Ticket de arqueo / cierre de caja (80mm).
 *
 * Muestra: encabezado del taller, datos del turno, balance tabular
 * (fondo, ingresos por metodo, desglose POS vs Reparaciones),
 * egresos, y balance final (esperado vs real vs diferencia).
 *
 * @example
 * <CashRegisterCutTicket
 *   data={cutData}
 *   business={{ name: "Mi Taller", phone: "555-1234", logoUrl: null }}
 * />
 */
const CashRegisterCutTicket = forwardRef<HTMLDivElement, CashRegisterCutTicketProps>(
  ({ data, business, options = {} }, ref) => {
    const { mostrarLogo = true } = options

    const totalIngresos =
      data.ingresos.efectivo + data.ingresos.tarjeta + data.ingresos.transferencia

    return (
      <Ticket80mmLayout ref={ref}>
        {/* ── ENCABEZADO ── */}
        <BusinessHeader
          businessName={business.name}
          businessPhone={business.phone}
          logoUrl={business.logoUrl}
          mostrarLogo={mostrarLogo}
          title="ARQUEO DE CAJA"
        />

        <Divider />

        {/* ── TURNO ── */}
        <Row label="Caja" value={data.cajaId} />
        <Row label="Cajero" value={truncate(data.cajeroName, 24)} />
        <Row label="Apertura" value={fmtDate(data.openedAt)} valSz="9px" />
        <Row label="Cierre" value={fmtDate(data.closedAt)} valSz="9px" />

        <Divider />

        {/* ── FONDO INICIAL ── */}
        <MoneyRow label="Fondo inicial:" value={fmtMXN(data.fondoInicial)} labelW={900} />

        <Divider />

        {/* ── INGRESOS POR METODO ── */}
        <div
          style={{
            ...w900,
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "2px",
          }}
        >
          Ingresos por metodo:
        </div>

        <MoneyRow label="Efectivo:" value={fmtMXN(data.ingresos.efectivo)} labelW={700} valSz="10px" />
        <MoneyRow label="Tarjeta:" value={fmtMXN(data.ingresos.tarjeta)} labelW={700} valSz="10px" />
        <MoneyRow label="Transferencia:" value={fmtMXN(data.ingresos.transferencia)} labelW={700} valSz="10px" />

        <div style={{ borderTop: `1px solid ${BLACK}`, margin: "2px 0" }} />
        <MoneyRow label="Total ingresos:" value={fmtMXN(totalIngresos)} labelW={900} valSz="10px" />

        <Divider />

        {/* ── DESEGLOSE POR ORIGEN ── */}
        <div
          style={{
            ...w900,
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "2px",
          }}
        >
          Desglose por origen:
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            ...w700,
            fontSize: "10px",
            marginBottom: "1px",
          }}
        >
          <span>Ventas POS:</span>
          <span style={{ fontFamily: MONO }}>{fmtMXN(data.posSales)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            ...w700,
            fontSize: "10px",
            marginBottom: "1px",
          }}
        >
          <span>Reparaciones:</span>
          <span style={{ fontFamily: MONO }}>{fmtMXN(data.repairIncome)}</span>
        </div>

        <Divider />

        {/* ── EGRESOS ── */}
        <div
          style={{
            ...w900,
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "2px",
          }}
        >
          Egresos / Salidas:
        </div>

        {data.egresos.length > 0 ? (
          data.egresos.map((e, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                ...w700,
                fontSize: "10px",
                marginBottom: "1px",
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {truncate(e.concepto, 28)}
              </span>
              <span style={{ fontFamily: MONO, flexShrink: 0 }}>{fmtMXN(e.monto)}</span>
            </div>
          ))
        ) : (
          <div style={{ ...w700, fontSize: "10px", fontStyle: "italic" }}>
            Sin egresos registrados
          </div>
        )}

        <div style={{ borderTop: `1px solid ${BLACK}`, margin: "2px 0" }} />
        <MoneyRow label="Total egresos:" value={fmtMXN(data.totalEgresos)} labelW={900} valSz="10px" />

        <Divider />

        {/* ── BALANCE FINAL ── */}
        <div
          style={{
            ...w900,
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "2px",
          }}
        >
          Balance final:
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            ...w700,
            fontSize: "10px",
            marginBottom: "1px",
          }}
        >
          <span>Fondo + Ingresos - Egresos:</span>
          <span style={{ fontFamily: MONO }}>{fmtMXN(data.totalEsperado)}</span>
        </div>

        <MoneyRow label="Total contado:" value={fmtMXN(data.totalReal)} labelW={900} valSz="11px" />

        <div style={{ borderTop: `1.5px solid ${BLACK}`, margin: "2px 0" }} />

        {/* Diferencia */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span style={{ ...w900, fontSize: "11px" }}>Diferencia:</span>
          <span
            style={{
              ...SHARP,
              fontFamily: MONO,
              fontWeight: 900,
              fontSize: "16px",
              lineHeight: "1",
              color: BLACK,
            }}
          >
            {data.diferencia >= 0 ? "+" : ""}
            {fmtMXN(data.diferencia)}
          </span>
        </div>

        <div
          style={{
            textAlign: "center",
            ...w700,
            fontSize: "9px",
            marginTop: "1px",
          }}
        >
          {data.diferencia === 0
            ? "Caja cuadrada"
            : data.diferencia > 0
              ? "SOBRANTE"
              : "FALTANTE"}
        </div>

        <Divider />

        {/* ── FIRMA ── */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              ...w900,
              fontSize: "9px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "2px",
            }}
          >
            Firma del cajero
          </div>
          <div
            style={{
              height: "1.2cm",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "60%",
                borderBottom: `1px solid ${BLACK}`,
              }}
            />
          </div>
        </div>

        <Divider />

        {/* ── PIE ── */}
        <TicketFooter mensajeDespedida={business.mensajeDespedida} />
      </Ticket80mmLayout>
    )
  }
)

CashRegisterCutTicket.displayName = "CashRegisterCutTicket"
export { CashRegisterCutTicket }
