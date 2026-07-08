"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  getAllActiveTechnicians,
  getRepairsByTallerId,
  type BitacoraRepair,
  type RepairStatusStats,
} from "@/lib/actions/repairs-prisma"
import { useDataFetchPerf } from "@/hooks/use-data-fetch-perf"
import { BitacoraTable } from "@/components/dashboard/bitacora-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Clock,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react"
import { ReparacionEditDialog } from "@/components/dashboard/reparacion-edit-dialog"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { REPAIR_URGENCY_DAYS } from "@/lib/constants/repair-urgency"
import { useActiveCustomer } from "@/lib/context/active-customer-context"
import { cn } from "@/lib/utils"

const OPEN_NEW_TICKET_PARAM = "openNewTicket"
const EDIT_TICKET_PARAM = "editTicket"
const FILTER_PARAM = "filter"
const PAGE_SIZE = 50

type RepairFilterId =
  | "all"
  | "recibido"
  | "diagnostico"
  | "en-reparacion"
  | "esperando-refaccion"
  | "listo"
  | "reingreso"
  | "entregado"
  | "cancelado"
  | "sin-reparacion"
  | "critical"

const EMPTY_STATS: RepairStatusStats = {
  Recibido: 0,
  Diagnostico: 0,
  "En Reparacion": 0,
  "Esperando Refaccion": 0,
  Listo: 0,
  Entregado: 0,
  Cancelado: 0,
  "Sin Reparacion": 0,
  Reingreso: 0,
}

const STATUS_FILTER_BY_ID: Partial<Record<RepairFilterId, BitacoraRepair["status"]>> = {
  recibido: "Recibido",
  diagnostico: "Diagnostico",
  "en-reparacion": "En Reparacion",
  "esperando-refaccion": "Esperando Refaccion",
  listo: "Listo",
  reingreso: "Reingreso",
  entregado: "Entregado",
  cancelado: "Cancelado",
  "sin-reparacion": "Sin Reparacion",
}

