"use client"

import { memo, useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export type SpecialCartItem = {
  id: string
  nombre: string
  precio: number
  costo: number
  cantidad: number
  isSpecial: boolean
  referencia?: string
}

interface SpecialModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (item: SpecialCartItem) => void
}

export const SpecialModal = memo(function SpecialModal({
  open,
  onOpenChange,
  onAdd,
}: SpecialModalProps) {
  const [nombre, setNombre] = useState("")
  const [precio, setPrecio] = useState("")
  const [costo, setCosto] = useState("")
  const [referencia, setReferencia] = useState("")

  const handleAdd = () => {
    const name = nombre.trim()
    const priceVal = Math.round((parseFloat(precio.replace(",", ".")) || 0) * 100) / 100
    if (!name || priceVal <= 0) return
    onAdd({
      id: `special-${Date.now()}`,
      nombre: name,
      precio: priceVal,
      costo: Math.round((parseFloat(costo.replace(",", ".")) || 0) * 100) / 100,
      cantidad: 1,
      isSpecial: true,
      referencia: referencia.trim() || undefined,
    })
    setNombre("")
    setPrecio("")
    setCosto("")
    setReferencia("")
    onOpenChange(false)
  }

  const labelClass = "block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2"
  const inputClass = "h-12 rounded-2xl border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:italic focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="backdrop-blur-sm bg-slate-200/75"
        className="w-[calc(100%-1rem)] max-w-[400px] rounded-3xl border-0 bg-white p-0 shadow-2xl ring-0 overflow-hidden sm:w-full"
        showCloseButton={false}
      >
        <div className="p-5 pb-4 sm:p-8 sm:pb-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black italic uppercase leading-tight tracking-tight text-slate-900">
                Producto /<br />Servicio<br />Especial
              </h2>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500 leading-relaxed">
                Agregue un item que no existe<br />en inventario (digital /<br />servicio)
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

        {/* Divider */}
        <div className="mx-5 h-px bg-slate-100 sm:mx-8" />

        {/* Form */}
        <div className="space-y-5 p-5 pt-4 sm:p-8 sm:pt-6">
          <div>
            <label className={labelClass}>Nombre del producto / servicio</label>
            <Input
              placeholder="Ej: Recarga Digital, Codigo de Desbloq..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Precio de venta</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className={`${inputClass} text-base font-bold italic`}
              />
            </div>
            <div>
              <label className={labelClass}>Costo (inversion)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                className={`${inputClass} text-base font-bold italic`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Referencia / codigo (opcional)</label>
            <Input
              placeholder="Ej: TRX-12345, Codigo: ABCDEF..."
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Divider before button */}
          <div className="h-px bg-slate-100" />

          <div className="flex justify-center pt-1 pb-2">
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!nombre.trim() || !precio.trim()}
              className="h-12 w-full rounded-2xl bg-blue-600 px-10 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 disabled:opacity-40 sm:w-auto"
            >
              Agregar al carrito
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
