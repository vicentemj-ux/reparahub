"use client"

import { forwardRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { getPublicAppBaseUrl } from "@/lib/app-public"
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
  LABEL_STYLE,
} from "../shared"

const QRCodeSVG = dynamic(() => import("qrcode.react").then((m) => m.QRCodeSVG), {
  ssr: false,
})

// ─── Data Types ───────────────────────────────────────────────────────────────────

export interface RepairIntakeTicketData {
  folio: string
  date: string
  customerName: string
  customerPhone: string
  deviceType?: string
  deviceBrand: string
  deviceModel: string
  imei?: string
  color?: string
  reportedFault: string
  estimatedPrice?: string
  deposit?: string
  repairId?: string
  trackingUrl?: string
  checklistIngreso?: {
    encendido?: string
    funcional?: Record<string, boolean>
    observacionesEsteticas?: string
  } | null
  servicios?: { nombre: string; precio: number; cantidad: number }[]
}

export interface RepairIntakeTicketProps {
  data: RepairIntakeTicketData
  business: {
    name: string
    phone: string
    logoUrl: string | null
    terminosGarantia?: string
    mensajeDespedida?: string
  }
  options?: {
    mostrarLogo?: boolean
    mostrarTecnico?: boolean
    mostrarPrecios?: boolean
    mostrarRedesSociales?: boolean
    redesSociales?: {
      facebook?: string | null
      instagram?: string | null
      tiktok?: string | null
      whatsapp?: string | null
    }
    tecnicoNombre?: string
    showHealthCheckFuncional?: boolean
    trackingBaseUrl?: string
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────

const DIVIDER_DASH = "- - - - - - - - - - - - - - - - - - - - -"

const TERMINOS_DEFAULT = [
  "No nos hacemos responsables por perdida de datos, SD o SIM.",
  "Equipos no reclamados despues de 90 dias seran desechados.",
  "Garantia cubre unicamente la reparacion realizada (30 dias).",
  "Al firmar este ticket acepta los terminos anteriores.",
]

function resolveReportedFault(d: RepairIntakeTicketData): string {
  return (
    (d.reportedFault && String(d.reportedFault).trim()) || ""
  )
}

// ─── Component ────────────────────────────────────────────────────────────────────

/**
 * Ticket de orden de entrada / recepcion de reparacion (80mm).
 *
 * Muestra: encabezado del taller, folio, datos del cliente, dispositivo,
 * falla reportada, checklist, servicios, totales, terminos, firma y QR.
 *
 * @example
 * <RepairIntakeTicket
 *   data={repairData}
 *   business={{ name: "Mi Taller", phone: "555-1234", logoUrl: null }}
 * />
 */
const RepairIntakeTicket = forwardRef<HTMLDivElement, RepairIntakeTicketProps>(
  ({ data, business, options = {} }, ref) => {
    const {
      mostrarLogo = true,
      mostrarPrecios = true,
      mostrarRedesSociales = false,
      redesSociales,
      tecnicoNombre,
      showHealthCheckFuncional = false,
      trackingBaseUrl,
    } = options

    const trackingUrl = useMemo(() => {
      const explicitUrl = data.trackingUrl?.trim()
      if (explicitUrl) return explicitUrl

      const base =
        (trackingBaseUrl || getPublicAppBaseUrl() || (typeof window !== "undefined" ? window.location.origin : ""))
          .replace(/\/$/, "")
      const id = data.repairId?.trim()
      return id && base ? `${base}/track/${encodeURIComponent(id)}` : ""
    }, [data.repairId, data.trackingUrl, trackingBaseUrl])

    const faultText = resolveReportedFault(data)
    const serviciosTotal = (data.servicios ?? []).reduce(
      (sum, s) => sum + s.precio * s.cantidad,
      0
    )
    const total = Math.max(
      parseFloat(data.estimatedPrice ?? "0") || 0,
      serviciosTotal
    )
    const pagado = data.deposit ? parseFloat(data.deposit) : 0
    const resta = Math.max(0, total - pagado)

    const terminosArr: string[] = business.terminosGarantia
      ? business.terminosGarantia.split(/\n/).map((t) => t.trim()).filter(Boolean)
      : TERMINOS_DEFAULT

    const obsEsteticas = data.checklistIngreso?.observacionesEsteticas?.trim() || ""

    return (
      <Ticket80mmLayout ref={ref}>
        {/* ── ENCABEZADO ── */}
        <BusinessHeader
          businessName={business.name}
          businessPhone={business.phone}
          logoUrl={business.logoUrl}
          mostrarLogo={mostrarLogo}
        />

        <Divider text={DIVIDER_DASH} />

        {/* ── FOLIO ── */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              ...w900,
              fontSize: "9px",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
            }}
          >
            ORDEN DE SERVICIO
          </div>
          <div
            style={{
              ...w900,
              fontSize: "20px",
              lineHeight: "1.05",
              letterSpacing: "0.04em",
            }}
          >
            #{data.folio}
          </div>
          <div style={{ ...w700, fontSize: "10px" }}>{data.date}</div>
        </div>

        <Divider text={DIVIDER_DASH} />

        {/* ── CLIENTE ── */}
        <Row label="Cliente" value={data.customerName || "-"} />
        {data.customerPhone && (
          <Row label="Tel" value={data.customerPhone} valSz="10px" />
        )}

        <Divider text={DIVIDER_DASH} />

        {/* ── EQUIPO ── */}
        <Row
          label="Equipo"
          value={`${data.deviceType ? data.deviceType + " " : ""}${data.deviceBrand} ${data.deviceModel}`.trim() || "-"}
        />
        {data.imei && <Row label="IMEI" value={data.imei} valSz="10px" />}
        {data.color && <Row label="Color" value={data.color} valSz="10px" />}

        <Divider text={DIVIDER_DASH} />

        {/* ── FALLA ── */}
        <div
          style={{
            ...w900,
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "1px",
          }}
        >
          Falla reportada:
        </div>
        <div
          style={{
            ...w700,
            fontSize: "11px",
            textTransform: "uppercase",
            lineHeight: "1.2",
            wordBreak: "break-word",
          }}
        >
          {faultText || "Sin descripcion inicial"}
        </div>

        {/* ── REVISION RAPIDA ── */}
        {data.checklistIngreso && (
          <>
            <Divider text={DIVIDER_DASH} />
            <div
              style={{
                ...w900,
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "2px",
              }}
            >
              Revision rapida:
            </div>
            <Row label="Enciende" value={data.checklistIngreso.encendido || "N/A"} valSz="10px" />

            {showHealthCheckFuncional && data.checklistIngreso.funcional && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0 6px",
                  marginTop: "2px",
                }}
              >
                {Object.entries(data.checklistIngreso.funcional).map(([key, ok]) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      ...w700,
                      fontSize: "9px",
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                    >
                      {key}
                    </span>
                    <span
                      style={{
                        ...w900,
                        flexShrink: 0,
                        marginLeft: "2px",
                        textDecoration: ok ? "none" : "underline",
                      }}
                    >
                      {ok ? "OK" : "!!"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── OBSERVACIONES ── */}
        {obsEsteticas && (
          <>
            <Divider text={DIVIDER_DASH} />
            <div
              style={{
                ...w900,
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "1px",
              }}
            >
              OBSERVACIONES Y ACCESORIOS:
            </div>
            <div
              style={{
                ...w700,
                fontSize: "10px",
                lineHeight: "1.3",
                wordBreak: "break-word",
              }}
            >
              {obsEsteticas}
            </div>
          </>
        )}

        <Divider text={DIVIDER_DASH} />

        {/* ── TECNICO ── */}
        {tecnicoNombre && (
          <>
            <Row label="Tecnico" value={tecnicoNombre} valSz="10px" />
            <Divider text={DIVIDER_DASH} />
          </>
        )}

        {/* ── SERVICIOS ── */}
        {mostrarPrecios && data.servicios && data.servicios.length > 0 && (
          <>
            <div
              style={{
                ...w900,
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "2px",
              }}
            >
              Servicios:
            </div>
            {data.servicios.map((s, i) => (
              <MoneyRow
                key={i}
                label={`${s.nombre}${s.cantidad > 1 ? ` x${s.cantidad}` : ""}`}
                value={fmtMXN(s.precio * s.cantidad)}
                labelW={700}
                valSz="10px"
              />
            ))}
            <Divider text={DIVIDER_DASH} />
          </>
        )}

        {/* ── TOTALES ── */}
        {mostrarPrecios && (
          <>
            <MoneyRow label="Presupuesto:" value={fmtMXN(total)} labelW={900} />
            <MoneyRow label="Anticipo:" value={fmtMXN(pagado)} labelW={700} />
            <div style={{ borderTop: `1.5px solid ${BLACK}`, margin: "2px 0" }} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span style={{ ...w900, fontSize: "11px" }}>Saldo pendiente:</span>
              <span
                style={{
                  ...SHARP,
                  fontFamily: MONO,
                  fontWeight: 900,
                  fontSize: "20px",
                  lineHeight: "1",
                }}
              >
                {fmtMXN(resta)}
              </span>
            </div>
            <div
              style={{
                textAlign: "center",
                ...w700,
                fontSize: "9px",
                fontStyle: "italic",
                marginTop: "1px",
              }}
            >
              * Sujeto a cambios tras diagnostico
            </div>
            <Divider text={DIVIDER_DASH} />
          </>
        )}

        {/* ── TERMINOS ── */}
        {terminosArr.length > 0 && (
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
              Terminos y condiciones:
            </div>
            <p
              style={{
                ...w700,
                fontSize: "10px",
                lineHeight: "1.3",
                margin: 0,
                wordBreak: "break-word",
              }}
            >
              {terminosArr.join(" * ")}
            </p>
            <Divider text={DIVIDER_DASH} />
          </>
        )}

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
            Acepto los terminos y condiciones
          </div>
        </div>

        <Divider text={DIVIDER_DASH} />

        {/* ── QR ── */}
        {trackingUrl ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                ...w900,
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "3px",
              }}
            >
              Rastrea tu equipo en linea
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <QRCodeSVG
                value={trackingUrl}
                size={66}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <div style={{ ...w700, fontSize: "9px", marginTop: "2px" }}>
              Escanea para ver el estado de tu reparacion
            </div>
          </div>
        ) : null}

        {/* ── REDES SOCIALES ── */}
        <TicketFooter
          mensajeDespedida={business.mensajeDespedida}
          mostrarRedesSociales={mostrarRedesSociales}
          redesSociales={redesSociales}
        />
      </Ticket80mmLayout>
    )
  }
)

RepairIntakeTicket.displayName = "RepairIntakeTicket"
export { RepairIntakeTicket }
