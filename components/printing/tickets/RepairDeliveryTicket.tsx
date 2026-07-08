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

export interface RepairDeliveryTicketData {
  /** Folio de la reparacion. */
  folio: string
  /** Fecha de entrega (ISO string). */
  deliveryDate: string
  /** Nombre del cliente. */
  customerName: string
  /** Telefono del cliente. */
  customerPhone: string
  /** Nombre del dispositivo (Marca + Modelo). */
  deviceName: string
  /** Numero de serie o IMEI. */
  imei?: string
  /** Diagnostico final realizado. */
  diagnosisFinal: string
  /** Desglose de refacciones utilizadas. */
  parts?: { nombre: string; costo: number; cantidad: number }[]
  /** Mano de obra / servicios aplicados. */
  labor?: { nombre: string; costo: number }[]
  /** Costo total de la reparacion. */
  totalCost: number
  /** Anticipo pagado originalmente. */
  originalDeposit: number
  /** Monto restante pagado en entrega. */
  remainingPayment: number
  /** Metodo de pago del restante. */
  remainingPaymentMethod?: string
  /** Dias de garantia. @default 30 */
  warrantyDays?: number
  /** Fecha de vencimiento de garantia (ISO string). Calculada si no se provee. */
  warrantyExpiration?: string
  /** Observaciones entregrega. */
  deliveryNotes?: string
}

export interface RepairDeliveryTicketProps {
  data: RepairDeliveryTicketData
  business: {
    name: string
    phone: string
    logoUrl: string | null
    terminosGarantia?: string
    mensajeDespedida?: string
  }
  options?: {
    mostrarLogo?: boolean
    mostrarPrecios?: boolean
    mostrarRedesSociales?: boolean
    redesSociales?: {
      facebook?: string | null
      instagram?: string | null
      tiktok?: string | null
      whatsapp?: string | null
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────

/** Trunca texto a un maximo de caracteres con indicador "...". */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 3) + "..."
}

/** Calcula fecha de vencimiento de garantia sumando dias. */
function calcWarrantyExpiration(baseDate: string, days: number): string {
  const d = new Date(baseDate)
  d.setDate(d.getDate() + days)
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const METODOS_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Pago Mixto",
}

// ─── Component ────────────────────────────────────────────────────────────────────

/**
 * Ticket de entrega de reparacion + poliza de garantia (80mm).
 *
 * Muestra: encabezado, resumen de orden, diagnostico final,
 * desglose tabular (refacciones + mano de obra), fecha de vencimiento
 * de garantia, conformidad del cliente y zona de firma fisica.
 *
 * @example
 * <RepairDeliveryTicket
 *   data={deliveryData}
 *   business={{ name: "Mi Taller", phone: "555-1234", logoUrl: null }}
 * />
 */
const RepairDeliveryTicket = forwardRef<HTMLDivElement, RepairDeliveryTicketProps>(
  ({ data, business, options = {} }, ref) => {
    const {
      mostrarLogo = true,
      mostrarPrecios = true,
      mostrarRedesSociales = false,
      redesSociales,
    } = options

    const warrantyDays = data.warrantyDays ?? 30
    const warrantyExpiration =
      data.warrantyExpiration ||
      calcWarrantyExpiration(data.deliveryDate, warrantyDays)

    const partsTotal = (data.parts ?? []).reduce(
      (sum, p) => sum + p.costo * p.cantidad,
      0
    )
    const laborTotal = (data.labor ?? []).reduce(
      (sum, l) => sum + l.costo,
      0
    )

    return (
      <Ticket80mmLayout ref={ref}>
        {/* ── ENCABEZADO ── */}
        <BusinessHeader
          businessName={business.name}
          businessPhone={business.phone}
          logoUrl={business.logoUrl}
          mostrarLogo={mostrarLogo}
          title="ENTREGA DE EQUIPO"
        />

        <Divider />

        {/* ── RESUMEN DE ORDEN ── */}
        <Row label="Folio" value={`#${data.folio}`} />
        <Row label="Cliente" value={truncate(data.customerName, 30)} />
        <Row label="Tel" value={data.customerPhone} valSz="10px" />
        <Row label="Equipo" value={truncate(data.deviceName, 28)} />
        {data.imei && <Row label="IMEI/S/N" value={data.imei} valSz="10px" />}

        <Divider />

        {/* ── DIAGNOSTICO FINAL ── */}
        <div
          style={{
            ...w900,
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "1px",
          }}
        >
          Diagnostico final:
        </div>
        <div
          style={{
            ...w700,
            fontSize: "10px",
            lineHeight: "1.2",
            wordBreak: "break-word",
            textTransform: "uppercase",
          }}
        >
          {truncate(data.diagnosisFinal, 120) || "Sin observaciones"}
        </div>

        <Divider />

        {/* ── DESGLOSE TABULAR ── */}
        {mostrarPrecios && (
          <>
            {/* Refacciones */}
            {data.parts && data.parts.length > 0 && (
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
                  Refacciones:
                </div>
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    ...w900,
                    fontSize: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: "1px",
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>Concepto</span>
                  <span style={{ width: "18mm", textAlign: "right", flexShrink: 0 }}>Importe</span>
                </div>
                {data.parts.map((p, i) => (
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
                      {truncate(p.nombre, 24)}
                      {p.cantidad > 1 ? ` x${p.cantidad}` : ""}
                    </span>
                    <span style={{ width: "18mm", textAlign: "right", flexShrink: 0, fontFamily: MONO }}>
                      {fmtMXN(p.costo * p.cantidad)}
                    </span>
                  </div>
                ))}
                <MoneyRow label="Subtotal refacciones:" value={fmtMXN(partsTotal)} labelW={700} valSz="9px" />
              </>
            )}

            {/* Mano de obra */}
            {data.labor && data.labor.length > 0 && (
              <>
                {data.parts && data.parts.length > 0 && <Divider />}
                <div
                  style={{
                    ...w900,
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "2px",
                  }}
                >
                  Mano de obra:
                </div>
                {data.labor.map((l, i) => (
                  <MoneyRow
                    key={i}
                    label={truncate(l.nombre, 28)}
                    value={fmtMXN(l.costo)}
                    labelW={700}
                    valSz="10px"
                  />
                ))}
                <MoneyRow label="Subtotal mano de obra:" value={fmtMXN(laborTotal)} labelW={700} valSz="9px" />
              </>
            )}

            <Divider />

            {/* TOTALES */}
            <MoneyRow label="Total reparacion:" value={fmtMXN(data.totalCost)} labelW={900} valSz="11px" />
            <MoneyRow label="Anticipo:" value={fmtMXN(data.originalDeposit)} labelW={700} valSz="10px" />

            {data.remainingPayment > 0 && (
              <>
                <MoneyRow label="Restante pagado:" value={fmtMXN(data.remainingPayment)} labelW={700} valSz="10px" />
                {data.remainingPaymentMethod && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      ...w700,
                      fontSize: "9px",
                    }}
                  >
                    <span> Metodo de pago</span>
                    <span>{METODOS_LABEL[data.remainingPaymentMethod] ?? data.remainingPaymentMethod}</span>
                  </div>
                )}
              </>
            )}

            <div style={{ borderTop: `1.5px solid ${BLACK}`, margin: "2px 0" }} />
          </>
        )}

