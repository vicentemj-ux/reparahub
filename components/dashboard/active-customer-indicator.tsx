"use client"

import { Phone, UserRound, Users } from "lucide-react"
import { useActiveCustomer } from "@/lib/context/active-customer-context"
import { cn } from "@/lib/utils"

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "")
}

function formatPhone(phone: string) {
  const digits = normalizeDigits(phone)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  if (digits.length <= 10) return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`
}

export function ActiveCustomerIndicator({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const { activeCustomer } = useActiveCustomer()

  if (activeCustomer.mode === "selected") {
    return (
      <div className={cn("rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5", className)}>
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600">
            <UserRound className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
              Cliente en sesion
            </p>
            <p className="truncate text-sm font-black text-slate-900">{activeCustomer.nombre}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <Phone className="h-3.5 w-3.5" />
              {formatPhone(activeCustomer.telefono)}
            </p>
            {!compact ? (
              <p className="mt-1 text-xs font-semibold text-slate-600">
                Si no cambias el cliente, este folio o captura quedara ligado a su historial.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2.5", className)}>
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500">
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Modo actual</p>
          <p className="text-sm font-black text-slate-900">Publico general</p>
          {!compact ? (
            <p className="mt-1 text-xs font-semibold text-slate-600">
              Puedes continuar sin cliente fijo o seleccionar uno desde la barra superior para ahorrar captura.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
