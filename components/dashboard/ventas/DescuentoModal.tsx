"use client"

import { memo, useState } from "react"
import { Tag, Banknote, Percent, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent } from "@/components/ui/dialog"

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface DescuentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subtotal: number
  onApply: (descuento: number) => void
}

export const DescuentoModal = memo(function DescuentoModal({
  open,
  onOpenChange,
  subtotal,
  onApply,
}: DescuentoModalProps) {
  const [modo, setModo] = useState<"fijo" | "porcentaje">("fijo")
  const [valor, setValor] = useState("")

  const handleApply = () => {
    const val = parseFloat(valor.replace(",", ".")) || 0
    if (val <= 0) return
    let descuento = 0
    if (modo === "fijo") {
      descuento = Math.min(val, subtotal)
    } else {
      descuento = Math.min((subtotal * val) / 100, subtotal)
    }
    onApply(Math.round(descuento * 100) / 100)
    setValor("")
    onOpenChange(false)
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
              <Tag className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black italic uppercase leading-tight tracking-tight text-slate-900">
                Aplicar<br />Descuento
              </h2>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500 leading-relaxed">
                Reduce el total a<br />cobrar de la venta
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

        <div className="space-y-5 px-5 pb-5 sm:px-8 sm:pb-8">
          {/* Input monto */}
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-slate-500">$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="h-14 text-3xl font-black italic text-slate-900 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              autoFocus
            />
          </div>

          {/* Tabs modo */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setModo("fijo")}
              className={`flex flex-col items-center justify-center gap-1.5 h-16 rounded-2xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                modo === "fijo"
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
              }`}
            >
              <Banknote className="h-4 w-4" />
              MONTO FIJO
            </button>
            <button
              type="button"
              onClick={() => setModo("porcentaje")}
              className={`flex flex-col items-center justify-center gap-1.5 h-16 rounded-2xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                modo === "porcentaje"
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
              }`}
            >
              <Percent className="h-4 w-4" />
              PORCENTAJE
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100" />

          {/* Aplicar */}
          <div className="flex justify-center">
            <Button
              onClick={handleApply}
              disabled={!valor.trim() || parseFloat(valor.replace(",", ".")) <= 0}
              className="h-12 w-full rounded-2xl bg-blue-600 px-10 text-xs font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 disabled:opacity-40 sm:w-auto"
            >
              Aplicar Descuento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
