"use client"

import { cn } from "@/lib/utils"

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export interface StatusBadgeFinancialProps {
  diferencia: number | null
  className?: string
}

/**
 * Estado visual del cuadre de caja: cuadrado, sobrante o faltante (pastel, pildora).
 * - diferencia > 0: sobro efectivo en caja → "Sobrante" (azul/cyan)
 * - diferencia < 0: falto efectivo → "Faltante" (rojo) - solo si realmente falta
 */
export function StatusBadgeFinancial({ diferencia, className }: StatusBadgeFinancialProps) {
  if (diferencia === null) {
    return (
      <span
        className={cn(
          "inline-flex min-w-[120px] flex-col items-center justify-center rounded-xl border-2 border-slate-300 bg-slate-100 px-3 py-1.5 text-slate-600",
          className,
        )}
      >
        <span className="tabular-nums text-base font-bold">$0.00</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide">Sin conteo</span>
      </span>
    )
  }

  if (Math.abs(diferencia) < 0.01) {
    return (
      <span
        className={cn(
          "inline-flex min-w-[120px] flex-col items-center justify-center rounded-xl border-2 border-emerald-500 bg-emerald-500/10 px-3 py-1.5 text-emerald-600",
          className,
        )}
      >
        <span className="tabular-nums text-base font-bold">$0.00</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide">Cuadrado</span>
      </span>
    )
  }

  if (diferencia > 0) {
    return (
      <span
        className={cn(
          "inline-flex min-w-[120px] flex-col items-center justify-center rounded-xl border-2 border-cyan-500 bg-cyan-500/10 px-3 py-1.5 text-cyan-700",
          className,
        )}
      >
        <span className="tabular-nums text-base font-bold">+${fmt(diferencia)}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide">Sobrante</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-[120px] flex-col items-center justify-center rounded-xl border-2 border-rose-500 bg-rose-500/10 px-3 py-1.5 text-rose-600",
        className,
      )}
    >
      <span className="tabular-nums text-base font-bold">−${fmt(Math.abs(diferencia))}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide">Faltante</span>
    </span>
  )
}
