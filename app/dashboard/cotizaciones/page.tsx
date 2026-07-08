"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { CotizacionesHeader } from "@/components/dashboard/cotizaciones/cotizaciones-header"
import { CotizacionesStats, type OrigenStatsData } from "@/components/dashboard/cotizaciones/cotizaciones-stats"
import { CotizacionesToolbar, type FiltroCotizaciones } from "@/components/dashboard/cotizaciones/cotizaciones-toolbar"
import { CotizacionesEmptyState } from "@/components/dashboard/cotizaciones/cotizaciones-empty-state"
import { CotizacionesList } from "@/components/dashboard/cotizaciones/cotizaciones-list"
import { CotizacionForm, type CotizacionDraft, type OrigenConsulta } from "@/components/dashboard/cotizaciones/cotizacion-form"
import { CotizacionDetail } from "@/components/dashboard/cotizaciones/cotizacion-detail"
import {
  buildCotizacionWhatsAppLink,
  convertirCotizacionAReparacion,
  createCotizacion,
  getCotizacionOrigenStats,
  getCotizaciones,
  setCotizacionEstado,
  type Cotizacion,
  type CotizacionInput,
  updateCotizacion,
} from "@/lib/actions/cotizaciones"
import { getEsUsuarioPro } from "@/lib/actions/auth-prisma"
import { useActiveCustomer } from "@/lib/context/active-customer-context"

function safeOrigen(value: string | null): OrigenConsulta {
  if (value === "WhatsApp" || value === "Telefono" || value === "Internet") return value
  return "Mostrador"
}

function readVisitDraftFromUrl(): CotizacionDraft | null {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  if (params.get("fromVisit") !== "1") return null

  const clienteNombre = params.get("clienteNombre")?.trim() ?? ""
  const clienteTelefono = params.get("clienteTelefono")?.trim() ?? ""
  const descripcion = params.get("descripcion")?.trim() ?? ""
  const origen = safeOrigen(params.get("origen"))
  const visitaId = params.get("visitaId")?.trim()

  if (!clienteNombre && !clienteTelefono && !descripcion) return null

  return {
    cliente_nombre: clienteNombre,
    cliente_telefono: clienteTelefono || null,
    descripcion,
    origen,
    observaciones: [
      `Origen: ${origen}`,
      "Generada desde bitacora de visitas.",
      visitaId ? `Visita: ${visitaId}` : "",
    ].filter(Boolean).join("\n"),
  }
}

