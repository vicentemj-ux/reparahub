"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Barcode, CheckCircle2, Crown, Loader2, PackagePlus, Sparkles, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { generateInventoryBarcode } from "@/lib/inventory-barcode"
import type { CreateEquiposLoteInput, CreateEquiposLoteResult, ProductoRow } from "@/lib/actions/productos-prisma"
import type { TallerSettings } from "@/lib/actions/settings-prisma"
import { InventoryPublicidadMenu } from "@/components/dashboard/inventory-publicidad-menu"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  isPro: boolean
  saving: boolean
  onSubmit: (input: CreateEquiposLoteInput) => Promise<CreateEquiposLoteResult>
  onCreated?: (result: CreateEquiposLoteResult) => void
  tallerNombre: string
  tallerSettings?: TallerSettings | null
  onPrintEtiqueta: (producto: ProductoRow, showPrice: boolean) => void
  onPrintCartel: (producto: ProductoRow) => void
}

export function AltaEquiposLoteModal({
  open,
  onOpenChange,
  isPro,
  saving,
  onSubmit,
  onCreated,
  tallerNombre,
  tallerSettings,
  onPrintEtiqueta,
  onPrintCartel,
}: Props) {
  const [nombre, setNombre] = useState("")
  const [marca, setMarca] = useState("")
  const [modelo, setModelo] = useState("")
  const [almacenamiento, setAlmacenamiento] = useState("")
  const [color, setColor] = useState("")
  const [condicion, setCondicion] = useState("")
  const [ubicacion, setUbicacion] = useState("")
  const [costo, setCosto] = useState("0")
  const [precioVenta, setPrecioVenta] = useState("0")
  const [seriesText, setSeriesText] = useState("")
  const [errors, setErrors] = useState<string[]>([])
  const [createdResult, setCreatedResult] = useState<CreateEquiposLoteResult | null>(null)

  const series = useMemo(
    () => seriesText.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean),
    [seriesText],
  )

  const duplicateSeries = useMemo(() => {
    const seen = new Set<string>()
    const dupes = new Set<string>()
    for (const serie of series) {
      const key = serie.toLowerCase()
      if (seen.has(key)) dupes.add(serie)
      seen.add(key)
    }
    return dupes
  }, [series])

  const previewRows = useMemo(
    () => series.slice(0, 12).map((serie, index) => ({
      serie,
      barcode: generateInventoryBarcode(new Date(), index),
      duplicated: duplicateSeries.has(serie),
      tooShort: serie.length < 5,
    })),
    [duplicateSeries, series],
  )

  const reset = () => {
    setNombre("")
    setMarca("")
    setModelo("")
    setAlmacenamiento("")
    setColor("")
    setCondicion("")
    setUbicacion("")
    setCosto("0")
    setPrecioVenta("0")
    setSeriesText("")
    setErrors([])
    setCreatedResult(null)
  }

  const submit = async () => {
    const localErrors: string[] = []
    if (!nombre.trim()) localErrors.push("Captura el nombre base del equipo.")
    if (series.length === 0) localErrors.push("Ingresa al menos una serie.")
    if (duplicateSeries.size > 0) localErrors.push("Hay series duplicadas dentro del lote.")
    if (series.some((serie) => serie.length < 5)) localErrors.push("Todas las series deben tener al menos 5 caracteres.")
    if (!isPro) localErrors.push("Alta por lote requiere PLAN PRO o Trial activo.")

    if (localErrors.length > 0) {
      setErrors(localErrors)
      return
    }

    setErrors([])
    const result = await onSubmit({
      nombre: nombre.trim(),
      categoria: "Equipos",
      marca: marca.trim() || undefined,
      modelo: modelo.trim() || undefined,
      almacenamiento: almacenamiento.trim() || undefined,
      color: color.trim() || undefined,
      condicion: condicion.trim() || undefined,
      ubicacion: ubicacion.trim() || undefined,
      costo: Number(costo) || 0,
      precio_venta: Number(precioVenta) || 0,
      stock_minimo: 1,
      series,
    })

    if (!result.success) {
      setErrors(result.errors ?? [result.error ?? "No se pudo crear el lote."])
      return
    }

    onCreated?.(result)
    setCreatedResult(result)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (saving) return
      onOpenChange(next)
      if (!next) {
        setErrors([])
        setCreatedResult(null)
      }
    }}>
      <DialogContent
        overlayClassName="bg-slate-200/75 backdrop-blur-md"
        className="max-h-[92vh] overflow-y-auto border-slate-200 bg-slate-50 p-0 sm:max-w-5xl [&>button]:right-5 [&>button]:top-5 [&>button]:z-20 [&>button]:h-11 [&>button]:w-11 [&>button]:rounded-full [&>button]:border-0 [&>button]:bg-transparent [&>button]:text-blue-600 [&>button]:opacity-100 [&>button]:shadow-none [&>button]:transition-all [&>button]:hover:scale-105 [&>button]:hover:bg-blue-50/80 [&>button]:hover:text-blue-700 [&>button]:focus:ring-blue-500/30 [&>button>svg]:h-7 [&>button>svg]:w-7"
      >
        <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_34%),linear-gradient(180deg,#ffffff,#f8fafc)] px-5 py-5 sm:px-7">
          <DialogHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                  <Crown className="h-3.5 w-3.5" />
                  Inventario PRO
                </div>
                <DialogTitle className="text-xl font-black italic tracking-tight text-slate-950 sm:text-2xl">
                  Alta por lote de equipos
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Captura los datos general del equipo que se subira por lotes agregando la SERIE de cada equipo. Tallercloud asignara codigo de barras unico por equipo integrando la fecha en el.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {!isPro ? (
          <div className="mx-5 mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:mx-7">
            <div className="flex gap-3">
              <Crown className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">Disponible en PLAN PRO</p>
                <p className="mt-1">Puedes revisar el flujo, pero para crear el lote necesitas activar PRO o estar en Trial.</p>
              </div>
            </div>
          </div>
        ) : null}

        {createdResult?.success ? (
          <div className="p-5 sm:p-7">
            <div className="rounded-[28px] border border-emerald-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-950">Lote creado correctamente</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {createdResult.createdCount} equipos quedaron listos en inventario. Puedes imprimir sus etiquetas desde esta lista.
                    </p>
                  </div>
                </div>
                <Badge tone="blue">{createdResult.createdCount} equipos</Badge>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:grid-cols-[minmax(0,1fr)_180px_150px_auto]">
                  <span>Equipo</span>
                  <span className="hidden sm:block">Serie / IMEI</span>
                  <span className="hidden sm:block">Codigo</span>
                  <span className="text-right">Imprimir</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {createdResult.productos.map((producto) => (
                    <div
                      key={producto.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_180px_150px_auto]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">{producto.nombre}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 sm:hidden">
                          {(producto.imei_serie ?? "").trim() || "Sin serie"} · {(producto.codigo_barras ?? producto.sku ?? "").trim() || "Sin codigo"}
                        </p>
                      </div>
                      <p className="hidden truncate font-mono text-xs font-semibold text-slate-600 sm:block">
                        {(producto.imei_serie ?? "").trim() || "Sin serie"}
                      </p>
                      <p className="hidden truncate font-mono text-xs font-semibold text-slate-600 sm:block">
                        {(producto.codigo_barras ?? producto.sku ?? "").trim() || "Sin codigo"}
                      </p>
                      <div className="flex justify-end">
                        <InventoryPublicidadMenu
                          producto={producto}
                          tallerNombre={tallerNombre}
                          onEtiquetaVenta={(showPrice) => onPrintEtiqueta(producto, showPrice)}
                          onCartelPrecio={() => onPrintCartel(producto)}
                          triggerVariant="printer"
                          tallerSettings={tallerSettings}
                          isPro={isPro}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-2xl border-slate-200 font-black"
                  onClick={() => reset()}
                >
                  Crear otro lote
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-2xl bg-blue-600 px-5 font-black text-white hover:bg-blue-700"
                  onClick={() => {
                    reset()
                    onOpenChange(false)
                  }}
                >
                  Terminar
                </Button>
              </div>
            </div>
          </div>
        ) : (
        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <PackagePlus className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-950">Ficha general</h3>
                  <p className="text-xs text-slate-500">Estos datos se copian a todas las unidades del lote.</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre base" value={nombre} onChange={setNombre} placeholder="iPad 7 32GB Blanco" className="sm:col-span-2" />
                <Field label="Marca" value={marca} onChange={setMarca} placeholder="Apple" />
                <Field label="Modelo" value={modelo} onChange={setModelo} placeholder="iPad 7" />
                <Field label="Capacidad" value={almacenamiento} onChange={setAlmacenamiento} placeholder="32GB" />
                <Field label="Color" value={color} onChange={setColor} placeholder="Blanco" />
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Condicion</Label>
                  <Select value={condicion || "__none__"} onValueChange={(value) => setCondicion(value === "__none__" ? "" : value)}>
                    <SelectTrigger className="min-h-12 rounded-xl border-slate-200 bg-slate-50">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin especificar</SelectItem>
                      <SelectItem value="Nuevo">Nuevo</SelectItem>
                      <SelectItem value="Reacondicionado">Reacondicionado</SelectItem>
                      <SelectItem value="Seminuevo">Seminuevo</SelectItem>
                      <SelectItem value="Usado">Usado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Ubicacion" value={ubicacion} onChange={setUbicacion} placeholder="Vitrina / Bodega" />
                <Field label="Costo" value={costo} onChange={setCosto} type="number" placeholder="0.00" />
                <Field label="Precio venta" value={precioVenta} onChange={setPrecioVenta} type="number" placeholder="0.00" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Barcode className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-950">Series del lote</h3>
                  <p className="text-xs text-slate-500">Una por linea o separadas por coma. Puedes pegar desde Excel.</p>
                </div>
              </div>
              <Textarea
                value={seriesText}
                onChange={(event) => setSeriesText(event.target.value)}
                placeholder={"F9FX12345ABC\nF9FX12345ABD\nF9FX12345ABE"}
                className="min-h-[220px] resize-y rounded-2xl border-slate-200 bg-slate-50 font-mono text-sm"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge tone="blue">{series.length} equipos</Badge>
                <Badge tone={duplicateSeries.size ? "amber" : "slate"}>{duplicateSeries.size} duplicadas</Badge>
                <Badge tone="slate">Stock 1 por unidad</Badge>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-950">Vista previa</h3>
                  <p className="text-xs text-slate-500">Primeras unidades con codigo fechado.</p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                {previewRows.length ? (
                  <div className="divide-y divide-slate-100 bg-white">
                    {previewRows.map((row, index) => (
                      <div key={`${row.serie}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">{row.serie}</p>
                          <p className="mt-1 font-mono text-xs text-slate-500">{row.barcode}</p>
                        </div>
                        {row.duplicated || row.tooShort ? (
                          <XCircle className="h-5 w-5 text-rose-500" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Pega las series para ver el lote.
                  </div>
                )}
              </div>

              {series.length > previewRows.length ? (
                <p className="mt-3 text-xs text-slate-500">Y {series.length - previewRows.length} equipos mas.</p>
              ) : null}
            </div>

            {errors.length ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <div className="mb-2 flex items-center gap-2 font-black">
                  <AlertTriangle className="h-4 w-4" />
                  Revisa antes de crear
                </div>
                <ul className="space-y-1">
                  {errors.slice(0, 6).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Button
              type="button"
              disabled={saving || !isPro}
              onClick={submit}
              className="h-12 w-full rounded-2xl bg-blue-600 font-black hover:bg-blue-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
              Crear {series.length || ""} equipos
            </Button>
          </aside>
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-12 rounded-xl border-slate-200 bg-slate-50"
        inputMode={type === "number" ? "decimal" : undefined}
      />
    </div>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "blue" | "amber" | "slate" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black",
        tone === "blue" && "bg-blue-50 text-blue-700",
        tone === "amber" && "bg-amber-50 text-amber-700",
        tone === "slate" && "bg-slate-100 text-slate-600",
      )}
    >
      {children}
    </span>
  )
}
