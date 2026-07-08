"use client"

import { forwardRef } from "react"
import { Ticket80mmLayout } from "../layouts"
import {
  BusinessHeader,
  Divider,
  MoneyRow,
  TicketFooter,
  FONT,
  MONO,
  SHARP,
  fmtMXN,
  fmtPhone,
  METODOS_PAGO_LABEL,
  w700,
  w900,
} from "../shared"

export type ApartadoTicketKind = "apartado" | "abono" | "liquidado" | "entregado"

export interface ApartadoTicketData {
  folio: string
  kind: ApartadoTicketKind
  clienteNombre: string
  clienteTelefono?: string | null
  productoNombre: string
  cantidad: number
  precioAcordado: number
  totalAbonado: number
  saldo: number
  fechaLimite: string
  metodoPago?: string | null
  referenciaPago?: string | null
  movimientoLabel?: string | null
  movimientoMonto?: number | null
  movimientoFecha?: string | null
}

export interface ApartadoTicketBusiness {
  name: string
  phone?: string | null
  logoUrl?: string | null
  mensajeDespedida?: string | null
  countryName?: string | null
}

export interface ApartadoTicketProps {
  data: ApartadoTicketData
  business: ApartadoTicketBusiness
  options?: {
    mostrarLogo?: boolean
  }
}

function dateShort(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }
  return new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ticketTitle(kind: ApartadoTicketKind) {
  if (kind === "entregado") return "Apartado Entregado"
  if (kind === "liquidado") return "Liquidacion de Apartado"
  if (kind === "abono") return "Abono de Apartado"
  return "Comprobante de Apartado"
}

function statusLabel(kind: ApartadoTicketKind) {
  if (kind === "entregado") return "ENTREGADO"
  if (kind === "liquidado") return "LIQUIDADO"
  if (kind === "abono") return "ABONO REGISTRADO"
  return "PRODUCTO RESERVADO"
}

const ApartadoTicket = forwardRef<HTMLDivElement, ApartadoTicketProps>(
  ({ data, business, options = {} }, ref) => {
    const total = data.precioAcordado * data.cantidad
    const mostrarLogo = options.mostrarLogo ?? true
    const metodo = (data.metodoPago || "").toLowerCase()

    return (
      <Ticket80mmLayout ref={ref}>
        <BusinessHeader
          businessName={business.name}
          businessPhone={business.phone ?? undefined}
          logoUrl={business.logoUrl ?? null}
          mostrarLogo={mostrarLogo}
          title={ticketTitle(data.kind)}
        />

        <Divider />

        <div style={{ textAlign: "center" }}>
          <div style={{ ...w900, fontSize: "15px", letterSpacing: "0.08em" }}>
            {statusLabel(data.kind)}
          </div>
          <div style={{ ...w900, fontFamily: MONO, fontSize: "13px", marginTop: "2px" }}>
            {data.folio}
          </div>
        </div>

        <Divider />

        <div style={{ fontFamily: FONT, fontSize: "11px", lineHeight: 1.32 }}>
          <div style={{ ...SHARP, fontWeight: 700 }}>
            <span style={{ fontWeight: 900 }}>Cliente:</span> {data.clienteNombre || "Publico general"}
          </div>
          {data.clienteTelefono ? (
            <div style={{ ...SHARP, fontWeight: 700 }}>
              <span style={{ fontWeight: 900 }}>Tel:</span> {fmtPhone(data.clienteTelefono)}
            </div>
          ) : null}
          <div style={{ ...SHARP, fontWeight: 700 }}>
            <span style={{ fontWeight: 900 }}>Fecha limite:</span> {dateShort(data.fechaLimite)}
          </div>
        </div>

        <Divider />

        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ ...w900, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Producto apartado
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
            <span style={{ ...w700, fontSize: "11px", lineHeight: 1.25, flex: 1, textAlign: "left" }}>
              {data.cantidad}x {data.productoNombre}
            </span>
            <span style={{ ...w900, fontSize: "11px", whiteSpace: "nowrap" }}>{fmtMXN(total)}</span>
          </div>
        </div>

        <Divider />

        {data.movimientoMonto != null ? (
          <>
            <div style={{ border: "1px solid #000", padding: "4px 5px", marginBottom: "2px" }}>
              <div style={{ ...w900, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {data.movimientoLabel || "Movimiento"}
              </div>
              {data.movimientoFecha ? (
                <div style={{ ...w700, fontSize: "10px", marginTop: "2px" }}>{dateShort(data.movimientoFecha)}</div>
              ) : null}
              <MoneyRow label="Monto" value={fmtMXN(data.movimientoMonto)} valSz="13px" />
              {metodo ? (
                <MoneyRow
                  label="Metodo"
                  value={METODOS_PAGO_LABEL[metodo] ?? data.metodoPago ?? "-"}
                  valSz="10px"
                />
              ) : null}
              {data.referenciaPago ? (
                <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", marginTop: "1px" }}>
                  <span style={{ ...w700, fontSize: "10px" }}>Referencia</span>
                  <span style={{ ...w900, fontSize: "10px", textAlign: "right", wordBreak: "break-word" }}>
                    {data.referenciaPago}
                  </span>
                </div>
              ) : null}
            </div>
            <Divider />
          </>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          <MoneyRow label="Total apartado" value={fmtMXN(total)} valSz="11px" />
          <MoneyRow label="Total abonado" value={fmtMXN(data.totalAbonado)} valSz="11px" />
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline" }}>
            <span style={{ ...w900, fontSize: "14px" }}>SALDO</span>
            <span style={{ ...w900, fontSize: "15px" }}>{fmtMXN(Math.max(0, data.saldo))}</span>
          </div>
        </div>

        <Divider />

        <div style={{ ...w700, fontSize: "10px", lineHeight: 1.35, textAlign: "left" }}>
          {data.kind === "entregado"
            ? "Producto entregado al cliente. Conserva este comprobante como evidencia de salida."
            : data.kind === "liquidado"
              ? "Saldo cubierto. El producto queda listo para entrega al cliente."
              : "El producto queda reservado hasta la fecha limite indicada. La entrega se realiza al liquidar el saldo."}
        </div>

        <Divider />

        <TicketFooter mensajeDespedida={business.mensajeDespedida || "Gracias por tu preferencia"} />
      </Ticket80mmLayout>
    )
  },
)

ApartadoTicket.displayName = "ApartadoTicket"
export { ApartadoTicket }
