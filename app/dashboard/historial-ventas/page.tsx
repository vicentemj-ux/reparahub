'use client'


import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDataFetchPerf } from "@/hooks/use-data-fetch-perf"
import { useLetterReportPrint } from '@/lib/print/print-config'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Printer, DollarSign, CreditCard, TrendingUp, ShoppingBag, Calendar, Loader2, Store, Search, X } from "lucide-react"
import {
  getHistorialVentas,
  type HistorialTipoFiltro,
  type HistorialVentaRow,
  type HistorialVentasTotales,
} from "@/lib/actions/sales-history-prisma"
import { getTallerSettings } from "@/lib/actions/settings-prisma"
import { HistorialVentaRowCard } from "@/components/dashboard/historial-ventas/HistorialVentaRowCard"
import { ReporteVentasPeriodoLetter } from "@/components/dashboard/historial-ventas/ReporteVentasPeriodoLetter"
import { HistorialCaja } from "@/components/dashboard/historial-caja"
import { formatMoneyCompact } from "@/lib/utils/currency"
import { ModuleHeader } from "@/components/dashboard/module-header"

function ymdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayYmd(): string {
  return ymdLocal(new Date())
}

function mapFilterToTipo(f: string): HistorialTipoFiltro {
  if (f === 'mostrador') return 'mostrador'
  if (f === 'reparaciones') return 'reparacion'
  if (f === 'apartados') return 'apartado'
  return 'todos'
}

function filterLabelUi(f: string) {
  if (f === 'mostrador') return 'Mostrador'
  if (f === 'reparaciones') return 'Reparaciones'
  if (f === 'apartados') return 'Apartados'
  return 'Todos'
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)),
  ])
}

