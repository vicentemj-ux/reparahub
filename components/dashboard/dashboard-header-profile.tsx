"use client"

import { useTallerNegocioNombre } from "@/lib/hooks/use-taller-negocio-nombre"

/** Bloque compacto "perfil": inicial + nombre del taller (barra superior). */
export function DashboardHeaderProfile() {
  const tallerName = useTallerNegocioNombre()
  const initial = tallerName.charAt(0).toUpperCase() || "T"

  return (
    <div className="flex min-w-0 max-w-[min(100%,14rem)] items-center gap-2 sm:max-w-xs">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-900 ring-1 ring-amber-200/80"
        aria-hidden
      >
        {initial}
      </div>
      <p className="truncate text-sm font-medium text-slate-800" title={tallerName}>
        {tallerName}
      </p>
    </div>
  )
}
