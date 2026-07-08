"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Calendar, FileSpreadsheet, CheckCircle2, Loader2 } from "lucide-react"

export function ReporteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    // Simular generacion de reporte
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    alert("Reporte descargado (mock)")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-6 pb-4 border-b border-slate-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="text-lg font-black italic tracking-tight text-white">
                REPORTE DE ABASTECIMIENTO
              </DialogTitle>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Generador de lista de compras
              </p>
            </DialogHeader>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Rango */}
          <div className="rounded-xl border border-slate-200 bg-slate-100/40 p-4 space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Rango de analisis de ventas
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Desde</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    type="date"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    className="h-9 pl-9 bg-white border-slate-200 text-slate-900 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Hasta</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    className="h-9 pl-9 bg-white border-slate-200 text-slate-900 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bullets */}
          <div className="rounded-xl border border-slate-200 bg-slate-100/40 p-4 space-y-2">
            {[
              "Incluye todos los productos registrados",
              "Cruza ventas vs stock actual",
              "Formato Excel (.xlsx) para proveedores",
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {t}
              </div>
            ))}
          </div>

          <Button
            onClick={handleDownload}
            disabled={loading || !desde || !hasta}
            className="w-full h-11 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-bold uppercase tracking-wider text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Descargar Excel de compras
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
