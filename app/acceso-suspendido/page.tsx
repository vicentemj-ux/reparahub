"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { AlertTriangle, MessageCircle, LogOut, RefreshCw } from "lucide-react"
import { buildWhatsAppSendUrl, REPARAHUB_WHATSAPP_SUPPORT_DIGITS } from "@/lib/whatsapp-send-url"
import { logoutTaller } from "@/lib/actions/auth-prisma"

function AccesoSuspendidoContent() {
  const params = useSearchParams()
  const razon = params.get("razon") // "vencido" | "suspendido"
  const [loggingOut, setLoggingOut] = useState(false)

  const titulo =
    razon === "suspendido"
      ? "Acceso suspendido"
      : "Periodo de acceso vencido"

  const mensaje =
    razon === "suspendido"
      ? "Tu acceso ha sido suspendido por el administrador del sistema."
      : "Tu periodo de acceso ha vencido."

  const waUrl = buildWhatsAppSendUrl(
    REPARAHUB_WHATSAPP_SUPPORT_DIGITS,
    `Hola, soy usuario de ReparaHub. Mi acceso esta ${
      razon === "suspendido" ? "suspendido" : "vencido"
    } y quisiera renovar mi suscripcion. ¿Me pueden ayudar?`,
  )

  const handleLogout = async () => {
    setLoggingOut(true)
    await logoutTaller()
    window.location.href = "/auth/login"
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 ring-8 ring-amber-50">
            <AlertTriangle className="h-10 w-10 text-amber-600" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-2xl font-black text-slate-900">{titulo}</h1>
          <p className="text-slate-600 leading-relaxed">
            {mensaje}
            <br />
            Contactanos para renovar tu suscripcion y continuar usando ReparaHub.
          </p>
        </div>

        {/* Primary CTA */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-3 w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base px-6 py-4 transition-colors shadow-lg shadow-blue-200/80"
        >
          <MessageCircle className="h-5 w-5" />
          Contactar a Soporte
        </a>

        {/* Secondary actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm px-6 py-3 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar acceso
          </button>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm px-6 py-3 transition-colors disabled:opacity-50"
          >
            {loggingOut ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {loggingOut ? "Cerrando sesion..." : "Cerrar sesion / Cambiar cuenta"}
          </button>
        </div>

        {/* Support note */}
        <p className="text-xs text-slate-500">
          ReparaHub &mdash; Si crees que es un error, escribenos y lo resolvemos de inmediato.
        </p>
      </div>
    </div>
  )
}

export default function AccesoSuspendidoPage() {
  return (
    <Suspense>
      <AccesoSuspendidoContent />
    </Suspense>
  )
}