        {/* ── GARANTIA ── */}
        <div
          style={{
            ...w900,
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "2px",
          }}
        >
          Garantia:
        </div>
        <div
          style={{
            ...w700,
            fontSize: "10px",
            lineHeight: "1.2",
          }}
        >
          <div>
            Cubre reparacion realizada:{" "}
            <span style={{ ...w900 }}>{warrantyDays} dias</span>
          </div>
          <div>
            Vence:{" "}
            <span style={{ ...w900 }}>{warrantyExpiration}</span>
          </div>
        </div>

        {business.terminosGarantia && (
          <div
            style={{
              ...w700,
              fontSize: "8px",
              lineHeight: "1.2",
              marginTop: "2px",
              wordBreak: "break-word",
            }}
          >
            {truncate(business.terminosGarantia, 160)}
          </div>
        )}

        <Divider />

        {/* ── CONFORMIDAD DEL CLIENTE ── */}
        <div
          style={{
            ...w900,
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "2px",
          }}
        >
          Declaracion de conformidad:
        </div>
        <div
          style={{
            ...w700,
            fontSize: "9px",
            lineHeight: "1.25",
            wordBreak: "break-word",
          }}
        >
          El cliente declara haber recibido su equipo en perfecto
          funcionamiento, conformandose con el trabajo realizado.
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
            Firma del cliente
          </div>
          <div
            style={{
              height: "1.4cm",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "65%",
                borderBottom: `1px solid ${BLACK}`,
              }}
            />
          </div>
          <div style={{ ...w700, fontSize: "9px" }}>
            Fecha de entrega: {fmtDate(data.deliveryDate)}
          </div>
        </div>

        <Divider />

        {/* ── PIE ── */}
        <TicketFooter
          mensajeDespedida={business.mensajeDespedida}
          mostrarRedesSociales={mostrarRedesSociales}
          redesSociales={redesSociales}
        />
      </Ticket80mmLayout>
    )
  }
)

RepairDeliveryTicket.displayName = "RepairDeliveryTicket"
export { RepairDeliveryTicket }
