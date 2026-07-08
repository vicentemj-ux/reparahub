"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Printer, Loader2, Ticket, Tag, CheckCircle2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { BitacoraRepair, RepairDetail } from "@/lib/actions/repairs-prisma"
import { printWithProvider } from "@/lib/printing/repair-print-service"
import { getTallerSettings } from "@/lib/actions/settings-prisma"
import { getPublicAppBaseUrl } from "@/lib/app-public"
import { buildRepairIntakeEscposBase64 } from "@/lib/printing/escpos"
import { printEscposWithDaemon } from "@/lib/printing/daemon-client"
import {
  RepairIntakeTicket,
  RepairOrderLabelPro,
  RepairDeliveryTicket,
  type RepairIntakeTicketData,
  type RepairOrderLabelProData,
  type RepairDeliveryTicketData,
} from "@/components/printing"
import { PrintPreviewModal } from "@/components/dashboard/print-preview-modal"

interface PrintMenuDropdownProps {
  repair: BitacoraRepair
  detail?: RepairDetail | null
  trigger?: "button" | "icon" | "headerIcon"
  shopName?: string
  warrantyText?: string
  estado?: string
}

type PreviewMode = "ticket" | "label" | "delivery" | null

// ─── Decodificador defensivo ──────────────────────────────────────────────────
// Acepta datos URL-encoded hasta 2 niveles (caso comun: "SUPER%2520CEL"
// en DB → decodeIfEncoded del template solo descodifica 1 vez → queda
// "SUPER%20CEL" visible). Esta funcion asegura que se ven espacios reales
// en el preview sin tocar la fuente de datos.
function deepDecode(s: string | null | undefined, maxPasses = 3): string {
  if (!s) return s ?? ""
  let cur = s
  for (let i = 0; i < maxPasses; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(cur)) break
    try {
      const next = decodeURIComponent(cur)
      if (next === cur) break
      cur = next
    } catch {
      break
    }
  }
  return cur
}

const LABEL_W_MM = 50.8
const LABEL_H_MM = 25.4
const LABEL_PREVIEW_SCALE = 2.6

function buildAccessCode(repair: BitacoraRepair, detail?: RepairDetail | null): string | null {
  const securityType = (detail?.securityType ?? repair.securityType ?? "").toLowerCase()
  const securityValue = (detail?.securityValue ?? repair.securityValue ?? "").trim()
  const legacyPin = (detail?.pinContrasena ?? repair.pinContrasena ?? "").trim()
  const legacyPattern = (detail?.patronDesbloqueo ?? repair.patronDesbloqueo ?? "").trim()

  if (!securityType || securityType === "none") {
    if (legacyPattern) return `PATRON: ${legacyPattern}`
    if (legacyPin) return `PIN: ${legacyPin}`
    return null
  }

  if (securityType === "pattern") {
    const value = securityValue || legacyPattern
    return value ? `PATRON: ${value}` : null
  }

  if (securityType === "pin") {
    const value = securityValue || legacyPin
    return value ? `PIN: ${value}` : null
  }

  if (securityType === "password") {
    const value = securityValue || legacyPin
    return value ? `PASS: ${value}` : null
  }

  const fallback = securityValue || legacyPin || legacyPattern
  return fallback ? `ACC: ${fallback}` : null
}

