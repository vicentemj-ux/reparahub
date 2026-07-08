"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Clock, MessageCircle, Phone, Search } from "lucide-react"
import { normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { getCodigoTelefono } from "@/lib/constants/paises"

interface TallerContact {
  name: string | null
  telefono: string | null
  whatsapp: string | null
  pais: string | null
}

interface TrackingValidationProps {
  onValidate: (last4: string) => Promise<void>
  isLoading: boolean
  error: string | null
  attemptsRemaining?: number
  attemptsMax?: number
  blocked?: boolean
  tallerContact?: TallerContact | null
}

const PHONE_LAST4_LENGTH = 4

export function TrackingValidation({
  onValidate,
  isLoading,
  error,
  attemptsRemaining,
  attemptsMax = 5,
  blocked = false,
  tallerContact = null,
}: TrackingValidationProps) {
  const [last4, setLast4] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (last4.trim().length === PHONE_LAST4_LENGTH && !blocked) {
      await onValidate(last4)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (blocked) return
    const value = e.target.value.replace(/\D/g, "").slice(0, PHONE_LAST4_LENGTH)
    setLast4(value)
  }

  // Construir el link de WhatsApp al numero del taller.
  const whatsappDigits = tallerContact
    ? normalizePhoneForWhatsApp(
        tallerContact.whatsapp || tallerContact.telefono,
        getCodigoTelefono(tallerContact.pais ?? null),
      )
    : null
  const whatsappHref = whatsappDigits
    ? `https://api.whatsapp.com/send?phone=${whatsappDigits}&text=${encodeURIComponent(
        "Hola, les contacto desde la pagina de tracking de ReparaHub. Ya agote mis intentos de verificacion y necesito apoyo para continuar.",
      )}`
    : undefined

  const showAttemptsHint = !blocked && typeof attemptsRemaining === "number"
  const attemptsLabel = showAttemptsHint
    ? attemptsRemaining === 1
      ? "Te queda 1 intento. Si fallas, contactanos por WhatsApp."
      : `Intentos disponibles: ${attemptsRemaining} de ${attemptsMax}.`
    : null

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-8">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-950 mb-2 tracking-tight">
            SEGUIMIENTO DE EQUIPO
          </h1>
          <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold">
            RED DE TALLERES CERTIFICADOS REPARAHUB
          </p>
        </div>

        {/* Validation Card */}
        <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-3xl p-8 mb-8 shadow-2xl shadow-slate-200/70">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-center text-2xl font-bold text-slate-950 mb-2">
            VERIFICACION DE SEGURIDAD
          </h2>

          {/* Visual instructions */}
          <p className="text-center text-sm text-slate-600 mb-2">
            Ingresa los ultimos 4 digitos del celular registrado en tu ticket de recepcion.
          </p>
          <div className="flex items-center justify-center gap-2 mb-6 text-xs text-slate-500">
            <Phone className="w-4 h-4 text-blue-400" />
            <span>
              Ejemplo:&nbsp;
              <span className="font-semibold text-slate-900">7393</span>
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="tracking-phone-last4"
              type="tel"
              inputMode="numeric"
              placeholder="Ultimos 4 digitos de tu celular"
              value={last4}
              onChange={handleInputChange}
              maxLength={4}
              disabled={blocked}
              aria-label="Ingresa los ultimos 4 digitos de tu celular"
              aria-invalid={!!error}
              aria-describedby={error ? "tracking-phone-last4-error" : undefined}
              className="h-14 text-center text-lg font-semibold bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/30 disabled:opacity-50"
            />

            {showAttemptsHint && attemptsLabel && (
              <p className="text-center text-xs font-semibold text-amber-400">
                {attemptsLabel}
              </p>
            )}

            <Button
              type="submit"
              disabled={blocked || last4.trim().length !== PHONE_LAST4_LENGTH || isLoading}
              className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                "Verificando..."
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  VERIFICAR Y ACCEDER
                </>
              )}
            </Button>
          </form>

          {/* Estado bloqueado: mostrar CTA de WhatsApp al taller */}
          {blocked && (
            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Limite de intentos alcanzado
                  </p>
                  <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                    Por tu seguridad, despues de {attemptsMax} intentos fallidos el acceso
                    se bloquea. Contacta directamente al taller y con gusto te
                    ayudamos a verificar tu equipo.
                  </p>
                </div>
              </div>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contactar al taller por WhatsApp
                </a>
              ) : (
                <p className="text-xs text-slate-500 text-center">
                  Llama al taller para continuar.
                </p>
              )}
              {tallerContact?.name && (
                <p className="text-[11px] text-slate-500 text-center">
                  {tallerContact.name}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-slate-500 px-4">
          Tu informacion esta protegida y segura. Estos datos solo seran utilizados para verificar tu solicitud.
        </p>
      </div>

      {/* Error banner fixed at bottom with shake-like animation */}
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        className="fixed inset-x-0 bottom-0 px-4 pb-4 pointer-events-none"
      >
        {error && !blocked && (
          <div className="mx-auto max-w-md bg-red-600 text-white border border-red-500 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 animate-shake-x pointer-events-auto">
            <AlertTriangle className="w-5 h-5" />
            <p
              id="tracking-phone-last4-error"
              className="text-xs sm:text-sm font-semibold tracking-wide text-center"
            >
              LOS D&Iacute;GITOS INGRESADOS NO COINCIDEN CON NUESTROS REGISTROS
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
