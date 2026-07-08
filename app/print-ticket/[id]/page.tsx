"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import {
  RepairIntakeTicket,
  RepairDeliveryTicket,
  type RepairIntakeTicketData,
  type RepairDeliveryTicketData,
} from "@/components/printing"
import { getRepairTicketPrintData } from "@/lib/actions/print-formatter-prisma"
import { getPublicAppBaseUrl } from "@/lib/app-public"
import { usePrintWindowClose } from "@/hooks/use-print-window-close"
import { injectThermalTicketStyleAndPrint } from "@/lib/print/print-config"
import { toast } from "@/hooks/use-toast"

// ─── Stubs de integracion Tauri (SaaS) ─────────────────────────────────
// El fork Tauri desktop (privado, no en este repo) reemplaza estos stubs
// con la implementacion real en su build de escritorio. En el SaaS siempre
// devuelven false / no-op, por lo que la ruta de produccion es
// react-to-print iframe. Ver AGENTS.md → "Tauri desktop fork (not in this repo)"
// y /DISABLED/tauri-patches/print-ticket-page.patch.txt.
// ──────────────────────────────────────────────────────────────────────
const isTauriAvailable = async () => false
const isTauriDesktop = isTauriAvailable
const domToPngBase64 = async (_el?: HTMLElement | null, _opts?: { pixelRatio?: number }) => ""
const printEscposImage = async (_printerName?: string, _base64?: string, _paperWidth?: number) => {}


function PrintTicketInner() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const ticketType = searchParams.get("type") ?? "intake"
  const [intakeData, setIntakeData] = useState<RepairIntakeTicketData | null>(null)
  const [deliveryData, setDeliveryData] = useState<RepairDeliveryTicketData | null>(null)
  const [business, setBusiness] = useState<{
    name: string
    phone: string
    logoUrl: string | null
    terminosGarantia: string
    mensajeDespedida: string
  } | null>(null)
  const [showHealthCheckFuncional, setShowHealthCheckFuncional] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const ticketRef = useRef<HTMLDivElement>(null)
  usePrintWindowClose()

  useEffect(() => {
    if (!id) return

    const load = async () => {
      try {
        const result = await getRepairTicketPrintData(decodeURIComponent(id))

        if (result.error || !result.data) {
          setLoadError(result.error ?? "Reparacion no encontrada.")
          return
        }

        const { repair, business: biz, showHealthCheckFuncional: showHc } = result.data

        setBusiness({
          name: biz.name,
          phone: biz.phone,
          logoUrl: biz.logoUrl,
          terminosGarantia: biz.terminosGarantia,
          mensajeDespedida: biz.mensajeDespedida,
        })

        if (ticketType === "delivery") {
          setDeliveryData({
            folio: repair.folio,
            deliveryDate: new Date().toISOString(),
            customerName: repair.customerName,
            customerPhone: repair.customerPhone,
            deviceName: `${repair.deviceBrand ?? ""} ${repair.deviceModel ?? ""}`.trim() || "Equipo",
            imei: repair.imei ?? undefined,
            diagnosisFinal: repair.reportedFault ?? "Reparacion completada",
            totalCost: repair.estimatedPrice ?? 0,
            originalDeposit: repair.deposit ?? 0,
            remainingPayment: 0,
          })
        } else {
          setIntakeData({
            folio: repair.folio,
            customerName: repair.customerName,
            customerPhone: repair.customerPhone,
            deviceModel: repair.deviceModel ?? "N/A",
            deviceBrand: repair.deviceBrand ?? "N/A",
            deviceType: repair.tipoEquipo ?? undefined,
            imei: repair.imei ?? undefined,
            color: repair.color ?? undefined,
            reportedFault: repair.reportedFault ?? "",
            estimatedPrice: repair.estimatedPrice != null ? String(repair.estimatedPrice) : undefined,
            deposit: repair.deposit != null ? String(repair.deposit) : undefined,
            date: repair.createdAt ?? "",
            repairId: repair.id,
            trackingUrl: `${getPublicAppBaseUrl()}/track/${encodeURIComponent(repair.id)}`,
            checklistIngreso: repair.checklistIngreso ? {
              encendido: repair.checklistIngreso.encendido ?? undefined,
              funcional: repair.checklistIngreso.funcional,
              observacionesEsteticas: repair.checklistIngreso.observacionesEsteticas,
            } : null,
          })
          setShowHealthCheckFuncional(showHc)
        }
      } catch (err) {
        console.error("[print-ticket/[id]] error:", err)
        setLoadError("Error al cargar el ticket. Cierra esta ventana e intenta de nuevo.")
      }
    }

    void load()
  }, [id, ticketType])

  useEffect(() => {
    if (!business) return
    if (ticketType === "delivery" && !deliveryData) return
    if (ticketType !== "delivery" && !intakeData) return

    const runPrint = async () => {
      if (await isTauriDesktop()) {
        try {
          const prnt = await import("@/lib/actions/print-formatter-prisma")
          const result = await prnt.getRepairTicketPrintData(decodeURIComponent(id!))
          if (!result.data) {
            toast({
              title: "Error",
              description: "No se pudieron cargar los datos del ticket.",
              variant: "destructive",
            })
            return
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 300))
          if (ticketRef.current) {
            const base64 = await domToPngBase64(ticketRef.current, { pixelRatio: 2 })
            await printEscposImage(result.data.business.name, base64)
            toast({ title: "Ticket enviado a impresora" })
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Error al imprimir"
          toast({ title: "Error de impresion", description: msg, variant: "destructive" })
        }
        return
      }

      document.body.classList.add("print-ticket-mode")
      injectThermalTicketStyleAndPrint()
      document.documentElement.style.setProperty("--ticket-width", "80mm")
      window.setTimeout(() => window.print(), 500)
    }

    runPrint()

    return () => {
      document.body.classList.remove("print-ticket-mode")
      document.getElementById("print-ticket-page-style")?.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeData, deliveryData, business])

  if (loadError) {
    return (
      <div style={{ padding: "20px", fontFamily: "Verdana, Tahoma, sans-serif", color: "#c00000", fontSize: "14px" }}>
        <strong>Error:</strong> {loadError}
      </div>
    )
  }

  if (!business || (ticketType === "delivery" && !deliveryData) || (ticketType !== "delivery" && !intakeData)) {
    return (
      <div style={{ padding: "20px", fontFamily: "Verdana, Tahoma, sans-serif", color: "#000000", fontSize: "13px" }}>
        Cargando ticket...
      </div>
    )
  }

  return (
    <div ref={ticketRef} className="print-ticket-only bg-white">
      {ticketType === "delivery" && deliveryData ? (
        <RepairDeliveryTicket
          data={deliveryData}
          business={{
            name: business.name,
            phone: business.phone,
            logoUrl: business.logoUrl,
            terminosGarantia: business.terminosGarantia,
            mensajeDespedida: business.mensajeDespedida,
          }}
        />
      ) : intakeData ? (
        <RepairIntakeTicket
          data={intakeData}
          business={{
            name: business.name,
            phone: business.phone,
            logoUrl: business.logoUrl,
            terminosGarantia: business.terminosGarantia,
            mensajeDespedida: business.mensajeDespedida,
          }}
          options={{
            showHealthCheckFuncional,
          }}
        />
      ) : null}
    </div>
  )
}

export default function PrintTicketDynamicPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "20px", fontFamily: "Verdana, Tahoma, sans-serif", color: "#000000", fontSize: "13px" }}>
          Cargando ticket...
        </div>
      }
    >
      <PrintTicketInner />
    </Suspense>
  )
}
