"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Loader2, Plus, Wallet, Wrench, Package, Cog, Hexagon, Lock, CreditCard, Landmark, ReceiptText, Trash2 } from "lucide-react"
import {
  addGastoTicket,
  deleteGastoTicket,
  getCajaAbiertaStatus,
  searchProductosParaGasto,
  type ReparacionGasto,
} from "@/lib/actions/gastos-prisma"
import { formatDateTime } from "@/lib/utils/date"

type GastoTipo = "mano_obra" | "refaccion" | "maquila" | "insumo" | "otro"
type MetodoPago = "efectivo" | "tarjeta" | "transferencia"

interface GastoCategoria {
  value: GastoTipo
  label: string
  icon: React.ReactNode
  tone: string
}

const CATEGORIAS: GastoCategoria[] = [
  {
    value: "refaccion",
    label: "Refaccion",
    icon: <Package className="h-3.5 w-3.5" />,
    tone: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    value: "mano_obra",
    label: "Mano de obra",
    icon: <Wrench className="h-3.5 w-3.5" />,
    tone: "border-violet-200 bg-violet-50 text-violet-700",
  },
  {
    value: "maquila",
    label: "Servicio externo",
    icon: <Cog className="h-3.5 w-3.5" />,
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    value: "insumo",
    label: "Insumo",
    icon: <Hexagon className="h-3.5 w-3.5" />,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    value: "otro",
    label: "Otro",
    icon: <ReceiptText className="h-3.5 w-3.5" />,
    tone: "border-slate-200 bg-slate-100 text-slate-700",
  },
]

const METODOS_PAGO: Array<{
  value: MetodoPago
  label: string
  hint: string
  icon: React.ReactNode
}> = [
  {
    value: "efectivo",
    label: "Efectivo",
    hint: "Sale del efectivo del corte",
    icon: <Wallet className="h-3.5 w-3.5" />,
  },
  {
    value: "tarjeta",
    label: "Tarjeta",
    hint: "Queda como egreso por terminal",
    icon: <CreditCard className="h-3.5 w-3.5" />,
  },
  {
    value: "transferencia",
    label: "Transferencia",
    hint: "Queda como egreso bancario",
    icon: <Landmark className="h-3.5 w-3.5" />,
  },
]

const COPY = {
  inventoryTitle: "Producto del inventario",
  inventoryPlaceholder: "Busca una refaccion o insumo por nombre",
  title: "Registrar consumo de refaccion o gasto manual",
  conceptPlaceholder: "Ej. Pantalla OLED Samsung A54",
  amountLabel: "Costo",
  addAction: "Agregar al folio",
  internalNote: "Estos movimientos se usan para control interno del taller y no aparecen en el ticket del cliente.",
  emptyTitle: "Sin movimientos registrados",
} as const

interface GastoWithCreator extends ReparacionGasto {
  creador_nombre?: string
}

type ProductoBusqueda = {
  id: string
  nombre: string
  sku: string | null
  costo: number
  precio_venta: number
  stock_actual: number
}

interface MonitorUtilidadOperativaProps {
  repairId: string
  folio: string
  presupuesto: number
  initialGastos: GastoWithCreator[]
}

