'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Wallet,
  Plus,
  TrendingDown,
  Search,
  Loader2,
  Trash2,
  CalendarDays,
  Tag,
  Banknote,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldOff,
} from "lucide-react"
import {
  getGastosOperativos,
  addGastoOperativo,
  deleteGastoOperativo,
  getCajaAbiertaStatus,
  type GastoOperativo,
} from "@/lib/actions/gastos-prisma"
import { toast } from "@/hooks/use-toast"
import { ModuleHeader } from "@/components/dashboard/module-header"


// --- Constants ---------------------------------------------------------------

const CATEGORIAS = [
  { value: "general", label: "General" },
  { value: "renta", label: "Renta" },
  { value: "servicios", label: "Servicios (agua, luz, internet)" },
  { value: "nomina", label: "Nomina" },
  { value: "insumos", label: "Insumos" },
  { value: "marketing", label: "Marketing" },
  { value: "equipo", label: "Equipo / Herramienta" },
  { value: "devolucion_reparacion", label: "Devolución por cancelación" },
  { value: "otro", label: "Otro" },
]

const METODOS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
]

const CATEGORIA_COLORS: Record<string, string> = {
  general: "bg-slate-100 text-slate-700",
  renta: "bg-orange-100 text-orange-700",
  servicios: "bg-blue-100 text-blue-700",
  nomina: "bg-purple-100 text-purple-700",
  insumos: "bg-amber-100 text-amber-700",
  marketing: "bg-pink-100 text-pink-700",
  equipo: "bg-cyan-100 text-cyan-700",
  devolucion_reparacion: "bg-red-100 text-red-700",
  otro: "bg-slate-100 text-slate-500",
}

const todayISO = () => new Date().toISOString().split("T")[0]

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)),
  ])
}

// --- Page --------------------------------------------------------------------

