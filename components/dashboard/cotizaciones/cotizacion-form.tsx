import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  FileText,
  Gamepad2,
  Laptop,
  Plus,
  Search,
  Smartphone,
  Trash2,
  UserRound,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ActiveCustomerIndicator } from "@/components/dashboard/active-customer-indicator"
import type { Cotizacion, CotizacionInput, CotizacionItemInput } from "@/lib/actions/cotizaciones"
import { searchClientByPhone } from "@/lib/actions/repairs-prisma"
import { getRecommendedRepairBrands } from "@/lib/reparaciones/device-catalog"
import { cn } from "@/lib/utils"

export interface CotizacionDraft {
  cliente_id?: string | null
  cliente_nombre?: string
  cliente_telefono?: string | null
  equipo_tipo?: string
  marca?: string
  modelo?: string
  descripcion?: string
  observaciones?: string | null
  origen?: OrigenConsulta
}

interface CotizacionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: Cotizacion | null
  draft?: CotizacionDraft | null
  onSubmit: (input: CotizacionInput) => Promise<void>
}

interface ItemState {
  descripcion: string
  precio_unitario: string
}

export type OrigenConsulta = "Mostrador" | "WhatsApp" | "Telefono" | "Internet"

type ClientStatus = "idle" | "searching" | "found" | "new" | "invalid"

const EMPTY_ITEM: ItemState = { descripcion: "", precio_unitario: "0" }

const EQUIPOS_RAPIDOS = [
  { value: "Celular", label: "Celular", icon: <Smartphone className="h-4 w-4" /> },
  { value: "Tablet", label: "Tablet", icon: <Smartphone className="h-4 w-4" /> },
  { value: "Laptop", label: "Laptop", icon: <Laptop className="h-4 w-4" /> },
  { value: "Computadora", label: "Computadora", icon: <Laptop className="h-4 w-4" /> },
  { value: "Videojuego", label: "Videojuego", icon: <Gamepad2 className="h-4 w-4" /> },
  { value: "Impresora", label: "Impresora", icon: <FileText className="h-4 w-4" /> },
  { value: "Reloj", label: "Reloj", icon: <Smartphone className="h-4 w-4" /> },
  { value: "Proyector", label: "Proyector", icon: <FileText className="h-4 w-4" /> },
  { value: "Otro", label: "Otro", icon: <FileText className="h-4 w-4" /> },
]

function addDaysIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function money(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function normalizePhone(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "").slice(0, 15)
}

function parseObservaciones(raw: string | null | undefined): { origen: OrigenConsulta; notas: string } {
  const text = (raw ?? "").trim()
  const lines = text.split(/\r?\n/)
  const first = lines[0] ?? ""
  const match = first.match(/^Origen:\s*(Mostrador|WhatsApp|Telefono|Internet)$/i)
  if (!match) return { origen: "Mostrador", notas: text }
  return {
    origen: match[1] as OrigenConsulta,
    notas: lines.slice(1).join("\n").trim(),
  }
}

