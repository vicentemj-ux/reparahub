"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Copy,
  FileText,
  Gamepad2,
  Laptop,
  Monitor,
  Plus,
  Printer,
  Search,
  Send,
  Smartphone,
  Star,
  Trash2,
  Tv,
  Watch,
  UserRound,
  X,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useActiveCustomer } from "@/lib/context/active-customer-context"
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface"
import {
  buildCotizacionWhatsAppLink,
  createCotizacion,
  getCotizacionById,
  type CotizacionInput,
  type CotizacionItemInput,
  type CotizacionOrigen,
} from "@/lib/actions/cotizaciones"
import { searchClientByPhone } from "@/lib/actions/repairs-prisma"
import { getRecommendedRepairBrands } from "@/lib/reparaciones/device-catalog"
import {
  clearNuevaCotizacionDraft,
  loadNuevaCotizacionDraft,
  saveNuevaCotizacionDraft,
  type NuevaCotizacionDraftV1,
} from "@/lib/offline/cotizacion-draft"
import { cn } from "@/lib/utils"

type ClientStatus = "idle" | "searching" | "found" | "new" | "invalid"

interface ItemState {
  descripcion: string
  precio_unitario: string
  orden: number
}

const ORIGENES: CotizacionOrigen[] = ["Mostrador", "WhatsApp", "Telefono", "Internet"]
const EMPTY_ITEM: ItemState = { descripcion: "", precio_unitario: "0", orden: 0 }
const DRAFT_AUTOSAVE_MS = 2000

const EQUIPOS_RAPIDOS = [
  { value: "Celular", label: "Celular", icon: <Smartphone className="h-4 w-4" /> },
  { value: "Tablet", label: "Tablet", icon: <Monitor className="h-4 w-4" /> },
  { value: "Laptop", label: "Laptop", icon: <Laptop className="h-4 w-4" /> },
  { value: "Computadora", label: "Computadora", icon: <Monitor className="h-4 w-4" /> },
  { value: "Videojuego", label: "Videojuego", icon: <Gamepad2 className="h-4 w-4" /> },
  { value: "Impresora", label: "Impresora", icon: <Printer className="h-4 w-4" /> },
  { value: "Reloj", label: "Reloj", icon: <Watch className="h-4 w-4" /> },
  { value: "Proyector", label: "Proyector", icon: <Tv className="h-4 w-4" /> },
  { value: "Otro", label: "Otro", icon: <FileText className="h-4 w-4" /> },
] as const

function getEquipoRapidoMeta(value: string) {
  return EQUIPOS_RAPIDOS.find((item) => item.value === value) ?? EQUIPOS_RAPIDOS[0]
}

function normalizePhone(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "").slice(0, 15)
}

function safeOrigen(value: string | null | undefined): CotizacionOrigen {
  if (value === "WhatsApp" || value === "Telefono" || value === "Internet") return value
  return "Mostrador"
}

function readVisitDraft(params: URLSearchParams): Partial<NuevaCotizacionDraftV1> | null {
  if (params.get("fromVisit") !== "1") return null
  const clienteNombre = params.get("clienteNombre")?.trim() ?? ""
  const clienteTelefono = params.get("clienteTelefono")?.trim() ?? ""
  const descripcion = params.get("descripcion")?.trim() ?? ""
  const origen = safeOrigen(params.get("origen"))

  if (!clienteNombre && !clienteTelefono && !descripcion) return null
  return {
    clienteNombre,
    clienteTelefono,
    descripcion,
    origen,
  }
}

function addDaysIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function money(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function reordenarOrdenes(items: ItemState[]): ItemState[] {
  return items.map((it, idx) => ({ ...it, orden: idx }))
}

export function NuevaCotizacionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeCustomer, setActiveCustomer } = useActiveCustomer()

  const [loading, setLoading] = useState(false)
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [clienteNombre, setClienteNombre] = useState("")
  const [clienteTelefono, setClienteTelefono] = useState("")
  const [clientStatus, setClientStatus] = useState<ClientStatus>("idle")
  const [equipoTipo, setEquipoTipo] = useState("Celular")
  const [selectedBrand, setSelectedBrand] = useState("")
  const [customBrand, setCustomBrand] = useState("")
  const [showCustomBrand, setShowCustomBrand] = useState(false)
  const [modelo, setModelo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [origenConsulta, setOrigenConsulta] = useState<CotizacionOrigen>("Mostrador")
  const [fechaExpiracion, setFechaExpiracion] = useState(addDaysIso(7))
  const [items, setItems] = useState<ItemState[]>([{ ...EMPTY_ITEM }])

  // Modales / dialogs
  const [successDialog, setSuccessDialog] = useState<{ folio: string; whatsappUrl: string | null; message?: string } | null>(null)
  const [draftPrompt, setDraftPrompt] = useState<NuevaCotizacionDraftV1 | null>(null)
  const [confirmLimpiar, setConfirmLimpiar] = useState(false)

  // Hydrate from visit draft, active customer, or duplicate (?dup=<id>)
  const visitDraft = useMemo(() => readVisitDraft(searchParams), [searchParams])
  const dupId = searchParams.get("dup")
  const [dupApplied, setDupApplied] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (dupId && !dupApplied) {
        const { data } = await getCotizacionById(dupId)
        if (cancelled) return
        if (data) {
          setEquipoTipo(data.equipo_tipo)
          setSelectedBrand(data.marca)
          setCustomBrand("")
          setShowCustomBrand(false)
          setModelo(data.modelo)
          setDescripcion(data.descripcion ?? "")
          setObservaciones("")
          setOrigenConsulta(data.origen)
          if (data.fecha_expiracion) setFechaExpiracion(data.fecha_expiracion)
          setItems(
            data.items.length > 0
              ? data.items.map((it, idx) => ({
                  descripcion: it.descripcion,
                  precio_unitario: String(it.precio_unitario),
                  orden: idx,
                }))
              : [{ ...EMPTY_ITEM }],
          )
          toast({ variant: "info", title: "Cotizacion duplicada", description: "Items y equipo pre-rellenados. Ajusta precio si cambia." })
        }
        setDupApplied(true)
        return
      }
      if (visitDraft) {
        setClienteNombre(visitDraft.clienteNombre ?? "")
        setClienteTelefono(normalizePhone(visitDraft.clienteTelefono ?? ""))
        setDescripcion(visitDraft.descripcion ?? "")
        setOrigenVisita(visitDraft.origen ?? "Mostrador")
      } else if (activeCustomer.mode === "selected") {
        setClienteId(activeCustomer.id || null)
        setClienteNombre(activeCustomer.nombre || "")
        setClienteTelefono(normalizePhone(activeCustomer.telefono || ""))
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [activeCustomer, dupApplied, dupId, visitDraft])

  function setOrigenVisita(o: CotizacionOrigen) {
    setOrigenConsulta(o)
  }

  // Cargar borrador de IndexedDB al montar (si no viene de dup/visit)
  useEffect(() => {
    if (dupId || visitDraft) return
    let cancelled = false
    const run = async () => {
      const draft = await loadNuevaCotizacionDraft()
      if (cancelled || !draft) return
      // Solo mostrar prompt si hay datos reales (no solo defaults)
      const hasContent =
        draft.clienteTelefono ||
        draft.clienteNombre ||
        draft.modelo ||
        draft.descripcion ||
        draft.items.some((it) => it.descripcion.trim())
      if (!hasContent) return
      setDraftPrompt(draft)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [dupId, visitDraft])

  const applyDraft = (d: NuevaCotizacionDraftV1) => {
    setClienteId(d.clienteId)
    setClienteNombre(d.clienteNombre)
    setClienteTelefono(d.clienteTelefono)
    setEquipoTipo(d.equipoTipo)
    setSelectedBrand(d.selectedBrand)
    setCustomBrand(d.customBrand)
    setShowCustomBrand(d.showCustomBrand)
    setModelo(d.modelo)
    setDescripcion(d.descripcion)
    setObservaciones(d.observaciones)
    setOrigenConsulta(d.origen)
    setFechaExpiracion(d.fechaExpiracion)
    setItems(d.items.length > 0 ? d.items : [{ ...EMPTY_ITEM }])
    setDraftPrompt(null)
  }

  const discardDraft = async () => {
    await clearNuevaCotizacionDraft()
    setDraftPrompt(null)
  }

  // Búsqueda de cliente por teléfono
  useEffect(() => {
    const digits = normalizePhone(clienteTelefono)
    if (digits.length === 0) {
      setClientStatus("idle")
      setClienteId(null)
      return
    }
    if (digits.length < 6) {
      setClientStatus("invalid")
      setClienteId(null)
      return
    }

    let cancelled = false
    setClientStatus("searching")
    const timer = window.setTimeout(async () => {
      const { client } = await searchClientByPhone(digits)
      if (cancelled) return
      if (client) {
        setClienteId(client.id)
        setClienteNombre(client.nombre || "")
        setClienteTelefono(normalizePhone(client.telefono || digits))
        setClientStatus("found")
      } else {
        setClienteId(null)
        setClientStatus("new")
      }
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [clienteTelefono])

  const recommendedBrands = useMemo(() => getRecommendedRepairBrands(equipoTipo), [equipoTipo])
  const marca = showCustomBrand ? customBrand : selectedBrand

  // Cuando cambia tipo de equipo, validar marca seleccionada
  useEffect(() => {
    if (!selectedBrand || showCustomBrand || recommendedBrands.includes(selectedBrand)) return
    setSelectedBrand("")
  }, [recommendedBrands, selectedBrand, showCustomBrand])

  const applyBrand = useCallback(
    (rawBrand?: string | null, deviceType = equipoTipo) => {
      const nextBrand = (rawBrand ?? "").trim()
      const known = getRecommendedRepairBrands(deviceType)
      if (!nextBrand) {
        setSelectedBrand("")
        setCustomBrand("")
        setShowCustomBrand(false)
        return
      }
      if (known.includes(nextBrand)) {
        setSelectedBrand(nextBrand)
        setCustomBrand("")
        setShowCustomBrand(false)
        return
      }
      setSelectedBrand("")
      setCustomBrand(nextBrand)
      setShowCustomBrand(true)
    },
    [equipoTipo],
  )

  const parsedItems = useMemo<CotizacionItemInput[]>(
    () =>
      items
        .map((item) => ({
          descripcion: item.descripcion.trim(),
          cantidad: 1,
          precio_unitario: Number(item.precio_unitario || 0),
          orden: item.orden,
        }))
        .filter((item) => item.descripcion && item.precio_unitario >= 0),
    [items],
  )
  const sumaOpciones = useMemo(
    () => parsedItems.reduce((acc, item) => acc + item.precio_unitario, 0),
    [parsedItems],
  )

  const hasPhone = normalizePhone(clienteTelefono).length >= 6
  const hasClientName = clienteNombre.trim().length > 1
  const hasConcept = parsedItems.length > 0 && sumaOpciones > 0
  const canSubmit = hasPhone && hasClientName && hasConcept

  const usingSessionCustomer =
    activeCustomer.mode === "selected" && normalizePhone(activeCustomer.telefono) === normalizePhone(clienteTelefono)
  const sessionCustomerNombre = usingSessionCustomer && activeCustomer.mode === "selected" ? activeCustomer.nombre : ""
  const sessionCustomerTelefono = usingSessionCustomer && activeCustomer.mode === "selected" ? activeCustomer.telefono : ""

  const clientStatusCopy = {
    idle: "Ingresa telefono para buscar o crear cliente",
    searching: "Buscando cliente...",
    found: "Cliente encontrado",
    new: "Cliente nuevo, se creara al guardar",
    invalid: "Telefono muy corto",
  }[clientStatus]

  const setItemField = (idx: number, key: keyof ItemState, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)))
  }

  const addItem = () => {
    setItems((prev) => reordenarOrdenes([...prev, { ...EMPTY_ITEM, orden: prev.length }]))
  }

  const removeItem = (idx: number) => {
    setItems((prev) => reordenarOrdenes(prev.filter((_, i) => i !== idx)))
  }

  const setPrincipal = (idx: number) => {
    setItems((prev) =>
      prev.map((it, i) => ({
        ...it,
        orden: i === idx ? 0 : it.orden === 0 ? 1 : it.orden,
      })),
    )
  }

  // Auto-save borrador cada DRAFT_AUTOSAVE_MS ms (debounced)
  const autosaveTimer = useRef<number | null>(null)
  useEffect(() => {
    if (dupId) return
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current)
    autosaveTimer.current = window.setTimeout(() => {
      const draft: NuevaCotizacionDraftV1 = {
        v: 1,
        savedAt: Date.now(),
        clienteId,
        clienteNombre,
        clienteTelefono,
        equipoTipo,
        selectedBrand,
        customBrand,
        showCustomBrand,
        modelo,
        descripcion,
        observaciones,
        origen: origenConsulta,
        fechaExpiracion,
        items: items.filter((it) => it.descripcion.trim() || Number(it.precio_unitario) > 0),
      }
      void saveNuevaCotizacionDraft(draft)
    }, DRAFT_AUTOSAVE_MS)
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current)
    }
  }, [
    clienteId,
    clienteNombre,
    clienteTelefono,
    equipoTipo,
    selectedBrand,
    customBrand,
    showCustomBrand,
    modelo,
    descripcion,
    observaciones,
    origenConsulta,
    fechaExpiracion,
    items,
    dupId,
  ])

  const limpiarTodo = useCallback(() => {
    if (items.some((it) => Number(it.precio_unitario) > 0)) {
      setConfirmLimpiar(true)
      return
    }
    doLimpiar()
  }, [items])

  const doLimpiar = async () => {
    setClienteId(null)
    setClienteNombre("")
    setClienteTelefono("")
    setClientStatus("idle")
    setEquipoTipo("Celular")
    setSelectedBrand("")
    setCustomBrand("")
    setShowCustomBrand(false)
    setModelo("")
    setDescripcion("")
    setObservaciones("")
    setOrigenConsulta("Mostrador")
    setFechaExpiracion(addDaysIso(7))
    setItems([{ ...EMPTY_ITEM }])
    await clearNuevaCotizacionDraft()
    setConfirmLimpiar(false)
  }

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault()
    if (!canSubmit) {
      const faltantes = [
        !hasClientName ? "captura el nombre del cliente" : null,
        !hasPhone ? "agrega un telefono valido" : null,
        !hasConcept ? "agrega al menos un concepto con precio" : null,
      ].filter(Boolean)
      toast({ variant: "warning", title: "Faltan datos para guardar", description: faltantes.join(", ") })
      return
    }

    const payload: CotizacionInput = {
      cliente_id: clienteId,
      cliente_nombre: clienteNombre.trim(),
      cliente_telefono: normalizePhone(clienteTelefono),
      equipo_tipo: equipoTipo.trim() || "Celular",
      marca: marca.trim(),
      modelo: modelo.trim(),
      descripcion: descripcion.trim(),
      origen: origenConsulta,
      observaciones: observaciones.trim() || null,
      descuento: 0,
      fecha_expiracion: fechaExpiracion || null,
      items: parsedItems,
    }

    setLoading(true)
    const result = await createCotizacion(payload)
    setLoading(false)

    if (result.error || !result.data) {
      toast({ variant: "destructive", title: "Error", description: result.error || "No se pudo guardar." })
      return
    }

    if (payload.cliente_nombre.trim() && payload.cliente_telefono?.trim()) {
      setActiveCustomer({
        id: result.data.cliente_id ?? payload.cliente_id ?? "",
        nombre: payload.cliente_nombre.trim(),
        telefono: payload.cliente_telefono.trim(),
        correo: "",
      })
    }

    await clearNuevaCotizacionDraft()

    // Construir el link de WhatsApp para que el usuario lo envie manualmente
    // desde el dialogo de exito (donde puede revisar la vista previa antes).
    let whatsappUrl: string | null = null
    let message: string | undefined
    try {
      const wa = await buildCotizacionWhatsAppLink(result.data)
      if (wa.url) {
        whatsappUrl = wa.url
        message = wa.message
      }
    } catch {
      /* noop */
    }

    toast({
      title: "Cotizacion creada",
      description: `${result.data.folio} lista para seguimiento.`,
    })
    setSuccessDialog({ folio: result.data.folio, whatsappUrl, message })
  }

  // Atajos: Cmd/Ctrl+Enter guarda, Esc cierra dialog de exito
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (successDialog && e.key === "Escape") {
        e.preventDefault()
        setSuccessDialog(null)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        void handleSubmit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successDialog, canSubmit, hasPhone, hasClientName, hasConcept, parsedItems, clienteId, clienteNombre, clienteTelefono, equipoTipo, marca, modelo, descripcion, observaciones, origenConsulta, fechaExpiracion, items])

  const onItemKey = (e: KeyboardEvent<HTMLInputElement>, idx: number, field: "descripcion" | "precio") => {
    if (e.key !== "Enter") return
    e.preventDefault()
    if (field === "descripcion") {
      // Enter en descripcion enfoca precio del mismo item
      const priceInput = document.querySelector<HTMLInputElement>(
        `input[data-item-idx="${idx}"][data-field="precio"]`,
      )
      priceInput?.focus()
    } else {
      // Enter en precio del ultimo item crea uno nuevo
      if (idx === items.length - 1) {
        addItem()
        requestAnimationFrame(() => {
          const newInput = document.querySelector<HTMLInputElement>(
            `input[data-item-idx="${idx + 1}"][data-field="descripcion"]`,
          )
          newInput?.focus()
        })
      }
    }
  }

  return (
    <div
      className="min-h-full text-slate-900"
      style={{ backgroundColor: DASHBOARD_SURFACE }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault()
          void handleSubmit()
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full min-w-0 flex-col gap-5 px-3 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8 xl:px-10 2xl:px-12"
      >
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white/70 px-4 py-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)] backdrop-blur sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Cotizaciones</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">Nueva cotizacion</h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
              Captura al cliente, define el equipo y cotiza una o varias opciones. Al guardar veras la cotizacion
              creada y podras decidir si la envias por WhatsApp desde el dialogo de exito.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <OrigenPicker value={origenConsulta} onChange={setOrigenConsulta} />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                asChild
              >
                <Link href="/dashboard/cotizaciones">
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Volver
                </Link>
              </Button>
              <Button
                type="button"
                onClick={limpiarTodo}
                className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="btn-glow h-10 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                <Send className="mr-1.5 h-4 w-4" />
                {loading ? "Guardando..." : "Guardar cotizacion"}
              </Button>
            </div>
          </div>
        </div>

        {/* Bloques */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Cliente */}
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <SectionHeader number={1} eyebrow="Cliente" title="Telefono primero" tone="blue" />
              <div className="space-y-3">
                {usingSessionCustomer ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">Cliente en sesion</p>
                      <p className="truncate text-sm font-black text-slate-950">{sessionCustomerNombre}</p>
                      <p className="text-xs font-semibold text-emerald-700">{sessionCustomerTelefono}</p>
                    </div>
                  </div>
                ) : null}
                <Field label="Telefono del cliente" hint="Minimo 6 digitos para detectar cliente existente">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      value={clienteTelefono}
                      onChange={(e) => {
                        setClienteTelefono(normalizePhone(e.target.value))
                        setClienteId(null)
                      }}
                      inputMode="tel"
                      autoFocus
                      placeholder="Ej. 6681234567"
                      readOnly={usingSessionCustomer}
                      className={cn(
                        "h-12 rounded-2xl pl-10 text-base font-semibold",
                        usingSessionCustomer ? "border-emerald-200 bg-emerald-50/50 text-emerald-900" : "bg-white",
                      )}
                    />
                    {clientStatus === "searching" ? (
                      <div className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    ) : null}
                  </div>
                </Field>

                <Field label="Nombre">
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder={clientStatus === "found" ? "Cliente encontrado" : "Nombre para crear cliente"}
                      readOnly={usingSessionCustomer}
                      className={cn(
                        "h-12 rounded-2xl pl-10 text-base font-semibold",
                        usingSessionCustomer ? "border-emerald-200 bg-emerald-50/50 text-emerald-900" : "bg-white",
                      )}
                    />
                  </div>
                </Field>

                {!usingSessionCustomer && clientStatus !== "idle" ? (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold",
                      clientStatus === "found" && "bg-emerald-50 text-emerald-700",
                      clientStatus === "new" && "bg-blue-50 text-blue-700",
                      clientStatus === "invalid" && "bg-amber-50 text-amber-700",
                      clientStatus === "searching" && "bg-slate-100 text-slate-600",
                    )}
                  >
                    {clientStatus === "found" ? <CheckCircle2 className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                    {clientStatusCopy}
                  </div>
                ) : null}

                {usingSessionCustomer ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                    Si necesitas otro cliente, cambialo o libéralo desde la barra superior antes de guardar la cotizacion.
                  </p>
                ) : null}
              </div>
            </section>

            {/* Equipo */}
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <SectionHeader number={2} eyebrow="Equipo" title="Tipo, marca y falla" />
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(180px,1fr)_minmax(220px,1.45fr)]">
                  <Select value={equipoTipo} onValueChange={setEquipoTipo}>
                    <SelectTrigger className="h-12 rounded-2xl bg-white">
                      <span className="flex min-w-0 items-center gap-2 text-left text-sm font-semibold text-slate-700">
                        {getEquipoRapidoMeta(equipoTipo).icon}
                        <span className="truncate">{equipoTipo || "Tipo de equipo"}</span>
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPOS_RAPIDOS.map((eq) => (
                        <SelectItem key={eq.value} value={eq.value}>{eq.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!showCustomBrand ? (
                    <Select
                      value={selectedBrand}
                      onValueChange={(value) => {
                        if (value === "otra") {
                          setShowCustomBrand(true)
                          setSelectedBrand("")
                          setCustomBrand("")
                          return
                        }
                        setSelectedBrand(value)
                        setCustomBrand("")
                        setShowCustomBrand(false)
                      }}
                    >
                      <SelectTrigger className="h-12 rounded-2xl bg-white">
                        <SelectValue placeholder="Marca" />
                      </SelectTrigger>
                      <SelectContent>
                        {recommendedBrands.map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))}
                        <SelectItem value="otra">Otra</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-2">
                      <Select
                        value="otra"
                        onValueChange={(value) => {
                          if (value !== "otra") {
                            setSelectedBrand(value)
                            setCustomBrand("")
                            setShowCustomBrand(false)
                          }
                        }}
                      >
                        <SelectTrigger className="h-12 w-24 shrink-0 rounded-2xl bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {recommendedBrands.map((brand) => (
                            <SelectItem key={brand} value={brand}>
                              {brand}
                            </SelectItem>
                          ))}
                          <SelectItem value="otra">Otra</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                        placeholder="Marca"
                        className="h-12 min-w-0 flex-1 rounded-2xl bg-white"
                      />
                    </div>
                  )}
                </div>

                <Input
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Modelo, ej. iPhone 11 Pro Max"
                  className="h-12 rounded-2xl bg-white"
                />

                <Textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe la falla o consulta. Ej. Cliente pregunta por cambio de pantalla, refaccion y mano de obra."
                  className="min-h-24 rounded-2xl bg-white"
                />

                <details className="rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm">
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-500">Notas internas (opcional)</summary>
                  <Textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Proveedor, disponibilidad, tiempos, condiciones especiales."
                    className="mt-2 min-h-20 rounded-2xl bg-white"
                  />
                </details>
              </div>
            </section>

            {/* Conceptos */}
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SectionHeader
                  number={3}
                  eyebrow="Conceptos"
                  title="Opciones a cotizar"
                  description="Marca con la estrella la opcion que quieres destacar como principal en el WhatsApp."
                />
                <Button
                  type="button"
                  onClick={addItem}
                  className="btn-glow h-10 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700"
                >
                  <Plus className="mr-1 h-4 w-4" /> Agregar opcion
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => {
                  const isPrincipal = item.orden === 0
                  return (
                    <div
                      key={`item-${idx}`}
                      className={cn(
                        "grid grid-cols-12 items-center gap-2 rounded-2xl border p-2 transition-colors",
                        isPrincipal ? "border-amber-300 bg-amber-50/60" : "border-slate-100 bg-slate-50",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setPrincipal(idx)}
                        title={isPrincipal ? "Opcion principal" : "Marcar como principal"}
                        className={cn(
                          "col-span-2 flex h-10 w-full items-center justify-center rounded-xl border transition-colors sm:col-span-1",
                          isPrincipal
                            ? "border-amber-400 bg-amber-100 text-amber-700"
                            : "border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-7000",
                        )}
                      >
                        <Star className={cn("h-4 w-4", isPrincipal && "fill-current")} />
                      </button>
                      <Input
                        data-item-idx={idx}
                        data-field="descripcion"
                        value={item.descripcion}
                        onChange={(e) => setItemField(idx, "descripcion", e.target.value)}
                        onKeyDown={(e) => onItemKey(e, idx, "descripcion")}
                        placeholder={idx === 0 ? "Ej. Calidad original nueva" : "Otra opcion..."}
                        className="col-span-10 h-10 rounded-2xl bg-white text-sm font-semibold sm:col-span-7"
                      />
                      <Input
                        data-item-idx={idx}
                        data-field="precio"
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={item.precio_unitario}
                        onChange={(e) => setItemField(idx, "precio_unitario", e.target.value)}
                        onKeyDown={(e) => onItemKey(e, idx, "precio")}
                        placeholder="Precio"
                        className="col-span-8 h-10 rounded-2xl bg-white text-sm font-semibold sm:col-span-3"
                      />
                      <Button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                        className="col-span-2 h-10 rounded-2xl border border-slate-200 bg-white px-0 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 sm:col-span-1"
                        aria-label="Eliminar opcion"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>

              <p className="mt-2 text-[11px] text-slate-500">
                Enter en descripcion salta al precio. Enter en precio del ultimo item crea una nueva opcion. La
                estrella marca la opcion principal (solo una) sin reordenar la lista.
              </p>
            </section>
          </div>

          {/* Resumen lateral */}
          <aside className="xl:sticky xl:top-4 xl:self-start">
            <ResumenPanel
              items={items}
              sumaOpciones={sumaOpciones}
              fechaExpiracion={fechaExpiracion}
              setFechaExpiracion={setFechaExpiracion}
              hasClientName={hasClientName}
              hasPhone={hasPhone}
              hasConcept={hasConcept}
              canSubmit={canSubmit}
              loading={loading}
              onSubmit={() => void handleSubmit()}
              onCopyMessage={async () => {
                if (!successDialog?.message) return
                try {
                  await navigator.clipboard.writeText(successDialog.message)
                  toast({ title: "Mensaje copiado" })
                } catch {
                  toast({ variant: "destructive", title: "No se pudo copiar" })
                }
              }}
            />
          </aside>
        </div>
      </form>

      {/* Dialog de éxito */}
      <Dialog open={!!successDialog} onOpenChange={(o) => !o && setSuccessDialog(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Cotizacion {successDialog?.folio} creada
            </DialogTitle>
            <DialogDescription>
              Revisa la vista previa del mensaje y envia por WhatsApp cuando estes listo.
            </DialogDescription>
          </DialogHeader>
          {successDialog?.message ? (
            <details open className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <summary className="cursor-pointer font-semibold">Vista previa del mensaje</summary>
              <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-white p-3 font-sans ring-1 ring-slate-200">
{successDialog.message}
              </pre>
            </details>
          ) : null}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            {successDialog?.whatsappUrl ? (
              <Button
                type="button"
                className="h-11 flex-1 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700"
                onClick={() => window.open(successDialog.whatsappUrl!, "_blank", "noopener,noreferrer")}
              >
                <Send className="mr-1.5 h-4 w-4" />
                Enviar WhatsApp
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-2xl border-slate-200 bg-white text-sm font-bold text-slate-700"
              onClick={() => setSuccessDialog(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prompt de borrador */}
      <Dialog open={!!draftPrompt} onOpenChange={(o) => !o && discardDraft()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tienes un borrador sin guardar</DialogTitle>
            <DialogDescription>
              Detectamos un borrador guardado automaticamente. ¿Quieres recuperarlo o empezar de cero?
            </DialogDescription>
          </DialogHeader>
          {draftPrompt ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p>
                <strong>Cliente:</strong> {draftPrompt.clienteNombre || "(sin nombre)"} · {draftPrompt.clienteTelefono || "(sin telefono)"}
              </p>
              <p>
                <strong>Items:</strong> {draftPrompt.items.length}
              </p>
              <p>
                <strong>Origen:</strong> {draftPrompt.origen}
              </p>
            </div>
          ) : null}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-2xl border-slate-200 bg-white text-sm font-bold text-slate-700"
              onClick={discardDraft}
            >
              Empezar de cero
            </Button>
            <Button
              type="button"
              className="btn-glow h-11 flex-1 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700"
              onClick={() => draftPrompt && applyDraft(draftPrompt)}
            >
              Recuperar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar limpiar */}
      <Dialog open={confirmLimpiar} onOpenChange={setConfirmLimpiar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <AlertCircle className="h-5 w-5 text-amber-7000" />
              ¿Limpiar todo el formulario?
            </DialogTitle>
            <DialogDescription>
              Hay opciones cotizadas. Si continúas se perdera el contenido actual.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-2xl border-slate-200 bg-white text-sm font-bold text-slate-700"
              onClick={() => setConfirmLimpiar(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-2xl bg-red-600 px-4 text-sm font-black text-white hover:bg-red-700"
              onClick={doLimpiar}
            >
              Si, limpiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function SectionHeader({
  number,
  eyebrow,
  title,
  description,
  tone = "slate",
}: {
  number: number
  eyebrow: string
  title: string
  description?: string
  tone?: "blue" | "slate"
}) {
  const toneClasses = tone === "blue" ? "bg-blue-600 text-white" : "bg-blue-600 text-white"
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-black", toneClasses)}>
        {number}
      </span>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  )
}

function OrigenPicker({ value, onChange }: { value: CotizacionOrigen; onChange: (v: CotizacionOrigen) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      <span className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Origen</span>
      {ORIGENES.map((o) => {
        const active = value === o
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-bold transition-colors",
              active ? "bg-white text-slate-900 shadow" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

function ResumenPanel({
  items,
  sumaOpciones,
  fechaExpiracion,
  setFechaExpiracion,
  hasClientName,
  hasPhone,
  hasConcept,
  canSubmit,
  loading,
  onSubmit,
  onCopyMessage,
}: {
  items: ItemState[]
  sumaOpciones: number
  fechaExpiracion: string
  setFechaExpiracion: (v: string) => void
  hasClientName: boolean
  hasPhone: boolean
  hasConcept: boolean
  canSubmit: boolean
  loading: boolean
  onSubmit: () => void
  onCopyMessage: () => void
}) {
  const principal = items.find((it) => it.orden === 0) ?? items[0]
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
      <div className="bg-white p-5 text-slate-900">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">Resumen</p>
        <p className="mt-2 text-2xl font-black italic leading-none">
          {principal?.descripcion ? principal.descripcion : "Sin opciones"}
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-600">
          {principal?.descripcion
            ? "Esta opcion se destaca en el WhatsApp como principal."
            : "Agrega opciones abajo y marca la principal con la estrella."}
        </p>
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Opciones cotizadas</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            {items.length === 0 || (items.length === 1 && !items[0].descripcion.trim()) ? (
              <li className="text-slate-500">Aun no agregas opciones.</li>
            ) : (
              items.map((it, idx) => (
                <li key={idx} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {it.orden === 0 ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-7000" /> : <span className="h-3.5 w-3.5" />}
                    <span className="truncate text-slate-700">{it.descripcion || "(sin descripcion)"}</span>
                  </span>
                  <strong className="text-slate-900">${money(Number(it.precio_unitario) || 0)}</strong>
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
            <p className="text-[11px] text-slate-500">
              Cada opcion es una alternativa independiente: el cliente elige solo una al autorizar.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Vigencia</label>
          <div className="relative mt-2">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              type="date"
              value={fechaExpiracion}
              onChange={(e) => setFechaExpiracion(e.target.value)}
              className="h-11 rounded-xl bg-white pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Para guardar</p>
          <Status ok={hasClientName} label="Cliente capturado" />
          <Status ok={hasPhone} label="Telefono valido" />
          <Status ok={hasConcept} label="Al menos una opcion con precio" />
        </div>

        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || loading}
          className="btn-glow h-12 w-full rounded-2xl bg-blue-600 text-sm font-black text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500"
        >
          <Send className="mr-1.5 h-4 w-4" />
          {loading ? "Guardando..." : "Guardar cotizacion"}
        </Button>
        <p className="text-center text-[11px] text-slate-500">
          Atajo: <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd>
          <span className="px-0.5">+</span>
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
        </p>
        <Button
          type="button"
          variant="ghost"
          onClick={onCopyMessage}
          className="hidden h-8 w-full rounded-xl text-[11px] text-slate-500 hover:text-slate-700"
        >
          <Copy className="mr-1 h-3 w-3" /> Copiar mensaje (despues de guardar)
        </Button>
      </div>
    </div>
  )
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <p className="flex items-center gap-1.5">
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-slate-500" />}
      <span className={ok ? "text-emerald-700" : "text-slate-500"}>{label}</span>
    </p>
  )
}
