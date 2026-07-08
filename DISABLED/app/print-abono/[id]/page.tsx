"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { RepairPaymentTicket, type RepairPaymentTicketData } from "@/components/printing"
import { getAbonoPrintData } from "@/lib/actions/print-formatter-prisma"
import { usePrintWindowClose } from "@/hooks/use-print-window-close"
import { injectThermalTicketStyleAndPrint } from "@/lib/print/print-config"
import { toast } from "@/hooks/use-toast"

export default function PrintAbonoDynamicPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<RepairPaymentTicketData | null>(null)
  const [business, setBusiness] = useState<{
    name: string
    phone: string
    logoUrl: string | null
    mensajeDespedida: string
  } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const ticketRef = useRef<HTMLDivElement>(null)
  usePrintWindowClose()

  useEffect(() => {
    if (!id) return

    const load = async () => {
      try {
        const result = await getAbonoPrintData(decodeURIComponent(id))

        if (result.error || !result.data) {
          setLoadError(result.error ?? "Comprobante no encontrado.")
          return
        }

        const { abono, business: biz } = result.data

        setData({
          folio: abono.folio,
          customerName: abono.customerName,
          customerPhone: abono.customerPhone,
          deviceName: abono.deviceName,
          metodoPago: abono.metodoPago,
          monto: abono.monto,
          totalPagado: abono.totalPagado,
          presupuesto: abono.presupuesto,
          saldoRestante: abono.saldoRestante,
          date: abono.date,
          tipoMov: abono.tipo === "liquidacion_reparacion" ? "liquidacion" : "anticipo",
        })

        setBusiness({
          name: biz.name,
          phone: biz.phone,
          logoUrl: biz.logoUrl,
          mensajeDespedida: biz.mensajeDespedida,
        })
      } catch (err) {
        console.error("[print-abono/[id]] error:", err)
        setLoadError("Error al cargar el comprobante. Cierra esta ventana e intenta de nuevo.")
      }
    }

    void load()
  }, [id])

  useEffect(() => {
    if (!data || !business) return

    document.body.classList.add("print-ticket-mode")
    injectThermalTicketStyleAndPrint()
    document.documentElement.style.setProperty("--ticket-width", "80mm")
    window.setTimeout(() => window.print(), 500)

    return () => {
      document.body.classList.remove("print-ticket-mode")
      document.getElementById("print-ticket-page-style")?.remove()
    }
  }, [data, business])

  if (loadError) {
    return (
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", color: "#c00000", fontSize: "14px" }}>
        <strong>Error:</strong> {loadError}
      </div>
    )
  }

  if (!data || !business) {
    return (
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", color: "#555", fontSize: "13px" }}>
        Cargando comprobante...
      </div>
    )
  }

  return (
    <div ref={ticketRef} className="print-ticket-only bg-white">
      <RepairPaymentTicket
        data={data}
        business={{
          name: business.name,
          phone: business.phone,
          logoUrl: business.logoUrl,
          mensajeDespedida: business.mensajeDespedida || undefined,
        }}
      />
    </div>
  )
}
