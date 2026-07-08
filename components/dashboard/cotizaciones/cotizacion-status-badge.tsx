import { cn } from "@/lib/utils"
import type { CotizacionEstado } from "@/lib/actions/cotizaciones"

const MAP: Record<CotizacionEstado, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "border-amber-200 bg-amber-50 text-amber-700" },
  aceptada: { label: "Aceptada", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  rechazada: { label: "Rechazada", className: "border-red-200 bg-red-50 text-red-700" },
  convertida: { label: "Convertida", className: "border-blue-200 bg-blue-50 text-blue-700" },
}

export function CotizacionStatusBadge({ estado }: { estado: CotizacionEstado }) {
  const meta = MAP[estado]
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide", meta.className)}>
      {meta.label}
    </span>
  )
}