export default function HistorialVentasPage() {
  const { startFetch, stopFetch } = useDataFetchPerf("historial-ventas")
  const [section, setSection] = useState<"ventas" | "cortes">("ventas")
  const [dateFrom, setDateFrom] = useState(todayYmd)
  const [dateTo, setDateTo] = useState(todayYmd)
  const [filterType, setFilterType] = useState('todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [rows, setRows] = useState<HistorialVentaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tallerNombre, setTallerNombre] = useState("Mi Taller")
  const [tallerTelefono, setTallerTelefono] = useState("")
  const [tallerPais, setTallerPais] = useState<string | null>(null)
  const [tallerId, setTallerId] = useState("")
  const [impresionConfig, setImpresionConfig] = useState<Record<string, unknown>>({})
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [mensajeDespedida, setMensajeDespedida] = useState<string | undefined>(undefined)

  const reportPrintRef = useRef<HTMLDivElement>(null)
  const reportTitleRef = useRef(`Reporte-ventas-${dateFrom}-${dateTo}`)

  const handlePrintReport = useLetterReportPrint({
    contentRef: reportPrintRef,
    documentTitle: () => reportTitleRef.current,
  })

  useEffect(() => {
    reportTitleRef.current = `Reporte-ventas-${dateFrom}-${dateTo}`
  }, [dateFrom, dateTo])

  useEffect(() => {
    void getTallerSettings().then((s) => {
      const cfg = s.settings
      if (cfg?.taller_id) setTallerId(cfg.taller_id)
      if (cfg?.nombre_taller) setTallerNombre(cfg.nombre_taller.trim())
      if (cfg?.telefono) setTallerTelefono(String(cfg.telefono).trim())
      setTallerPais(cfg?.pais ?? null)
      setImpresionConfig(cfg?.impresion_config ?? {})
      if (cfg?.logo_url) setLogoUrl(cfg.logo_url)
      if (cfg?.mensaje_despedida) setMensajeDespedida(cfg.mensaje_despedida.trim())
    })
  }, [])

  /** Totales de las tarjetas segun las filas visibles (mismo criterio que la tabla). */
  const totalesResumen = useMemo((): HistorialVentasTotales => {
    let efectivo = 0
    let tarjeta = 0
    let transferencia = 0
    for (const r of rows) {
      if (r.source === 'mostrador' && r.ventaEstado !== 'activa') continue
      if (r.anulada === true) continue
      const codigo = r.metodoPagoCodigo
      if (codigo === 'mixto' && r.montosMixto) {
        efectivo += r.montosMixto.efectivo
        tarjeta += r.montosMixto.tarjeta
        transferencia += r.montosMixto.transferencia
      } else if (codigo === 'efectivo' || codigo === 'otro') {
        efectivo += r.total
      } else if (codigo === 'tarjeta') {
        tarjeta += r.total
      } else if (codigo === 'transferencia') {
        transferencia += r.total
      }
    }
    return {
      efectivo,
      tarjeta,
      transferencia,
      total: efectivo + tarjeta + transferencia,
    }
  }, [rows])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    startFetch()
    try {
      const res = await withTimeout(
        getHistorialVentas({
          startDate: dateFrom,
          endDate: dateTo,
          tipo: mapFilterToTipo(filterType),
          search: debouncedSearch,
          tzOffsetMin: new Date().getTimezoneOffset(),
        }),
        15000,
        "getHistorialVentas"
      )
      setRows(res.rows)
      setError(res.error)
    } catch (error) {
      console.error("[historial-ventas] load:", error)
      setRows([])
      setError("No se pudo cargar historial de ventas.")
    } finally {
      setLoading(false)
      stopFetch()
    }
  }, [dateFrom, dateTo, filterType, debouncedSearch, startFetch, stopFetch])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="min-h-screen bg-dashboard-surface">
      {/* Reporte Carta: capa oculta para react-to-print (mismo patron que cortes de caja) */}
      <div
        ref={reportPrintRef}
        className="print-letter-report-offscreen"
        aria-hidden
      >
        <ReporteVentasPeriodoLetter
          dateFrom={dateFrom}
          dateTo={dateTo}
          filterLabel={filterLabelUi(filterType)}
          searchQuery={debouncedSearch}
          totales={totalesResumen}
          rows={rows}
          tallerNombre={tallerNombre}
          tallerTelefono={tallerTelefono}
          tallerLogoUrl={logoUrl}
        />
      </div>

      <div className="flex w-full flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <ModuleHeader
        icon={Clock}
        title="HISTORIAL Y CORTES"
        eyebrow="VENTAS, CORTE DE CAJA Y TRAZABILIDAD FINANCIERA"
        description="Consulta ventas del mostrador y cortes de caja desde una sola vista, sin saturar el POS."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => setSection("ventas")}
              className={`h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider ${
                section === "ventas"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Ventas
            </Button>
            <Button
              type="button"
              onClick={() => setSection("cortes")}
              className={`h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider ${
                section === "cortes"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Cortes
            </Button>
            {section === "ventas" && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                disabled={loading}
                title="Reporte de ventas del periodo (Carta)"
                onClick={() => void handlePrintReport()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : <Printer className="h-4 w-4 text-slate-500" />}
              </Button>
            )}
          </div>
        )}
      />

      {section === "ventas" ? (
        <>
          {/* Filters Section */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
              {/* Date Range */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
                <Calendar className="hidden sm:block h-4 w-4 text-slate-500 shrink-0" />
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-auto min-w-[10rem] h-11 rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-900 transition-colors focus:bg-white"
                  />
                  <span className="text-slate-400">—</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-auto min-w-[10rem] h-11 rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-900 transition-colors focus:bg-white"
                  />
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => setFilterType('todos')}
                  className={`h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider ${
                    filterType === 'todos'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Todos
                </Button>
                <Button
                  type="button"
                  onClick={() => setFilterType('mostrador')}
                  className={`h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider ${
                    filterType === 'mostrador'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Mostrador
                </Button>
                <Button
                  type="button"
                  onClick={() => setFilterType('reparaciones')}
                  className={`h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider ${
                    filterType === 'reparaciones'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Reparaciones
                </Button>
                <Button
                  type="button"
                  onClick={() => setFilterType('apartados')}
                  className={`h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider ${
                    filterType === 'apartados'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Apartados
                </Button>
              </div>

              {/* Search */}
              <div className="flex-1 lg:ml-auto">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Input
                    placeholder="Buscar folio o cliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-8 text-base placeholder:text-slate-400 transition-colors focus:bg-white md:text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Limpiar busqueda"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="gap-0 overflow-hidden border border-slate-200 bg-white py-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Efectivo</p>
                    <p className="text-2xl font-bold text-slate-900">{formatMoneyCompact(totalesResumen.efectivo)}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

        <Card className="gap-0 overflow-hidden border border-slate-200 bg-white py-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Tarjeta</p>
                <p className="text-2xl font-bold text-slate-900">{formatMoneyCompact(totalesResumen.tarjeta)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden border border-slate-200 bg-white py-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Transf.</p>
                <p className="text-2xl font-bold text-slate-900">{formatMoneyCompact(totalesResumen.transferencia)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/15">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden border border-slate-200 bg-white py-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Total Periodo</p>
                <p className="text-2xl font-bold text-slate-900">{formatMoneyCompact(totalesResumen.total)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/15">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          ) : null}

          {/* Sales List - Single Card Container */}
          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16 shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden />
              <p className="mt-3 text-sm text-slate-500">Cargando historial...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16 shadow-sm">
              <Store className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No hay ventas en este periodo.</p>
            </div>
          ) : (
            <>
              {/* Mobile - cards */}
              <div className="sm:hidden flex flex-col gap-3">
                {rows.map((row) => (
                  <Card key={row.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white py-0 shadow-sm">
                    <HistorialVentaRowCard
                      variant="card"
                      row={row}
                      tallerNombre={tallerNombre}
                      tallerTelefono={tallerTelefono}
                      logoUrl={logoUrl}
                      mensajeDespedida={mensajeDespedida}
                      impresoraTicket={null}
                      impresionConfig={impresionConfig}
                      tallerId={tallerId}
                      tallerPais={tallerPais}
                      onVentaAnulada={() => void load()}
                    />
                  </Card>
                ))}
              </div>

              {/* Desktop - table with divs */}
              <Card className="hidden sm:block gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white py-0 shadow-sm">
                <div className="w-full overflow-x-auto">
                  <div className="table w-full border-collapse">
                    <div className="table-row border-b border-slate-100 bg-slate-50/60">
                      <div className="table-cell w-[150px] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Referencia / Fecha</div>
                      <div className="table-cell w-[100px] px-2 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Categoria</div>
                      <div className="table-cell w-[100px] px-2 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Titular</div>
                      <div className="table-cell w-[100px] px-2 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Vendedor</div>
                      <div className="table-cell px-2 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Resumen Conceptos</div>
                      <div className="table-cell w-[110px] px-2 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Metodo</div>
                      <div className="table-cell w-[120px] px-2 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Monto Neto</div>
                      <div className="table-cell w-[50px] pl-2 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Accion</div>
                    </div>
                    {rows.map((row) => (
                      <HistorialVentaRowCard
                        key={row.id}
                        variant="row"
                        row={row}
                        tallerNombre={tallerNombre}
                        tallerTelefono={tallerTelefono}
                        logoUrl={logoUrl}
                        mensajeDespedida={mensajeDespedida}
                        impresoraTicket={null}
                        impresionConfig={impresionConfig}
                        tallerId={tallerId}
                        tallerPais={tallerPais}
                        onVentaAnulada={() => void load()}
                      />
                    ))}
                  </div>
                </div>
              </Card>
            </>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-8">
          <HistorialCaja />
        </div>
      )}
      </div>
    </div>
  )
}