export function MonitorUtilidadOperativa({
  repairId,
  folio: _folio,
  presupuesto: _presupuesto,
  initialGastos,
}: MonitorUtilidadOperativaProps) {
  void _folio
  void _presupuesto
  const [gastos, setGastos] = useState<GastoWithCreator[]>(initialGastos)
  const [isPending, startTransition] = useTransition()
  const [addError, setAddError] = useState<string | null>(null)

  const [categoria, setCategoria] = useState<GastoTipo>("refaccion")
  const [concepto, setConcepto] = useState("")
  const [monto, setMonto] = useState("")
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo")
  const [productoQuery, setProductoQuery] = useState("")
  const [productoResults, setProductoResults] = useState<ProductoBusqueda[]>([])
  const [selectedProducto, setSelectedProducto] = useState<ProductoBusqueda | null>(null)
  const [buscandoProductos, setBuscandoProductos] = useState(false)
  const [cajaStatusLoaded, setCajaStatusLoaded] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState("")
  const [gastoToDelete, setGastoToDelete] = useState<GastoWithCreator | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void getCajaAbiertaStatus()
      .then((result) => {
        if (!cancelled) {
          void result.cajaId
          setCajaStatusLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCajaStatusLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const term = productoQuery.trim()
    if (term.length < 2) {
      setProductoResults([])
      setBuscandoProductos(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setBuscandoProductos(true)
      void searchProductosParaGasto(term)
        .then((result) => {
          if (!cancelled) {
            setProductoResults(result.error ? [] : (result.data as ProductoBusqueda[]))
          }
        })
        .finally(() => {
          if (!cancelled) setBuscandoProductos(false)
        })
    }, 220)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [productoQuery])

  const selectedCategoria = CATEGORIAS.find((item) => item.value === categoria) ?? CATEGORIAS[0]
  const selectedMetodo = METODOS_PAGO.find((item) => item.value === metodoPago) ?? METODOS_PAGO[0]
  const montoPreview = Number(monto || selectedProducto?.costo || 0)

  const handleAddGasto = useCallback(async () => {
    const conceptoFinal = concepto.trim() || selectedProducto?.nombre.trim() || ""
    const tipoFinal = selectedProducto ? "refaccion" : categoria
    const montoNum = monto.trim() ? parseFloat(monto) : selectedProducto?.costo ?? Number.NaN

    if (!conceptoFinal || Number.isNaN(montoNum) || montoNum <= 0) {
      setAddError("Captura un concepto y un costo valido.")
      return
    }

    setAddError(null)
    startTransition(async () => {
      try {
        const result = await addGastoTicket({
          reparacion_id: repairId,
          concepto: conceptoFinal,
          monto: montoNum,
          tipo: tipoFinal,
          producto_id: selectedProducto?.id ?? null,
          metodo_pago: metodoPago,
          aplicar_a_caja: true,
        })

        if (result.error) {
          setAddError(result.error)
          toast({
            variant: "destructive",
            title: "No se pudo registrar",
            description: result.error,
          })
          return
        }

        if (result.data) {
          setGastos((prev) => [...prev, result.data!] as GastoWithCreator[])
          toast({
            title: "Movimiento agregado",
            description: `${selectedCategoria.label} · ${formatCurrency(montoNum)} · ${selectedMetodo.label}`,
          })
          setConcepto("")
          setMonto("")
          setCategoria("refaccion")
          setMetodoPago("efectivo")
          setProductoQuery("")
          setProductoResults([])
          setSelectedProducto(null)
        }
      } catch (error) {
        setAddError(error instanceof Error ? error.message : "Error al registrar gasto")
      }
    })
  }, [categoria, concepto, metodoPago, monto, repairId, selectedCategoria.label, selectedMetodo.label, selectedProducto])

  const handleSelectProducto = useCallback((producto: ProductoBusqueda) => {
    setSelectedProducto(producto)
    setProductoQuery(producto.nombre)
    setProductoResults([])
    setCategoria("refaccion")
    setAddError(null)

    if (!concepto.trim()) setConcepto(producto.nombre)
    if (!monto.trim() && producto.costo > 0) setMonto(producto.costo.toFixed(2))
  }, [concepto, monto])

  const canSubmit =
    !isPending &&
    cajaStatusLoaded &&
    (concepto.trim().length > 0 || Boolean(selectedProducto)) &&
    (monto.trim().length > 0 || Boolean(selectedProducto))

  const openDeleteDialog = useCallback((gasto: GastoWithCreator) => {
    setGastoToDelete(gasto)
    setDeleteReason("")
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteGasto = useCallback(() => {
    if (!gastoToDelete) return

    const motivo = deleteReason.trim()
    if (motivo.length < 4) {
      setDeleteError("Describe brevemente por que se cancela este movimiento.")
      return
    }

    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteGastoTicket({ id: gastoToDelete.id, motivo })

      if (result.error) {
        setDeleteError(result.error)
        toast({
          variant: "destructive",
          title: "No se pudo cancelar",
          description: result.error,
        })
        return
      }

      setGastos((prev) => prev.filter((item) => item.id !== gastoToDelete.id))
      setDeleteDialogOpen(false)
      setDeleteReason("")
      setGastoToDelete(null)
      toast({
        title: "Movimiento cancelado",
        description: "La cancelacion quedo registrada en el historial del folio.",
      })
    })
  }, [deleteReason, gastoToDelete, startTransition])

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.12)]">
      <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <section className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.9))] p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-950">{COPY.title}</h3>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-slate-600">{COPY.inventoryTitle}</Label>
              <Input
                placeholder={COPY.inventoryPlaceholder}
                value={productoQuery}
                onChange={(event) => {
                  const next = event.target.value
                  setProductoQuery(next)
                  if (selectedProducto && next.trim() !== selectedProducto.nombre.trim()) {
                    setSelectedProducto(null)
                  }
                }}
                className="h-12 rounded-xl border-slate-200 bg-slate-50/80 text-[15px] shadow-none"
              />
              {selectedProducto ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200/70 bg-blue-50/80 px-3.5 py-3 text-sm text-blue-950">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-700">
                    <Package className="h-4 w-4" />
                  </span>
                  <span className="font-semibold">{selectedProducto.nombre}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-blue-700">Stock {selectedProducto.stock_actual}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-blue-700">Costo {formatCurrency(selectedProducto.costo)}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-blue-700">Venta {formatCurrency(selectedProducto.precio_venta)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProducto(null)
                      setProductoQuery("")
                      setProductoResults([])
                    }}
                    className="ml-auto text-xs font-semibold text-blue-700 hover:text-blue-800"
                  >
                    Quitar seleccion
                  </button>
                </div>
              ) : null}
              {buscandoProductos ? <p className="text-xs text-slate-400">Buscando coincidencias...</p> : null}
              {productoResults.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <ul className="divide-y divide-slate-100">
                    {productoResults.map((producto) => (
                      <li key={producto.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectProducto(producto)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">{producto.nombre}</p>
                            <p className="text-xs text-slate-500">
                              Disponible: {producto.stock_actual}
                              {producto.sku ? ` · SKU ${producto.sku}` : ""}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-slate-700">{formatCurrency(producto.costo)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : productoQuery.trim().length >= 2 ? (
                <p className="text-xs text-slate-400">No encontramos productos con ese nombre.</p>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_160px]">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-slate-600">Categoria</Label>
                  <Select value={categoria} onValueChange={(value) => setCategoria(value as GastoTipo)}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white text-sm shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        <span className="flex items-center gap-2">
                          <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-md border", item.tone)}>{item.icon}</span>
                          {item.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-slate-600">Concepto</Label>
                <Input
                  placeholder={COPY.conceptPlaceholder}
                  value={concepto}
                  onChange={(event) => setConcepto(event.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-white shadow-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-slate-600">{COPY.amountLabel}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={monto}
                  onChange={(event) => setMonto(event.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-white text-base font-semibold shadow-none"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-slate-600">Forma de pago</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {METODOS_PAGO.map((item) => {
                    const isActive = metodoPago === item.value
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setMetodoPago(item.value)}
                        className={cn(
                          "group flex min-h-[80px] items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-[border-color,background-color,transform] duration-200",
                          isActive
                            ? "border-blue-300 bg-blue-50/75"
                            : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white",
                        )}
                      >
                        <span className={cn("mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg", isActive ? "bg-white text-blue-700" : "bg-white text-slate-500")}>
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                          <span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.hint}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Monto</p>
                <p className="mt-2 text-[1.9rem] font-semibold tracking-[-0.04em] text-slate-950">{formatCurrency(montoPreview)}</p>
                <p className="mt-2 text-xs text-slate-500">{selectedMetodo.label} · {selectedCategoria.label}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <Lock className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Uso interno</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{COPY.internalNote}</p>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:min-w-[240px] sm:items-end">
                {addError ? <p className="text-xs font-medium text-red-600 sm:text-right">{addError}</p> : null}
                <Button
                  onClick={handleAddGasto}
                  disabled={!canSubmit}
                  className="h-12 rounded-xl bg-blue-600 px-5 text-sm font-semibold hover:bg-blue-700"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" />{COPY.addAction}</>}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)] sm:p-5">
            <div className="flex items-center gap-3">
              <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-xl border", selectedCategoria.tone)}>
                {selectedCategoria.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950">Vista previa</p>
                <p className="text-xs text-slate-500">Valida el cargo antes de registrarlo en el folio.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-white px-4 py-4 ring-1 ring-slate-200/80">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Costo a registrar</p>
                <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-slate-950">{formatCurrency(montoPreview)}</p>
                <p className="mt-2 text-xs text-slate-500">{selectedMetodo.label} · {selectedCategoria.label}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Concepto</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{concepto.trim() || selectedProducto?.nombre || "Pendiente por definir"}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Producto ligado</p>
                {selectedProducto ? (
                  <div className="mt-2 flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <Package className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{selectedProducto.nombre}</p>
                      <p className="mt-1 text-xs text-slate-500">Stock disponible: {selectedProducto.stock_actual}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Sin producto ligado.</p>
                )}
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="border-t border-slate-200/80 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Cargos registrados</p>
            <p className="mt-1 text-xs text-slate-500">Listado puntual de refacciones y gastos ligados a este folio.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
            {gastos.length} {gastos.length === 1 ? "movimiento registrado" : "movimientos registrados"}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          {gastos.length > 0 ? (
            <div className="divide-y divide-slate-100 bg-white">
              {gastos.map((gasto) => {
                const categoriaMeta = CATEGORIAS.find((item) => item.value === gasto.tipo) ?? CATEGORIAS[0]
                const metodoMeta = METODOS_PAGO.find((item) => item.value === gasto.metodo_pago) ?? null
                return (
                  <div key={gasto.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_150px_150px_160px_120px] sm:items-center sm:px-5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg border", categoriaMeta.tone)}>
                          {categoriaMeta.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{gasto.concepto}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatDateTime(gasto.created_at)}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:hidden">Categoria</p>
                      <p className="text-sm font-medium text-slate-700">{categoriaMeta.label}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:hidden">Pago</p>
                      <p className="text-sm font-medium text-slate-700">{metodoMeta?.label ?? "Interno"}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:hidden">Monto</p>
                      <p className="text-base font-semibold text-slate-950">{formatCurrency(gasto.monto)}</p>
                    </div>
                    <div className="sm:flex sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openDeleteDialog(gasto)}
                        disabled={isPending}
                        className="h-10 rounded-xl border-rose-200 bg-white px-3 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="ml-2 sm:hidden">Cancelar</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white px-4 py-10 text-center sm:px-6">
              <p className="text-sm font-medium text-slate-600">{COPY.emptyTitle}</p>
              <p className="mt-1 text-xs text-slate-500">Cuando registres una refaccion o gasto manual, aparecera en esta lista.</p>
            </div>
          )}
        </div>
      </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open)
        if (!open) {
          setDeleteError(null)
          setDeleteReason("")
          setGastoToDelete(null)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar movimiento</DialogTitle>
            <DialogDescription>
              {gastoToDelete
                ? `Se eliminara "${gastoToDelete.concepto}" del folio y el motivo quedara registrado en historial.`
                : "Captura el motivo de la cancelacion."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{gastoToDelete?.concepto ?? "Movimiento"}</p>
              <p className="mt-1 text-xs text-slate-500">
                {gastoToDelete ? `${formatCurrency(gastoToDelete.monto)} · ${formatDateTime(gastoToDelete.created_at)}` : ""}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-gasto-reason" className="text-[11px] font-semibold text-slate-600">
                Motivo de cancelacion
              </Label>
              <Textarea
                id="delete-gasto-reason"
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                placeholder="Ej. Refaccion defectuosa, captura duplicada o error de registro."
                className="min-h-[110px] resize-none"
              />
            </div>

            {deleteError ? <p className="text-sm font-medium text-rose-600">{deleteError}</p> : null}
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isPending}
            >
              Conservar
            </Button>
            <Button
              type="button"
              onClick={handleDeleteGasto}
              disabled={isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Cancelar movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value || 0)
}
