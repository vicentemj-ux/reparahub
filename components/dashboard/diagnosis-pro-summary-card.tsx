"use client"

import { ClipboardList, ClipboardCheck, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { EncendidoRecepcion } from "@/lib/reparaciones/checklist-ingreso"
import type { ChecklistProData } from "@/lib/reparaciones/checklist-pro"
import {
  countHealthProbesOk,
  getDiagnosisProBadgeText,
  MIN_HEALTH_PROBES,
} from "@/lib/reparaciones/checklist-pro"
import { itemsForDeviceType } from "@/lib/reparaciones/checklist-ingreso"

export interface DiagnosisProSummaryCardProps {
  /** Revision rapida (encendido) desde `checklist_ingreso` - mismo criterio que el modal de ingreso. */
  encendido?: EncendidoRecepcion | null
  checklistPro?: ChecklistProData | null
  tipoEquipo?: string
  onOpenDetails: () => void
  className?: string
}

function RevisionRapidaResumen({ encendido }: { encendido: EncendidoRecepcion | null | undefined }) {
  if (encendido == null) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white/80 px-2.5 py-2 text-center">
        <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">Encendido</p>
        <p className="mt-0.5 text-[10px] text-slate-500">Sin registrar</p>
      </div>
    )
  }

  if (encendido === "ok") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 shadow-sm ring-1 ring-emerald-200/80">
        <span className="text-sm leading-none" aria-hidden>✅</span>
        <div className="min-w-0 text-left">
          <p className="text-[8px] font-bold uppercase tracking-wide text-emerald-800">Encendido</p>
          <p className="text-[10px] font-semibold leading-tight text-emerald-900">Enciende bien</p>
        </div>
      </div>
    )
  }

  if (encendido === "intermitente") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50 px-2.5 py-1.5 shadow-sm ring-1 ring-amber-200/80">
        <span className="text-sm leading-none" aria-hidden>⚡</span>
        <div className="min-w-0 text-left">
          <p className="text-[8px] font-bold uppercase tracking-wide text-amber-900">Encendido</p>
          <p className="text-[10px] font-semibold leading-tight text-amber-950">Intermitente</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-rose-400 bg-rose-50 px-2.5 py-1.5 shadow-sm ring-1 ring-rose-200/80">
      <span className="text-sm leading-none" aria-hidden>❌</span>
      <div className="min-w-0 text-left">
        <p className="text-[8px] font-bold uppercase tracking-wide text-rose-900">Encendido</p>
        <p className="text-[10px] font-semibold leading-tight text-rose-950">No enciende</p>
      </div>
    </div>
  )
}

function HealthCheckProStatus({
  checklistPro,
  tipoEquipo,
}: {
  checklistPro?: ChecklistProData | null
  tipoEquipo?: string
}) {
  const dt = tipoEquipo?.trim() || "Otro"
  const cp = checklistPro ?? null

  const hasExpress = Boolean(cp?.expressOmitReason?.trim())
  const funcional = cp?.funcional ?? {}
  const passCount = countHealthProbesOk(funcional)
  const totalItems = itemsForDeviceType(dt).length
  const anyNonNa = Object.values(funcional).some((v) => v !== "na")

  if (!anyNonNa && !hasExpress) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 bg-white/80 px-2 py-2 text-center">
        <ClipboardList className="h-4 w-4 text-slate-400" aria-hidden />
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Health check PRO</p>
        <p className="text-[10px] text-slate-500">Pendiente</p>
      </div>
    )
  }

  if (hasExpress && !anyNonNa) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-2 shadow-sm ring-1 ring-amber-200/80">
        <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
        <p className="text-[9px] font-bold uppercase tracking-wide text-amber-900">Health check PRO</p>
        <p className="text-[10px] font-semibold text-amber-950">Express (omitido)</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-2 shadow-sm ring-1 ring-emerald-200/80">
      <ClipboardCheck className="h-4 w-4 text-emerald-600" aria-hidden />
      <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-800">Health check PRO</p>
      <p className="text-[10px] font-semibold text-emerald-900">
        {passCount}/{totalItems} verificados
      </p>
      {passCount < MIN_HEALTH_PROBES && !hasExpress && (
        <p className="text-[8px] text-amber-700">Minimo {MIN_HEALTH_PROBES} requeridos</p>
      )}
    </div>
  )
}

/**
 * Resumen compacto en el visor: grid 2x2 con revision rapida + health check PRO + boton de acceso.
 */
export function DiagnosisProSummaryCard({
  encendido,
  checklistPro,
  tipoEquipo,
  onOpenDetails,
  className,
}: DiagnosisProSummaryCardProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 p-3 shadow-sm",
        className,
      )}
    >
      <div className="grid grid-cols-2 gap-2">
        <RevisionRapidaResumen encendido={encendido ?? null} />
        <HealthCheckProStatus checklistPro={checklistPro ?? null} tipoEquipo={tipoEquipo} />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-9 w-full shrink-0 gap-2 border-amber-300/90 bg-gradient-to-b from-amber-50 to-white text-xs font-bold uppercase tracking-wider text-amber-950 shadow-sm hover:bg-amber-50"
        onClick={onOpenDetails}
      >
        <ClipboardList className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
        Revisar Health Check Pro
      </Button>
    </div>
  )
}