export default function CotizacionesPage() {
  const router = useRouter()
  const { activeCustomer, setActiveCustomer } = useActiveCustomer()
  const [isPro, setIsPro] = useState(false)
  const [checkingPro, setCheckingPro] = useState(true)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filtro, setFiltro] = useState<FiltroCotizaciones>("todas")
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])

  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editing, setEditing] = useState<Cotizacion | null>(null)
  const [draft, setDraft] = useState<CotizacionDraft | null>(null)
  const [visitDraftHandled, setVisitDraftHandled] = useState(false)
  const [selected, setSelected] = useState<Cotizacion | null>(null)
  const [origenStats, setOrigenStats] = useState<OrigenStatsData | null>(null)

  const loadCotizaciones = async (nextFiltro = filtro, nextSearch = search) => {
    setLoading(true)
    try {
      const [list, statsRes] = await Promise.all([
        getCotizaciones({ estado: nextFiltro, search: nextSearch }),
        getCotizacionOrigenStats(),
      ])
      if (list.error) {
        toast({ variant: "destructive", title: "Error", description: list.error })
      } else {
        setCotizaciones(list.data)
      }
      if (!statsRes.error && statsRes.data) {
        setOrigenStats(statsRes.data)
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Error inesperado al cargar cotizaciones." })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const pro = await getEsUsuarioPro()
      if (!cancelled) {
        setIsPro(Boolean(pro))
        setCheckingPro(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (checkingPro || !isPro) return
    loadCotizaciones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingPro, isPro])

  useEffect(() => {
    if (checkingPro || !isPro || visitDraftHandled) return
    const nextDraft = readVisitDraftFromUrl()
    setVisitDraftHandled(true)
    if (!nextDraft) return

    setEditing(null)
    setDraft(nextDraft)
    setFormOpen(true)
    window.history.replaceState(null, "", "/dashboard/cotizaciones")
    toast({
      title: "Cotizacion desde visita",
      description: "Cliente y origen fueron prellenados desde la bitacora.",
      variant: "info",
    })
  }, [checkingPro, isPro, visitDraftHandled])

  const activeCustomerDraft = useMemo<CotizacionDraft | null>(() => {
    if (activeCustomer.mode !== "selected") return null
    return {
      cliente_id: activeCustomer.id || null,
      cliente_nombre: activeCustomer.nombre,
      cliente_telefono: activeCustomer.telefono,
    }
  }, [activeCustomer])

  useEffect(() => {
    if (checkingPro || !isPro) return
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("new") !== "1") return
    router.replace("/dashboard/cotizaciones/nueva")
  }, [checkingPro, isPro, router])

  const stats = useMemo(() => {
    const total = cotizaciones.length
    const pendientes = cotizaciones.filter((cot) => cot.estado === "pendiente").length
    const aceptadas = cotizaciones.filter((cot) => cot.estado === "aceptada").length
    const rechazadas = cotizaciones.filter((cot) => cot.estado === "rechazada").length
    return { total, pendientes, aceptadas, rechazadas }
  }, [cotizaciones])

  const effectiveDraft = useMemo<CotizacionDraft | null>(() => {
    if (editing) return null
    if (!draft && activeCustomerDraft) return activeCustomerDraft
    if (!draft) return null
    if (!activeCustomerDraft) return draft
    return {
      ...draft,
      cliente_id: draft.cliente_id ?? activeCustomerDraft.cliente_id,
      cliente_nombre: draft.cliente_nombre || activeCustomerDraft.cliente_nombre,
      cliente_telefono: draft.cliente_telefono || activeCustomerDraft.cliente_telefono,
    }
  }, [activeCustomerDraft, draft, editing])

  const handleSave = async (input: CotizacionInput) => {
    const result = editing ? await updateCotizacion(editing.id, input) : await createCotizacion(input)
    if (result.error) {
      toast({ variant: "destructive", title: "Error", description: result.error })
      return
    }
    if (input.cliente_nombre.trim() && input.cliente_telefono?.trim()) {
      setActiveCustomer({
        id: input.cliente_id ?? "",
        nombre: input.cliente_nombre.trim(),
        telefono: input.cliente_telefono.trim(),
        correo: "",
      })
    }
    toast({ title: editing ? "Cotizacion actualizada" : "Cotizacion creada" })
    setEditing(null)
    await loadCotizaciones()
  }

  const handleWhatsApp = async (cotizacion: Cotizacion) => {
    const { url, error } = await buildCotizacionWhatsAppLink(cotizacion)
    if (error || !url) {
      toast({ variant: "destructive", title: "WhatsApp", description: error || "No se pudo abrir WhatsApp." })
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleConvert = async (cotizacion: Cotizacion) => {
    const res = await convertirCotizacionAReparacion(cotizacion.id)
    if (!res.success) {
      toast({ variant: "destructive", title: "Conversion", description: res.error || "No se pudo convertir." })
      return
    }
    toast({ title: "Cotizacion convertida", description: `Se creo la reparacion ${res.folioReparacion ?? ""}`.trim() })
    await loadCotizaciones()
  }

  const handleSetEstado = async (cotizacion: Cotizacion, estado: "aceptada" | "rechazada") => {
    const { error } = await setCotizacionEstado(cotizacion.id, estado)
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error })
      return
    }
    toast({ title: "Estado actualizado", description: `Cotizacion marcada como ${estado}.` })
    await loadCotizaciones()
  }

  const handleDuplicate = (cotizacion: Cotizacion) => {
    router.push(`/dashboard/cotizaciones/nueva?dup=${encodeURIComponent(cotizacion.id)}`)
  }

  if (checkingPro) {
    return (
      <div className="min-h-screen bg-dashboard-surface">
        <div className="flex min-h-[70vh] w-full items-center justify-center px-4 py-8 text-sm text-slate-500 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          Validando acceso PRO...
        </div>
      </div>
    )
  }

  if (!isPro) {
    return (
      <div className="min-h-screen bg-dashboard-surface">
        <div className="flex w-full min-w-0 flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
          <CotizacionesHeader onCreate={() => {}} />
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Lock className="h-7 w-7 text-slate-500" />
            </div>
            <h2 className="mt-4 text-2xl font-black text-slate-900">Modulo disponible en PLAN PRO</h2>
            <p className="mt-2 text-sm text-slate-500">
              Activa tu plan PRO para generar cotizaciones y convertirlas a reparacion en un clic.
            </p>
            <Button className="btn-glow mt-5 h-11 rounded-xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700" asChild>
              <a href="/dashboard/facturacion">Ir a Mi suscripcion</a>
            </Button>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="flex w-full min-w-0 flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
        <CotizacionesHeader
          onCreate={() => {
            router.push("/dashboard/cotizaciones/nueva")
          }}
        />

        <CotizacionesStats stats={stats} origenStats={origenStats} />

        <CotizacionesToolbar
          search={search}
          onSearch={async (value) => {
            setSearch(value)
            await loadCotizaciones(filtro, value)
          }}
          filtro={filtro}
          onFiltro={async (value) => {
            setFiltro(value)
            await loadCotizaciones(value, search)
          }}
        />

        {loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
            Cargando cotizaciones...
          </section>
        ) : cotizaciones.length === 0 ? (
          <CotizacionesEmptyState
            onCreate={() => {
              router.push("/dashboard/cotizaciones/nueva")
            }}
          />
        ) : (
          <CotizacionesList
            data={cotizaciones}
            onDetail={(cotizacion) => {
              setSelected(cotizacion)
              setDetailOpen(true)
            }}
            onEdit={(cotizacion) => {
              setEditing(cotizacion)
              setDraft(null)
              setFormOpen(true)
            }}
            onWhatsApp={handleWhatsApp}
            onConvert={handleConvert}
            onSetAceptada={(cotizacion) => handleSetEstado(cotizacion, "aceptada")}
            onSetRechazada={(cotizacion) => handleSetEstado(cotizacion, "rechazada")}
            onDuplicate={handleDuplicate}
          />
        )}
      </div>

      <CotizacionForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setEditing(null)
            setDraft(null)
          }
        }}
        initial={editing}
        draft={effectiveDraft}
        onSubmit={handleSave}
      />

      <CotizacionDetail
        open={detailOpen}
        onOpenChange={setDetailOpen}
        cotizacion={selected}
      />
    </div>
  )
}