const STATUS_CARDS: {
  id: RepairFilterId
  label: string
  sublabel: string
  status: BitacoraRepair["status"]
  Icon: LucideIcon
  iconBg: string
  iconColor: string
  countColor: string
  ring: string
  activeBg: string
  activeBadge: string
}[] = [
  {
    id: "recibido",
    label: "Nuevas",
    sublabel: "Esperan primera accion",
    status: "Recibido",
    Icon: CircleAlert,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    countColor: "text-orange-600",
    ring: "ring-2 ring-orange-400/60 border-orange-200",
    activeBg: "bg-gradient-to-br from-white to-orange-50/60",
    activeBadge: "bg-orange-50 text-orange-600 ring-orange-100",
  },
  {
    id: "diagnostico",
    label: "Diagnostico",
    sublabel: "En revision tecnica",
    status: "Diagnostico",
    Icon: Clock,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    countColor: "text-amber-600",
    ring: "ring-2 ring-amber-400/60 border-amber-200",
    activeBg: "bg-gradient-to-br from-white to-amber-50/60",
    activeBadge: "bg-amber-50 text-amber-600 ring-amber-100",
  },
  {
    id: "en-reparacion",
    label: "En reparacion",
    sublabel: "Trabajo activo",
    status: "En Reparacion",
    Icon: Wrench,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    countColor: "text-blue-600",
    ring: "ring-2 ring-blue-400/60 border-blue-200",
    activeBg: "bg-gradient-to-br from-white to-blue-50/60",
    activeBadge: "bg-blue-50 text-blue-600 ring-blue-100",
  },
  {
    id: "esperando-refaccion",
    label: "Pendientes",
    sublabel: "Proveedor externo",
    status: "Esperando Refaccion",
    Icon: Clock,
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-700",
    countColor: "text-cyan-700",
    ring: "ring-2 ring-cyan-400/60 border-cyan-200",
    activeBg: "bg-gradient-to-br from-white to-cyan-50/70",
    activeBadge: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  },
  {
    id: "listo",
    label: "Listos",
    sublabel: "Entrega y saldo",
    status: "Listo",
    Icon: BadgeCheck,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    countColor: "text-emerald-600",
    ring: "ring-2 ring-emerald-400/60 border-emerald-200",
    activeBg: "bg-gradient-to-br from-white to-emerald-50/60",
    activeBadge: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
  {
    id: "reingreso",
    label: "Reingresos",
    sublabel: "Garantias / retornos",
    status: "Reingreso",
    Icon: RotateCcw,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    countColor: "text-rose-600",
    ring: "ring-2 ring-rose-400/60 border-rose-200",
    activeBg: "bg-gradient-to-br from-white to-rose-50/60",
    activeBadge: "bg-rose-50 text-rose-600 ring-rose-100",
  },
]

const SECONDARY_FILTERS: {
  id: RepairFilterId
  label: string
  Icon: LucideIcon
  getCount: (stats: RepairStatusStats, criticalCount: number, total: number) => number
}[] = [
  { id: "all", label: "Todos", Icon: ClipboardList, getCount: (_stats, _critical, total) => total },
  { id: "entregado", label: "Entregados", Icon: CheckCircle2, getCount: (stats) => stats.Entregado },
  { id: "cancelado", label: "Cancelados", Icon: X, getCount: (stats) => stats.Cancelado },
  { id: "sin-reparacion", label: "Sin reparacion", Icon: CircleAlert, getCount: (stats) => stats["Sin Reparacion"] },
  { id: "critical", label: `Criticos +${REPAIR_URGENCY_DAYS} dias`, Icon: AlertTriangle, getCount: (_stats, critical) => critical },
]

function ReparacionesContent() {
  const { startFetch, stopFetch } = useDataFetchPerf("reparaciones")
  const router = useRouter()
  const { activeCustomer } = useActiveCustomer()
  const searchParams = useSearchParams()
  const filterParam = searchParams.get(FILTER_PARAM)
  const filterPreset =
    filterParam === "queue" ? "queue" :
    filterParam === "critical" ? "critical" :
    filterParam === "waiting-parts" ? "waiting-parts" :
    null

  const [repairs, setRepairs] = useState<BitacoraRepair[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewTicketModal, setShowNewTicketModal] = useState(false)
  const [editingRepairId, setEditingRepairId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activeFilterId, setActiveFilterId] = useState<RepairFilterId>("all")
  const [page, setPage] = useState(0)
  const [totalRepairs, setTotalRepairs] = useState(0)
  const [stats, setStats] = useState<RepairStatusStats>(EMPTY_STATS)
  const [criticalCount, setCriticalCount] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [technicians, setTechnicians] = useState<Array<{ id: string; nombre: string }>>([])
  const [selectedTechnician, setSelectedTechnician] = useState("__all__")

  const estatusFilter = STATUS_FILTER_BY_ID[activeFilterId]
  const criticalOnly = activeFilterId === "critical"
  const technicianFilter = selectedTechnician === "__all__" ? undefined : selectedTechnician
  const globalTotal = useMemo(() => Object.values(stats).reduce((sum, value) => sum + value, 0), [stats])
  const hasActiveFilter = Boolean(searchTerm || activeFilterId !== "all" || selectedTechnician !== "__all__")
  const openNewRepairPage = () => {
    router.push("/dashboard/reparaciones/nueva")
  }

  useEffect(() => {
    if (searchParams.get(OPEN_NEW_TICKET_PARAM) === "1") {
      router.replace("/dashboard/reparaciones/nueva", { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    const ticketId = searchParams.get(EDIT_TICKET_PARAM)
    if (ticketId) {
      setEditingRepairId(ticketId)
      setShowNewTicketModal(true)
      router.replace("/dashboard/reparaciones", { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    if (filterPreset === "queue") setActiveFilterId("en-reparacion")
    if (filterPreset === "critical") setActiveFilterId("critical")
    if (filterPreset === "waiting-parts") setActiveFilterId("esperando-refaccion")
  }, [filterPreset])

  useEffect(() => {
    let cancelled = false
    void getAllActiveTechnicians()
      .then((result) => {
        if (!cancelled) setTechnicians(result.technicians ?? [])
      })
      .catch((error) => {
        console.error("Error loading technicians:", error)
        if (!cancelled) setTechnicians([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(0)
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(id)
  }, [searchTerm])

  useEffect(() => {
    const loadRepairs = async () => {
      setIsLoading(true)
      startFetch()
      try {
        const result = await getRepairsByTallerId(
          page,
          PAGE_SIZE,
          debouncedSearch || undefined,
          estatusFilter,
          criticalOnly,
          technicianFilter,
        )
        setRepairs(result.data || [])
        setTotalRepairs(result.total)
        setStats(result.stats || EMPTY_STATS)
        setCriticalCount(result.criticalCount || 0)
      } catch (error) {
        console.error("Error loading repairs:", error)
        setRepairs([])
        setTotalRepairs(0)
      } finally {
        setIsLoading(false)
        stopFetch()
      }
    }
    loadRepairs()
  }, [page, debouncedSearch, estatusFilter, criticalOnly, technicianFilter, refreshKey, startFetch, stopFetch])

  const clearFilters = () => {
    setPage(0)
    setSearchTerm("")
    setDebouncedSearch("")
    setActiveFilterId("all")
    setSelectedTechnician("__all__")
    if (filterParam) router.replace("/dashboard/reparaciones", { scroll: false })
  }

  const handleFilterClick = (id: RepairFilterId) => {
    setPage(0)
    setActiveFilterId((prev) => (prev === id ? "all" : id))
    if (filterParam) router.replace("/dashboard/reparaciones", { scroll: false })
  }

  const handleRepairUpdated = (updated: BitacoraRepair) => {
    setRepairs((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setRefreshKey((k) => k + 1)
  }

  const handleRepairDeleted = (repairId: string) => {
    setRepairs((prev) => prev.filter((r) => r.id !== repairId))
    setRefreshKey((k) => k + 1)
  }

  const handleNewTicketSuccess = (_newRepairId: string) => {
    setShowNewTicketModal(false)
    setPage(0)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="flex w-full min-w-0 flex-col gap-5 px-3 py-4 sm:gap-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
        <ModuleHeader
          icon={Wrench}
          title="REPARACIONES"
          eyebrow="CENTRO DE MANDO TECNICO"
          description="Prioriza recepcion, diagnostico, reparacion y entregas sin perder el contexto."
          stats={[
            {
              label: "Ordenes",
              value: globalTotal.toLocaleString("es-MX"),
              tone: "blue",
            },
          ]}
          actions={(
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <div className="relative flex-1 sm:min-w-[280px] lg:w-80">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  placeholder="Buscar folio, cliente, marca, IMEI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-8 text-base placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-400/40 md:text-sm"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Limpiar busqueda"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Select
                value={selectedTechnician}
                onValueChange={(value) => {
                  setPage(0)
                  setSelectedTechnician(value)
                }}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white text-left font-semibold text-slate-700 shadow-sm sm:w-[230px]">
                  <SelectValue placeholder="Filtrar por tecnico" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-900">
                  <SelectItem value="__all__">Todos los tecnicos</SelectItem>
                  <SelectItem value="__unassigned__">Sin asignar</SelectItem>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.nombre}>
                      {tech.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={openNewRepairPage}
                className="h-11 shrink-0 gap-2 rounded-xl bg-blue-600 px-4 font-semibold tracking-tight text-white hover:bg-blue-700 btn-glow"
              >
                <Plus className="h-4 w-4" />
                <span>Nuevo Ticket</span>
              </Button>
            </div>
          )}
        />

        <ReparacionEditDialog
          open={showNewTicketModal}
          onOpenChange={(open) => {
            setShowNewTicketModal(open)
            if (!open) setEditingRepairId(null)
          }}
          editingRepairId={editingRepairId}
          onEditSuccess={handleNewTicketSuccess}
          initialClient={
            editingRepairId || activeCustomer.mode !== "selected"
              ? null
              : {
                  id: activeCustomer.id,
                  nombre: activeCustomer.nombre,
                  telefono: activeCustomer.telefono,
                  correo: activeCustomer.correo ?? "",
                }
          }
        />

        {!isLoading && (
          <section className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
            <div className="-mx-0.5 flex snap-x gap-2 overflow-x-auto px-0.5 pb-1 lg:grid lg:grid-cols-6 lg:overflow-visible">
              {STATUS_CARDS.map((card) => {
                const isActive = activeFilterId === card.id
                const count = stats[card.status] ?? 0
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleFilterClick(card.id)}
                    className={cn(
                      "group flex min-h-[76px] min-w-[172px] snap-start items-center gap-3 rounded-2xl border bg-white px-3 py-3 text-left",
                      "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
                      isActive ? cn(card.ring, card.activeBg) : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", card.iconBg)}>
                      <card.Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", card.iconColor)} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className={cn("text-2xl font-black tabular-nums tracking-tight leading-none", card.countColor)}>
                          {count.toLocaleString("es-MX")}
                        </p>
                        {isActive && (
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ring-1", card.activeBadge)}>
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-[11px] font-black uppercase tracking-widest text-slate-800 leading-none">
                        {card.label}
                      </p>
                      <p className="mt-1 truncate text-[10px] leading-snug text-slate-500">{card.sublabel}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {SECONDARY_FILTERS.map((filter) => {
                  const isActive = activeFilterId === filter.id
                  const count = filter.getCount(stats, criticalCount, globalTotal)
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => handleFilterClick(filter.id)}
                      className={cn(
                        "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-black uppercase tracking-wider transition-colors",
                        isActive
                          ? "border-blue-200 bg-blue-600 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
                      )}
                    >
                      <filter.Icon className="h-3.5 w-3.5" />
                      {filter.label}
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", isActive ? "bg-blue-100" : "bg-slate-100 text-slate-500")}>
                        {count.toLocaleString("es-MX")}
                      </span>
                    </button>
                  )
                })}
              </div>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex min-h-9 items-center justify-center gap-1 rounded-full px-3 text-[11px] font-black uppercase tracking-wider text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpiar filtros
                </button>
              )}
            </div>
          </section>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm font-semibold tracking-tight text-slate-500">Cargando reparaciones...</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="w-full overflow-x-auto">
                <BitacoraTable
                  repairs={repairs}
                  onRepairUpdated={handleRepairUpdated}
                  onRepairDeleted={handleRepairDeleted}
                  onEditTicket={(repair) => {
                    setEditingRepairId(repair.id)
                    setShowNewTicketModal(true)
                  }}
                />
              </div>
            </div>

            {repairs.length === 0 && (
              <div className="-mt-3 flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center shadow-sm sm:flex-row sm:items-center sm:justify-center sm:text-left">
                <p className="text-sm font-semibold text-slate-600">No hay tickets en esta vista.</p>
                <div className="flex justify-center gap-2">
                  {hasActiveFilter && (
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={clearFilters}>
                      Limpiar filtros
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 btn-glow"
                    onClick={openNewRepairPage}
                  >
                    Crear nuevo ticket
                  </Button>
                </div>
              </div>
            )}

            {totalRepairs > PAGE_SIZE && (
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalRepairs)} de {totalRepairs}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl border-slate-200 font-semibold" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-slate-200 font-semibold"
                    disabled={(page + 1) * PAGE_SIZE >= totalRepairs}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ReparacionesPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ReparacionesContent />
    </Suspense>
  )
}
