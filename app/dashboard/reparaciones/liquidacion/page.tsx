"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
  Wrench,
} from "lucide-react"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  confirmarLiquidacionTrabajo,
  createColaboradorOperativo,
  getColaboradoresLiquidacion,
  getLiquidacionPreview,
  getLiquidacionesRecientes,
  type ColaboradorOperativoOption,
  type ColaboradorTipo,
  type LiquidacionMetodoPago,
  type LiquidacionPreviewItem,
  type LiquidacionResumen,
  type LiquidacionTipo,
} from "@/lib/actions/liquidaciones-trabajo-prisma"

const METODOS: Array<{ value: LiquidacionMetodoPago; label: string; icon: typeof Banknote; hint: string }> = [
  { value: "efectivo", label: "Efectivo", icon: Banknote, hint: "Sale del corte abierto" },
  { value: "tarjeta", label: "Tarjeta", icon: CreditCard, hint: "Egreso por terminal" },
  { value: "transferencia", label: "Transferencia", icon: Landmark, hint: "Egreso bancario" },
]

function todayYmd() {
  return new Date().toISOString().slice(0, 10)
}

function weekStartYmd() {
  const date = new Date()
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - diff)
  return date.toISOString().slice(0, 10)
}

function money(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" })
}

function dateShort(value: string) {
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

function typeLabel(tipo: LiquidacionTipo) {
  return tipo === "maquila" ? "Maquila" : "Mano de obra"
}

export default function LiquidacionTrabajosPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [colaboradores, setColaboradores] = useState<ColaboradorOperativoOption[]>([])
  const [recientes, setRecientes] = useState<LiquidacionResumen[]>([])
  const [selectedColaboradorId, setSelectedColaboradorId] = useState("")
  const [tipo, setTipo] = useState<LiquidacionTipo>("mano_obra")
  const [metodoPago, setMetodoPago] = useState<LiquidacionMetodoPago>("efectivo")
  const [desde, setDesde] = useState(weekStartYmd())
  const [hasta, setHasta] = useState(todayYmd())
  const [montoDefault, setMontoDefault] = useState("100")
  const [preview, setPreview] = useState<LiquidacionPreviewItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exceptionIds, setExceptionIds] = useState<Set<string>>(new Set())
  const [exceptionReason, setExceptionReason] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [newNombre, setNewNombre] = useState("")
  const [newTipo, setNewTipo] = useState<ColaboradorTipo>("maquila")
  const [newTarifa, setNewTarifa] = useState("100")
  const [newNotas, setNewNotas] = useState("")

  const selectedColaborador = useMemo(
    () => colaboradores.find((item) => item.id === selectedColaboradorId) ?? null,
    [colaboradores, selectedColaboradorId],
  )

  const availableColaboradores = useMemo(
    () => colaboradores.filter((item) => item.activo),
    [colaboradores],
  )

  const selectedItems = useMemo(
    () => preview.filter((item) => selectedIds.has(item.repairId)),
    [preview, selectedIds],
  )
  const total = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.montoSugerido, 0),
    [selectedItems],
  )
  const payableCount = useMemo(() => preview.filter((item) => !item.yaLiquidado).length, [preview])

  const loadBaseData = async () => {
    setLoading(true)
    const [colabRes, recentRes] = await Promise.all([
      getColaboradoresLiquidacion(),
      getLiquidacionesRecientes(),
    ])
    if (colabRes.error) {
      toast({ title: "No se cargaron colaboradores", description: colabRes.error, variant: "destructive" })
    }
    setColaboradores(colabRes.data)
    setRecientes(recentRes.data)
    setSelectedColaboradorId((prev) => prev || colabRes.data.find((item) => item.activo)?.id || "")
    setLoading(false)
  }

  useEffect(() => {
    void loadBaseData()
  }, [])

  useEffect(() => {
    if (!selectedColaborador) return
    setTipo(selectedColaborador.tipo === "maquila" ? "maquila" : "mano_obra")
    if (selectedColaborador.tarifa_default && selectedColaborador.tarifa_default > 0) {
      setMontoDefault(selectedColaborador.tarifa_default.toFixed(2))
    }
  }, [selectedColaborador])

  const handlePreview = () => {
    if (!selectedColaborador) {
      toast({ title: "Selecciona colaborador", description: "Elige tecnico o maquila para calcular.", variant: "destructive" })
      return
    }
    setPreviewLoading(true)
    setPreview([])
    setSelectedIds(new Set())
    setExceptionIds(new Set())
    startTransition(async () => {
      const result = await getLiquidacionPreview({
        colaboradorNombre: selectedColaborador.nombre,
        tipo,
        desde,
        hasta,
        montoDefault: Number(montoDefault),
      })
      if (result.error) {
        toast({ title: "No se pudo calcular", description: result.error, variant: "destructive" })
      } else {
        setPreview(result.data)
        setSelectedIds(new Set(result.data.filter((item) => !item.yaLiquidado).map((item) => item.repairId)))
      }
      setPreviewLoading(false)
    })
  }

  const toggleItem = (item: LiquidacionPreviewItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(item.repairId)) next.delete(item.repairId)
      else next.add(item.repairId)
      return next
    })
  }

  const toggleException = (item: LiquidacionPreviewItem) => {
    setExceptionIds((prev) => {
      const next = new Set(prev)
      if (next.has(item.repairId)) next.delete(item.repairId)
      else next.add(item.repairId)
      return next
    })
  }

  const handleConfirm = () => {
    if (!selectedColaborador) return
    if (selectedItems.length === 0) {
      toast({ title: "Sin folios seleccionados", description: "Selecciona al menos un trabajo.", variant: "destructive" })
      return
    }
    if (selectedItems.some((item) => item.yaLiquidado && !exceptionIds.has(item.repairId))) {
      toast({ title: "Hay folios ya liquidados", description: "Marca excepcion o retiralos de la seleccion.", variant: "destructive" })
      return
    }
    if (selectedItems.some((item) => item.yaLiquidado && exceptionIds.has(item.repairId)) && exceptionReason.trim().length < 4) {
      toast({ title: "Motivo requerido", description: "Explica por que se paga de nuevo un folio.", variant: "destructive" })
      return
    }

    startTransition(async () => {
      const result = await confirmarLiquidacionTrabajo({
        colaboradorId: selectedColaborador.id,
        colaboradorNombre: selectedColaborador.nombre,
        tipo,
        metodoPago,
        desde,
        hasta,
        items: selectedItems.map((item) => ({
          repairId: item.repairId,
          folio: item.folio,
          concepto: `Folio #${item.folio} ${item.equipo}`,
          monto: item.montoSugerido,
          fechaTerminado: item.fechaTerminado,
          permitirDuplicado: exceptionIds.has(item.repairId),
          motivoExcepcion: exceptionIds.has(item.repairId) ? exceptionReason : null,
        })),
      })

      if (result.error) {
        toast({ title: "No se pudo liquidar", description: result.error, variant: "destructive" })
        return
      }

      toast({
        title: "Liquidacion registrada",
        description: `${result.data?.items ?? 0} trabajos · ${money(result.data?.total ?? 0)}`,
      })
      setPreview([])
      setSelectedIds(new Set())
      setExceptionIds(new Set())
      setExceptionReason("")
      await loadBaseData()
    })
  }

  const handleCreateColaborador = () => {
    startTransition(async () => {
      const result = await createColaboradorOperativo({
        nombre: newNombre,
        tipo: newTipo,
        tarifa_default: Number(newTarifa),
        notas: newNotas,
      })

      if (result.error || !result.data) {
        toast({ title: "No se pudo crear", description: result.error ?? "Intenta de nuevo.", variant: "destructive" })
        return
      }

      setColaboradores((prev) => [...prev, result.data!])
      setSelectedColaboradorId(result.data.id)
      setCreateOpen(false)
      setNewNombre("")
      setNewTipo("maquila")
      setNewTarifa("100")
      setNewNotas("")
      toast({ title: "Colaborador creado", description: "Ya puedes asignarlo y liquidarle trabajos." })
    })
  }

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="flex w-full min-w-0 flex-col gap-5 px-3 py-4 sm:gap-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
        <ModuleHeader
          icon={BriefcaseBusiness}
          title="LIQUIDAR TRABAJOS"
          eyebrow="REPARACIONES · NOMINA OPERATIVA"
          description="Calcula trabajos terminados por tecnico o maquila y registra los gastos del folio en una sola operacion."
          stats={[
            { label: "Seleccionados", value: selectedItems.length, tone: "blue" },
            { label: "Total", value: money(total), tone: total > 0 ? "emerald" : "slate" },
          ]}
          actions={(
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => router.push("/dashboard/reparaciones")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Reparaciones
              </Button>
              <Button className="h-11 rounded-xl bg-blue-600 text-white hover:bg-blue-700 btn-glow" onClick={() => setCreateOpen(true)}>
                <UserRoundPlus className="mr-2 h-4 w-4" />
                Nuevo externo
              </Button>
            </div>
          )}
        />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_360px]">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-white via-blue-50/55 to-cyan-50/50 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">Filtro de liquidacion</p>
                  <h2 className="mt-1 text-xl font-black italic tracking-tight text-slate-950">Trabajos terminados en periodo</h2>
                </div>
                <Badge variant="outline" className="rounded-full border-blue-200 bg-white px-3 py-1 text-blue-700">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  Anti duplicado activo
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Colaborador</Label>
                <Select value={selectedColaboradorId} onValueChange={setSelectedColaboradorId} disabled={loading}>
                  <SelectTrigger className="h-12 w-full rounded-2xl border-slate-200 bg-slate-50/80 font-semibold">
                    <SelectValue placeholder="Selecciona tecnico o maquila..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColaboradores.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nombre} · {item.tipo === "maquila" ? "Maquila" : item.source === "usuario" ? "Usuario" : "Tecnico externo"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tipo</Label>
                <Select value={tipo} onValueChange={(value) => setTipo(value as LiquidacionTipo)}>
                  <SelectTrigger className="h-12 w-full rounded-2xl border-slate-200 bg-slate-50/80 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mano_obra">Mano de obra</SelectItem>
                    <SelectItem value="maquila">Maquila</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Monto por folio</Label>
                <Input
                  value={montoDefault}
                  onChange={(event) => setMontoDefault(event.target.value)}
                  inputMode="decimal"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50/80 font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Desde</Label>
                <Input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} className="h-12 rounded-2xl border-slate-200 bg-slate-50/80 font-semibold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Hasta</Label>
                <Input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} className="h-12 rounded-2xl border-slate-200 bg-slate-50/80 font-semibold" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Metodo de pago</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {METODOS.map((method) => {
                    const Icon = method.icon
                    const active = metodoPago === method.value
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setMetodoPago(method.value)}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-left transition-all",
                          active
                            ? "border-blue-300 bg-blue-50 text-blue-950 shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50",
                        )}
                      >
                        <Icon className={cn("mb-2 h-4 w-4", active ? "text-blue-600" : "text-slate-500")} />
                        <p className="text-sm font-black">{method.label}</p>
                        <p className="text-xs text-slate-500">{method.hint}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <Button
                  className="h-12 w-full rounded-2xl bg-blue-600 font-black text-white hover:bg-blue-700"
                  disabled={previewLoading || isPending || loading}
                  onClick={handlePreview}
                >
                  {previewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Calcular trabajos terminados
                </Button>
              </div>
            </div>
          </div>

          <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Resumen</p>
                <h3 className="text-lg font-black text-slate-950">Listo para corte</h3>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Colaborador</p>
                <p className="mt-1 text-base font-black text-slate-950">{selectedColaborador?.nombre ?? "Sin seleccionar"}</p>
                <p className="text-xs font-semibold text-slate-500">{typeLabel(tipo)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Pagables</p>
                  <p className="mt-1 text-2xl font-black text-blue-700">{payableCount}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Total</p>
                  <p className="mt-1 text-2xl font-black text-emerald-700">{money(total)}</p>
                </div>
              </div>
              {selectedItems.some((item) => item.yaLiquidado) ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-amber-700">Motivo de excepcion</Label>
                  <Textarea
                    value={exceptionReason}
                    onChange={(event) => setExceptionReason(event.target.value)}
                    placeholder="Ej. Pago complementario autorizado por gerencia..."
                    className="mt-2 min-h-20 rounded-xl border-amber-200 bg-white"
                  />
                </div>
              ) : null}
              <Button
                className="h-12 w-full rounded-2xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                disabled={isPending || selectedItems.length === 0}
                onClick={handleConfirm}
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Confirmar liquidacion
              </Button>
            </div>
          </aside>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Vista previa de folios</h2>
              <p className="text-sm font-semibold text-slate-500">Se listan folios que cambiaron a Listo o Entregado en el periodo.</p>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {preview.length} encontrados
            </Badge>
          </div>
          {preview.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center px-5 py-10 text-center">
              <CalendarDays className="h-10 w-10 text-slate-600" />
              <p className="mt-3 text-base font-black text-slate-800">Calcula un periodo para comenzar</p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Si no aparecen folios, revisa que el tecnico asignado coincida con el colaborador seleccionado.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {preview.map((item) => {
                const selected = selectedIds.has(item.repairId)
                const exception = exceptionIds.has(item.repairId)
                return (
                  <div
                    key={item.repairId}
                    className={cn(
                      "grid gap-4 px-5 py-4 transition-colors lg:grid-cols-[44px_minmax(0,1fr)_150px_145px_145px]",
                      selected ? "bg-blue-50/35" : "bg-white",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(item)}
                      className={cn(
                        "mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-black",
                        selected ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-500",
                      )}
                      aria-label={selected ? "Quitar folio" : "Seleccionar folio"}
                    >
                      {selected ? <CheckCircle2 className="h-4 w-4" /> : null}
                    </button>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-black text-slate-950">#{item.folio}</p>
                        <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">{item.estado}</Badge>
                        {item.yaLiquidado ? (
                          <Badge className="rounded-full bg-amber-100 text-amber-700 hover:bg-amber-100">Ya liquidado</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-700">{item.equipo}</p>
                      <p className="text-xs text-slate-500">{item.cliente} · Terminado {dateShort(item.fechaTerminado)}</p>
                      {item.liquidadoDetalle ? <p className="mt-1 text-xs font-semibold text-amber-700">{item.liquidadoDetalle}</p> : null}
                      {item.yaLiquidado ? (
                        <button
                          type="button"
                          onClick={() => toggleException(item)}
                          className={cn(
                            "mt-2 rounded-full px-3 py-1 text-xs font-black transition-colors",
                            exception ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100",
                          )}
                        >
                          {exception ? "Excepcion marcada" : "Permitir excepcion"}
                        </button>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Presupuesto</p>
                      <p className="text-sm font-black text-slate-900">{money(item.presupuesto)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ya en folio</p>
                      <p className="text-sm font-black text-slate-900">{money(item.gastosTipoTotal)}</p>
                    </div>
                    <div className="lg:text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">A pagar</p>
                      <p className="text-xl font-black text-emerald-700">{money(item.montoSugerido)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Liquidaciones recientes</h2>
              <p className="text-sm font-semibold text-slate-500">Ultimos lotes confirmados.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {recientes.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Aun no hay liquidaciones registradas.</p>
            ) : recientes.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{row.colaborador_nombre}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      {typeLabel(row.tipo)} · {dateShort(row.periodo_desde)} - {dateShort(row.periodo_hasta)}
                    </p>
                  </div>
                  <p className="text-lg font-black text-slate-950">{money(row.monto_total)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full">{row.items} folios</Badge>
                  <Badge variant="outline" className="rounded-full capitalize">{row.metodo_pago}</Badge>
                  <Badge variant="outline" className="rounded-full">{dateShort(row.created_at)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg rounded-[28px] border-slate-200 p-0">
          <DialogHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-6">
            <DialogTitle className="flex items-center gap-3 text-xl font-black italic text-slate-950">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                <Plus className="h-5 w-5" />
              </span>
              Nuevo colaborador sin login
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={newNombre} onChange={(event) => setNewNombre(event.target.value)} placeholder="Ej. Taller externo Daniel" className="h-12 rounded-2xl" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newTipo} onValueChange={(value) => setNewTipo(value as ColaboradorTipo)}>
                  <SelectTrigger className="h-12 w-full rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maquila">Maquila</SelectItem>
                    <SelectItem value="tecnico">Tecnico externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tarifa sugerida</Label>
                <Input value={newTarifa} onChange={(event) => setNewTarifa(event.target.value)} inputMode="decimal" className="h-12 rounded-2xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={newNotas} onChange={(event) => setNewNotas(event.target.value)} placeholder="Opcional: telefono, condiciones, especialidad..." className="min-h-24 rounded-2xl" />
            </div>
            <Button disabled={isPending} onClick={handleCreateColaborador} className="h-12 w-full rounded-2xl bg-blue-600 font-black text-white hover:bg-blue-700">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
              Crear colaborador
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
