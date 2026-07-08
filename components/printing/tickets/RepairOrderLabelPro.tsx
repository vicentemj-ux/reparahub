"use client"

import { forwardRef } from "react"
import { Label2xLayout } from "../layouts"
import {
  BLACK,
  LABEL_FONT,
  MONO,
  SHARP,
  fmtMXN,
  w700,
  w900,
} from "../shared"
import type { RepairOrderLabelData } from "./RepairOrderLabel"

export type RepairOrderLabelProData = RepairOrderLabelData & {
  kind?: "repair-label-pro"
  shopName?: string | null
  deviceType?: string | null
  accessories?: string | null
}

export interface RepairOrderLabelProProps {
  data: RepairOrderLabelProData
}

function truncate(text: string | null | undefined, max: number): string {
  const clean = (text ?? "").trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max - 3).trimEnd() + "..."
}

function upperClean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim().toUpperCase()
}

function compactDate(value: string): string {
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })
  }
  return truncate(value, 8)
}

function compactPhone(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (digits.length <= 4) return digits || value
  return digits.slice(-10)
}

function compactAccessCode(value: string | null | undefined): string {
  const clean = (value ?? "").trim()
  if (!clean) return ""
  return clean
    .replace(/^PATRON\s*:/i, "PAT:")
    .replace(/^PIN\s*:/i, "PIN:")
    .replace(/^PASS\s*:/i, "PASS:")
    .replace(/\s*-\s*/g, "›")
    .replace(/\s*→\s*/g, "›")
    .replace(/\s+/g, " ")
}

function normalizeShopName(value: string | null | undefined): string {
  const clean = (value ?? "").trim()
  if (!clean) return ""
  // Evita imprimir un placeholder como si fuera el nombre real del taller.
  if (clean.toLowerCase() === "mi taller") return ""
  return clean
}

function buildDeviceLine(deviceType: string | null | undefined, deviceDescription: string | null | undefined): string {
  const type = upperClean(deviceType)
  const description = upperClean(deviceDescription || "Equipo")
  if (!type || description.startsWith(type)) return description
  return `${type} ${description}`.trim()
}

const RepairOrderLabelPro = forwardRef<HTMLDivElement, RepairOrderLabelProProps>(
  ({ data }, ref) => {
    const shopName = truncate(upperClean(normalizeShopName(data.shopName)), 31)
    const folio = truncate(data.folio, 12)
    const device = buildDeviceLine(data.deviceType, data.deviceDescription)
    const customer = truncate(data.customerName || "Cliente", 24)
    const phone = compactPhone(data.customerPhone || "")
    const fault = truncate(data.reportedFault || "Sin falla reportada", 64)
    const accessories = truncate(upperClean(data.accessories), 38)
    const accessCode = compactAccessCode(data.accessCode)
    const accessFontSize = accessCode.length > 22 ? "4.8px" : accessCode.length > 16 ? "5.4px" : "6.4px"
    const budget =
      data.estimatedBudget != null && data.estimatedBudget > 0
        ? fmtMXN(data.estimatedBudget)
        : "PENDIENTE"

    return (
      <Label2xLayout ref={ref} id="etiqueta-reparacion-pro">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            columnGap: "1mm",
            height: "4mm",
            marginTop: "0.75mm",
            borderBottom: `1.6px solid ${BLACK}`,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              ...w900,
              fontSize: shopName.length > 26 ? "7.2px" : "8px",
              lineHeight: 1,
              letterSpacing: "0.015em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textTransform: "uppercase",
              minWidth: 0,
            }}
          >
            {shopName}
          </div>
          <div
            style={{
              ...w700,
              fontFamily: MONO,
              fontSize: "6.8px",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {compactDate(data.entryDate)}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "16mm 1fr",
            gap: "0.9mm",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            paddingTop: "0.45mm",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateRows: "5.7mm 1fr auto",
              borderRight: `1.6px solid ${BLACK}`,
              paddingRight: "0.75mm",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  ...w900,
                  fontFamily: MONO,
                  fontSize: "15.5px",
                  letterSpacing: "0",
                  lineHeight: 0.98,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "clip",
                }}
              >
                #{folio}
              </div>
            </div>
            <div
              style={{
                ...w900,
                alignSelf: "start",
                marginTop: "0.6mm",
                fontSize: device.length > 28 ? "5.8px" : "6.6px",
                lineHeight: 1.04,
                letterSpacing: "0.01em",
                textTransform: "uppercase",
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "normal",
                overflowWrap: "anywhere",
              }}
            >
              {device}
            </div>
            {accessories ? (
              <div
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  paddingBottom: "0.2mm",
                }}
              >
                <div
                  style={{
                    ...w700,
                    fontSize: "4.8px",
                    lineHeight: 1,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  ACC.
                </div>
                <div
                  style={{
                    ...w900,
                    fontSize: accessories.length > 24 ? "4.8px" : "5.4px",
                    lineHeight: 1.03,
                    letterSpacing: "0.01em",
                    textTransform: "uppercase",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    overflowWrap: "anywhere",
                  }}
                >
                  {accessories}
                </div>
              </div>
            ) : null}
          </div>

          <div
            style={{
              minWidth: 0,
              display: "grid",
              gridTemplateRows: "6.4mm 1fr 5.4mm",
              overflow: "hidden",
              rowGap: "0.35mm",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "0.35mm",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  ...w900,
                  fontSize: customer.length > 18 ? "7.5px" : "8.2px",
                  lineHeight: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                {customer}
              </div>
              <div
                style={{
                  ...w700,
                  fontFamily: MONO,
                  fontSize: "6.9px",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {phone}
              </div>
            </div>

            <div
              style={{
                ...w700,
                alignSelf: "center",
                fontSize: fault.length > 38 ? "7.2px" : "8.1px",
                lineHeight: 1.08,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflowWrap: "anywhere",
              }}
            >
              <span
                style={{
                  ...w900,
                  display: "inline-block",
                  marginRight: "0.6mm",
                  marginBottom: "0.3mm",
                  padding: "0.2mm 0.5mm",
                  border: `1px solid ${BLACK}`,
                  fontSize: "5.8px",
                  lineHeight: 1,
                  letterSpacing: "0.05em",
                }}
              >
                FALLA REPORTADA
              </span>
              {fault}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                alignSelf: "end",
                gap: "0.8mm",
                borderTop: `1.5px solid ${BLACK}`,
                paddingTop: "0.55mm",
                marginTop: "0.7mm",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  ...w900,
                  fontSize: accessFontSize,
                  lineHeight: 1.02,
                  letterSpacing: accessCode.length > 16 ? "0.01em" : "0.03em",
                  border: "0",
                  padding: 0,
                  whiteSpace: accessCode.length > 16 ? "normal" : "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "27mm",
                  flexShrink: 1,
                  overflowWrap: "anywhere",
                }}
              >
                {accessCode}
              </div>
              <div
                style={{
                  ...SHARP,
                  fontFamily: LABEL_FONT,
                  fontWeight: 900,
                  fontSize: budget === "PENDIENTE" ? "7.8px" : "9.2px",
                  lineHeight: 1,
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {budget}
              </div>
            </div>
          </div>
        </div>
      </Label2xLayout>
    )
  }
)

RepairOrderLabelPro.displayName = "RepairOrderLabelPro"
export { RepairOrderLabelPro }
