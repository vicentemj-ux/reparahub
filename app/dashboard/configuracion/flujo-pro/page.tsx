"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function FlujoProRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir a la pestana Flujo PRO en la pagina de Configuracion
    router.push("/dashboard/configuracion?tab=flujo-pro")
  }, [router])

  return (
    <div className="min-h-screen bg-dashboard-surface flex items-center justify-center">
      <p className="text-slate-500">Redirigiendo...</p>
    </div>
  )
}
