"use client"

import { Suspense, useEffect, useState, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import {
  Camera,
  Calendar,
  Clock,
  FilePenLine,
  FileText,
  Loader2,
  MoreHorizontal,
  Phone,
  Search,
  ShoppingBag,
  UserCheck,
  UserIcon,
  UserX,
  Wrench,
  X,
  XCircle,
  ZoomIn,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ActiveCustomerIndicator } from "@/components/dashboard/active-customer-indicator"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { Input } from "@/components/ui/input"
import {
  getVisitas,
  registrarVisitaManual,
  completarAtencionVisita,
  getCurrentTallerIdPublic,
  type BitacoraVisita,
} from "@/lib/actions/bitacora-visitas-prisma"
import { searchClientByPhone } from "@/lib/actions/repairs-prisma"
import { getMotivoLabel, type MotivoVisita } from "@/lib/utils/visitas"
import { useActiveCustomer } from "@/lib/context/active-customer-context"

function fmtDateFull(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
}

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function toLocalDateKey(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  return toLocalDateStr(date)
}

function groupByDay(visitas: BitacoraVisita[]): Map<string, BitacoraVisita[]> {
  const map = new Map<string, BitacoraVisita[]>()
  for (const v of visitas) {
    const day = v.fecha_dia_local || toLocalDateKey(v.fecha_hora_entrada)
    const list = map.get(day) || []
    list.push(v)
    map.set(day, list)
  }
  return map
}

const QUICK_PURPOSES: { value: MotivoVisita; label: string; icon: React.ReactNode }[] = [
  { value: "llamada", label: "Llamada telefonica", icon: <Phone className="h-5 w-5" /> },
  { value: "cotizacion", label: "Cotizacion", icon: <FileText className="h-5 w-5" /> },
  { value: "reparacion", label: "Seguimiento reparacion", icon: <Wrench className="h-5 w-5" /> },
  { value: "personal", label: "Personal", icon: <UserIcon className="h-5 w-5" /> },
  { value: "venta", label: "Buscar equipo / accesorio", icon: <ShoppingBag className="h-5 w-5" /> },
  { value: "otro", label: "Otro", icon: <MoreHorizontal className="h-5 w-5" /> },
]

function BitacoraVisitasContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeCustomer } = useActiveCustomer()
  const [visitas, setVisitas] = useState<BitacoraVisita[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"todos" | "pendiente" | "atendido" | "se_fue">("todos")
  const [tallerId, setTallerId] = useState<string | null>(null)
  const [tallerIdError, setTallerIdError] = useState(false)
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [photoZoom, setPhotoZoom] = useState<string | null>(null)
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false)
  const [editingVisita, setEditingVisita] = useState<BitacoraVisita | null>(null)

  useEffect(() => {
    if (!searchParams) return
    if (searchParams.get("quick") !== "1") return
    setQuickRegisterOpen(true)
    window.history.replaceState(null, "", "/dashboard/bitacora-visitas")
  }, [searchParams])

  useEffect(() => {
    getCurrentTallerIdPublic().then((id) => {
      if (id) {
        const hoy = toLocalDateStr(new Date())
        // React 18 batchea los 3 setState en un solo render para
        // evitar el "flash de TODAS las visitas" entre que llega el
        // tallerId y se setean las fechas de hoy.
        setTallerId(id)
        setDesde(hoy)
        setHasta(hoy)
      } else {
        setTallerIdError(true)
        setLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    // Esperamos a tener tallerId + fechas. Asi el primer fetch ya
    // sale con el rango "hoy" y NO dispara una query sin filtro
    // que muestre visitas de otros dias por un instante.
    if (!tallerId || !desde || !hasta) return
    async function load(id: string) {
      setLoading(true)
      try {
        const estado = filter === "todos" ? undefined : filter
        // desde/hasta se envian como "YYYY-MM-DD" puro. El server
        // los interpreta en la zona horaria del tenant (default
        // America/Mexico_City). Concatenar T00:00:00 aca era el
        // bug: el server parseaba en UTC y excluia visitas del
        // final del dia local.
        const { data } = await getVisitas({
          tallerId: id,
          estado,
          desde,
          hasta,
          limite: 500,
        })
        setVisitas(data)
      } catch {
        setVisitas([])
      } finally {
        setLoading(false)
      }
    }
    void load(tallerId)
  }, [tallerId, filter, desde, hasta])

  const reloadVisitas = useCallback(() => {
    if (!tallerId || !desde || !hasta) return
    const estado = filter === "todos" ? undefined : filter
    void getVisitas({
      tallerId,
      estado,
      desde,
      hasta,
      limite: 500,
    }).then(({ data }) => setVisitas(data))
  }, [tallerId, filter, desde, hasta])

  const grouped = useMemo(() => groupByDay(visitas), [visitas])

  const stats = {
    total: visitas.length,
    pendientes: visitas.filter((v) => v.estado_atencion === "pendiente").length,
    atendidos: visitas.filter((v) => v.estado_atencion === "atendido").length,
    seFueron: visitas.filter((v) => v.estado_atencion === "se_fue").length,
  }

  const openCotizacionFromVisita = useCallback((visita: BitacoraVisita) => {
    const params = new URLSearchParams()
    params.set("fromVisit", "1")
    params.set("visitaId", visita.id)

    if (visita.cliente_nombre) params.set("clienteNombre", visita.cliente_nombre)
    if (visita.cliente_telefono) params.set("clienteTelefono", visita.cliente_telefono)

    const isPhoneVisit = visita.evento_tipo === "telefono" || visita.motivo_visita === "llamada"
    params.set("origen", isPhoneVisit ? "Telefono" : "Mostrador")

    const descripcion = visita.motivo_otro || visita.notas || "Consulta registrada en bitacora de visitas"
    params.set("descripcion", descripcion)

    router.push(`/dashboard/cotizaciones/nueva?${params.toString()}`)
  }, [router])

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="flex w-full flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
        {/* Header */}
        <ModuleHeader
          icon={Camera}
          title="BITACORA DE VISITAS"
          eyebrow="DETECCION AUTOMATICA DE CLIENTES"
          description="Control diario de entradas, motivos de visita y atencion del equipo."
          stats={[
            {
              label: "Visitas",
              value: stats.total.toLocaleString("es-MX"),
              tone: "blue",
            },
          ]}
          actions={(
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button
                onClick={() => setQuickRegisterOpen(true)}
                disabled={!tallerId}
                className="h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider btn-glow"
              >
                <Camera className="h-4 w-4" />
                Registrar Visita
              </Button>
              <StatBadge label="Pendientes" value={stats.pendientes} color="red" />
              <StatBadge label="Atendidos" value={stats.atendidos} color="emerald" />
              <StatBadge label="Se fueron" value={stats.seFueron} color="slate" />
            </div>
          )}
        />

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <Input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="h-9 w-40 rounded-xl border-slate-200 bg-white text-xs font-semibold px-3"
            />
            <span className="text-xs text-slate-500">-</span>
            <Input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="h-9 w-40 rounded-xl border-slate-200 bg-white text-xs font-semibold px-3"
            />
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div className="flex flex-wrap gap-2">
            {([
              { key: "todos", label: "Todos" },
              { key: "pendiente", label: "Pendientes" },
              { key: "atendido", label: "Atendidos" },
              { key: "se_fue", label: "Se fueron" },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all border ${
                  filter === f.key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="space-y-6">
          {loading ? (
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-sm text-slate-500 mt-3 font-medium">Cargando visitas...</p>
            </div>
          ) : tallerIdError ? (
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12 text-center">
              <XCircle className="h-8 w-8 text-red-400 mb-3" />
              <p className="text-sm font-bold text-slate-700">No se pudo identificar el taller</p>
              <p className="text-xs text-slate-500 mt-1">Asegurate de haber iniciado sesion correctamente.</p>
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => router.push("/dashboard")}>
                Volver al inicio
              </Button>
            </div>
          ) : visitas.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12 text-center">
              <Search className="h-8 w-8 text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-500">No hay registros de visitas en este periodo</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([day, dayVisitas]) => (
              <div key={day} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-tight text-slate-700">
                    {fmtDateFull(`${day}T12:00:00`)}
                  </h2>
                  <span className="text-[10px] font-bold text-slate-500">
                    {dayVisitas.length} visita{dayVisitas.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/30">
                        <th className="px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Foto</th>
                        <th className="px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Hora</th>
                        <th className="px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Estado</th>
                        <th className="px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Cliente</th>
                        <th className="px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Contacto</th>
                        <th className="px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Motivo</th>
                        <th className="px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Atendido por</th>
                        <th className="px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {dayVisitas.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3">
                            {v.evento_tipo === "telefono" || v.motivo_visita === "llamada" ? (
                              <div
                                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600"
                                title="Llamada telefonica"
                              >
                                <Phone className="h-5 w-5" />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => v.foto_entrada_url && setPhotoZoom(v.foto_entrada_url)}
                                className="h-14 w-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 block relative group"
                                disabled={!v.foto_entrada_url}
                              >
                                {v.foto_entrada_url ? (
                                  <>
                                    <img
                                      src={v.foto_entrada_url}
                                      alt="Entrada"
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-slate-100/0 group-hover:bg-slate-200/75 transition-colors flex items-center justify-center">
                                      <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-slate-600">
                                    <Camera className="h-5 w-5" />
                                  </div>
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="text-xs font-black text-slate-900">{fmtTime(v.fecha_hora_entrada)}</div>
                            {v.fecha_hora_salida && (
                              <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                                Salida: {fmtTime(v.fecha_hora_salida)}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <EstadoBadge estado={v.estado_atencion} />
                          </td>
                          <td className="px-5 py-3">
                            <div className="text-xs font-bold text-slate-700">
                              {v.cliente_nombre || (
                                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                  Publico general
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {v.cliente_telefono ? (
                              <a
                                href={`https://api.whatsapp.com/send?phone=${v.cliente_telefono}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                              >
                                <Phone className="h-3 w-3" />
                                {v.cliente_telefono}
                              </a>
                            ) : (
                              <span className="text-xs font-semibold text-slate-500">Sin contacto</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="text-xs font-bold text-slate-700">
                              {getMotivoLabel(v.motivo_visita)}
                            </div>
                            {v.motivo_otro && (
                              <div className="text-[10px] text-slate-500">{v.motivo_otro}</div>
                            )}
                            {v.notas && (
                              <div className="text-[10px] text-slate-500 mt-0.5 italic max-w-[200px] truncate" title={v.notas}>
                                {v.notas}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="text-xs font-bold text-slate-600">
                              {v.atendido_por || "-"}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-2">
                              {v.motivo_visita === "cotizacion" ? (
                                <button
                                  type="button"
                                  onClick={() => openCotizacionFromVisita(v)}
                                  className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-black text-blue-700 hover:border-blue-300 hover:bg-blue-100 transition-all"
                                  title="Crear cotizacion con los datos de esta visita"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Cotizar
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => setEditingVisita(v)}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                title={v.estado_atencion === "pendiente" ? "Completar atencion" : "Editar visita"}
                              >
                                <FilePenLine className="h-3.5 w-3.5" />
                                {v.estado_atencion === "pendiente" ? "Atender" : "Editar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lightbox foto */}
      {photoZoom && (
        <div className="fixed inset-0 z-[200] bg-slate-100/95 flex items-center justify-center p-4" onClick={() => setPhotoZoom(null)}>
          <button type="button" onClick={() => setPhotoZoom(null)} className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-white hover:bg-blue-100 transition-colors">
            <X className="h-6 w-6" />
          </button>
          <img src={photoZoom} alt="Foto de entrada" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Quick register modal */}
      {quickRegisterOpen && (
        <QuickRegisterModal
          onClose={() => setQuickRegisterOpen(false)}
          onRegistrada={() => {
            setQuickRegisterOpen(false)
            reloadVisitas()
          }}
          initialClient={
            activeCustomer.mode === "selected"
              ? {
                  nombre: activeCustomer.nombre,
                  telefono: activeCustomer.telefono,
                }
              : null
          }
        />
      )}

      {/* Edit / completar atencion modal */}
      {editingVisita && (
        <CompletarAtencionModal
          visita={editingVisita}
          onClose={() => setEditingVisita(null)}
          onCompletada={() => {
            setEditingVisita(null)
            reloadVisitas()
          }}
        />
      )}
    </div>
  )
}

export default function BitacoraVisitasPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dashboard-surface flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    }>
      <BitacoraVisitasContent />
    </Suspense>
  )
}

/* ─── Quick Register Modal (solo nombre + telefono) ─── */

function QuickRegisterModal({
  onClose,
  onRegistrada,
  initialClient,
}: {
  onClose: () => void
  onRegistrada: () => void
  initialClient?: { nombre: string; telefono: string } | null
}) {
  const { activeCustomer } = useActiveCustomer()
  const [clienteNombre, setClienteNombre] = useState("")
  const [clienteTelefono, setClienteTelefono] = useState("")
  const [tipoRegistro, setTipoRegistro] = useState<"visita" | "llamada">("visita")
  const [clienteEncontrado, setClienteEncontrado] = useState(false)
  const [searchingClient, setSearchingClient] = useState(false)
  const [saving, setSaving] = useState(false)
  const usingSessionCustomer = activeCustomer.mode === "selected"
  const sessionCustomerNombre = usingSessionCustomer ? activeCustomer.nombre : ""
  const sessionCustomerTelefono = usingSessionCustomer ? activeCustomer.telefono : ""

  useEffect(() => {
    if (!initialClient) return
    setClienteTelefono(initialClient.telefono)
    setClienteNombre(initialClient.nombre)
    setClienteEncontrado(initialClient.telefono.replace(/\D/g, "").length >= 6)
  }, [initialClient])

  useEffect(() => {
    if (!usingSessionCustomer) return
    setClienteTelefono(sessionCustomerTelefono)
    setClienteNombre(sessionCustomerNombre)
    setClienteEncontrado(true)
  }, [sessionCustomerNombre, sessionCustomerTelefono, usingSessionCustomer])

  useEffect(() => {
    if (usingSessionCustomer) {
      setSearchingClient(false)
      return
    }
    const telefono = clienteTelefono.replace(/\D/g, "")
    if (telefono.length < 6) {
      setClienteEncontrado(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setSearchingClient(true)
      void searchClientByPhone(telefono)
        .then(({ client }) => {
          if (cancelled) return
          if (client) {
            setClienteNombre(client.nombre)
            setClienteEncontrado(true)
          } else {
            setClienteEncontrado(false)
          }
        })
        .finally(() => {
          if (!cancelled) setSearchingClient(false)
        })
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [clienteTelefono, usingSessionCustomer])

  const handleSubmit = useCallback(async (asPublic = false) => {
    const nombreFinal = asPublic
      ? undefined
      : usingSessionCustomer
        ? sessionCustomerNombre.trim() || undefined
        : clienteNombre.trim() || undefined
    const telefonoFinal = asPublic
      ? undefined
      : usingSessionCustomer
        ? sessionCustomerTelefono.trim() || undefined
        : clienteTelefono.trim() || undefined

    setSaving(true)
    const { success, error } = await registrarVisitaManual({
      eventoTipo: tipoRegistro === "llamada" ? "telefono" : "manual",
      motivoVisita: tipoRegistro === "llamada" ? "llamada" : undefined,
      clienteNombre: nombreFinal,
      clienteTelefono: telefonoFinal,
    })
    setSaving(false)

    if (!success) {
      toast.error(error || "Error al registrar visita")
      return
    }

    toast.success(tipoRegistro === "llamada" ? "Llamada registrada" : asPublic ? "Visita publico general" : "Visita Registrada")

    setClienteNombre("")
    setClienteTelefono("")
    setTipoRegistro("visita")
    setClienteEncontrado(false)
    onRegistrada()
  }, [clienteNombre, clienteTelefono, onRegistrada, sessionCustomerNombre, sessionCustomerTelefono, tipoRegistro, usingSessionCustomer])

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-200/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="relative h-36 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-slate-700">
            {tipoRegistro === "llamada" ? <Phone className="h-10 w-10" /> : <Camera className="h-10 w-10" />}
            <span className="text-[10px] font-black uppercase tracking-widest">Registro rapido</span>
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-slate-200/75 text-white flex items-center justify-center hover:bg-slate-200/75 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs leading-relaxed text-slate-500">
            Primero elige si fue visita en mostrador o llamada. Si ya tienes cliente en sesion, lo usaremos automaticamente.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipoRegistro("visita")}
              className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                tipoRegistro === "visita"
                  ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Camera className="h-4 w-4" />
              Visita
            </button>
            <button
              type="button"
              onClick={() => setTipoRegistro("llamada")}
              className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                tipoRegistro === "llamada"
                  ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Phone className="h-4 w-4" />
              Llamada
            </button>
          </div>

          <div className="space-y-3">
            <ActiveCustomerIndicator compact />

            {usingSessionCustomer ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-xs font-semibold text-blue-700">
                Esta visita se registrara con el cliente activo. Si necesitas otro cliente, cambialo en la barra superior.
              </div>
            ) : (
              <>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                  <input
                    type="tel"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    placeholder="Telefono del cliente"
                    autoFocus
                    className="w-full rounded-xl border border-blue-100 bg-blue-50/60 pl-9 pr-10 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                  {searchingClient && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />}
                </div>

                {clienteEncontrado && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    <UserCheck className="h-4 w-4" />
                    Cliente encontrado
                  </div>
                )}

                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => {
                      setClienteNombre(e.target.value)
                      if (clienteEncontrado) setClienteEncontrado(false)
                    }}
                    placeholder={clienteTelefono.replace(/\D/g, "").length >= 6 ? "Nombre si es cliente nuevo" : "Nombre opcional"}
                    readOnly={clienteEncontrado}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid gap-2">
            <Button
              onClick={() => void handleSubmit(false)}
              disabled={saving || searchingClient}
              className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-xs btn-glow"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => void handleSubmit(true)}
                disabled={saving}
                variant="outline"
                className="h-11 rounded-xl border-slate-200 text-slate-700 text-xs font-bold"
              >
                Publico general
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="h-11 rounded-xl border-slate-200 text-slate-600 text-xs font-bold"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Completar Atencion Modal ─── */

function CompletarAtencionModal({
  visita,
  onClose,
  onCompletada,
}: {
  visita: BitacoraVisita
  onClose: () => void
  onCompletada: () => void
}) {
  const [motivo, setMotivo] = useState<MotivoVisita | null>((visita.motivo_visita as MotivoVisita) || null)
  const [motivoOtro, setMotivoOtro] = useState(visita.motivo_otro || "")
  const [clienteNombre, setClienteNombre] = useState(visita.cliente_nombre || "")
  const [clienteTelefono, setClienteTelefono] = useState(visita.cliente_telefono || "")
  const [publicoGeneral, setPublicoGeneral] = useState(!visita.cliente_nombre && !visita.cliente_telefono)
  const [notas, setNotas] = useState(visita.notas || "")
  const [saving, setSaving] = useState(false)

  const isPendiente = visita.estado_atencion === "pendiente"

  const handleSubmit = useCallback(async () => {
    if (isPendiente && !motivo) {
      toast.error("Selecciona el motivo de la visita")
      return
    }
    if (isPendiente && motivo === "otro" && !motivoOtro.trim()) {
      toast.error("Especifica el motivo")
      return
    }

    setSaving(true)

    if (isPendiente) {
      const { success, error } = await completarAtencionVisita({
        visitaId: visita.id,
        motivoVisita: motivo!,
        motivoOtro: motivo === "otro" ? motivoOtro : undefined,
        notas: notas || undefined,
        clienteNombre: publicoGeneral ? undefined : clienteNombre.trim() || undefined,
        clienteTelefono: publicoGeneral ? undefined : clienteTelefono.trim() || undefined,
      })
      setSaving(false)
      if (!success) {
        toast.error(error || "Error al guardar")
        return
      }
      toast.success("Atencion completada")
    } else {
      const { success, error } = await registrarVisitaManual({
        motivoVisita: motivo || undefined,
        motivoOtro: motivo === "otro" ? motivoOtro : undefined,
        notas: notas || undefined,
        clienteNombre: publicoGeneral ? undefined : clienteNombre.trim() || undefined,
        clienteTelefono: publicoGeneral ? undefined : clienteTelefono.trim() || undefined,
      })
      setSaving(false)
      if (!success) {
        toast.error(error || "Error al guardar")
        return
      }
      toast.success("Visita actualizada")
    }

    onCompletada()
  }, [isPendiente, motivo, motivoOtro, clienteNombre, clienteTelefono, notas, publicoGeneral, visita.id, onCompletada])

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-200/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="relative h-36 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-slate-700">
            <UserCheck className="h-10 w-10" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isPendiente ? "COMPLETAR ATENCION" : "EDITAR VISITA"}
            </span>
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-slate-200/75 text-white flex items-center justify-center hover:bg-slate-200/75 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isPendiente && (
            <>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Motivo de la visita</h3>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_PURPOSES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setMotivo(p.value)}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 text-xs font-bold transition-all ${
                      motivo === p.value
                        ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className={motivo === p.value ? "text-blue-500" : "text-slate-500"}>{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>
              {motivo === "otro" && (
                <input
                  type="text"
                  value={motivoOtro}
                  onChange={(e) => setMotivoOtro(e.target.value)}
                  placeholder="Especifica el motivo..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              )}
            </>
          )}

          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3">
              {isPendiente ? "Datos del cliente" : "Editar datos"}
            </h3>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPublicoGeneral(false)
                }}
                className={`rounded-xl border px-3.5 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                  !publicoGeneral
                    ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                Cliente
              </button>
              <button
                type="button"
                onClick={() => {
                  setPublicoGeneral(true)
                  setClienteNombre("")
                  setClienteTelefono("")
                }}
                className={`rounded-xl border px-3.5 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                  publicoGeneral
                    ? "border-slate-500 bg-white text-slate-900 ring-1 ring-slate-900"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                Publico general
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Nombre"
                  disabled={publicoGeneral}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="tel"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="Telefono"
                  disabled={publicoGeneral}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
            </div>
            {publicoGeneral && (
              <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                Esta visita quedara sin cliente vinculado y no contara para historial ni recompensas.
              </p>
            )}
          </div>

          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Notas (opcional)..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />

          <div className="flex gap-2">
            <Button
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-xs btn-glow"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPendiente ? (
                "Completar atencion"
              ) : (
                "Guardar cambios"
              )}
            </Button>
            <Button onClick={onClose} variant="outline" className="h-11 rounded-xl border-slate-200 text-slate-600 text-xs font-bold">
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Estado Badge ─── */

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { text: string; icon: React.ReactNode; classes: string }> = {
    pendiente: {
      text: "Pendiente",
      icon: <Clock className="h-3 w-3" />,
      classes: "bg-amber-50 text-amber-600 border-amber-100",
    },
    atendido: {
      text: "Atendido",
      icon: <UserCheck className="h-3 w-3" />,
      classes: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
    no_atendido: {
      text: "No atendido",
      icon: <XCircle className="h-3 w-3" />,
      classes: "bg-red-50 text-red-600 border-red-100",
    },
    se_fue: {
      text: "Se fue",
      icon: <UserX className="h-3 w-3" />,
      classes: "bg-slate-100 text-slate-500 border-slate-200",
    },
  }

  const config = map[estado] || map.pendiente

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${config.classes}`}>
      {config.icon}
      {config.text}
    </span>
  )
}

/* ─── Stat Badge ─── */

function StatBadge({ label, value, color }: { label: string; value: number; color: "slate" | "red" | "emerald" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-50 text-red-600",
    emerald: "bg-emerald-50 text-emerald-600",
  }
  return (
    <div className={`rounded-2xl px-4 py-2 text-center ${colors[color]}`}>
      <div className="text-lg font-black leading-none">{value}</div>
      <div className="text-[9px] font-black uppercase tracking-wider mt-1 opacity-70">{label}</div>
    </div>
  )
}
