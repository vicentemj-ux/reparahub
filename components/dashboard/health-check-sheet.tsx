"use client"

import { useState } from "react"
import { AlertTriangle, ClipboardList, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { HealthCheckFuncionalSegmented } from "@/components/dashboard/health-check-funcional-segmented"
import { itemsForDeviceType } from "@/lib/reparaciones/checklist-ingreso"
import type { ChecklistProData } from "@/lib/reparaciones/checklist-pro"
import {
  countHealthProbesOk,
  mergeFuncionalWithDeviceKeys,
  MIN_HEALTH_PROBES,
} from "@/lib/reparaciones/checklist-pro"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

export interface HealthCheckSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo_equipo: string
  value: ChecklistProData
  onChange: (next: ChecklistProData) => void
  /** Si existe, al cerrar con «Listo» o Express se persiste en el ticket y se notifica. */
  persistRepair?: {
    repairId: string
    save: (data: ChecklistProData) => Promise<{ success: boolean; error?: string }>
    onSaved?: () => void | Promise<void>
  }
}

/**
 * Health check PRO: items segun tipo de equipo; estados pass / fail / na (sin probar por defecto).
 * Minimo 5 pruebas OK o «Omitir (Express)» con motivo.
 */
export function HealthCheckSheet({
  open,
  onOpenChange,
  tipo_equipo,
  value,
  onChange,
  persistRepair,
}: HealthCheckSheetProps) {
  const [omitOpen, setOmitOpen] = useState(false)
  const [omitReason, setOmitReason] = useState("")
  const [persisting, setPersisting] = useState(false)

  const dt = tipo_equipo?.trim() || "Otro"
  const items = itemsForDeviceType(dt)

  const mergedFuncional = mergeFuncionalWithDeviceKeys(dt, value.funcional)
  const okCount = countHealthProbesOk(mergedFuncional)
  const meetsMin = okCount >= MIN_HEALTH_PROBES || Boolean(value.expressOmitReason?.trim())

  async function persistIfNeeded(data: ChecklistProData): Promise<boolean> {
    if (!persistRepair) return true
    setPersisting(true)
    try {
      const normalized: ChecklistProData = {
        ...data,
        funcional: mergeFuncionalWithDeviceKeys(dt, data.funcional),
      }
      const r = await persistRepair.save(normalized)
      if (!r.success) {
        toast({ variant: "destructive", title: "No se guardo", description: r.error })
        return false
      }
      await persistRepair.onSaved?.()
      toast({ title: "Diagnostico guardado", description: "El health check quedo registrado en el ticket." })
      return true
    } finally {
      setPersisting(false)
    }
  }

  async function handleListo() {
    if (!meetsMin) return
    const next: ChecklistProData = {
      ...value,
      funcional: mergeFuncionalWithDeviceKeys(dt, value.funcional),
    }
    onChange(next)
    const ok = await persistIfNeeded(next)
    if (!ok) return
    onOpenChange(false)
  }

  async function applyExpressOmit() {
    const r = omitReason.trim()
    if (!r) return
    const next: ChecklistProData = {
      funcional: mergeFuncionalWithDeviceKeys(dt, value.funcional),
      expressOmitReason: r,
    }
    onChange(next)
    setOmitOpen(false)
    setOmitReason("")
    const ok = await persistIfNeeded(next)
    if (!ok) return
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          overlayClassName="z-[119]"
          className="z-[120] flex w-full max-w-lg flex-col gap-0 overflow-y-auto border-slate-200 bg-white p-0 sm:max-w-xl"
        >
          <SheetHeader className="border-b border-slate-100 px-6 py-5 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-100/80">
                <ClipboardList className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle className="text-base font-semibold tracking-tight text-slate-900">
                    Health check PRO
                  </SheetTitle>
                  <span className="rounded-full bg-gradient-to-r from-amber-200 to-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm">
                    PRO
                  </span>
                </div>
                <SheetDescription className="text-xs text-slate-500">
                  Lista segun tipo de equipo: <span className="font-medium text-slate-700">{dt}</span>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="border-b border-amber-100 bg-amber-50/80 px-4 py-3">
            <div className="flex items-start gap-2 text-xs text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>
                <span className="font-semibold">Diagnostico PRO:</span> marca cada punto como funciona, con falla o sin
                probar. Si el taller exige health check para pasar a En reparacion, necesitas al menos{" "}
                <span className="font-bold tabular-nums">{MIN_HEALTH_PROBES}</span> en «Funciona». Llevas{" "}
                <span className="font-bold tabular-nums">{okCount}</span> / {MIN_HEALTH_PROBES}.
              </p>
            </div>
          </div>

          <p className="px-4 pt-3 text-[10px] leading-relaxed text-slate-500">
            <span className="text-emerald-700">✅ Funciona</span> · <span className="text-red-700">❌ Tiene falla</span> ·{" "}
            <span className="text-slate-600">➖ Sin probar</span>
          </p>

          <div className="flex-1 px-4 py-4">
            <HealthCheckFuncionalSegmented
              items={items}
              value={mergedFuncional}
              onChange={(funcional) =>
                onChange({
                  ...value,
                  funcional,
                  expressOmitReason: null,
                })
              }
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full rounded-xl border-amber-300 bg-white text-sm font-semibold text-amber-900 hover:bg-amber-50",
                value.expressOmitReason && "border-emerald-300 bg-emerald-50 text-emerald-900",
              )}
              onClick={() => setOmitOpen(true)}
            >
              Omitir (Express)
            </Button>
            <p className="text-center text-[10px] text-slate-500">
              Registra un motivo; queda auditado en el ticket.
            </p>
            <Button
              type="button"
              disabled={!meetsMin || persisting}
              className="w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={() => void handleListo()}
            >
              {persisting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : meetsMin ? (
                persistRepair ? "Guardar y listo" : "Listo"
              ) : (
                `✨ ¡Casi listo! Realiza al menos ${MIN_HEALTH_PROBES} pruebas para un diagnostico PRO`
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={omitOpen} onOpenChange={setOmitOpen}>
        <DialogContent className="z-[130] border-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Omitir health check (Express)</DialogTitle>
            <DialogDescription>
              Indica el motivo (cliente apurado, equipo no enciende para probar componentes, etc.).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="omit-reason">Motivo</Label>
            <Textarea
              id="omit-reason"
              value={omitReason}
              onChange={(e) => setOmitReason(e.target.value)}
              placeholder="Ej. Cliente urgente - diagnostico express acordado verbalmente"
              className="min-h-[100px] resize-y"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOmitOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700"
              disabled={!omitReason.trim() || persisting}
              onClick={() => void applyExpressOmit()}
            >
              {persisting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar y cerrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