export default function BitacoraGastosPage() {
  const [gastos, setGastos] = useState<GastoOperativo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [fConcepto, setFConcepto] = useState('')
  const [fCategoria, setFCategoria] = useState('general')
  const [fMonto, setFMonto] = useState('')
  const [fMetodo, setFMetodo] = useState('efectivo')
  const [fAplicarACaja, setFAplicarACaja] = useState(true)
  const [fFecha, setFFecha] = useState(todayISO())
  const [fNotas, setFNotas] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Estado de caja abierta (afecta el callout del dialog y la decision
  // de si el gasto en efectivo se aplicara al Corte del dia).
  const [cajaAbiertaId, setCajaAbiertaId] = useState<string | null>(null)
  const [cajaStatusLoaded, setCajaStatusLoaded] = useState(false)
  const refreshCajaStatus = useCallback(async () => {
    try {
      const res = await withTimeout(getCajaAbiertaStatus(), 10000, "getCajaAbiertaStatus")
      setCajaAbiertaId(res.cajaId ?? null)
    } catch {
      setCajaAbiertaId(null)
    } finally {
      setCajaStatusLoaded(true)
    }
  }, [])

  const loadGastos = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await withTimeout(getGastosOperativos(), 15000, "getGastosOperativos")
      setGastos(res.data)
    } catch (error) {
      console.error("[bitacora-gastos] load:", error)
      toast({
        title: "No se pudo cargar gastos",
        description: "Intenta recargar en unos segundos.",
        variant: "destructive",
      })
      setGastos([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGastos()
    refreshCajaStatus()
  }, [loadGastos, refreshCajaStatus])

  const resetForm = () => {
    setFConcepto('')
    setFCategoria('general')
    setFMonto('')
    setFMetodo('efectivo')
    setFAplicarACaja(true)
    setFFecha(todayISO())
    setFNotas('')
    setFormError(null)
  }

  const handleOpenDialog = () => {
    resetForm()
    setDialogOpen(true)
    void refreshCajaStatus()
  }

  const handleSave = async () => {
    if (!fConcepto.trim()) { setFormError("Ingresa el concepto del gasto."); return }
    const monto = parseFloat(fMonto)
    if (isNaN(monto) || monto <= 0) { setFormError("Ingresa un monto valido mayor a 0."); return }
    if (!fFecha) { setFormError("Selecciona la fecha."); return }

    setIsSaving(true)
    setFormError(null)
    try {
      const res = await addGastoOperativo({
        concepto: fConcepto.trim(),
        categoria: fCategoria,
        monto,
      metodo_pago: fMetodo,
      fecha: fFecha,
      notas: fNotas.trim() || null,
      aplicar_a_caja: fAplicarACaja,
    })

      if (res.error) { setFormError(res.error); return }

      if (res.data) setGastos((prev) => [res.data!, ...prev])
      setDialogOpen(false)
      // El toast refleja el flujo real: si era efectivo y se aplico a caja,
      // la utilidad y el corte bajan juntos. Si era efectivo sin caja abierta,
      // solo baja la utilidad (el corte no se mueve).
      if (fMetodo === "efectivo") {
        if (res.cajaAplicada) {
          toast({
            title: "Gasto registrado y aplicado a caja",
            description: "La utilidad y el efectivo esperado del corte bajan.",
          })
        } else {
          toast({
            title: "Gasto registrado (sin caja)",
            description: "La utilidad baja, pero el efectivo de hoy no se ve afectado.",
          })
        }
      } else {
        toast({
          title: "Gasto registrado",
          description: "No se aplico a caja (no es efectivo). La utilidad lo descuenta.",
        })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      setFormError(msg)
      toast({
        variant: "destructive",
        title: "Error",
        description: msg,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    await deleteGastoOperativo(deleteId)
    setGastos((prev) => prev.filter((g) => g.id !== deleteId))
    setDeleteId(null)
    setIsDeleting(false)
  }

  // -- Derived --------------------------------------------------------------
  const now = new Date()
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const totalMes = gastos
    .filter((g) => g.fecha.startsWith(mesActual))
    .reduce((s, g) => s + g.monto, 0)

  const totalGeneral = gastos.reduce((s, g) => s + g.monto, 0)

  const filtered = gastos.filter((g) =>
    g.concepto.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.notas ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatFecha = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })

  const categoriaLabel = (v: string) => CATEGORIAS.find((c) => c.value === v)?.label ?? v
  const metodoLabel = (v: string) => METODOS.find((m) => m.value === v)?.label ?? v

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="flex w-full flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <ModuleHeader
        icon={Wallet}
        title="GASTOS OPERATIVOS"
        eyebrow="CONTROL DE EGRESOS Y COSTOS FIJOS"
        description="Registra, clasifica y consulta los egresos operativos del taller."
        actions={(
          <Button
            onClick={handleOpenDialog}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold uppercase tracking-tight gap-2 px-8 rounded-2xl h-11 whitespace-nowrap btn-glow"
          >
            <Plus className="h-5 w-5" />
            <span>Registrar Gasto</span>
          </Button>
        )}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl p-6 border-red-200 bg-red-50 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-4 w-4 text-red-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              Total Este Mes
            </p>
          </div>
          <p className="text-2xl font-black text-red-700">
            ${totalMes.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
        </Card>
        <Card className="rounded-2xl p-6 border-slate-200 bg-slate-50 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-slate-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Total Acumulado
            </p>
          </div>
          <p className="text-2xl font-black text-slate-700">
            ${totalGeneral.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <Card className="gap-0 py-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-red-600" />
            <h2 className="text-base font-extrabold italic tracking-tight text-slate-900 sm:text-lg">HISTORIAL DE EGRESOS</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar gasto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-8 text-base placeholder:text-slate-400 transition-colors focus:bg-white md:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Limpiar busqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="hidden md:table-header-group bg-slate-50">
              <TableRow className="hover:bg-transparent border-b border-slate-200">
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Concepto</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Categoria</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Metodo</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Fecha</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Monto</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Accion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="hidden md:table-row-group">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Cargando gastos...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow className="hover:bg-slate-50 border-b border-slate-100">
                  <TableCell colSpan={6} className="py-16 text-center">
                    <p className="text-slate-500 italic">NO SE ENCONTRARON GASTOS</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((g) => (
                  <TableRow key={g.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <TableCell className="font-medium text-sm text-foreground max-w-[180px]">
                      <div className="truncate">{g.concepto}</div>
                      {g.notas && (
                        <div className="text-xs text-slate-500 truncate mt-0.5">{g.notas}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${CATEGORIA_COLORS[g.categoria] ?? CATEGORIA_COLORS.otro}`}>
                        {categoriaLabel(g.categoria)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Banknote className="h-3.5 w-3.5 shrink-0" />
                        {metodoLabel(g.metodo_pago)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                      {formatFecha(g.fecha)}
                    </TableCell>
                    <TableCell className="font-bold text-red-600 whitespace-nowrap">
                      -${g.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteId(g.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

            {/* ── Mobile cards ── */}
            <div className="md:hidden divide-y divide-slate-100">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Cargando gastos...
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-slate-500 italic">NO SE ENCONTRARON GASTOS</p>
                </div>
              ) : (
                filtered.map((g) => (
                  <div key={g.id} className="flex flex-col gap-3 px-5 py-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{g.concepto}</p>
                        {g.notas && <p className="text-xs text-slate-500 mt-0.5">{g.notas}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteId(g.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${CATEGORIA_COLORS[g.categoria] ?? CATEGORIA_COLORS.otro}`}>
                        {categoriaLabel(g.categoria)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Banknote className="h-3 w-3" />
                        {metodoLabel(g.metodo_pago)}
                      </span>
                      <span className="text-xs text-slate-400">{formatFecha(g.fecha)}</span>
                    </div>
                    <p className="text-lg font-bold text-red-600">
                      -${g.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Table>
        </div>
      </Card>

      {/* Add Gasto Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border-slate-200 bg-white p-6 shadow-sm">
          <DialogTitle className="text-lg font-bold">Registrar Gasto Operativo</DialogTitle>
          <DialogDescription className="text-sm tracking-tight text-slate-500">
            Completa los datos del egreso. Si el metodo es efectivo, se registrara una salida en caja.
          </DialogDescription>

          <div className="space-y-4 pt-2">
            {/* Concepto */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide">Concepto *</Label>
              <Input
                value={fConcepto}
                onChange={(e) => setFConcepto(e.target.value)}
                placeholder="Ej. Renta del local, Internet, etc."
              />
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Categoria
              </Label>
              <Select value={fCategoria} onValueChange={setFCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Monto + Metodo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide">Monto *</Label>
                <Input
                  value={fMonto}
                  onChange={(e) => setFMonto(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide">Metodo de pago</Label>
                <Select value={fMetodo} onValueChange={setFMetodo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METODOS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fecha */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Fecha *
              </Label>
              <Input
                value={fFecha}
                onChange={(e) => setFFecha(e.target.value)}
                type="date"
              />
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide">Notas (opcional)</Label>
              <Input
                value={fNotas}
                onChange={(e) => setFNotas(e.target.value)}
                placeholder="Observaciones adicionales..."
              />
            </div>

            {fMetodo === "efectivo" && cajaStatusLoaded && (
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  {cajaAbiertaId ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <p className={cajaAbiertaId ? "text-emerald-800" : "text-amber-800"}>
                    {cajaAbiertaId
                      ? "Hay caja abierta. Puedes aplicar el gasto al corte o registrarlo sin salida de caja si no hay efectivo disponible."
                      : "No hay caja abierta. El gasto se guardara igual y descontara la utilidad; solo no generara salida de caja."}
                  </p>
                </div>
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={fAplicarACaja && Boolean(cajaAbiertaId)}
                    onChange={(e) => setFAplicarACaja(e.target.checked)}
                    disabled={!cajaAbiertaId}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <span className="flex items-center gap-1 font-semibold text-slate-900">
                      <ShieldOff className="h-3.5 w-3.5 text-slate-500" />
                      {cajaAbiertaId ? "Aplicar a caja" : "Registrar sin salida de caja"}
                    </span>
                    <span className="block text-slate-500">
                      {cajaAbiertaId
                        ? "Desactivalo si necesitas continuar aunque no haya fondo suficiente."
                        : "Esta opcion mantiene la utilidad afectada, aunque no exista caja abierta."}
                    </span>
                  </span>
                </label>
              </div>
            )}

            {formError && (
              <p className="text-xs font-medium text-red-600">{formError}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving} className="rounded-2xl border-slate-200">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null) }}>
        <AlertDialogContent className="rounded-3xl border-slate-200 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>?Eliminar este gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Si el gasto fue registrado en efectivo, tambien se eliminara el movimiento de caja correspondiente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-2xl border-slate-200">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  )
}

