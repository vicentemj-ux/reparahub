"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Loader2, Printer, MessageCircle, Tag, DollarSign } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { buildFirmaDigitalQrUrl } from "@/lib/reparaciones/firma-digital-url"
import type { RepairWelcomeWhatsAppPayload } from "@/lib/whatsapp-repair-welcome"
import type { ChecklistIngreso } from "@/lib/reparaciones/checklist-ingreso"
import { registrarAbono } from "@/lib/actions/repairs-prisma"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

export type VictoryLaunchPayload = RepairWelcomeWhatsAppPayload & {
  estimatedPrice: string
  deposit: string
  firmaDigitalToken?: string | null
  tipo_equipo?: string
  checklistIngreso?: ChecklistIngreso | null
}

function FirmaQrBlock({ token, size = 128 }: { token: string; size?: number }) {
  try {
    const url = buildFirmaDigitalQrUrl(token)
    if (!url?.trim()) {
      return (
        <p className="text-center text-xs font-medium text-red-600" role="alert">
          No se pudo generar el codigo de firma
        </p>
      )
    }
    return <QRCodeSVG value={url} size={size} level="M" />
  } catch {
    return (
      <p className="text-center text-xs font-medium text-red-600" role="alert">
        No se pudo generar el codigo de firma
      </p>
    )
  }
}

type VictoryLaunchSuccessDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  payload: VictoryLaunchPayload | null
  /** Usa `repairId` + `folio` del payload recien creado via localStorage + ventana de impresion */
  onPrintTicket: () => void
  onPrintLabel: () => void
  onSendWhatsApp: () => void
  /** Resetea formulario, cierra modal y opcionalmente navega */
  onDone: () => void
}

const tridentCardClass =
  "group flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-slate-200/90 bg-white px-4 py-5 text-center shadow-[0_12px_40px_-12px_rgba(15,23,42,0.18)] transition-all hover:border-blue-300 hover:shadow-[0_20px_50px_-15px_rgba(37,99,235,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]"

