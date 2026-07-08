"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Truck, Search, Plus, Package, Users, Smartphone, ArrowRight,
  FileText, AlertTriangle, X,
} from "lucide-react"
import {
  getOrdenes,
} from "@/lib/actions/compras-prisma"
import type { OrdenCompra } from "@/lib/actions/compras-prisma"
import { ProveedoresModal } from "@/components/dashboard/compras/ProveedoresModal"
import { ReporteModal } from "@/components/dashboard/compras/ReporteModal"
import { ModuleHeader } from "@/components/dashboard/module-header"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMXN(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 })
}

function fmtDate(s: string | null) {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
}

function fmtTime(s: string | null) {
  if (!s) return ""
  const d = new Date(s)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()
}

const ESTATUS_CONFIG: Record<string, { label: string; className: string }> = {
  borrador: { label: "BORRADOR DE AUDITORIA", className: "bg-slate-100 text-slate-600 border-slate-200" },
  en_transito: { label: "EN TRANSITO", className: "bg-blue-50 text-blue-700 border-blue-200" },
  pendiente: { label: "ORDENADO", className: "bg-blue-50 text-blue-600 border-blue-100" },
  recibida: { label: "RECIBIDO", className: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  parcial: { label: "PARCIAL", className: "bg-amber-50 text-amber-600 border-amber-100" },
  cancelada: { label: "CANCELADO", className: "bg-red-50 text-red-600 border-red-100" },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComprasPage() {
  const router = useRouter()
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [loadingOrdenes, setLoadingOrdenes] = useState(true)
  const [search, setSearch] = useState("")
  const [estatusFiltro, setEstatusFiltro] = useState("todos")
  const [showProvModal, setShowProvModal] = useState(false)
  const [showReporteModal, setShowReporteModal] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchOrdenes = useCallback(async () => {
    setLoadingOrdenes(true)
    const { data } = await getOrdenes({ search, estatus: estatusFiltro })
    setOrdenes(data)
    setLoadingOrdenes(false)
  }, [search, estatusFiltro])

  useEffect(() => { fetchOrdenes() }, [fetchOrdenes])

  const handleSearch = (v: string) => {
    setSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchOrdenes(), 400)
  }

  const estatusOptions = [
    { value: "todos", label: "Todos" },
    { value: "borrador", label: "Borradores" },
    { value: "en_transito", label: "En transito" },
    { value: "pendiente", label: "Ordenados" },
    { value: "recibida", label: "Recibidos" },
    { value: "cancelada", label: "Cancelados" },
  ]

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="flex w-full flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">

        {/* -- Header --------------------------------------------------------- */}
        <ModuleHeader
          icon={Truck}
          title="CADENA DE SUMINISTRO"
          eyebrow="LOGISTICA GLOBAL Y ABASTECIMIENTO DE ACTIVOS"
          description="Ordenes de compra, proveedores y recepcion de mercancia con trazabilidad operativa."
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/inventario")}
                className="h-9 gap-2 rounded-xl border-emerald-200 bg-white px-4 text-xs font-bold uppercase tracking-wider text-emerald-700 hover:bg-emerald-50 shadow-sm"
              >
                <Package className="h-3.5 w-3.5" /> Inventario critico
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowProvModal(true)}
                className="h-9 gap-2 rounded-xl border-blue-200 bg-white px-4 text-xs font-bold uppercase tracking-wider text-blue-700 hover:bg-blue-50 shadow-sm"
              >
                <Users className="h-3.5 w-3.5" /> Directorio proveedores
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/compras/usados")}
                className="h-9 gap-2 rounded-xl border-fuchsia-200 bg-white px-4 text-xs font-bold uppercase tracking-wider text-fuchsia-700 hover:bg-fuchsia-50 shadow-sm"
              >
                <Smartphone className="h-3.5 w-3.5" /> Equipos usados
              </Button>
              <Button
                onClick={() => router.push("/dashboard/compras/nueva")}
                className="h-10 gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-700 shadow-sm btn-glow"
              >
                <Plus className="h-4 w-4" /> Generar orden
              </Button>
            </div>
          )}
        />

        {/* ── Buscador + Filtros ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Buscar orden, proveedor..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-8 text-base placeholder:text-slate-400 transition-colors focus:bg-white md:text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); fetchOrdenes() }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-600 transition-colors"
                aria-label="Limpiar busqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {estatusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setEstatusFiltro(opt.value)}
                className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all border ${
                  estatusFiltro === opt.value
                    ? "bg-white text-slate-900 border-slate-200 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {/* Header de tabla */}
          <div className="hidden sm:grid grid-cols-[1.2fr_1.2fr_140px_1fr_140px_48px] gap-4 px-6 py-4 border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Descriptor orden
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Origen suministro
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Estado operativo
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 text-right">
              Resumen financiero
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 text-right">
              Timestamp registro
            </span>
            <span />
          </div>

          {loadingOrdenes ? (
            <div className="p-6 flex flex-col gap-3">
              {[0,1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
          ) : ordenes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <FileText className="h-8 w-8 text-slate-600" />
              </div>
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Sin ordenes de compra</p>
              <p className="text-xs text-slate-500">Crea una nueva orden para abastecer tu inventario.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {ordenes.map((orden) => {
                const cfg = ESTATUS_CONFIG[orden.estatus]
                return (
                  <div
                    key={orden.id}
                    className="group flex flex-col sm:grid sm:grid-cols-[1.2fr_1.2fr_140px_1fr_140px_48px] gap-3 sm:gap-4 px-6 py-5 hover:bg-slate-50/60 transition-colors cursor-pointer items-start sm:items-center"
                    onClick={() => router.push(`/dashboard/compras/${orden.id}`)}
                  >
                    {/* DESCRIPTOR ORDEN */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <FileText className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-bold text-slate-900 truncate">{orden.folio}</p>
                        {orden.errores_recepcion && orden.errores_recepcion.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-red-500 mt-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            Requiere atencion
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ORIGEN SUMINISTRO */}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{orden.proveedor_nombre}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                        Suministros verificados
                      </p>
                    </div>

                    {/* ESTADO OPERATIVO */}
                    <div>
                      <Badge
                        variant="outline"
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${cfg.className}`}
                      >
                        {cfg.label}
                      </Badge>
                    </div>

                    {/* RESUMEN FINANCIERO */}
                    <div className="text-right">
                      <p className="text-base font-black text-slate-900 tabular-nums">{fmtMXN(orden.total)}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                        {orden.articulos_count ?? 0} articulos auditados
                      </p>
                    </div>

                    {/* TIMESTAMP */}
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700">{fmtDate(orden.created_at)}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{fmtTime(orden.created_at)}</p>
                    </div>

                    {/* ACCION */}
                    <div className="flex items-center justify-end">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-700 transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ProveedoresModal open={showProvModal} onClose={() => setShowProvModal(false)} />
      <ReporteModal open={showReporteModal} onClose={() => setShowReporteModal(false)} />
    </div>
  )
}

