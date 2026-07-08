"use client"

import { useEffect, useRef, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react"
import { verifyEmailToken } from "@/lib/actions/auth-prisma"
import { trackMarketingEvent } from "@/lib/marketing-analytics"

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailSkeleton />}>
      <VerifyEmailContent />
    </Suspense>
  )
}

function VerifyEmailSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md border-0 shadow-lg p-8 space-y-4">
        <div className="h-12 w-12 bg-muted rounded-full animate-pulse mx-auto" />
        <div className="h-6 w-48 bg-muted rounded animate-pulse mx-auto" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse mx-auto" />
      </Card>
    </div>
  )
}

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error" | "check-email">("loading")
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState<string | null>(null)
  const trackedSuccessRef = useRef(false)

  useEffect(() => {
    const token = searchParams.get("token")
    const sig = searchParams.get("sig")
    const emailParam = searchParams.get("email")
    
    if (emailParam) {
      setEmail(emailParam)
    }
    
    if (!token) {
      setStatus("check-email")
      return
    }

    const verify = async () => {
      const result = await verifyEmailToken(token, sig || undefined)
      
      if (result.success) {
        setStatus("success")
        setMessage(result.message || "")
        if (!trackedSuccessRef.current) {
          trackedSuccessRef.current = true
          trackMarketingEvent("email_verified")
        }
      } else {
        setStatus("error")
        setMessage(result.error || "Error al verificar el email")
      }
    }

    verify()
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">
              {status === "loading" && "Verificando tu email..."}
              {status === "success" && "Email verificado"}
              {status === "error" && "Error de verificacion"}
              {status === "check-email" && "¡Registro exitoso!"}
            </CardTitle>
            {status === "check-email" && (
              <p className="text-slate-600">Revisa tu correo electronico</p>
            )}
          </CardHeader>

          <CardContent className="text-center space-y-6">
            {/* Status Icon */}
            <div className="flex justify-center">
              {status === "loading" && (
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              )}
              {status === "success" && (
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              )}
              {status === "error" && (
                <AlertCircle className="h-12 w-12 text-red-600" />
              )}
              {status === "check-email" && (
                <Mail className="h-16 w-16 text-blue-600" />
              )}
            </div>

            {/* Message */}
            <div className="space-y-4">
              <p className="text-slate-600">
                {status === "loading" && "Por favor espera mientras verificamos tu email..."}
                {status === "success" && message}
                {status === "error" && message}
                {status === "check-email" && (
                  <>
                    Te enviamos un correo de verificacion{email ? ` a ${email}` : ""}. 
                    Haz clic en el enlace del correo para activar tu cuenta.
                  </>
                )}
              </p>
              
              {status === "check-email" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>¿No encuentras el correo?</strong> Revisa tu carpeta de spam o correos no deseados.
                  </p>
                </div>
              )}
            </div>

            {/* Action Button */}
            {status !== "loading" && (
              <div className="space-y-3 pt-4">
                <Link href={status === "success" ? "/auth/login" : "/auth/login"}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    {status === "success" ? "Ir al login" : "Ya verifique mi correo → ir al login"}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 mt-6 leading-relaxed">
          <p>ReparaHub © 2024–2026 · Software de gestion para talleres</p>
          <p className="mt-1">
            <a
              href="https://api.whatsapp.com/send?phone=526681227393"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Soporte tecnico via WhatsApp
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
