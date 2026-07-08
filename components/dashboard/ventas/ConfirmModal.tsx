"use client"

import { memo } from "react"
import { HelpCircle, X, Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"

type MetodoPago = "efectivo" | "tarjeta" | "transferencia" | "mixto"

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  metodo: MetodoPago
  cambio: number
  clienteNombre: string
  itemCount: number
  loading: boolean
  onConfirm: () => void
}

export const ConfirmModal = memo(function ConfirmModal({
  open,
  onOpenChange,
  total,
  metodo,
  cambio,
  clienteNombre,
  itemCount,
  loading,
  onConfirm,
}: ConfirmModalProps) {
  const metodosLabel: Record<MetodoPago, string> = {
    efectivo: "EFECTIVO",
    tarjeta: "TARJETA",
    transferencia: "TRANSFERENCIA",
    mixto: "PAGO MIXTO",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="backdrop-blur-sm bg-slate-200/75"
        className="w-[calc(100%-1rem)] max-w-[400px] rounded-[32px] border-0 bg-white p-0 shadow-2xl ring-0 overflow-hidden sm:w-full"
        showCloseButton={false}
      >
        <div className="p-5 pb-4 sm:p-8 sm:pb-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black italic uppercase leading-tight tracking-tight text-slate-900">
                Confirmar
              </h2>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500 leading-relaxed">
                Verifica los detalles antes de<br />finalizar
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 pb-5 sm:px-8 sm:pb-8">
          {/* Total card */}
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total a pagar</p>
            <p className="text-3xl font-black italic text-slate-900">$ {fmt(total)}</p>
          </div>

          {/* Method row */}
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 italic">Metodo de pago</p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 italic">{metodosLabel[metodo]}</p>
          </div>

          {/* Info card */}
          <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-4 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-500 mt-0.5">
              <Info className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 leading-relaxed">
              Al confirmar, se descontara el stock de los productos y se registrara la transaccion en el historial.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100" />

          {/* Confirm button */}
          <div className="flex justify-center pt-1">
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-blue-600 px-10 text-xs font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 disabled:opacity-40 sm:w-auto"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Si, Finalizar Venta"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
