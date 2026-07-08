"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"
import { requestPasswordReset } from "@/lib/actions/auth-prisma"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await requestPasswordReset(email)
      
      if (result.success) {
        setSubmitted(true)
      }
    } catch (err) {
      console.error("Error requesting password reset:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-600">ReparaHub</h1>
            <p className="text-sm text-slate-600 mt-1">Gestion de reparaciones inteligente</p>
          </div>
        </div>

        {/* Card */}
        <Card className="border-0 shadow-lg">
          {submitted ? (
            <>
              <CardHeader className="space-y-2">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-center">Revisa tu email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 text-center">
                  Hemos enviado instrucciones para resetear tu contrasena a:
                </p>
                <p className="font-medium text-center text-slate-900">{email}</p>
                <p className="text-xs text-slate-500 text-center">
                  Si no ves el email, revisa tu carpeta de spam.
                </p>
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al login
                  </Button>
                </Link>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl text-center">Olvide mi contrasena</CardTitle>
                <CardDescription className="text-center">
                  Ingresa tu email y te enviaremos instrucciones para resetearla
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Correo Electronico
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-10"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar instrucciones"
                    )}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                  <Link
                    href="/auth/login"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio de sesion
                  </Link>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500">
          <p>ReparaHub © 2024. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  )
}