export function VictoryLaunchSuccessDialog({
  open,
  onOpenChange,
  payload,
  onPrintTicket,
  onPrintLabel,
  onSendWhatsApp,
  onDone,
}: VictoryLaunchSuccessDialogProps) {
  const [abonoMonto, setAbonoMonto] = useState("")
  const [abonoMetodo, setAbonoMetodo] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo")
  const [registrandoAbono, setRegistrandoAbono] = useState(false)
  const [abonoError, setAbonoError] = useState<string | null>(null)
  const [abonoExitoso, setAbonoExitoso] = useState(false)

  const handleRegistrarAbono = async () => {
    if (!payload?.repairId || !abonoMonto || parseFloat(abonoMonto) <= 0) {
      setAbonoError("Ingresa un monto valido")
      return
    }

    setRegistrandoAbono(true)
    setAbonoError(null)

    try {
      const result = await registrarAbono({
        repairId: payload.repairId,
        monto: parseFloat(abonoMonto),
        metodoPago: abonoMetodo,
      })

      if (result.success) {
        setAbonoExitoso(true)
        toast({
          title: "✅ Abono registrado",
          description: `Se registro un abono de $${parseFloat(abonoMonto).toLocaleString("es-MX")} en caja`,
          variant: "default",
        })
      } else {
        setAbonoError(result.error || "Error al registrar el abono")
      }
    } catch (err) {
      setAbonoError(err instanceof Error ? err.message : "Error inesperado al registrar el abono")
    } finally {
      setRegistrandoAbono(false)
    }
  }

  const handleSoloTicket = () => {
    // Resetear estados de abono
    setAbonoMonto("")
    setAbonoMetodo("efectivo")
    setAbonoExitoso(false)
    setAbonoError(null)
    // Ejecutar onDone que cierra el modal
    onDone()
  }

  return (
    <Dialog open={open && !!payload} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[125]"
        className={cn(
          "z-[130] max-h-[92vh] gap-0 overflow-y-auto rounded-3xl border-0 p-0 shadow-[0_25px_80px_-20px_rgba(15,23,42,0.35)] sm:max-w-lg",
          "bg-gradient-to-b from-slate-50/95 via-white to-white",
        )}
      >
        {payload ? (
          <div className="rounded-[1.35rem] px-5 pb-6 pt-6 sm:px-6">
            {/* Header con icono y titulo */}
            <div className="mb-5 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
                className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 shadow-inner ring-2 ring-emerald-100/80"
              >
                <CheckCircle2 className="h-9 w-9 text-emerald-500" strokeWidth={2.25} aria-hidden />
              </motion.div>
              <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900 sm:text-lg">
                ¡ORDEN REGISTRADA CON EXITO!
              </h2>
            </div>

            {/* Folio destacado - centrado */}
            <div className="mx-auto mb-5 flex max-w-[280px] flex-col items-center rounded-2xl border-2 border-blue-100/80 bg-gradient-to-b from-blue-50/80 to-white px-6 py-4 text-center shadow-[0_8px_24px_-8px_rgba(37,99,235,0.15)]">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Folio asignado
              </p>
              <p className="text-5xl font-black tracking-tight text-blue-600 sm:text-6xl">
                {payload.folio}
              </p>
              <p className="sr-only">Ticket {payload.repairId}.</p>
            </div>

            {/* Seccion de Gestion de Anticipo */}
            {!abonoExitoso ? (
              <div className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-amber-600" aria-hidden />
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                    💳 Gestion de Anticipo
                  </p>
                </div>
                <p className="mb-2.5 text-[9px] leading-relaxed text-slate-400">
                  Se recomienda solicitar un anticipo para asegurar las refacciones y formalizar el ingreso.
                </p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="abono-monto" className="text-[10px] text-slate-600">
                      Monto
                    </Label>
                    <Input
                      id="abono-monto"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={abonoMonto}
                      onChange={(e) => {
                        setAbonoMonto(e.target.value)
                        setAbonoError(null)
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="abono-metodo" className="text-[10px] text-slate-600">
                      Metodo de pago
                    </Label>
                    <Select
                      value={abonoMetodo}
                      onValueChange={(v) => setAbonoMetodo(v as typeof abonoMetodo)}
                    >
                      <SelectTrigger id="abono-metodo" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta Debito/Credito</SelectItem>
                        <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {abonoError && (
                  <p className="mt-1.5 text-[10px] text-red-600 font-medium">{abonoError}</p>
                )}

                <Button
                  type="button"
                  className="mt-3 w-full rounded-lg bg-amber-600 hover:bg-amber-700 text-[10px] font-semibold h-8"
                  onClick={handleRegistrarAbono}
                  disabled={registrandoAbono || !abonoMonto}
                >
                  {registrandoAbono ? (
                    <>
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    "Registrar Abono"
                  )}
                </Button>
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 text-center">
                <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Abono registrado correctamente
                </p>
              </div>
            )}

            {/* Botones de accion */}
            <div className="mb-5">
              <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Siguiente paso
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button" 
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-slate-200/80 bg-white p-3 text-center shadow-sm transition-all hover:border-blue-300 hover:shadow-md active:scale-[0.98]"
                  onClick={onPrintTicket}
                >
                  <Printer className="h-5 w-5 text-blue-600" aria-hidden />
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-700">
                    Ticket
                  </span>
                </button>
                <button 
                  type="button" 
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-slate-200/80 bg-white p-3 text-center shadow-sm transition-all hover:border-blue-300 hover:shadow-md active:scale-[0.98]"
                  onClick={onPrintLabel}
                >
                  <Tag className="h-5 w-5 text-blue-600" aria-hidden />
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-700">
                    Etiqueta
                  </span>
                </button>
                <button
                  type="button"
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-emerald-200/80 bg-white p-3 text-center shadow-sm transition-all hover:border-emerald-300 hover:shadow-md active:scale-[0.98]"
                  onClick={onSendWhatsApp}
                  disabled={payload.customerPhone.replace(/\D/g, "").length < 6}
                  title={
                    payload.customerPhone.replace(/\D/g, "").length < 6
                      ? "Se requiere un telefono valido"
                      : undefined
                  }
                >
                  <MessageCircle className="h-5 w-5 text-emerald-600" aria-hidden />
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-700">
                    WhatsApp
                  </span>
                </button>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={handleSoloTicket}
            >
              {abonoExitoso ? "Cerrar" : "Solo Ticket / Cerrar"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
