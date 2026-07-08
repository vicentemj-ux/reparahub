"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, Mail, RefreshCw, MessageCircle, KeyRound } from "lucide-react"
import { signIn } from "next-auth/react"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { checkEmailStatus, resendVerificationEmail } from "@/lib/actions/auth-prisma"
import {
  resendStaffPinByEmail,
  verifyStaffPinByEmail,
} from "@/lib/actions/email-verification"

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="space-y-4">
          <div className="h-8 w-32 bg-muted rounded animate-pulse mx-auto" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse mx-auto" />
          <div className="space-y-3">
            <div className="h-10 bg-muted rounded animate-pulse" />
            <div className="h-10 bg-muted rounded animate-pulse" />
            <div className="h-10 bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")

  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [unverifiedRole, setUnverifiedRole] = useState<"OWNER" | "STAFF" | null>(null)
  const [resending, setResending] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [resendError, setResendError] = useState("")

  const [pin, setPin] = useState("")
  const [verifyingPin, setVerifyingPin] = useState(false)
  const [pinError, setPinError] = useState("")
  const [pinVerified, setPinVerified] = useState(false)

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMsg("Cuenta creada exitosamente. Debes verificar tu correo antes de iniciar sesion. Revisa tu bandeja de entrada o spam.")
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMsg("")
    setUnverifiedEmail(null)
    setUnverifiedRole(null)
    setResendSent(false)
    setResendError("")
    setPin("")
    setPinError("")
    setPinVerified(false)
    setLoading(true)

    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.ok) {
        router.push("/dashboard")
        router.refresh()
        return
      }

      // Check if the email exists but is unverified
      const status = await checkEmailStatus(email)
      if (status.exists && !status.verified) {
        setUnverifiedEmail(email)
        setUnverifiedRole(status.role ?? null)
        setError("Tu correo aun no ha sido verificado. Revisa tu bandeja de entrada o reenvia el correo de verificacion.")
      } else {
        setError("Email o contrasena incorrectos")
      }
    } catch {
      setError("Error al iniciar sesion. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!unverifiedEmail) return
    setResending(true)
    setResendError("")
    setResendSent(false)
    const result =
      unverifiedRole === "STAFF"
        ? await resendStaffPinByEmail(unverifiedEmail)
        : await resendVerificationEmail(unverifiedEmail)
    if (result.success) {
      setResendSent(true)
    } else {
      setResendError(result.error || "Error al reenviar")
    }
    setResending(false)
  }

  const handleVerifyPin = async () => {
    if (!unverifiedEmail) return
    const trimmed = pin.trim()
    if (!/^[0-9]{6}$/.test(trimmed)) {
      setPinError("Ingresa el codigo de 6 digitos que enviamos a tu correo.")
      return
    }
    setVerifyingPin(true)
    setPinError("")
    const result = await verifyStaffPinByEmail(unverifiedEmail, trimmed)
    if (result.success) {
      setPinVerified(true)
      setResendError("")
      setError("")
      setSuccessMsg("Correo verificado. Ingresa tu contrasena para iniciar sesion.")
    } else {
      setPinError(result.error || "No se pudo verificar el codigo.")
    }
    setVerifyingPin(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-600">ReparaHub</h1>
            <p className="text-sm text-slate-600 mt-1">Gestion de reparaciones inteligente</p>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl text-center">Iniciar Sesion</CardTitle>
            <CardDescription className="text-center">Accede a tu dashboard de ReparaHub</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              {successMsg && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                  <p>{error}</p>
                </div>
              )}

              {unverifiedEmail && (
                <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Mail className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-900 space-y-2">
                      <p className="font-semibold">Correo pendiente de verificacion</p>
                      {unverifiedRole === "STAFF" ? (
                        <p>
                          Enviamos un <strong>codigo de 6 digitos</strong> a <strong>{unverifiedEmail}</strong>.
                          Tu dueno de taller o el correo electronico te lo entrega al registrarte.
                          Ingresalo aqui para confirmar tu correo y luego inicia sesion con tu contrasena.
                        </p>
                      ) : (
                        <>
                          <p>Enviamos un enlace de verificacion a <strong>{unverifiedEmail}</strong>. Revisa tu bandeja de entrada y, si no lo encuentras, sigue estas recomendaciones:</p>
                          <ul className="list-disc pl-5 space-y-1 text-amber-800">
                            <li>Revisa la carpeta de <strong>Spam</strong> o Correo no deseado</li>
                            <li>Si usas Gmail, revisa la pestana <strong>Promociones</strong> o <strong>Social</strong></li>
                            <li>Agrega <strong>noreply@reparahub.com</strong> a tu lista de contactos</li>
                          </ul>
                        </>
                      )}
                    </div>
                  </div>

                  {unverifiedRole === "STAFF" && !pinVerified && (
                    <div className="space-y-2 pt-1">
                      <Label htmlFor="pin" className="text-[11px] font-bold uppercase tracking-wide text-amber-900">
                        Codigo de verificacion
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="pin"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="000000"
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          disabled={verifyingPin}
                          className="h-10 flex-1 border-amber-300 bg-white text-center text-lg font-bold tracking-[0.5em] text-slate-900"
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyPin}
                          disabled={verifyingPin || pin.length !== 6}
                          size="sm"
                          className="h-10 gap-1 bg-blue-600 text-white hover:bg-blue-700"
                        >
                          {verifyingPin ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                          Verificar
                        </Button>
                      </div>
                      {pinError && (
                        <p className="text-xs text-red-600 font-medium">{pinError}</p>
                      )}
                    </div>
                  )}

                  {pinVerified && unverifiedRole === "STAFF" && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span>Correo verificado. Ahora ingresa tu contrasena y pulsa <strong>Entrar</strong>.</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-1">
                    <Button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-100"
                    >
                      {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {unverifiedRole === "STAFF" ? "Reenviar codigo" : "Reenviar correo de verificacion"}
                    </Button>

                    {resendSent && (
                      <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {unverifiedRole === "STAFF" ? "Codigo reenviado correctamente" : "Correo reenviado correctamente"}
                      </p>
                    )}
                    {resendError && (
                      <p className="text-xs text-red-600 font-medium">{resendError}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Correo Electronico</Label>
                <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} className="h-10" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Contrasena</Label>
                <Input id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} className="h-10" />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-10 bg-blue-600 hover:bg-blue-700">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</> : "Entrar"}
              </Button>

              <div className="text-center">
                <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Olvide mi contrasena</Link>
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">o</span></div>
              </div>

              <GoogleSignInButton />
            </form>

            <div className="mt-6 pt-6 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-600">Nuevo en ReparaHub? <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-medium">Registrar mi Taller</Link></p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-slate-500 mt-6 leading-relaxed">
          <p>ReparaHub &copy; 2024&ndash;2026 &middot; Software de gestion para talleres</p>
          <p className="mt-1">
            <a
              href="https://api.whatsapp.com/send?phone=526681227393"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Soporte tecnico via WhatsApp
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
