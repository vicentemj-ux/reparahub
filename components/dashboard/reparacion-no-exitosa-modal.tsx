"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, AlertTriangle } from "lucide-react"

const RAZONES_SIN_REPARAR = [
  "Pieza no disponible / Descontinuada",
  "Dano irreparable (placa, CPU, etc.)",
  "Costo de reparacion mayor al valor del equipo",
  "Cliente rechazo el presupuesto",
  "Equipo mojado / Corrosion severa",
  "Falla recurrente, no se logro solucionar",
  "Otro",
]

const RAZONES_CANCELAR = [
  "Cliente solicito cancelacion",
  "Cliente no contesta / No se presento",
  "Folio duplicado / Error de captura",
  "Equipo retirado sin reparar",
  "Garantia no cubre el dano",
  "Otro",
]

export interface ReparacionNoExitosaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: "sin_reparar" | "cancelar"
  onConfirm: (data: { razon: string; nota: string }) => void | Promise<void>
  pending?: boolean
}

export function ReparacionNoExitosaModal({
  open,
  onOpenChange,
  tipo,
  onConfirm,
  pending = false,
}: ReparacionNoExitosaModalProps) {
  const [razon, setRazon] = useState("")
  const [nota, setNota] = useState("")

  const razones = tipo === "sin_reparar" ? RAZONES_SIN_REPARAR : RAZONES_CANCELAR
  const titulo = tipo === "sin_reparar" ? "Marcar como sin reparar" : "Cancelar reparacion"
  const descripcion =
    tipo === "sin_reparar"
      ? "Registra por que no fue posible reparar el equipo. Esta informacion es clave para metricas internas."
      : "Registra la razon de la cancelacion. Ayuda a identificar patrones y mejorar el servicio."

  const handleConfirm = () => {
    if (!razon.trim()) return
    void onConfirm({ razon: razon.trim(), nota: nota.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!pending) onOpenChange(v) }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-lg">
        <DialogHeader className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-5 text-left">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-7000" aria-hidden />
            <DialogTitle className="text-base font-bold text-slate-900">{titulo}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-500">{descripcion}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Razon <span className="text-red-500">*</span>
            </Label>
            <Select value={razon} onValueChange={setRazon} disabled={pending}>
              <SelectTrigger className="rounded-lg border-slate-200 text-sm">
                <SelectValue placeholder="Selecciona una razon..." />
              </SelectTrigger>
              <SelectContent>
                {razones.map((r) => (
                  <SelectItem key={r} value={r} className="text-sm">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Nota adicional <span className="font-normal text-slate-500">(opcional)</span>
            </Label>
            <Textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={3}
              disabled={pending}
              className="min-h-[80px] resize-none rounded-lg border-slate-200 text-sm"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Volver
          </Button>
          <Button
            type="button"
            className="w-full rounded-lg bg-amber-600 text-sm font-bold text-white hover:bg-amber-700 sm:w-auto"
            onClick={handleConfirm}
            disabled={pending || !razon.trim()}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
