"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { TicketCompraTemplate } from "@/components/printing"
import type { TicketCompraData } from "@/components/printing"
import { usePrintWindowClose } from "@/hooks/use-print-window-close"
import { injectThermalTicketStyleAndPrint } from "@/lib/print/print-config"
import { getTallerSettings } from "@/lib/actions/settings-prisma"

function PrintCompraInner() {
  const searchParams = useSearchParams()
  const [business, setBusiness] = useState<{
    name: string
    phone: string
    address: string
    logoUrl: string | null
  } | null>(null)
  const ticketRef = useRef<HTMLDivElement>(null)
  usePrintWindowClose()

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getTallerSettings()
        const s = result.settings
        setBusiness({
          name: s?.nombre_taller || "Mi Taller",
          phone: s?.telefono || "",
          address: s?.direccion || "",
          logoUrl: s?.logo_url || null,
        })
      } catch {
        setBusiness({
          name: "Mi Taller",
          phone: "",
          address: "",
          logoUrl: null,
        })
      }
    }
    void load()
  }, [])

  useEffect(() => {
    if (!business) return

    document.body.classList.add("print-ticket-mode")
    injectThermalTicketStyleAndPrint()
    window.setTimeout(() => window.print(), 500)

    return () => {
      document.body.classList.remove("print-ticket-mode")
      document.getElementById("print-ticket-page-style")?.remove()
    }
  }, [business])

  if (!business) {
    return (
      <div style={{ padding: "20px", fontFamily: "Verdana, Tahoma, sans-serif", color: "#000000", fontSize: "13px" }}>
        Cargando comprobante...
      </div>
    )
  }

  const data: TicketCompraData = {
    folio: searchParams.get("folio") || "\u2014",
    fecha: searchParams.get("fecha") || "",
    vendedor: searchParams.get("vendedor") || "\u2014",
    documento: searchParams.get("documento") || "\u2014",
    marca: searchParams.get("marca") || "\u2014",
    modelo: searchParams.get("modelo") || "\u2014",
    serial: searchParams.get("serial") || "\u2014",
    imei: searchParams.get("imei") || "\u2014",
    monto: Number(searchParams.get("monto")) || 0,
    condicion: searchParams.get("condicion") || "\u2014",
    color: searchParams.get("color") || "\u2014",
    capacidad: searchParams.get("capacidad") || "\u2014",
    observaciones: searchParams.get("observaciones") || undefined,
  }

  return (
    <div ref={ticketRef} className="print-ticket-only bg-white">
      <TicketCompraTemplate
        data={data}
        businessName={business.name}
        businessPhone={business.phone}
        businessAddress={business.address}
        logoUrl={business.logoUrl}
        mostrarLogo={true}
      />
    </div>
  )
}

export default function PrintCompraPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "20px", fontFamily: "Verdana, Tahoma, sans-serif", color: "#000000", fontSize: "13px" }}>
          Cargando comprobante...
        </div>
      }
    >
      <PrintCompraInner />
    </Suspense>
  )
}
