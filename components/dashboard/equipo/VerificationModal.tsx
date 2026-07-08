"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type VerificationModalProps = {
  open: boolean
  email: string
  pin: string
  isSubmitting?: boolean
  errorMessage?: string
  onPinChange: (value: string) => void
  onConfirm: () => void
  onResend: () => void
  onSkip: () => void
}

export function VerificationModal({
  open,
  email,
  pin,
  isSubmitting = false,
  errorMessage,
  onPinChange,
  onConfirm,
  onResend,
  onSkip,
}: VerificationModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (errorMessage) inputRef.current?.focus()
  }, [errorMessage])

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md border border-gray-200 bg-white p-0 text-gray-900 sm:rounded-2xl"
      >
        <DialogHeader className="items-center border-b border-gray-200 px-6 pb-4 pt-6 text-center">
          <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <span className="text-lg font-black">TC</span>
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            ¡Falta poco para configurar tu acceso!
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Ingresa el codigo de verificacion de 6 digitos que enviamos a tu correo{" "}
            <span className="font-semibold text-gray-800">{email}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6 pt-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Codigo PIN
            </Label>
            <Input
              ref={inputRef}
              value={pin}
              onChange={(e) => onPinChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              autoFocus
              placeholder="000000"
              className={`h-14 text-center font-mono text-2xl tracking-[0.4em] ${
                errorMessage
                  ? "border-red-300 bg-red-50 text-red-700 focus-visible:ring-red-400"
                  : "border-gray-200 bg-white text-gray-900 focus-visible:ring-blue-500"
              }`}
            />
          </div>

          {errorMessage && (
            <p className="text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          <Button
            type="button"
            disabled={isSubmitting || pin.length !== 6}
            onClick={onConfirm}
            className="h-11 w-full rounded-xl bg-blue-600 text-sm font-bold uppercase tracking-wide text-white hover:bg-blue-700"
          >
            {isSubmitting ? "Confirmando..." : "Confirmar codigo"}
          </Button>

          <div className="flex flex-col items-center gap-2 pt-1 text-sm">
            <button
              type="button"
              onClick={onResend}
              disabled={isSubmitting}
              className="text-gray-700 underline underline-offset-2 hover:text-blue-600 disabled:opacity-50"
            >
              ¿No recibiste el codigo? Reenviar correo
            </button>
            <button
              type="button"
              onClick={onSkip}
              disabled={isSubmitting}
              className="text-gray-500 underline underline-offset-2 hover:text-gray-700 disabled:opacity-50"
            >
              Omitir por ahora
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
