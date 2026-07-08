"use client"

import { useState } from "react"
import {
  X,
  CheckCircle2,
  Loader2,
  Phone,
  UserIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { responderEncuestaVisita } from "@/lib/actions/bitacora-visitas-prisma"
import type { MotivoVisita } from "@/lib/utils/visitas"
import { toast } from "@/hooks/use-toast"

const QUICK_PURPOSES: { value: MotivoVisita; label: string }[] = [
  { value: "cotizacion", label: "Cotizacion" },
  { value: "reparacion", label: "Seguimiento reparacion" },
  { value: "personal", label: "Personal" },
  { value: "venta", label: "Buscar equipo / accesorio" },
  { value: "compra", label: "Comprar producto" },
  { value: "recoger", label: "Recoger equipo" },
  { value: "otro", label: "Otro" },
]

interface EncuestaVisitaModalProps {
  visitaId: string
  fotoUrl: string | null
  open: boolean
  onClose: () => void
  onComplete: () => void
}

export function EncuestaVisitaModal({
  visitaId,
  fotoUrl,
  open,
  onClose,
  onComplete,
}: EncuestaVisitaModalProps) {
  const [motivo, setMotivo] = useState<MotivoVisita | null>(null)
  const [motivoOtro, setMotivoOtro] = useState("")
  const [notas, setNotas] = useState("")
  const [clienteNombre, setClienteNombre] = useState("")
  const [clienteTelefono, setClienteTelefono] = useState("")
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function handleSubmit() {
    if (!motivo) {
      toast({ title: "Selecciona un motivo", variant: "destructive" })
      return
    }
    if (motivo === "otro" && !motivoOtro.trim()) {
      toast({ title: "Especifica el motivo", variant: "destructive" })
      return
    }

    setLoading(true)
    const { success, error } = await responderEncuestaVisita({
      visitaId,
      motivoVisita: motivo,
      motivoOtro: motivo === "otro" ? motivoOtro : undefined,
      notas: notas || undefined,
      atendidoPor: "sistema",
      clienteNombre: clienteNombre.trim() || undefined,
      clienteTelefono: clienteTelefono.trim() || undefined,
    })
    setLoading(false)

    if (!success) {
      toast({ title: error || "Error al guardar", variant: "destructive" })
      return
    }

    toast({ title: "Visita registrada correctamente" })
    setMotivo(null)
    setMotivoOtro("")
    setNotas("")
    setClienteNombre("")
    setClienteTelefono("")
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-200/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="relative h-48 bg-slate-100">
          {fotoUrl ? (
            <img src={fotoUrl} alt="Visita" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-600">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-slate-200/75 text-white flex items-center justify-center hover:bg-slate-200/75 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-3 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
            CLIENTE EN RECEPCION
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
            ¿Cual es el motivo de la visita?
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {QUICK_PURPOSES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMotivo(m.value)}
                className={`rounded-xl border px-3.5 py-3 text-xs font-bold transition-all ${
                  motivo === m.value
                    ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {motivo === "otro" && (
            <input
              type="text"
              value={motivoOtro}
              onChange={(e) => setMotivoOtro(e.target.value)}
              placeholder="Especifica el motivo..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          )}

          {/* Cliente */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Nombre del cliente
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej: Juan Perez"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Telefono
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="tel"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="Ej: 5512345678"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Notas adicionales (opcional)..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />

          <Button
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-xs btn-glow"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar y continuar"}
          </Button>
        </div>
      </div>
    </div>
  )
}