export function CotizacionForm({ open, onOpenChange, initial, draft, onSubmit }: CotizacionFormProps) {
  const initialObs = parseObservaciones(initial?.observaciones)
  const [loading, setLoading] = useState(false)
  const [clienteId, setClienteId] = useState<string | null>(initial?.cliente_id ?? null)
  const [clienteNombre, setClienteNombre] = useState(initial?.cliente_nombre ?? "")
  const [clienteTelefono, setClienteTelefono] = useState(normalizePhone(initial?.cliente_telefono))
  const [clientStatus, setClientStatus] = useState<ClientStatus>("idle")
  const [equipoTipo, setEquipoTipo] = useState(initial?.equipo_tipo ?? "Celular")
  const [selectedBrand, setSelectedBrand] = useState("")
  const [customBrand, setCustomBrand] = useState("")
  const [showCustomBrand, setShowCustomBrand] = useState(false)
  const [modelo, setModelo] = useState(initial?.modelo ?? "")
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? "")
  const [observaciones, setObservaciones] = useState(initialObs.notas)
  const [origenConsulta, setOrigenConsulta] = useState<OrigenConsulta>(initialObs.origen)
  const [descuento, setDescuento] = useState(initial ? String(initial.descuento) : "0")
  const [fechaExpiracion, setFechaExpiracion] = useState(initial?.fecha_expiracion ?? addDaysIso(7))
  const [items, setItems] = useState<ItemState[]>(
    initial?.items?.length
      ? initial.items.map((it) => ({ descripcion: it.descripcion, precio_unitario: String(it.precio_unitario) }))
      : [{ descripcion: "Mano de obra y refaccion", precio_unitario: "0" }],
  )

  const recommendedBrands = useMemo(() => getRecommendedRepairBrands(equipoTipo), [equipoTipo])
  const marca = showCustomBrand ? customBrand : selectedBrand

  const applyBrand = (rawBrand?: string | null, deviceType = equipoTipo) => {
    const nextBrand = (rawBrand ?? "").trim()
    const knownBrands = getRecommendedRepairBrands(deviceType)
    if (!nextBrand) {
      setSelectedBrand("")
      setCustomBrand("")
      setShowCustomBrand(false)
      return
    }
    if (knownBrands.includes(nextBrand)) {
      setSelectedBrand(nextBrand)
      setCustomBrand("")
      setShowCustomBrand(false)
      return
    }
    setSelectedBrand("")
    setCustomBrand(nextBrand)
    setShowCustomBrand(true)
  }

  useEffect(() => {
    if (!open) return
    const parsedObs = parseObservaciones(initial?.observaciones ?? draft?.observaciones)
    const draftClienteNombre = draft?.cliente_nombre ?? ""
    const draftClienteTelefono = normalizePhone(draft?.cliente_telefono)
    const nextEquipoTipo = initial?.equipo_tipo ?? draft?.equipo_tipo ?? "Celular"

    setClienteId(initial?.cliente_id ?? draft?.cliente_id ?? null)
    setClienteNombre(initial?.cliente_nombre ?? draftClienteNombre)
    setClienteTelefono(normalizePhone(initial?.cliente_telefono ?? draftClienteTelefono))
    setClientStatus(initial?.cliente_id || draft?.cliente_id ? "found" : "idle")
    setEquipoTipo(nextEquipoTipo)
    applyBrand(initial?.marca ?? draft?.marca ?? "", nextEquipoTipo)
    setModelo(initial?.modelo ?? draft?.modelo ?? "")
    setDescripcion(initial?.descripcion ?? draft?.descripcion ?? "")
    setObservaciones(parsedObs.notas)
    setOrigenConsulta(initial ? parsedObs.origen : draft?.origen ?? parsedObs.origen)
    setDescuento(initial ? String(initial.descuento) : "0")
    setFechaExpiracion(initial?.fecha_expiracion ?? addDaysIso(7))
    setItems(
      initial?.items?.length
        ? initial.items.map((it) => ({ descripcion: it.descripcion, precio_unitario: String(it.precio_unitario) }))
        : [{ descripcion: "Mano de obra y refaccion", precio_unitario: "0" }],
    )
  }, [open, initial, draft])

  useEffect(() => {
    if (!open) return
    if (!selectedBrand || showCustomBrand || recommendedBrands.includes(selectedBrand)) return
    setSelectedBrand("")
  }, [open, recommendedBrands, selectedBrand, showCustomBrand])

  useEffect(() => {
    if (!open) return
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
  }, [clienteTelefono, open])

  const parsedItems = useMemo<CotizacionItemInput[]>(
    () =>
      items
        .map((item) => ({
          descripcion: item.descripcion.trim(),
          cantidad: 1,
          precio_unitario: Number(item.precio_unitario),
        }))
        .filter((item) => item.descripcion && item.precio_unitario >= 0),
    [items],
  )

  const subtotal = useMemo(
    () => parsedItems.reduce((acc, item) => acc + item.precio_unitario, 0),
    [parsedItems],
  )
  const descuentoNum = Math.min(Math.max(Number(descuento || 0), 0), subtotal)
  const total = Math.max(0, subtotal - descuentoNum)
  const hasPhone = normalizePhone(clienteTelefono).length >= 6
  const hasClientName = clienteNombre.trim().length > 1
  const hasConcept = parsedItems.length > 0 && total > 0
  const canSubmit = hasPhone && hasClientName && hasConcept

  const setItemField = (idx: number, key: keyof ItemState, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)))
  }

  const resetAndClose = () => {
    onOpenChange(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    const notas = [`Origen: ${origenConsulta}`, observaciones.trim()].filter(Boolean).join("\n")

    setLoading(true)
    await onSubmit({
      cliente_id: clienteId,
      cliente_nombre: clienteNombre.trim(),
      cliente_telefono: normalizePhone(clienteTelefono),
      equipo_tipo: equipoTipo.trim() || "Celular",
      marca: marca.trim(),
      modelo: modelo.trim(),
      descripcion: descripcion.trim(),
      observaciones: notas || null,
      descuento: descuentoNum,
      fecha_expiracion: fechaExpiracion || null,
      items: parsedItems,
    })
    setLoading(false)
    resetAndClose()
  }

  const clientStatusCopy = {
    idle: "Ingresa telefono para buscar o crear cliente",
    searching: "Buscando cliente...",
    found: "Cliente encontrado",
    new: "Cliente nuevo, se creara al guardar",
    invalid: "Telefono muy corto",
  }[clientStatus]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-[min(1080px,calc(100vw-2rem))]">
        <DialogHeader className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase italic tracking-tight text-slate-950">
                  {initial ? `Editar ${initial.folio}` : "Nueva cotizacion"}
                </DialogTitle>
                <p className="mt-1 max-w-xl text-sm font-semibold text-slate-500">
                  Crea una cotizacion formal que crea estadistica en tus reportes.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span className="rounded-xl bg-white px-3 py-2 text-blue-700 shadow-sm">1. Cliente</span>
              <span className="rounded-xl bg-white px-3 py-2 text-blue-700 shadow-sm">2. Equipo</span>
              <span className="rounded-xl bg-white px-3 py-2 text-blue-700 shadow-sm">3. Enviar</span>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid max-h-[calc(94vh-88px)] gap-4 overflow-y-auto bg-slate-50 p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white">1</span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Cliente</p>
                  <h3 className="text-lg font-black text-slate-950">Telefono primero</h3>
                </div>
              </div>

              <div className="space-y-3">
                <ActiveCustomerIndicator compact />
                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Telefono del cliente</label>
                  <div className="relative">
                    <PhoneInputIcon />
                    <Input
                      value={clienteTelefono}
                      onChange={(e) => {
                        setClienteTelefono(normalizePhone(e.target.value))
                        setClienteId(null)
                      }}
                      inputMode="tel"
                      placeholder="Ej. 6681234567"
                      className="h-12 rounded-2xl bg-white pl-10 text-base font-semibold"
                    />
                    {clientStatus === "searching" ? (
                      <div className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Nombre</label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder={clientStatus === "found" ? "Cliente encontrado" : "Nombre para crear cliente"}
                      className="h-12 rounded-2xl bg-white pl-10 text-base font-semibold"
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold",
                    clientStatus === "found" && "bg-emerald-50 text-emerald-700",
                    clientStatus === "new" && "bg-blue-50 text-blue-700",
                    clientStatus === "invalid" && "bg-amber-50 text-amber-700",
                    (clientStatus === "idle" || clientStatus === "searching") && "bg-slate-100 text-slate-600",
                  )}
                >
                  {clientStatus === "found" ? <CheckCircle2 className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                  {clientStatusCopy}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white">2</span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Equipo</p>
                  <h3 className="text-lg font-black text-slate-950">Tipo, marca y falla</h3>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select value={equipoTipo} onValueChange={setEquipoTipo}>
                    <SelectTrigger className="h-12 rounded-2xl bg-white">
                      <span className="flex min-w-0 items-center gap-2">
                        <EquipoTipoIcon value={equipoTipo} />
                        <SelectValue placeholder="Tipo de equipo" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPOS_RAPIDOS.map((eq) => (
                        <SelectItem key={eq.value} value={eq.value}>
                          <span className="flex items-center gap-2">
                            {eq.icon}
                            {eq.label}
                          </span>
                        </SelectItem>
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
                          <SelectItem key={brand} value={brand}>{brand}</SelectItem>
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
                            <SelectItem key={brand} value={brand}>{brand}</SelectItem>
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
                  className="min-h-28 rounded-2xl bg-white"
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-700">3</span>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Enviar</p>
                    <h3 className="text-lg font-black text-slate-950">Conceptos de cotizacion</h3>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, EMPTY_ITEM])}
                  className="btn-glow h-11 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700"
                >
                  <Plus className="mr-1 h-4 w-4" /> Agregar item
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={`item-${idx}`} className="grid grid-cols-12 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2">
                    <Input
                      value={item.descripcion}
                      onChange={(e) => setItemField(idx, "descripcion", e.target.value)}
                      placeholder="Concepto, ej. Cambio de pantalla"
                      className="col-span-12 h-12 rounded-2xl bg-white md:col-span-8"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.precio_unitario}
                      onChange={(e) => setItemField(idx, "precio_unitario", e.target.value)}
                      placeholder="Precio"
                      className="col-span-9 h-12 rounded-2xl bg-white md:col-span-3"
                    />
                    <Button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="col-span-3 h-12 rounded-2xl border border-slate-200 bg-white px-0 text-slate-500 hover:bg-red-50 hover:text-red-600 md:col-span-1"
                      disabled={items.length === 1}
                      aria-label="Eliminar item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="xl:sticky xl:top-4 xl:self-start">
            <div className="overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-xl shadow-blue-950/5">
              <div className="bg-blue-600 p-5 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">Total a cotizar</p>
                <p className="mt-2 text-4xl font-black italic leading-none">${money(total)}</p>
                <p className="mt-2 text-xs font-semibold text-blue-100">Valida datos y envia seguimiento desde la lista.</p>
              </div>

              <div className="space-y-4 p-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Descuento</p>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={descuento}
                        onChange={(e) => setDescuento(e.target.value)}
                        placeholder="0"
                        className="mt-2 h-11 rounded-xl bg-white"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Vigencia</p>
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
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3">
                    <p className="flex justify-between text-sm text-slate-700"><span>Subtotal</span><strong>${money(subtotal)}</strong></p>
                    <p className="flex justify-between text-sm text-slate-700"><span>Descuento</span><strong>${money(descuentoNum)}</strong></p>
                    <p className="flex justify-between text-lg font-black text-blue-700"><span>Total</span><strong>${money(total)}</strong></p>
                  </div>
                </div>

                <div className="grid gap-2 text-xs font-bold text-slate-600">
                  <StatusPill ok={hasClientName} labelOk="Cliente capturado" labelBad="Falta nombre del cliente" />
                  <StatusPill ok={hasPhone} labelOk="Telefono valido" labelBad="Falta telefono valido" />
                  <StatusPill ok={hasConcept} labelOk="Importe listo" labelBad="Agrega concepto y precio" />
                  <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-slate-600">
                    <CalendarDays className="h-4 w-4" /> Vigencia: {fechaExpiracion || "Sin fecha"}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 border-t border-slate-200 bg-slate-50 p-3">
                <Button type="button" onClick={resetAndClose} className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-100">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="btn-glow h-11 flex-[1.35] rounded-xl bg-blue-600 px-5 font-black text-white hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {loading ? "Guardando..." : initial ? "Guardar" : "Crear cotizacion"}
                </Button>
              </div>
            </div>
          </aside>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PhoneInputIcon() {
  return <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
}

function EquipoTipoIcon({ value }: { value: string }) {
  const item = EQUIPOS_RAPIDOS.find((eq) => eq.value === value)
  return <span className="shrink-0 text-slate-500">{item?.icon ?? <FileText className="h-4 w-4" />}</span>
}

function StatusPill({ ok, labelOk, labelBad }: { ok: boolean; labelOk: string; labelBad: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2", ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {ok ? labelOk : labelBad}
    </div>
  )
}
