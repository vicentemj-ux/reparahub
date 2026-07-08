"use client"

import { memo, useEffect, useMemo, useState } from "react"
import { Calculator, Clock, X, Loader2 } from "lucide-react"
import { getCajaConDetalle, type CajaRow, type CortePrintData, type CorteCobro, type CorteGasto, type CorteVentaLinea, type CorteAnulacion } from "@/lib/actions/ventas-prisma"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

interface MovimientoItem {
  id: string
  tipo: "venta" | "cobro" | "gasto" | "anulacion"
  metodo: string
  descripcion: string
  monto: number
  fecha: string
  esEgreso: boolean
}

interface ArqueoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caja: CajaRow
}

export const ArqueoModal = memo(function ArqueoModal({
  open,
  onOpenChange,
  caja,
}: ArqueoModalProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CortePrintData | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    getCajaConDetalle(caja.id).then(({ data: d }) => {
      if (!cancelled) {
        setData(d)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [open, caja.id])

  const horaInicio = useMemo(() => {
    return new Date(caja.fecha_apertura).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }, [caja.fecha_apertura])

  const totalVendido = data?.totalVentasPdv ?? 0
  const totalEfectivoConFondo = (data?.monto_inicial ?? caja.monto_inicial) + (data?.total_efectivo ?? caja.total_efectivo) + (data?.total_abonos_efectivo ?? 0)
  const totalGastos = data?.total_gastos ?? 0
  const totalGastosEfectivo = data?.total_gastos_efectivo ?? totalGastos
  const totalGastosTarjeta = data?.total_gastos_tarjeta ?? 0
  const totalGastosTransferencia = data?.total_gastos_transferencia ?? 0
  const totalTarjeta = (data?.total_tarjeta ?? caja.total_tarjeta) + (data?.total_abonos_tarjeta ?? 0) - totalGastosTarjeta
  const totalTransferencia = (data?.total_transferencia ?? caja.total_transferencia) + (data?.total_abonos_transferencia ?? 0) - totalGastosTransferencia
  const totalAnulacionesEfectivo = data?.total_anulaciones_efectivo ?? caja.total_anulaciones_efectivo ?? 0
  const totalAnulacionesTarjeta = data?.total_anulaciones_tarjeta ?? caja.total_anulaciones_tarjeta ?? 0
  const totalAnulacionesTransferencia = data?.total_anulaciones_transferencia ?? caja.total_anulaciones_transferencia ?? 0
  const efectivoEsperado = totalEfectivoConFondo - totalGastosEfectivo - totalAnulacionesEfectivo

  const movimientos: MovimientoItem[] = useMemo(() => {
    if (!data) return []
    const items: MovimientoItem[] = []

    data.ventas.forEach((v: CorteVentaLinea) => {
      const metodoRaw = (v.metodo_pago ?? "efectivo").toUpperCase()
      const desc = v.descripcion?.trim() || v.folio
      items.push({
        id: v.id,
        tipo: "venta",
        metodo: metodoRaw,
        descripcion: `1X ${desc}`,
        monto: v.total,
        fecha: v.created_at,
        esEgreso: false,
      })
    })

    data.cobrosRep.forEach((c: CorteCobro) => {
      const metodoRaw = (c.metodo_pago ?? "efectivo").toUpperCase()
      items.push({
        id: c.id,
        tipo: "cobro",
        metodo: metodoRaw,
        descripcion: c.descripcion || c.tipo,
        monto: c.monto,
        fecha: c.id,
        esEgreso: false,
      })
    })

    data.listaGastos.forEach((g: CorteGasto) => {
      items.push({
        id: g.id,
        tipo: "gasto",
        metodo: (g.metodo_pago ?? "gasto").toUpperCase(),
        descripcion: (g.descripcion || "GASTO").toUpperCase(),
        monto: g.monto,
        fecha: g.id,
        esEgreso: true,
      })
    })

    data.anulaciones.forEach((a: CorteAnulacion) => {
      const metodoRaw = (a.metodo_pago ?? "efectivo").toUpperCase()
      const desc = (a.descripcion || (a.folio ? `Anulacion Venta ${a.folio}` : "Venta anulada")).toUpperCase()
      items.push({
        id: a.id,
        tipo: "anulacion",
        metodo: metodoRaw,
        descripcion: desc,
        monto: a.monto,
        fecha: a.fecha,
        esEgreso: true,
      })
    })

    // Sort by fecha (real dates first, then keep original order for others)
    return items.sort((a, b) => {
      const aIsDate = a.fecha.startsWith("2")
      const bIsDate = b.fecha.startsWith("2")
      if (aIsDate && bIsDate) return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      if (aIsDate) return -1
      if (bIsDate) return 1
      return 0
    })
  }, [data])

  const metodoBadgeColor = (metodo: string, esEgreso: boolean) => {
    if (esEgreso) return "bg-red-100 text-red-500"
    const m = metodo.toLowerCase()
    if (m.includes("efectivo")) return "bg-emerald-100 text-emerald-500"
    if (m.includes("tarjeta")) return "bg-blue-100 text-blue-500"
    if (m.includes("transfer")) return "bg-cyan-100 text-cyan-500"
    return "bg-slate-100 text-slate-500"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="backdrop-blur-sm bg-slate-200/75"
        className="w-[calc(100%-1rem)] max-w-[420px] rounded-[32px] border-0 bg-white p-0 shadow-2xl ring-0 overflow-hidden sm:w-full"
        showCloseButton={false}
      >
        <div className="p-5 pb-4 sm:p-8 sm:pb-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
              <Calculator className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black italic uppercase leading-tight tracking-tight text-slate-900">
                Resumen de mi<br />Turno
              </h2>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500 leading-relaxed">
                Consulta tus ventas y gastos<br />actuales
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

        <div className="max-h-[65vh] space-y-5 overflow-y-auto px-5 pb-5 sm:px-8 sm:pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando arqueo...
            </div>
          ) : (
            <>
              {/* Card azul - Total vendido */}
              <div className="rounded-3xl bg-blue-600 p-5 text-white shadow-lg shadow-blue-600/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-200">
                      Total vendido en turno
                    </p>
                    <p className="text-4xl font-black italic mt-1">${fmt(totalVendido)}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    <Calculator className="h-5 w-5 text-blue-100" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold uppercase tracking-wider text-blue-200">
                  <Clock className="h-3 w-3" />
                  Iniciaste hoy a las {horaInicio}
                </div>
              </div>

              {/* Grid 2x2 */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
                    Efectivo (+${fmt(caja.monto_inicial)} inicial)
                  </p>
                  <p className="text-xl font-black italic text-emerald-600 mt-1">${fmt(totalEfectivoConFondo - totalAnulacionesEfectivo)}</p>
                </div>
                <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/60 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-fuchsia-600">Tarjeta</p>
                  <p className="text-xl font-black italic text-fuchsia-600 mt-1">${fmt(totalTarjeta - totalAnulacionesTarjeta)}</p>
                </div>
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-600">Transferencia</p>
                  <p className="text-xl font-black italic text-cyan-600 mt-1">${fmt(totalTransferencia - totalAnulacionesTransferencia)}</p>
                </div>
                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500">Gastos efectivo</p>
                  <p className="text-xl font-black italic text-red-500 mt-1">-${fmt(totalGastosEfectivo)}</p>
                </div>
              </div>

              {(totalGastosTarjeta > 0 || totalGastosTransferencia > 0) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {totalGastosTarjeta > 0 && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">Gastos tarjeta</p>
                      <p className="text-xl font-black italic text-blue-600 mt-1">-${fmt(totalGastosTarjeta)}</p>
                    </div>
                  )}
                  {totalGastosTransferencia > 0 && (
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-600">Gastos transferencia</p>
                      <p className="text-xl font-black italic text-cyan-600 mt-1">-${fmt(totalGastosTransferencia)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Efectivo esperado */}
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Efectivo esperado en mano
                    </p>
                    <p className="text-3xl font-black italic text-slate-900 mt-1">${fmt(efectivoEsperado)}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200/50 text-slate-500">
                    <Calculator className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Detalle de movimientos */}
              {movimientos.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Detalle de movimientos
                  </p>
                  <div className="space-y-2.5">
                    {movimientos.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-2xl border p-4 ${
                          m.esEgreso
                            ? "bg-red-50/40 border-red-100"
                            : "bg-white border-slate-100 shadow-sm"
                        }`}
                      >
                        {/* Fila 1: badge + hora + monto */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${metodoBadgeColor(m.metodo, m.esEgreso)}`}
                            >
                              {m.metodo}
                            </span>
                            {m.fecha.startsWith("2") && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                {fmtTime(m.fecha)}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-sm font-black italic ${
                              m.esEgreso ? "text-red-500" : "text-slate-900"
                            }`}
                          >
                            {m.esEgreso ? "-" : "+"}${fmt(m.monto)}
                          </span>
                        </div>

                        {/* Fila 2: descripcion */}
                        <p
                          className={`text-xs font-black uppercase tracking-wide mt-2 ${
                            m.esEgreso ? "text-red-600" : "text-slate-800"
                          }`}
                        >
                          {m.descripcion}
                        </p>

                        {/* Fila 3: fecha (solo si es fecha real) */}
                        {m.fecha.startsWith("2") && (
                          <p className="text-[9px] text-slate-500 mt-1">
                            {fmtDateShort(m.fecha)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 pt-0">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
})


