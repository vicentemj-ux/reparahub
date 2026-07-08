"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { MarketingPageView } from "@/components/marketing/marketing-page-view"
import { registerWithPrisma } from "@/lib/actions/auth-prisma"
import { trackMarketingEvent } from "@/lib/marketing-analytics"

const initialFormData = {
  nombrePropietario: "",
  nombreTaller: "",
  email: "",
  password: "",
  confirmPassword: "",
}

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState(initialFormData)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const dirtyRef = useRef(false)
  const completedRef = useRef(false)

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (dirtyRef.current && !completedRef.current) {
        trackMarketingEvent("register_abandon")
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    dirtyRef.current = true
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.")
      trackMarketingEvent("register_error", { category: "password_mismatch" })
      return
    }

    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.")
      trackMarketingEvent("register_error", { category: "password_length" })
      return
    }

    setLoading(true)
    trackMarketingEvent("register_submit", { method: "email" })

    try {
      const result = await registerWithPrisma({
        nombrePropietario: formData.nombrePropietario,
        nombreTaller: formData.nombreTaller,
        email: formData.email,
        password: formData.password,
      })

      if (result.success) {
        completedRef.current = true
        trackMarketingEvent("register_success", { method: "email" })
        router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`)
        return
      }

      setError(result.error || "No pudimos crear la cuenta. Revisa los datos e inténtalo de nuevo.")
      trackMarketingEvent("register_error", { category: "server_validation" })
    } catch {
      setError("No pudimos crear la cuenta. Inténtalo nuevamente.")
      trackMarketingEvent("register_error", { category: "unexpected" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <MarketingPageView eventName="register_view" />
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="hidden bg-blue-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-blue-600">
              <Image src="/images/logo.png" width={42} height={42} alt="" className="h-10 w-10 object-contain" />
              <span className="text-xl font-black">ReparaHub</span>
            </Link>
            <p className="mt-14 text-sm font-bold text-blue-200">30 DÍAS DE PLAN PRO</p>
            <h1 className="mt-4 text-balance text-4xl font-black leading-tight tracking-[-0.03em]">
              Empieza con toda la operación conectada
            </h1>
            <p className="mt-5 leading-7 text-blue-100">
              Configura tu taller y prueba reparaciones, POS, inventario, apartados, cotizaciones y reportes.
            </p>
          </div>
          <ul className="mt-10 space-y-4 text-sm font-semibold text-blue-50">
            {["Sin tarjeta de crédito", "Acceso desde computadora, tablet y celular", "Tus datos permanecen al elegir un plan"].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <section aria-labelledby="registro-titulo" className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <Link href="/" className="mb-8 flex items-center justify-center gap-2 lg:hidden">
              <Image src="/images/logo.png" width={36} height={36} alt="" className="h-9 w-9 object-contain" />
              <span className="text-xl font-black text-slate-950">ReparaHub</span>
            </Link>

            <div className="text-center">
              <h2 id="registro-titulo" className="text-3xl font-black tracking-tight text-slate-950">Crea tu cuenta</h2>
              <p className="mt-2 text-slate-600">Activa 30 días de PLAN PRO, sin tarjeta de crédito.</p>
            </div>

            <form onSubmit={handleRegister} className="mt-8 space-y-5" aria-describedby={error ? "registro-error" : undefined}>
              {error ? (
                <div id="registro-error" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert" aria-live="assertive">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="nombrePropietario">Nombre completo del propietario</Label>
                <Input id="nombrePropietario" name="nombrePropietario" placeholder="Juan García" value={formData.nombrePropietario} onChange={handleChange} required disabled={loading} autoComplete="name" maxLength={100} className="h-11" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombreTaller">Nombre del taller</Label>
                <Input id="nombreTaller" name="nombreTaller" placeholder="Servicio Técnico García" value={formData.nombreTaller} onChange={handleChange} required disabled={loading} autoComplete="organization" maxLength={100} className="h-11" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" name="email" placeholder="tu@taller.com" value={formData.email} onChange={handleChange} required disabled={loading} autoComplete="email" maxLength={254} className="h-11" />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" type="password" name="password" value={formData.password} onChange={handleChange} required disabled={loading} autoComplete="new-password" minLength={8} maxLength={128} aria-describedby="password-help" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input id="confirmPassword" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required disabled={loading} autoComplete="new-password" minLength={8} maxLength={128} className="h-11" />
                </div>
              </div>
              <p id="password-help" className="text-xs text-slate-500">Usa al menos 8 caracteres.</p>

              <Button type="submit" disabled={loading} className="btn-glow h-12 w-full bg-blue-600 text-base font-bold hover:bg-blue-700">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />Creando cuenta...</> : "Crear cuenta gratis"}
              </Button>

              <div className="relative py-1" aria-hidden>
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">o</span></div>
              </div>

              <GoogleSignInButton />
            </form>

            <p className="mt-7 text-center text-sm text-slate-600">
              ¿Ya tienes cuenta? <Link href="/auth/login" className="font-bold text-blue-700 hover:underline">Inicia sesión</Link>
            </p>
            <p className="mt-5 text-center text-xs leading-5 text-slate-500">
              Al crear tu cuenta aceptas los <Link href="/terminos" className="underline">términos de servicio</Link> y la <Link href="/privacidad" className="underline">política de privacidad</Link>.
            </p>
          </div>
        </section>
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">ReparaHub © 2026. Todos los derechos reservados.</p>
    </main>
  )
}
