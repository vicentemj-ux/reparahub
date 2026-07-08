"use client"

import { useEffect, useState, useTransition } from "react"
import { VerificationModal } from "@/components/dashboard/equipo/VerificationModal"
import {
  getCurrentUserVerificationStatus,
  resendCurrentUserVerificationPin,
  verifyCurrentUserPin,
} from "@/lib/actions/email-verification"
import { toast } from "@/hooks/use-toast"

export function VerificationGate() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [pin, setPin] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const status = await getCurrentUserVerificationStatus()
      if (!status.requiresVerification) {
        setOpen(false)
        return
      }
      setEmail(status.email)
      setOpen(true)
    })
  }, [])

  const handleConfirm = () => {
    setErrorMessage("")
    startTransition(async () => {
      const result = await verifyCurrentUserPin(pin)
      if (!result.success) {
        setErrorMessage(
          "Codigo incorrecto o expirado. Por favor verifica el correo nuevamente, revisa tu carpeta de Spam o Correo no deseado. Si sigues sin recibirlo, solicita uno nuevo."
        )
        return
      }
      setOpen(false)
      setPin("")
      toast({ title: "Correo verificado", description: "Tu acceso quedo confirmado correctamente." })
    })
  }

  const handleResend = () => {
    setErrorMessage("")
    startTransition(async () => {
      const result = await resendCurrentUserVerificationPin()
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "No se pudo reenviar el correo de verificacion.",
          variant: "destructive",
        })
        return
      }
      toast({ title: "Codigo reenviado", description: "Revisa tu correo y carpeta de spam." })
    })
  }

  const handleSkip = () => {
    setOpen(false)
  }

  return (
    <VerificationModal
      open={open}
      email={email}
      pin={pin}
      isSubmitting={isPending}
      errorMessage={errorMessage}
      onPinChange={(value) => {
        setPin(value)
        if (errorMessage) setErrorMessage("")
      }}
      onConfirm={handleConfirm}
      onResend={handleResend}
      onSkip={handleSkip}
    />
  )
}
