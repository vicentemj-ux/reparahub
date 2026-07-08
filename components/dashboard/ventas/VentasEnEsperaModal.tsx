"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Clock, Trash2, ShoppingBag } from "lucide-react"
import { getVentasEnEspera, eliminarVentaEnEspera, type VentaEnEspera } from "@/lib/ventas-en-espera"

function fmtMXN(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 })
}

function fmtTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()
}

export function VentasEnEsperaModal({
  open,
  onClose,
  onRecuperar,
}: {
  open: boolean
  onClose: () => void
  onRecuperar: (venta: VentaEnEspera) => void
}) {
  const [ventas, setVentas] = useState<VentaEnEspera[]>([])

  useEffect(() => {
    if (open) {
      setVentas(getVentasEnEspera())
    }
  }, [open])

  const handleEliminar = (id: string) => {
    eliminarVentaEnEspera(id)
    setVentas(getVentasEnEspera())
  }

  const handleRecuperar = (venta: VentaEnEspera) => {
    onRecuperar(venta)
    eliminarVentaEnEspera(venta.id)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md rounded-3xl border-slate-100 bg-white p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-white to-blue-50/60">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-black italic tracking-tight text-slate-900 uppercase">
                VENTAS EN ESPERA
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mt-0.5">
                Recupera carritos guardados anteriormente
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="px-6">
          <div className="h-px bg-slate-100" />
        </div>

        {/* Lista */}
        <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
          {ventas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <ShoppingBag className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-500">No hay ventas en espera</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {ventas.map((v) => {
                const itemCount = v.cartItems.reduce((s, i) => s + i.cantidad, 0)
                const total = v.cartItems.reduce((s, i) => s + i.precio * i.cantidad, 0) - v.descuentoAplicado
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4"
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black italic text-blue-600">{fmtMXN(total)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {itemCount} articulo{itemCount !== 1 ? "s" : ""}
                        </span>
                        <span className="text-[10px] text-slate-300">·</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {fmtTime(v.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEliminar(v.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Button
                        onClick={() => handleRecuperar(v)}
                        className="h-9 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-[10px] font-black uppercase tracking-wider text-white"
                      >
                        Recuperar
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
