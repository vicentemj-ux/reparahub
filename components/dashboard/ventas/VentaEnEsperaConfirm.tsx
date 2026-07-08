"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function VentaEnEsperaConfirm({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm rounded-3xl border-slate-100 bg-white p-0 gap-0 overflow-hidden text-center">
        {/* Header con gradiente */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-white to-blue-50/60">
          <div className="text-left">
            <h2 className="text-xl font-black italic tracking-tight text-slate-900 uppercase">
              VENTA EN ESPERA
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mt-1 leading-relaxed">
              La venta ha sido guardada. Puedes atender a otro cliente y recuperarla mas tarde desde el boton de &quot;VENTAS EN ESPERA&quot;.
            </p>
          </div>
        </div>

        {/* Divider decorativo */}
        <div className="px-6 py-2">
          <div className="h-px bg-slate-100" />
        </div>

        {/* Boton */}
        <div className="px-6 pb-6">
          <Button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-black uppercase tracking-wider text-white"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
