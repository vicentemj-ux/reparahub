"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Mail, RotateCw, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { sendAdminOTP, verifyAdminOTP } from "@/lib/actions/admin-otp"

const ADMIN_OTP_LENGTH = 8

export default function AdminVerifyPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sendPending, startSend] = useTransition()
  const [verifyPending, startVerify] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const hasSubmittedRef = useRef(false)

  // Auto-send OTP on mount
  const triggerSend = useCallback(() => {
    setError(null)
    startSend(async () => {
      const result = await sendAdminOTP()
      if (result.success) {
        setMaskedEmail(result.maskedEmail ?? null)
        inputRef.current?.focus()
      } else if (result.error === "SESSION_EXPIRED") {
        router.replace("/auth/super-admin")
      } else {
        setError(result.error ?? "Error al enviar el codigo.")
      }
    })
  }, [router])

  useEffect(() => {
    triggerSend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleVerify = useCallback(() => {
    if (hasSubmittedRef.current || code.trim().length !== ADMIN_OTP_LENGTH) {
      if (code.trim().length !== ADMIN_OTP_LENGTH) {
        setError(`Ingresa los ${ADMIN_OTP_LENGTH} digitos del codigo.`)
      }
      return
    }
    hasSubmittedRef.current = true
    setError(null)
    startVerify(async () => {
      try {
        const result = await verifyAdminOTP(code.trim())
        if (result.success) {
          setSuccess(true)
          router.replace("/admin/dashboard")
        } else if (result.error === "SESSION_EXPIRED") {
          router.replace("/auth/super-admin")
        } else {
          setError(result.error ?? "Codigo incorrecto.")
          setCode("")
          hasSubmittedRef.current = false
          inputRef.current?.focus()
        }
      } catch {
        setError("Error de conexion. Intenta de nuevo.")
        hasSubmittedRef.current = false
      }
    })
  }, [code, router])

  const isPending = sendPending || verifyPending

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/15 border border-blue-500/30 mb-4">
            <ShieldCheck className="h-7 w-7 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight text-center">
            Verificacion de Identidad
          </h1>
          <p className="mt-1 text-sm text-slate-500 text-center font-medium">
            Propietario de ReparaHub
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-200/80">

          {success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <p className="text-emerald-400 font-semibold text-sm">Acceso autorizado</p>
              <p className="text-slate-500 text-xs">Redirigiendo al panel...</p>
            </div>
          ) : (
            <>
              {/* Send status */}
              {sendPending ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  Enviando codigo a tu correo...
                </div>
              ) : maskedEmail ? (
                <div className="flex items-start gap-2 text-sm text-slate-500 mb-5">
                  <Mail className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" />
                  <span>
                    Codigo enviado a <span className="text-slate-600 font-medium">{maskedEmail}</span>.
                    Valido por 10 minutos.
                  </span>
                </div>
              ) : null}

              {/* Code input */}
              <div className="space-y-2 mb-4">
                <label
                  htmlFor="otp-code"
                  className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500"
                >
                  Codigo de {ADMIN_OTP_LENGTH} digitos
                </label>
                <input
                  ref={inputRef}
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={ADMIN_OTP_LENGTH}
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, ADMIN_OTP_LENGTH)
                    setCode(val)
                    setError(null)
                    if (val.length === ADMIN_OTP_LENGTH && !hasSubmittedRef.current && !verifyPending) {
                      // Auto-submit when all digits are entered
                      setTimeout(() => handleVerify(), 50)
                    }
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleVerify() }}
                  disabled={isPending}
                  placeholder="00000000"
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] text-slate-900 placeholder:text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 transition"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-950/40 px-3 py-2.5 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {error}
                  </div>
                  {error.includes("Error inesperado") || error.includes("soporte") ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => router.replace("/auth/super-admin")}
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-blue-50 transition-colors"
                      >
                        ← Regresar al inicio de sesion
                      </button>
                      <p className="text-xs text-slate-600 text-center">
                        Si el problema persiste, contacta a soporte con los logs del servidor.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Verify button */}
              <button
                onClick={handleVerify}
                disabled={isPending || code.length !== ADMIN_OTP_LENGTH}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {verifyPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verificando...</>
                ) : (
                  <><ShieldCheck className="h-4 w-4" /> Verificar acceso</>
                )}
              </button>

              {/* Resend */}
              <div className="mt-4 flex flex-col items-center gap-3">
                <button
                  onClick={triggerSend}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <RotateCw className="h-3 w-3" />
                  {sendPending ? "Enviando..." : "Reenviar codigo"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-slate-700">
          Este panel es de acceso exclusivo del propietario de ReparaHub.
        </p>
      </div>
    </div>
  )
}
