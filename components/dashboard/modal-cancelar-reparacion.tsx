"use client"

import { useState, useEffect } from "react"
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
import { Loader2, XCircle, AlertTriangle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  cancelarReparacionConRazon,
  getCancelacionSummary,
} from "@/lib/actions/repairs-prisma"

const RAZONES_CANCELAR = [
  "Cliente solicito cancelacion",
  "Cliente no contesta / No se presento",
  "Folio duplicado / Error de captura",
  "Equipo retirado sin reparar",
  "Costo de reparacion mayor al valor del equipo",
  "Pieza no disponible / Descontinuada",
  "Dano irreparable (placa, CPU, etc.)",
  "Cliente rechazo el presupuesto",
  "Garantia no cubre el dano",
  "Equipo mojado / Corrosion severa",
  "Otro",
]

function fmt(n: number) {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export interface ModalCancelarReparacionProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repairId: string
  folio: string
  onCompleted: () => void | Promise<void>
}

export function ModalCancelarReparacion({
  open,
  onOpenChange,
  repairId,
  folio,
  onCompleted,
}: ModalCancelarReparacionProps) {
  const [razon, setRazon] = useState("")
  const [nota, setNota] = useState("")
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<{
    total: number
    movements: Array<{ id: string; tipo: string; monto: number; metodo_pago: string; caja_id: string | null }>
  } | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  useEffect(() => {
    if (!open) {
      setRazon("")
      setNota("")
      setSummary(null)
      return
    }

    const loadSummary = async () => {
      setLoadingSummary(true)
      try {
        const res = await getCancelacionSummary(repairId)
        if (!res.error) {
          setSummary(res)
        }
      } finally {
        setLoadingSummary(false)
      }
    }
    loadSummary()
  }, [open, repairId])

  const handleConfirm = async () => {
    if (!razon.trim()) return
    setSaving(true)
    try {
      const res = await cancelarReparacionConRazon({
        repairId,
        razon: razon.trim(),
        nota: nota.trim() || undefined,
      })
      if (!res.success) {
        toast({ title: "No se pudo cancelar", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Reparacion cancelada", description: "El folio fue cancelado correctamente." })
      onOpenChange(false)
      await onCompleted()
    } finally {
      setSaving(false)
    }
  }

  const tieneAbonos = (summary?.total ?? 0) > 0.005

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v) }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl border-red-200 bg-white p-0 shadow-lg">
        <DialogHeader className="shrink-0 border-b border-red-100 px-5 pb-4 pt-5 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
              <XCircle className="h-5 w-5 text-red-600" aria-hidden />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">Cancelar reparacion</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Folio <span className="font-mono font-semibold">{folio}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          {loadingSummary ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : tieneAbonos ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Abonos registrados
                </p>
              </div>
              <p className="mt-1 text-sm text-amber-900">
                Este folio tiene abonos por <span className="font-bold">{fmt(summary?.total ?? 0)}</span>. Al entregar el equipo se generara una devolucion en caja.
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Motivo de cancelacion <span className="text-red-500">*</span>
            </Label>
            <Select value={razon} onValueChange={setRazon} disabled={saving}>
              <SelectTrigger className="rounded-lg border-slate-200 text-sm">
                <SelectValue placeholder="Selecciona un motivo..." />
              </SelectTrigger>
              <SelectContent>
                {RAZONES_CANCELAR.map((r) => (
                  <SelectItem key={r} value={r} className="text-sm">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Observaciones <span className="font-normal text-slate-400">(opcional)</span>
            </Label>
            <Textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Detalles adicionales sobre la cancelacion..."
              rows={3}
              disabled={saving}
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
            disabled={saving}
          >
            Volver
          </Button>
          <Button
            type="button"
            className="btn-glow w-full rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700 sm:w-auto"
            onClick={() => void handleConfirm()}
            disabled={saving || !razon.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelando...
              </>
            ) : (
              "Confirmar cancelacion"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
