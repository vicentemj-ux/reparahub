"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft, Plus, Search, Smartphone, MonitorSmartphone,
  ShieldAlert,
} from "lucide-react"
import { getComprasUsadas } from "@/lib/actions/compras-usado-prisma"
import type { CompraUsadaRow } from "@/lib/actions/compras-usado-prisma"
import { ModuleHeader } from "@/components/dashboard/module-header"

// --- Helpers ------------------------------------------------------------------

function fmtMXN(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 })
}

function fmtDate(s: string | null) {
  if (!s) return "-"
  const d = new Date(s)
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
}

// --- Page ---------------------------------------------------------------------

export default function ActivosAdquiridosPage() {
  const router = useRouter()
  const [data, setData] = useState<CompraUsadaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: d } = await getComprasUsadas()
    setData(d)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const stats = useMemo(() => {
    const total = data.reduce((s, r) => s + Number(r.monto ?? 0), 0)
    const count = data.length
    const avg = count > 0 ? total / count : 0
    return { total, count, avg }
  }, [data])

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter(r =>
      r.vendedor.toLowerCase().includes(q) ||
      r.marca.toLowerCase().includes(q) ||
      r.modelo.toLowerCase().includes(q) ||
      r.folio.toLowerCase().includes(q)
    )
  }, [data, search])

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">

        <ModuleHeader
          icon={MonitorSmartphone}
          title="ACTIVOS ADQUIRIDOS"
          eyebrow="HISTORIAL DE ADQUISICIONES Y DECLARACIONES JURADAS"
          description="Consulta compras de equipos usados, origen del activo y capital invertido."
          stats={[
            {
              label: "Unidades",
              value: stats.count,
              tone: "blue",
            },
            {
              label: "Capital",
              value: fmtMXN(stats.total),
              tone: "slate",
            },
          ]}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => router.push("/dashboard/inventario")}
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Inventario
              </button>
              <Button
                onClick={() => router.push("/dashboard/compras/registrar-usado")}
                className="h-10 gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-700 btn-glow"
              >
                <Plus className="h-4 w-4" /> Nueva adquisicion
              </Button>
            </div>
          )}
        />

        <section className="flex justify-end">
          <div className="w-full sm:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="FILTRAR POR FOLIO O VENDEDOR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 rounded-full border-slate-200 bg-white pl-11 pr-4 text-sm font-medium uppercase tracking-wider text-slate-800 placeholder:text-slate-300 placeholder:font-normal shadow-sm"
              />
            </div>
          </div>
        </section>

        {/* -- TABLA -- */}
        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {/* Header */}
          <div className="hidden lg:grid grid-cols-[1fr_1fr_1.5fr_140px_140px] gap-4 px-6 py-4 border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Bitacora / Temporalidad</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Origen (vendedor)</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Activo / Especificaciones</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-right">Valor de compra</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-right">Jurisdiccion</span>
          </div>

          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              {[0,1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Smartphone className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Archivo vacio en este momento</p>
              <p className="text-xs text-slate-400">Registra tu primera adquisicion de equipo usado.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.5fr_140px_140px] gap-3 lg:gap-4 px-6 py-5 hover:bg-slate-50/60 transition-colors items-center"
                >
                  {/* Bitacora */}
                  <div>
                    <p className="font-mono text-sm font-bold text-slate-900">{row.folio}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                      {fmtDate(row.fecha)}
                    </p>
                  </div>
                  {/* Origen */}
                  <div>
                    <p className="text-sm font-bold text-slate-800">{row.vendedor}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                      {row.documento}
                    </p>
                  </div>
                  {/* Activo */}
                  <div>
                    <p className="text-sm font-bold text-slate-900">{row.marca} {row.modelo}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {row.imei && row.imei !== "-" && (
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          IMEI: {row.imei.slice(0, 12)}...
                        </span>
                      )}
                      {row.color && row.color !== "-" && (
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {row.color}
                        </span>
                      )}
                      {row.capacidad && row.capacidad !== "-" && (
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {row.capacidad}
                        </span>
                      )}
                      {row.condicion && row.condicion !== "-" && (
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {row.condicion}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Valor */}
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900 tabular-nums">{fmtMXN(row.monto)}</p>
                  </div>
                  {/* Jurisdiccion */}
                  <div className="text-right">
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 border border-emerald-100">
                      Declaracion jurada
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* -- PROTOCOLO -- */}
        <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-black italic tracking-tight text-amber-800 uppercase">
                  Protocolo de seguridad legal
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                  <p className="text-[11px] font-bold text-amber-700">
                    01. Registro de declaracion jurada instantaneo.
                  </p>
                  <p className="text-[11px] font-bold text-amber-700">
                    02. Reporte en formato carta o termico.
                  </p>
                  <p className="text-[11px] font-bold text-amber-700">
                    03. Exigencia de documentacion fisica y huella.
                  </p>
                  <p className="text-[11px] font-bold text-amber-700">
                    04. Modificacion de marco legal en ajustes.
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="h-10 rounded-full border-amber-300 px-5 text-xs font-bold uppercase tracking-wider text-amber-700 hover:bg-amber-100 self-start lg:self-auto"
            >
              Configuracion legal
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


