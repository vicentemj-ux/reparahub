"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DollarSign, Loader2, CheckCircle2, Pencil } from "lucide-react"
import { actualizarPresupuestoReparacion } from "@/lib/actions/repairs-prisma"
import { toast } from "@/hooks/use-toast"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresupuestoEditModalProps {
  isOpen: boolean
  repairId: string | null
  presupuestoActual: number
  onClose: () => void
  onSuccess: (nuevoPresupuesto: number) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPeso(n: number) {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

const RAZONES_CAMBIO = [
  { value: "revision_adicional", label: "Revision adicional - se detectaron mas fallas" },
  { value: "cambio_refaccion", label: "Cambio de refaccion - precio de piezas vario" },
  { value: "ajuste_diagnostico", label: "Ajuste por diagnostico - correccion de estimacion inicial" },
  { value: "descuento_aplicado", label: "Descuento aplicado" },
  { value: "servicio_adicional", label: "Servicio adicional solicitado por el cliente" },
  { value: "presupuesto_aproximado", label: "Presupuesto inicial era aproximado" },
  { value: "garantia_sin_costo", label: "Garantia del servicio - sin costo" },
  { value: "diagnostico_gratuito", label: "Diagnostico gratuito" },
  { value: "otro", label: "Otro" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function PresupuestoEditModal({
  isOpen,
  repairId,
  presupuestoActual,
  onClose,
  onSuccess,
}: PresupuestoEditModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [nuevoPresupuesto, setNuevoPresupuesto] = useState("")
  const [razon, setRazon] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setNuevoPresupuesto(presupuestoActual > 0 ? presupuestoActual.toString() : "")
      setRazon("")
      setDescripcion("")
      setShowSuccess(false)
    }
  }, [isOpen, presupuestoActual])

  const presupuestoNum = parseFloat(nuevoPresupuesto) || 0
  const isValid = nuevoPresupuesto.trim() !== "" && presupuestoNum > 0 && razon.trim() !== ""
  const hasChanged = presupuestoNum !== presupuestoActual

  async function handleSave() {
    if (!repairId || !isValid || !hasChanged) return
    setIsSaving(true)

    const razonLabel = RAZONES_CAMBIO.find((r) => r.value === razon)?.label ?? razon
    const nota = descripcion.trim()
      ? `${razonLabel}: ${descripcion.trim()}`
      : razonLabel

    const res = await actualizarPresupuestoReparacion(
      repairId,
      presupuestoNum,
      nota
    )

    setIsSaving(false)

    if (!res.success) {
      toast({
        title: "Error",
        description: res.error || "No se pudo actualizar el presupuesto.",
        variant: "destructive",
      })
      return
    }

    setShowSuccess(true)
    onSuccess(presupuestoNum)
  }

  function handleClose() {
    setShowSuccess(false)
    onClose()
  }

  // ── Success view ───────────────────────────────────────────────────────────

  if (showSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Presupuesto actualizado</h3>
            <p className="mt-2 text-sm text-slate-600">
              Nuevo presupuesto: <strong>{fmtPeso(presupuestoNum)}</strong>
            </p>
            <Button className="mt-6 w-full bg-white text-slate-900 hover:bg-slate-100" onClick={handleClose}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Form view ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-[#2563eb]" />
            Editar presupuesto
          </DialogTitle>
          <DialogDescription>
            Modifica el presupuesto estimado. Cada cambio queda registrado en el historial.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Presupuesto actual */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Presupuesto actual</p>
            <p className="text-lg font-bold text-gray-900">{fmtPeso(presupuestoActual)}</p>
          </div>

          {/* Nuevo presupuesto */}
          <div className="space-y-1.5">
            <Label htmlFor="nuevo-presupuesto" className="text-sm font-semibold text-slate-700">
              Nuevo presupuesto
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="nuevo-presupuesto"
                type="number"
                min={0.01}
                step="0.01"
                placeholder="0.00"
                value={nuevoPresupuesto}
                onChange={(e) => setNuevoPresupuesto(e.target.value)}
                className="pl-9 text-right font-bold tabular-nums"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-500">
              El presupuesto debe ser mayor a 0. Si aun no hay monto, mantenlo como pendiente.
            </p>
          </div>

          {/* Razon del cambio */}
          <div className="space-y-1.5">
            <Label htmlFor="razon-cambio" className="text-sm font-semibold text-slate-700">
              Razon del cambio <span className="text-red-500">*</span>
            </Label>
            <Select value={razon} onValueChange={setRazon}>
              <SelectTrigger id="razon-cambio" className="w-full">
                <SelectValue placeholder="Selecciona una razon" />
              </SelectTrigger>
              <SelectContent>
                {RAZONES_CAMBIO.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descripcion / motivo adicional */}
          <div className="space-y-1.5">
            <Label htmlFor="descripcion-cambio" className="text-sm font-semibold text-slate-700">
              Descripcion adicional <span className="font-normal text-slate-500">(opcional)</span>
            </Label>
            <Textarea
              id="descripcion-cambio"
              placeholder="Ej. Se requiere cambio de pantalla + bateria, se ajusta precio..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="gap-1.5 bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
              onClick={handleSave}
              disabled={!isValid || !hasChanged || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar presupuesto"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
