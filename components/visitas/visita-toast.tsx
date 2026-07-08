"use client"

import { X, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { BitacoraVisita } from "@/lib/actions/bitacora-visitas-prisma"

interface VisitaToastProps {
  visita: BitacoraVisita
  onAttend: () => void
  onDismiss: () => void
}

export function VisitaToast({ visita, onAttend, onDismiss }: VisitaToastProps) {
  const time = new Date(visita.fecha_hora_entrada).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="pointer-events-auto w-80 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Foto o placeholder */}
      <div className="relative h-40 bg-slate-100">
        {visita.foto_entrada_url ? (
          <img
            src={visita.foto_entrada_url}
            alt="Cliente detectado"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-600">
            <Camera className="h-10 w-10" />
          </div>
        )}
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-slate-200/80 text-white flex items-center justify-center hover:bg-slate-200/80 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="absolute bottom-2 left-2 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
          NUEVA VISITA
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Entrada
          </span>
          <span className="text-xs font-black text-slate-700">{time}</span>
        </div>

        <Button
          onClick={onAttend}
          className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-wider btn-glow"
        >
          Registrar motivo
        </Button>
      </div>
    </div>
  )
}
