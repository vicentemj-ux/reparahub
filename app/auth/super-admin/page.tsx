"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Lock, AlertCircle } from "lucide-react"
import { loginAdmin } from "@/lib/actions/auth-prisma"

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await loginAdmin(email, password)

      if (result.success) {
        router.push("/admin/dashboard")
        router.refresh()
      } else {
        setError(result.error || "Error al iniciar sesion")
      }
    } catch {
      setError("Error al iniciar sesion. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 relative overflow-hidden">
      {/* Background security accent - minimalist geometric pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-600 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Security Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">ReparaHub</h1>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200 bg-white/90 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-3 border-b border-slate-200 pb-6">
            <CardTitle className="text-white text-center">Portal de Administracion</CardTitle>
            <CardDescription className="text-slate-500 text-center text-sm">
              Acceso exclusivo para Super Administradores del Sistema
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-950/30 border border-red-900/50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 text-sm font-medium">
                  Usuario de Sistema
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="administrador@reparahub.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-white/90 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-slate-100 focus:border-blue-600 focus:ring-blue-600/20"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 text-sm font-medium">
                  Contrasena Maestra
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="**************"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-white/90 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-slate-100 focus:border-blue-600 focus:ring-blue-600/20"
                />
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-10 rounded-lg transition-all duration-200"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando acceso...
                  </span>
                ) : (
                  "Acceder al Sistema"
                )}
              </Button>
            </form>

            {/* 2FA Info */}
            <div className="mt-4 p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg">
              <p className="text-xs text-blue-400 text-center">
                <strong>Verificacion en dos pasos:</strong> Tras iniciar sesion, recibiras un codigo de 6 digitos en tu correo registrado.
                <br />
                Asegurate de que <code className="text-blue-300">RESEND_API_KEY</code> este configurada en las variables de entorno.
              </p>
            </div>

            {/* Security Footer */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                Esta pagina solo es accesible para administradores autorizados.
                <br />
                Todos los intentos de acceso se registran y monitorean.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/90 border border-slate-200 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-500">Sistema Seguro</span>
          </div>
        </div>
      </div>
    </div>
  )
}
