"use client"

import { forwardRef } from "react"
import { Ticket80mmLayout } from "../layouts"
import {
  BusinessHeader,
  Divider,
  MoneyRow,
  TicketFooter,
  w700,
  w900,
  SHARP,
  FONT,
  fmtMXN,
  fmtDate,
  fmtPhone,
  METODOS_PAGO_LABEL,
} from "../shared"

// ─── Data Types ───────────────────────────────────────────────────────────────────

export interface PosSaleTicketItem {
  id: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  categoria?: string | null
  marca?: string | null
  modelo?: string | null
  imeiSerie?: string | null
  color?: string | null
  condicion?: string | null
  procesador?: string | null
  ram?: string | null
  almacenamiento?: string | null
  referencia?: string | null
}

export interface PosSaleTicketData {
  id: string
  folio: string | null
  total: number
  descuento: number
  metodoPago: string
  montoEfectivo: number
  montoTarjeta?: number
  montoTransferencia?: number
  referenciaPago?: string | null
  clienteNombre: string | null
  clienteTelefono: string | null
  items: PosSaleTicketItem[]
  createdAt: string
  cambio?: number
}

export interface PosSaleTicketProps {
  data: PosSaleTicketData
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

// ─── Component ────────────────────────────────────────────────────────────────────

/**
 * Ticket de venta POS (80mm).
 *
 * Muestra: encabezado del taller, datos del cliente, articulos vendidos,
 * descuento, total, metodo de pago, cambio y pie de pagina.
 *
 * @example
 * <PosSaleTicket
 *   data={ventaData}
 *   business={{ name: "Mi Taller", phone: "555-1234", logoUrl: null }}
 * />
 */
const PosSaleTicket = forwardRef<HTMLDivElement, PosSaleTicketProps>(
  ({ data, business, options = {} }, ref) => {
    const {
      mostrarLogo = true,
      mostrarPrecios = true,
      mostrarRedesSociales = false,
      redesSociales,
    } = options

    const pagoConTotal = data.total + (data.cambio ?? 0)
    const tieneCambio = (data.cambio ?? 0) > 0
    const metodo = (data.metodoPago || "").toLowerCase()
    const referenciaLabel =
      metodo === "tarjeta"
        ? "Autorizacion / voucher"
        : metodo === "transferencia"
          ? "Referencia transferencia"
          : metodo === "mixto"
            ? "Autorizacion / referencia"
            : "Referencia"

    return (
      <Ticket80mmLayout ref={ref}>
        {/* ── ENCABEZADO ── */}
        <BusinessHeader
          businessName={business.name}
          businessPhone={business.phone}
          logoUrl={business.logoUrl}
          mostrarLogo={mostrarLogo}
          title="Comprobante de Venta"
        />

        <Divider />

        {/* ── DATOS DEL CLIENTE ── */}
        <div style={{ fontFamily: FONT, fontSize: "11px", lineHeight: 1.3 }}>
          <div style={{ ...SHARP, fontWeight: 700 }}>
            <span style={{ fontWeight: 900 }}>Cliente:</span>{" "}
            {data.clienteNombre || "Venta General"}
          </div>
          <div style={{ ...SHARP, fontWeight: 700 }}>
            <span style={{ fontWeight: 900 }}>Folio:</span>{" "}
            {data.folio || "S/N"}
          </div>
          <div style={{ ...SHARP, fontWeight: 700 }}>
            <span style={{ fontWeight: 900 }}>Fecha:</span>{" "}
            {fmtDate(data.createdAt)}
          </div>
          {data.clienteTelefono && (
            <div style={{ ...SHARP, fontWeight: 700 }}>
              <span style={{ fontWeight: 900 }}>Tel:</span>{" "}
              {fmtPhone(data.clienteTelefono)}
            </div>
          )}
        </div>

        <Divider />

        {/* ── ARTICULOS ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {data.items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "6px",
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  ...SHARP,
                  fontFamily: FONT,
                  fontSize: "11px",
                  fontWeight: 700,
                  textAlign: "left",
                  flex: 1,
                  minWidth: 0,
                  lineHeight: 1.2,
                }}
              >
                <span style={{ fontWeight: 900 }}>{item.cantidad}x</span>{" "}
                {(item.categoria ? item.categoria + " " : "") + item.descripcion}
                {item.referencia && (
                  <span style={{ fontWeight: 400, fontSize: "10px", display: "block", color: "#666" }}>
                    Ref: {item.referencia}
                  </span>
                )}
              </span>
              {mostrarPrecios && (
                <span
                  style={{
                    ...SHARP,
                    fontFamily: FONT,
                    fontSize: "11px",
                    fontWeight: 900,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {fmtMXN(item.precioUnitario * item.cantidad)}
                </span>
              )}
            </div>
          ))}
        </div>

        <Divider />

        {/* ── TOTALES ── */}
        {mostrarPrecios && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {(data.descuento ?? 0) > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "6px",
                }}
              >
                <span style={{ ...w700, fontSize: "11px" }}>Descuento</span>
                <span style={{ ...w700, fontSize: "11px" }}>
                  -{fmtMXN(data.descuento)}
                </span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "6px",
                alignItems: "baseline",
              }}
            >
              <span style={{ ...w900, fontSize: "14px" }}>TOTAL</span>
              <span style={{ ...w900, fontSize: "14px" }}>{fmtMXN(data.total)}</span>
            </div>

            {metodo === "mixto" ? (
              <>
                <MoneyRow
                  label="Efectivo"
                  value={fmtMXN(data.montoEfectivo)}
                  valSz="11px"
                />
                <MoneyRow
                  label="Tarjeta"
                  value={fmtMXN(data.montoTarjeta ?? 0)}
                  valSz="11px"
                />
                <MoneyRow
                  label="Transferencia"
                  value={fmtMXN(data.montoTransferencia ?? 0)}
                  valSz="11px"
                />
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "6px",
                }}
              >
                <span style={{ ...w700, fontSize: "11px" }}>Metodo de pago</span>
                <span style={{ ...w700, fontSize: "11px" }}>
                  {METODOS_PAGO_LABEL[metodo] ?? data.metodoPago}
                </span>
              </div>
            )}
            {data.referenciaPago && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "6px",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ ...w700, fontSize: "11px", flexShrink: 0 }}>{referenciaLabel}</span>
                <span style={{ ...w900, fontSize: "11px", textAlign: "right", wordBreak: "break-word" }}>
                  {data.referenciaPago}
                </span>
              </div>
            )}

            {tieneCambio && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "6px",
                  }}
                >
                  <span style={{ ...w700, fontSize: "11px" }}>Pago con</span>
                  <span style={{ ...w700, fontSize: "11px" }}>
                    {fmtMXN(pagoConTotal)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "6px",
                  }}
                >
                  <span style={{ ...w900, fontSize: "11px" }}>Cambio</span>
                  <span style={{ ...w900, fontSize: "11px" }}>
                    {fmtMXN(data.cambio!)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <Divider />

        {/* ── PIE ── */}
        <TicketFooter
          mensajeDespedida={business.mensajeDespedida || "Gracias por tu confianza"}
          mostrarRedesSociales={mostrarRedesSociales}
          redesSociales={redesSociales}
        />
      </Ticket80mmLayout>
    )
  }
)

PosSaleTicket.displayName = "PosSaleTicket"
export { PosSaleTicket }
