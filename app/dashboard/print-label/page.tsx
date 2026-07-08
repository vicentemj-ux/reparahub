"use client"

import { useEffect } from "react"

/** Compatibilidad: redirige a /print-label (sin sidebar) para impresion limpia. */
export default function DashboardPrintLabelRedirectPage() {
  useEffect(() => {
    window.location.replace("/print-label")
  }, [])
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-slate-500">
      Abriendo ventana de impresion...
    </div>
  )
}
