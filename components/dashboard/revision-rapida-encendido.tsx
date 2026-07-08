"use client"

import { cn } from "@/lib/utils"
import type { ChecklistIngreso, EncendidoRecepcion } from "@/lib/reparaciones/checklist-ingreso"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle2, CircleDashed, XCircle, Zap } from "lucide-react"

const OPCIONES: { id: EncendidoRecepcion; label: string }[] = [
  { id: "ok", label: "Enciende y entra a sistema" },
  { id: "intermitente", label: "Enciende con dificultad" },
  { id: "no", label: "No enciende" },
]

const ICON_ROW: {
  id: EncendidoRecepcion | "clear"
  tooltip: string
  Icon: typeof CheckCircle2
  activeClass: string
}[] = [
  {
    id: "ok",
    tooltip: "Enciende y entra a sistema",
    Icon: CheckCircle2,
    activeClass: "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
  {
    id: "intermitente",
    tooltip: "Enciende con dificultad",
    Icon: Zap,
    activeClass: "border-amber-500 bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  },
  {
    id: "no",
    tooltip: "No enciende",
    Icon: XCircle,
    activeClass: "border-rose-500 bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  },
  {
    id: "clear",
    tooltip: "Sin evaluar (quitar seleccion)",
    Icon: CircleDashed,
    activeClass: "border-slate-400 bg-slate-50 text-slate-700 ring-1 ring-slate-200",
  },
]

export interface RevisionRapidaEncendidoProps {
  value: ChecklistIngreso
  onChange: (next: ChecklistIngreso) => void
  /** Fila compacta de iconos + tooltips (modal nueva reparacion). */
  variant?: "default" | "icons"
}

export function RevisionRapidaEncendido({ value, onChange, variant = "default" }: RevisionRapidaEncendidoProps) {
  function setEncendido(enc: EncendidoRecepcion | null) {
    onChange({ ...value, encendido: enc })
  }

  if (variant === "icons") {
    const selectedDesc = value.encendido
      ? ICON_ROW.find((i) => i.id === value.encendido)?.tooltip ?? null
      : null
    return (
      <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revision rapida</Label>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          {ICON_ROW.map(({ id, tooltip, Icon, activeClass }) => {
            const isClear = id === "clear"
            const idEnc = id as EncendidoRecepcion | "clear"
            const active = isClear
              ? value.encendido === null
              : value.encendido === idEnc
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (isClear) {
                        setEncendido(null)
                        return
                      }
                      const next = id as EncendidoRecepcion
                      setEncendido(value.encendido === next ? null : next)
                    }}
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50/50",
                      active && activeClass,
                    )}
                    aria-label={tooltip}
                    aria-pressed={active}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="z-[130] max-w-[220px] border border-slate-200 bg-white text-slate-900">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        {selectedDesc && (
          <p className="text-center text-[11px] font-semibold text-slate-700 sm:text-left">
            {selectedDesc}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Revision rapida
      </Label>
      <div className="flex flex-col gap-2">
        {OPCIONES.map(({ id, label }) => {
          const active = value.encendido === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setEncendido(active ? null : id)}
              className={cn(
                "w-full rounded-xl border px-3 py-2.5 text-left text-[11px] font-semibold leading-snug transition-colors",
                active
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
