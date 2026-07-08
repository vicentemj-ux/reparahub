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
  fmtMXN,
  fmtDate,
  METODOS_PAGO_LABEL,
} from "../shared"

// ─── Data Types ───────────────────────────────────────────────────────────────────

export interface RepairPaymentTicketData {
  /** Folio de la reparacion. */
  folio: string
  /** Nombre del cliente. */
  customerName: string
  /** Telefono del cliente. */
  customerPhone: string
  /** Nombre del dispositivo (marca + modelo). */
  deviceName: string
  /** Metodo de pago utilizado. */
  metodoPago: string
  /** Referencia, autorizacion o cuenta para tarjeta/transferencia. */
  referenciaPago?: string | null
  /** Monto de este abono/liquidacion. */
  monto: number
  /** Total pagado acumulado. */
  totalPagado: number
  /** Presupuesto total. */
  presupuesto: number
  /** Saldo restante. */
  saldoRestante: number
  /** Fecha del movimiento (ISO string). */
  date: string
  /** Tipo de movimiento: "anticipo" o "liquidacion". */
  tipoMov: "anticipo" | "liquidacion"
}

export interface RepairPaymentTicketProps {
  data: RepairPaymentTicketData
  business: {
    name: string
    phone: string
    logoUrl: string | null
    mensajeDespedida?: string
  }
  options?: {
    mostrarLogo?: boolean
    mostrarPrecios?: boolean
    servicios?: { nombre: string; precio: number; cantidad: number }[]
    terminosGarantia?: string
  }
}

// ─── Component ────────────────────────────────────────────────────────────────────

/**
 * Ticket de abono a reparacion (80mm).
 *
 * Muestra: encabezado del taller, tipo de comprobante (anticipo/liquidacion),
 * datos del cliente, dispositivo, monto pagado, totales y metodo de pago.
 *
 * @example
 * <RepairPaymentTicket
 *   data={abonoData}
 *   business={{ name: "Mi Taller", phone: "555-1234", logoUrl: null }}
 * />
 */
const RepairPaymentTicket = forwardRef<HTMLDivElement, RepairPaymentTicketProps>(
  ({ data, business, options = {} }, ref) => {
    const {
      mostrarLogo = true,
      servicios,
      terminosGarantia,
    } = options

    const titulo =
      data.tipoMov === "liquidacion"
        ? "Liquidacion de reparacion"
        : "Anticipo de reparacion"
    const metodo = (data.metodoPago || "").toLowerCase()

    return (
      <Ticket80mmLayout ref={ref}>
        {/* ── ENCABEZADO ── */}
        <BusinessHeader
          businessName={business.name}
          businessPhone={business.phone}
          logoUrl={business.logoUrl}
          mostrarLogo={mostrarLogo}
          title={titulo}
        />

        <Divider />

        {/* ── DATOS ── */}
        <Row label="Cliente" value={data.customerName || "-"} />
        <Row label="Folio" value={`#${data.folio}`} />
        <Row label="Fecha" value={fmtDate(data.date)} valSz="10px" />

        <Divider />

        {/* ── DISPOSITIVO ── */}
        <div
          style={{
            ...w700,
            fontSize: "11px",
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          <span style={{ ...w900 }}>Equipo:</span> {data.deviceName || "N/A"}
        </div>

        <Divider />

        {/* ── SERVICIOS ── */}
        {servicios && servicios.length > 0 && (
          <>
            <div
              style={{
                ...w900,
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "2px",
              }}
            >
              Servicios aplicados:
            </div>
            {servicios.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "6px",
                  marginBottom: "1px",
                }}
              >
                <span style={{ ...w700, fontSize: "10px" }}>
                  {s.nombre}
                  {s.cantidad > 1 ? ` x${s.cantidad}` : ""}
                </span>
                <span style={{ ...w700, fontSize: "10px" }}>
                  {fmtMXN(s.precio * s.cantidad)}
                </span>
              </div>
            ))}
            <Divider />
          </>
        )}

        {/* ── TERMINOS DE GARANTIA ── */}
        {terminosGarantia && (
          <>
            <div
              style={{
                ...w700,
                fontSize: "8px",
                lineHeight: 1.2,
                wordBreak: "break-word",
              }}
            >
              <span
                style={{
                  ...w900,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Garantia:
              </span>{" "}
              {terminosGarantia}
            </div>
            <Divider />
          </>
        )}

        {/* ── MONTO ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "6px",
            alignItems: "baseline",
          }}
        >
          <span style={{ ...w900, fontSize: "14px" }}>TOTAL</span>
          <span style={{ ...w900, fontSize: "14px" }}>{fmtMXN(data.monto)}</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "6px",
            marginTop: "2px",
          }}
        >
          <span style={{ ...w700, fontSize: "11px" }}>Metodo</span>
          <span style={{ ...w700, fontSize: "11px" }}>
            {METODOS_PAGO_LABEL[metodo] ?? data.metodoPago}
          </span>
        </div>
        {data.referenciaPago ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "6px",
              marginTop: "2px",
            }}
          >
            <span style={{ ...w700, fontSize: "10px" }}>Referencia</span>
            <span style={{ ...w700, fontSize: "10px", textAlign: "right", wordBreak: "break-word" }}>
              {data.referenciaPago}
            </span>
          </div>
        ) : null}

        <Divider />

        {/* ── TOTALES ACUMULADOS ── */}
        <MoneyRow label="Presupuesto:" value={fmtMXN(data.presupuesto)} labelW={700} valSz="10px" />
        <MoneyRow label="Total pagado:" value={fmtMXN(data.totalPagado)} labelW={700} valSz="10px" />

        <div style={{ borderTop: `1px solid #000000`, margin: "2px 0" }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span style={{ ...w900, fontSize: "11px" }}>Saldo pendiente:</span>
          <span style={{ ...w900, fontSize: "13px" }}>{fmtMXN(data.saldoRestante)}</span>
        </div>

        <Divider />

        {/* ── PIE ── */}
        <TicketFooter mensajeDespedida={business.mensajeDespedida} />
      </Ticket80mmLayout>
    )
  }
)

RepairPaymentTicket.displayName = "RepairPaymentTicket"
export { RepairPaymentTicket }
