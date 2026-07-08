"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  getAllTalleres,
  searchTalleres,
  getAdminStats,
  type TallerForAdmin,
  type AdminStats,
} from "@/lib/actions/admin"
import { logoutTaller } from "@/lib/actions/auth-prisma"
import { ManagementPanel } from "@/components/admin/management-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertTriangle,
  Ban,
  Building2,
  ChevronRight,
  Clock,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Zap,
  XCircle,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Filtro = "todos" | "prueba" | "activo" | "suspendido" | "por_vencer"

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  alert,
}: {
  label: string
  value: number | null
  icon: React.ElementType
  colorClass: string
  alert?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 flex items-center gap-3 ${
        alert && (value ?? 0) > 0
          ? "border-red-800 bg-red-900/20"
          : "border-slate-200 bg-slate-100/60"
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        {value === null ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-500 mb-0.5" />
        ) : (
          <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
        )}
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mt-1 leading-tight">
          {label}
        </p>
      </div>
    </div>
  )
}

// ─── Talleres Table ───────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: TallerForAdmin["plan_tipo"] }) {
  if (plan === "activo") return <Badge className="bg-blue-600 text-white text-[10px]">Activo</Badge>
  if (plan === "suspendido") return <Badge variant="secondary" className="bg-slate-700 text-slate-600 text-[10px]">Suspendido</Badge>
  return <Badge variant="secondary" className="bg-amber-600/20 text-amber-300 text-[10px]">Prueba</Badge>
}

function ProBadge({ isPro }: { isPro: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={
        isPro
          ? "bg-purple-100 text-purple-700 border border-purple-200"
          : "bg-slate-700 text-slate-600 border border-slate-300"
      }
    >
      {isPro ? "PRO" : "FREE"}
    </Badge>
  )
}

function TalleresTable({
  talleres,
  onSelect,
}: {
  talleres: TallerForAdmin[]
  onSelect: (t: TallerForAdmin) => void
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 border-b border-slate-200">
          <tr>
            {["Taller", "Propietario / Email", "Plan", "Vencimiento", ""].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {talleres.map((t) => {
            const dias = t.dias_restantes
            const diasColor =
              dias === null ? "text-slate-500" :
              dias <= 0    ? "text-red-400 font-bold" :
              dias < 3     ? "text-red-400" :
              dias < 7     ? "text-amber-400" : "text-slate-600"

            return (
              <tr
                key={t.id}
                className="hover:bg-slate-100/60 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 truncate max-w-[180px]">
                      {t.nombre_taller}
                    </p>
                    {t.plan_activo && <ProBadge isPro />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-700 truncate max-w-[160px]">{t.nombre_propietario}</p>
                  <p className="text-xs text-slate-500 truncate max-w-[160px]">{t.email}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <PlanBadge plan={t.plan_tipo} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {t.fecha_vencimiento_plan ? (
                    <div>
                      <p className={`text-xs ${diasColor}`}>
                        {dias !== null && dias <= 0
                          ? "Vencido"
                          : dias !== null
                            ? `${dias}d restantes`
                            : "-"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(t.fecha_vencimiento_plan).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(t)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors py-1 px-2 rounded-lg hover:bg-blue-900/20"
                  >
                    Gestionar <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter()
  const [talleres, setTalleres] = useState<TallerForAdmin[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<TallerForAdmin | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError("")
    setSearchQuery("")
    const [talleresRes, statsRes] = await Promise.all([getAllTalleres(filtro), getAdminStats()])
    if (talleresRes.error) setError(talleresRes.error)
    else setTalleres(talleresRes.talleres)
    if (statsRes.stats) setStats(statsRes.stats)
    setLoading(false)
  }, [filtro])

  useEffect(() => { loadAll() }, [loadAll])

  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) { loadAll(); return }
    setLoading(true)
    const r = await searchTalleres(q)
    if (r.error) setError(r.error)
    else setTalleres(r.talleres)
    setLoading(false)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await logoutTaller()
    router.push("/auth/super-admin")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 leading-none truncate">ReparaHub Admin</h1>
              <p className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">Super Administrador</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={loadAll}
              disabled={loading}
              size="sm"
              variant="outline"
              className="border-slate-200 text-slate-600 hover:bg-slate-100 gap-1.5 h-8 px-3 text-xs"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button
              onClick={handleLogout}
              disabled={loggingOut}
              size="sm"
              variant="outline"
              className="border-red-900 text-red-400 hover:bg-red-900/20 gap-1.5 h-8 px-3 text-xs"
            >
              {loggingOut ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* ── Metric cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total" value={stats?.total ?? null} icon={Building2} colorClass="bg-slate-600" />
          <StatCard label="En prueba" value={stats?.prueba ?? null} icon={Clock} colorClass="bg-amber-600" />
          <StatCard label="Activos" value={stats?.activo ?? null} icon={Zap} colorClass="bg-blue-600" />
          <StatCard label="Suspendidos" value={stats?.suspendido ?? null} icon={Ban} colorClass="bg-slate-600" />
          <StatCard label="Vencidos" value={stats?.vencidos ?? null} icon={XCircle} colorClass="bg-red-700" alert />
          <StatCard label="Vencen &lt;3d" value={stats?.porVencer ?? null} icon={AlertTriangle} colorClass="bg-red-600" alert />
        </div>

        {/* ── Alert for expiring trials ─────────────────────────────────────── */}
        {filtro === "por_vencer" && talleres.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-red-800 bg-red-900/20 p-4">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-200">
              <strong>{talleres.length}</strong> taller(es) con acceso que vence en menos de 3 dias.
            </p>
          </div>
        )}

        {/* ── Search + filter ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar por nombre, propietario o email..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
            <SelectTrigger className="bg-slate-100 border-slate-200 text-slate-900 w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-100 border-slate-200 text-slate-900">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="prueba">Solo prueba</SelectItem>
              <SelectItem value="activo">Solo activos</SelectItem>
              <SelectItem value="suspendido">Suspendidos</SelectItem>
              <SelectItem value="por_vencer">Vencen en &lt;3 dias</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5 sm:justify-start shrink-0">
            <span className="text-xl font-black text-slate-900">{talleres.length}</span>
            <span className="text-xs text-slate-500 uppercase tracking-wide">resultados</span>
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-red-800 bg-red-900/20 p-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* ── Table / states ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            Cargando talleres...
          </div>
        ) : talleres.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-100/40 p-10 text-center">
            <p className="text-slate-500">No se encontraron talleres</p>
          </div>
        ) : (
          <TalleresTable
            talleres={talleres}
            onSelect={(t) => { setSelected(t); setPanelOpen(true) }}
          />
        )}
      </main>

      {/* ── Management panel ──────────────────────────────────────────────── */}
      <ManagementPanel
        taller={selected}
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        onUpdate={loadAll}
      />
    </div>
  )
}
