"use client"

import { Check, Minus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HealthProbeStatus } from "@/lib/reparaciones/checklist-pro"

const SEGMENTS: {
  status: HealthProbeStatus
  shortLabel: string
  Icon: typeof Check
  active: string
  inactive: string
}[] = [
  {
    status: "pass",
    shortLabel: "FUNCIONA",
    Icon: Check,
    active:
      "border-emerald-500 bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-400/60 hover:bg-emerald-600",
    inactive:
      "border-slate-200/80 bg-white/70 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-700",
  },
  {
    status: "fail",
    shortLabel: "FALLA",
    Icon: X,
    active: "border-red-500 bg-red-500 text-white shadow-sm ring-1 ring-red-400/60 hover:bg-red-600",
    inactive:
      "border-slate-200/80 bg-white/70 text-slate-500 hover:border-red-200 hover:bg-red-50/50 hover:text-red-700",
  },
  {
    status: "na",
    shortLabel: "SIN PROBAR",
    Icon: Minus,
    active:
      "border-slate-500 bg-slate-500 text-white shadow-sm ring-1 ring-slate-400/50 hover:bg-slate-600",
    inactive:
      "border-slate-200/80 bg-white/70 text-slate-500 hover:border-slate-300 hover:bg-slate-100/80 hover:text-slate-700",
  },
]

export interface HealthCheckFuncionalSegmentedProps {
  items: readonly { key: string; label: string }[]
  value: Record<string, HealthProbeStatus>
  onChange: (next: Record<string, HealthProbeStatus>) => void
}

/**
 * Una fila por prueba: nombre a la izquierda, tres botones compactos a la derecha.
 */
export function HealthCheckFuncionalSegmented({
  items,
  value,
  onChange,
}: HealthCheckFuncionalSegmentedProps) {
  function setStatus(key: string, status: HealthProbeStatus) {
    onChange({ ...value, [key]: status })
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
      {items.map(({ key, label }) => {
        const current = value[key] ?? "na"
        return (
          <li key={key}>
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2">
              <span className="min-w-0 flex-1 text-left text-[11px] font-semibold leading-snug text-slate-900 sm:text-xs">
                {label}
              </span>
              <div
                className="flex shrink-0 items-center gap-0.5 sm:gap-1"
                role="group"
                aria-label={`Resultado para ${label}`}
              >
                {SEGMENTS.map(({ status, shortLabel, Icon, active, inactive }) => {
                  const isOn = current === status
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatus(key, status)}
                      className={cn(
                        "inline-flex h-7 min-h-[28px] items-center justify-center gap-0.5 rounded-lg border px-1 transition-colors sm:h-8 sm:min-h-[32px] sm:px-1.5",
                        isOn ? active : inactive,
                      )}
                    >
                      <Icon className="h-2.5 w-2.5 shrink-0 opacity-95 sm:h-3 sm:w-3" aria-hidden />
                      <span className="max-w-[4.2rem] truncate text-[7px] font-bold uppercase leading-none tracking-tight sm:max-w-none sm:text-[8px]">
                        {shortLabel}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