export function PrintMenuDropdown({
  repair,
  detail,
  trigger = "button",
  shopName,
}: PrintMenuDropdownProps) {
  const [printing, setPrinting] = useState(false)
  const [previewMode, setPreviewMode] = useState<PreviewMode>(null)

  const buildLabelData = (): RepairOrderLabelProData => {
    const accessories =
      detail?.checklistIngreso?.observacionesEsteticas ??
      repair.checklistIngreso?.observacionesEsteticas ??
      ""

    return {
      kind: "repair-label-pro",
      shopName: deepDecode(shopName ?? "") || null,
      folio: repair.folio,
      entryDate: repair.createdAtRaw || repair.createdAt,
      customerName: deepDecode(repair.clienteName),
      customerPhone: deepDecode(repair.clientePhone),
      deviceType: repair.tipo_equipo ?? null,
      deviceDescription: `${repair.deviceBrand ?? ""} ${repair.deviceModel ?? ""}`.trim() || "-",
      reportedFault: deepDecode(repair.falla ?? ""),
      accessCode: buildAccessCode(repair, detail),
      estimatedBudget: repair.estimatedPrice != null ? Number(repair.estimatedPrice) : null,
      accessories: deepDecode(accessories),
    }
  }

  const buildTicketPreview = (): RepairIntakeTicketData => {
    return {
      folio: repair.folio,
      date: repair.createdAt,
      customerName: deepDecode(repair.clienteName),
      customerPhone: deepDecode(repair.clientePhone),
      deviceBrand: repair.deviceBrand || "N/A",
      deviceModel: repair.deviceModel || "N/A",
      deviceType: repair.tipo_equipo ?? undefined,
      reportedFault: deepDecode(repair.falla ?? ""),
      estimatedPrice: repair.estimatedPrice != null ? String(repair.estimatedPrice) : undefined,
      deposit: repair.anticipo > 0 ? String(repair.anticipo) : undefined,
      repairId: repair.id,
      trackingUrl: `${getPublicAppBaseUrl()}/track/${encodeURIComponent(repair.id)}`,
    }
  }

  const buildDeliveryData = (): RepairDeliveryTicketData => {
    return {
      folio: repair.folio,
      deliveryDate: new Date().toISOString(),
      customerName: deepDecode(repair.clienteName),
      customerPhone: deepDecode(repair.clientePhone),
      deviceName: `${repair.deviceBrand ?? ""} ${repair.deviceModel ?? ""}`.trim() || "Equipo",
      imei: (detail as any)?.imei ?? undefined,
      diagnosisFinal: deepDecode(repair.falla ?? "Reparacion completada"),
      totalCost: (detail as any)?.costoTotal ?? repair.estimatedPrice ?? 0,
      originalDeposit: repair.anticipo ?? 0,
      remainingPayment: (detail as any)?.restante ?? 0,
    }
  }

  const handleOpenTicketPreview = () => {
    setPreviewMode("ticket")
  }

  const handleOpenLabelPreview = () => {
    setPreviewMode("label")
  }

  const handleOpenDeliveryPreview = () => {
    setPreviewMode("delivery")
  }

  const closePreview = () => {
    setPreviewMode(null)
  }

  const handlePrintTicket = async () => {
    setPrinting(true)
    try {
      const folio = repair.folio
      await printWithProvider({
        daemonPrint: async (config, tenantId) => {
          const { settings } = await getTallerSettings()
          const contentBase64 = buildRepairIntakeEscposBase64({
            data: buildTicketPreview(),
            business: {
              name: settings?.nombre_taller || deepDecode(shopName ?? "") || "Mi Taller",
              phone: settings?.telefono || "",
              terminosGarantia: settings?.terminos_garantia || undefined,
              mensajeDespedida: settings?.mensaje_despedida || undefined,
            },
            paperWidth: config.paperWidth,
          })
          await printEscposWithDaemon({
            jobId: folio,
            tenantId,
            source: "reparaciones.ticket",
            contentBase64,
            config,
          })
        },
        webPrint: () => {
          window.open(`/print-ticket/${encodeURIComponent(folio)}`, "_blank", "noopener,noreferrer,width=400,height=700")
        },
      })
      toast({ title: "Ticket de recepcion" })
      closePreview()
    } catch (e) {
      toast({ title: "Error al imprimir", description: e instanceof Error ? e.message : "Intenta de nuevo.", variant: "destructive" })
    } finally {
      setPrinting(false)
    }
  }

  const handlePrintLabel = async () => {
    setPrinting(true)
    try {
      const labelData = buildLabelData()
      window.localStorage.setItem("printLabel", JSON.stringify(labelData))
      await printWithProvider({
        webPrint: () => {
          window.open("/print-label", "_blank", "noopener,noreferrer,width=520,height=300")
        },
      })
      toast({ title: "Etiqueta enviada a impresora" })
      closePreview()
    } catch (e) {
      toast({ title: "Error al imprimir", description: e instanceof Error ? e.message : "Intenta de nuevo.", variant: "destructive" })
    } finally {
      setPrinting(false)
    }
  }

  const handlePrintDelivery = async () => {
    setPrinting(true)
    try {
      const deliveryData = buildDeliveryData()
      window.localStorage.setItem("printDelivery", JSON.stringify(deliveryData))
      await printWithProvider({
        webPrint: () => {
          window.open(`/print-ticket/${encodeURIComponent(repair.folio)}?type=delivery`, "_blank", "noopener,noreferrer,width=400,height=700")
        },
      })
      toast({ title: "Ticket de entrega enviado a impresora" })
      closePreview()
    } catch (e) {
      toast({ title: "Error al imprimir", description: e instanceof Error ? e.message : "Intenta de nuevo.", variant: "destructive" })
    } finally {
      setPrinting(false)
    }
  }

  const isPreviewing = previewMode !== null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger === "icon" ? (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={printing || isPreviewing}>
              {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            </Button>
          ) : trigger === "headerIcon" ? (
            <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" disabled={printing || isPreviewing}>
              {printing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
            </Button>
          ) : (
            <Button size="default" variant="outline" className="gap-2" disabled={printing || isPreviewing}>
              {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              <span className="text-sm font-medium">Imprimir</span>
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleOpenTicketPreview} className="cursor-pointer gap-2" disabled={printing}>
            <Ticket className="h-4 w-4" />
            Ticket de recepcion
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenLabelPreview} className="cursor-pointer gap-2" disabled={printing}>
            <Tag className="h-4 w-4" />
            Etiqueta 2x1"
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenDeliveryPreview} className="cursor-pointer gap-2" disabled={printing}>
            <CheckCircle2 className="h-4 w-4" />
            Ticket de entrega
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PrintPreviewModal
        open={previewMode === "ticket"}
        onOpenChange={(open) => {
          if (!open) closePreview()
        }}
        paperSize="80MM"
        typeSpec="TICKET DE RECEPCION"
        printLabel="IMPRIMIR TICKET"
        paperNote="Asegurate de que tu impresora termica de 80mm este encendida y con papel."
        onPrint={handlePrintTicket}
        printing={printing}
        title="Vista previa del ticket de recepcion"
        description="Revisa el ticket antes de imprimir."
      >
        <div className="w-full max-w-[80mm] mx-auto">
          <RepairIntakeTicket
            data={buildTicketPreview()}
            business={{
              name: deepDecode(shopName ?? "") || "Mi Taller",
              phone: "",
              logoUrl: null,
            }}
          />
        </div>
      </PrintPreviewModal>

      <PrintPreviewModal
        open={previewMode === "label"}
        onOpenChange={(open) => {
          if (!open) closePreview()
        }}
        paperSize="50MM X 25MM"
        subSpec="ETIQUETA 2X1 PULGADA"
        typeSpec="ETIQUETA DE REPARACION"
        printLabel="IMPRIMIR ETIQUETA"
        paperNote="Asegurate de que tu impresora de etiquetas 2x1 este encendida y con papel."
        onPrint={handlePrintLabel}
        printing={printing}
        title="Vista previa de la etiqueta de reparacion"
        description="Revisa la etiqueta antes de imprimir."
      >
        {/* Wrapper con layout = tamano visual escalado (132mm x 66mm) para
            que la card del modal crezca y no corte las 5 lineas. El inner
            usa transform: scale() con origin top-left para que la
            etiqueta (50.8mm x 25.4mm) llene el wrapper exactamente. */}
        <div
          style={{
            position: "relative",
            width: `${LABEL_W_MM * LABEL_PREVIEW_SCALE}mm`,
            height: `${LABEL_H_MM * LABEL_PREVIEW_SCALE}mm`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: `scale(${LABEL_PREVIEW_SCALE})`,
              transformOrigin: "top left",
            }}
          >
            <RepairOrderLabelPro data={buildLabelData()} />
          </div>
        </div>
      </PrintPreviewModal>

      <PrintPreviewModal
        open={previewMode === "delivery"}
        onOpenChange={(open) => {
          if (!open) closePreview()
        }}
        paperSize="80MM"
        typeSpec="TICKET DE ENTREGA"
        printLabel="IMPRIMIR ENTREGA"
        paperNote="Asegurate de que tu impresora termica de 80mm este encendida y con papel."
        onPrint={handlePrintDelivery}
        printing={printing}
        title="Vista previa del ticket de entrega"
        description="Revisa el ticket de entrega y garantia antes de imprimir."
      >
        <div className="w-full max-w-[80mm] mx-auto">
          <RepairDeliveryTicket
            data={buildDeliveryData()}
            business={{
              name: deepDecode(shopName ?? "") || "Mi Taller",
              phone: "",
              logoUrl: null,
            }}
          />
        </div>
      </PrintPreviewModal>
    </>
  )
}
