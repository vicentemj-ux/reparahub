"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

const PRIMARY = "w-full sm:w-auto bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-sm"

export interface StatusChangeConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  estadoAnteriorLabel: string
  estadoNuevoLabel: string
  notaTecnica: string
  onNotaTecnicaChange: (v: string) => void
  waitingPartsMode?: boolean
  esperaRefaccionConcepto?: string
  esperaRefaccionEta?: string
  esperaRefaccionNota?: string
  onEsperaRefaccionConceptoChange?: (v: string) => void
  onEsperaRefaccionEtaChange?: (v: string) => void
  onEsperaRefaccionNotaChange?: (v: string) => void
  onSoloHistorial: () => void
  onActualizarYWhatsApp: () => void
  /** null = no hay operacion en curso */
  pendingKind: "historial" | "whatsapp" | null
}

export function StatusChangeConfirmDialog({
  open,
  onOpenChange,
  estadoAnteriorLabel,
  estadoNuevoLabel,
  notaTecnica,
  onNotaTecnicaChange,
  waitingPartsMode = false,
  esperaRefaccionConcepto = "",
  esperaRefaccionEta = "",
  esperaRefaccionNota = "",
  onEsperaRefaccionConceptoChange,
  onEsperaRefaccionEtaChange,
  onEsperaRefaccionNotaChange,
  onSoloHistorial,
  onActualizarYWhatsApp,
  pendingKind,
}: StatusChangeConfirmDialogProps) {
  const isPending = pendingKind !== null
  const waitingPartsReady =
    !waitingPartsMode || (esperaRefaccionConcepto.trim().length > 0 && esperaRefaccionEta.trim().length > 0)
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent
        overlayClassName="z-[100] bg-slate-200/75"
        className="z-[110] flex max-h-[min(90vh,560px)] w-[calc(100%-1.5rem)] max-w-md flex-col gap-0 overflow-hidden border border-slate-200 bg-white p-0 text-slate-900 shadow-xl sm:w-full"
        showCloseButton
      >
        <DialogHeader className="shrink-0 space-y-2 border-b border-slate-100 px-5 pb-4 pt-5 text-left">
          <DialogTitle className="text-lg font-semibold leading-snug text-slate-900">
            Confirmar cambio de estado
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600">
            Cambiando de{" "}
            <span className="font-semibold text-slate-800">{estadoAnteriorLabel}</span> a{" "}
            <span className="font-semibold text-slate-800">{estadoNuevoLabel}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {waitingPartsMode ? (
            <div className="mb-4 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">Bloqueo por proveedor externo</p>
              <p className="mt-1 text-sm text-cyan-950">
                Estos datos se usan para KPI, urgencia por ETA vencida y mensaje al cliente.
              </p>
            </div>
          ) : null}
          {waitingPartsMode ? (
            <div className="mb-4 grid gap-3">
              <div>
                <Label htmlFor="espera-refaccion-concepto" className="text-sm font-medium text-slate-700">
                  Refaccion o proveedor pendiente <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="espera-refaccion-concepto"
                  value={esperaRefaccionConcepto}
                  onChange={(e) => onEsperaRefaccionConceptoChange?.(e.target.value)}
                  placeholder="Ej. Pantalla OLED Samsung A54 / proveedor CDMX"
                  disabled={isPending}
                  className="mt-2 h-11 rounded-xl border-slate-200"
                />
              </div>
              <div>
                <Label htmlFor="espera-refaccion-eta" className="text-sm font-medium text-slate-700">
                  Fecha estimada de llegada <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="espera-refaccion-eta"
                  type="date"
                  value={esperaRefaccionEta}
                  onChange={(e) => onEsperaRefaccionEtaChange?.(e.target.value)}
                  disabled={isPending}
                  className="mt-2 h-11 rounded-xl border-slate-200"
                />
              </div>
              <div>
                <Label htmlFor="espera-refaccion-nota" className="text-sm font-medium text-slate-700">
                  Nota para el cliente <span className="font-normal text-slate-500">(opcional)</span>
                </Label>
                <Textarea
                  id="espera-refaccion-nota"
                  value={esperaRefaccionNota}
                  onChange={(e) => onEsperaRefaccionNotaChange?.(e.target.value)}
                  placeholder="Ej. La pieza viene de importacion; te avisaremos en cuanto llegue."
                  rows={3}
                  disabled={isPending}
                  className="mt-2 min-h-[80px] resize-none rounded-xl border-slate-200"
                />
              </div>
            </div>
          ) : null}
          <Label htmlFor="nota-tecnica-status" className="text-sm font-medium text-slate-700">
            Nota tecnica <span className="font-normal text-slate-500">(opcional)</span>
          </Label>
          <Textarea
            id="nota-tecnica-status"
            value={notaTecnica}
            onChange={(e) => onNotaTecnicaChange(e.target.value)}
            placeholder="Detalle interno o motivo visible en plantillas segun el estado..."
            rows={4}
            disabled={isPending}
            className="mt-2 min-h-[96px] max-h-40 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#2563eb]"
          />
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-300 bg-white text-slate-800 hover:bg-slate-50 sm:w-auto"
              onClick={onSoloHistorial}
              disabled={isPending || !waitingPartsReady}
            >
              {pendingKind === "historial" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Solo actualizar historial"
              )}
            </Button>
            <Button type="button" className={PRIMARY} onClick={onActualizarYWhatsApp} disabled={isPending || !waitingPartsReady}>
              {pendingKind === "whatsapp" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Actualizar y notificar WhatsApp"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
