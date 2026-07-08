"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import {
  getOrdenById, emitirOrden, abortarOrden,
  recibirOrdenConCreacion,
} from "@/lib/actions/compras-prisma"
import type { OrdenCompra, DetalleOrden } from "@/lib/actions/compras-prisma"
import {
  ArrowLeft, Package, Calendar, FileText,
  CheckCircle2, AlertTriangle, Loader2, Trash2, XCircle,
  RefreshCw, Info,
} from "lucide-react"

// --- Helpers ------------------------------------------------------------------

function fmtMXN(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 })
}

function fmtDate(s: string | null) {
  if (!s) return "-"
  const d = new Date(s + "T12:00:00")
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
}

const ESTATUS_CONFIG: Record<string, { label: string; className: string }> = {
  borrador: { label: "BORRADOR DE AUDITORIA", className: "bg-slate-100 text-slate-600 border-slate-200" },
  en_transito: { label: "EN TRANSITO", className: "bg-blue-50 text-blue-700 border-blue-200" },
  pendiente: { label: "ORDENADO", className: "bg-blue-50 text-blue-600 border-blue-100" },
  recibida: { label: "RECIBIDO", className: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  parcial: { label: "PARCIAL", className: "bg-amber-50 text-amber-600 border-amber-100" },
  cancelada: { label: "CANCELADO", className: "bg-red-50 text-red-600 border-red-100" },
}

// --- Page ---------------------------------------------------------------------

export default function OrdenDetallePage() {
  const router = useRouter()
  const params = useParams()
  const ordenId = params.id as string

  const [orden, setOrden] = useState<OrdenCompra | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Modals
  const [showAbortar, setShowAbortar] = useState(false)
  const [showRecepcion, setShowRecepcion] = useState(false)
  const [showDisputa, setShowDisputa] = useState(false)
  const [showSyncConfirm, setShowSyncConfirm] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; creados: number; actualizados: number; errores: string[] } | null>(null)

  const fetchOrden = useCallback(async () => {
    if (!ordenId) return
    setLoading(true)
    const { data } = await getOrdenById(ordenId)
    setOrden(data)
    setLoading(false)
  }, [ordenId])

  useEffect(() => {
    fetchOrden()
  }, [fetchOrden])

  const handleEmitir = async () => {
    if (!orden) return
    setActionLoading(true)
    const { error } = await emitirOrden(orden.id)
    setActionLoading(false)
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" })
      return
    }
    toast({ title: "Orden emitida", description: "Ahora esta en transito." })
    fetchOrden()
  }

  const handleAbortar = async () => {
    if (!orden) return
    setActionLoading(true)
    const { error } = await abortarOrden(orden.id)
    setActionLoading(false)
    setShowAbortar(false)
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" })
      return
    }
    toast({ title: "Orden eliminada", description: "El borrador fue descartado." })
    router.push("/dashboard/compras")
  }

  const handleDisputar = async () => {
    if (!orden) return
    setActionLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setActionLoading(false)
    setShowDisputa(false)
    toast({ title: "Disputa registrada", description: "Se notifico al proveedor." })
  }

  const handleSincronizar = async () => {
    if (!orden) return
    setActionLoading(true)
    const result = await recibirOrdenConCreacion(orden.id, null)
    setActionLoading(false)
    setShowSyncConfirm(false)
    setSyncResult(result)
    if (result.success) {
      toast({
        title: "Stock sincronizado",
        description: `${result.creados} producto(s) creado(s), ${result.actualizados} actualizado(s).`,
      })
      fetchOrden()
    } else {
      toast({
        title: "Errores en recepcion",
        description: result.errores.join("\n"),
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dashboard-surface">
        <div className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <Skeleton className="h-20 w-full rounded-3xl" />
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            <Skeleton className="h-80 w-full rounded-3xl" />
            <Skeleton className="h-80 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!orden) {
    return (
      <div className="min-h-screen bg-dashboard-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-600">Orden no encontrada</p>
          <Button variant="outline" onClick={() => router.push("/dashboard/compras")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
        </div>
      </div>
    )
  }

  const cfg = ESTATUS_CONFIG[orden.estatus]
  const detalle = orden.detalle ?? []

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">

        {/* -- HEADER -- */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard/compras")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black italic tracking-tight text-slate-900">
                  {orden.folio}
                </h1>
                <Badge
                  variant="outline"
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${cfg.className}`}
                >
                  {cfg.label}
                </Badge>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-0.5">
                CUSTODIADO POR {orden.custodio || "SISTEMA"} . {fmtDate(orden.fecha_orden)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {orden.estatus === "borrador" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowAbortar(true)}
                  className="h-10 gap-2 rounded-full border-red-200 px-5 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4" /> Abortar orden
                </Button>
                <Button
                  onClick={handleEmitir}
                  disabled={actionLoading}
                  className="h-10 gap-2 rounded-full bg-blue-600 px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-700 btn-glow"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Emitir orden logistica
                </Button>
              </>
            )}
            {orden.estatus === "en_transito" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowDisputa(true)}
                  className="h-10 gap-2 rounded-full border-slate-200 px-5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                >
                  <AlertTriangle className="h-4 w-4" /> Disputar orden
                </Button>
                <Button
                  onClick={() => setShowRecepcion(true)}
                  disabled={actionLoading}
                  className="h-10 gap-2 rounded-full bg-emerald-600 px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-700 btn-glow"
                >
                  <CheckCircle2 className="h-4 w-4" /> Validar y recibir activos
                </Button>
              </>
            )}
            {(orden.estatus === "recibida" || orden.estatus === "cancelada") && (
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/compras")}
                className="h-10 gap-2 rounded-full border-slate-200 px-5 text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                <ArrowLeft className="h-4 w-4" /> Regresar
              </Button>
            )}
          </div>
        </header>

        {/* -- MAIN -- */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

          {/* Left column */}
          <div className="flex flex-col gap-5">
            {/* Socio de suministro */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-blue-600" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800">
                  Socio de suministro
                </h3>
              </div>
              <p className="text-xl font-black italic text-slate-900">{orden.proveedor_nombre}</p>
              {orden.proveedor_id && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Proveedor verificado
                </div>
              )}
            </div>

            {/* Registro auditoria */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-blue-600" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800">
                  Registro auditoria
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Arribo estimado</p>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-800">{fmtDate(orden.fecha_entrega)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Notas de recepcion</p>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {orden.notas || "No se registraron instrucciones de auditoria para este despliegue logistico."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Desglose */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Package className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black italic tracking-tight text-slate-900">DESGLOSE DE ACTIVOS</h3>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {detalle.length} SKUs unificados en orden
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Compromiso financiero total</p>
                <p className="text-2xl font-black text-slate-900 tabular-nums">{fmtMXN(orden.total)}</p>
              </div>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Descriptor de producto
                    </th>
                    <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Unidades
                    </th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Coste unitario
                    </th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Subtotal SKU
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {detalle.map((d: DetalleOrden) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <Package className="h-4 w-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{d.descripcion}</p>
                            {d.producto_id && (
                              <p className="text-[10px] text-slate-400 mt-0.5">SKU vinculado</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                          {d.cantidad}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-medium text-slate-600 tabular-nums">
                        {fmtMXN(d.precio_unitario)}
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-black text-slate-900 tabular-nums">
                        {fmtMXN(d.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* -- Modal: Abortar -- */}
      <AlertDialog open={showAbortar} onOpenChange={setShowAbortar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>?Abortar orden?</AlertDialogTitle>
            <AlertDialogDescription>
              La orden <strong>{orden.folio}</strong> sera eliminada permanentemente. Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
              onClick={handleAbortar}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Abortar orden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* -- Modal: Disputa -- */}
      <Dialog open={showDisputa} onOpenChange={setShowDisputa}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Disputar orden
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              Estas a punto de registrar una disputa para la orden <strong>{orden.folio}</strong>. El proveedor sera notificado.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDisputa(false)}>Cancelar</Button>
            <Button onClick={handleDisputar} disabled={actionLoading} className="bg-amber-600 hover:bg-amber-700">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirmar disputa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* -- Modal: Sincronizar stock (recepcion) [Image 8/9 style] -- */}
      <Dialog open={showRecepcion} onOpenChange={setShowRecepcion}>
        <DialogContent className="max-w-sm text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
              <Info className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sincronizar Stock Entrante</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Al validar la recepcion, el inventario se actualizara en tiempo real. Esta accion consolidara los registros logisticos y es irreversible.
              </p>
            </div>
            <div className="flex w-full gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => setShowRecepcion(false)}
                className="flex-1 h-11 rounded-xl border-slate-200 text-sm font-bold"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => { setShowRecepcion(false); setShowSyncConfirm(true) }}
                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-bold uppercase tracking-wider text-white"
              >
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* -- Modal: Confirmar sync final [Image 9] -- */}
      <Dialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
        <DialogContent className="max-w-sm text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
              <RefreshCw className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Confirmar operacion</h3>
              <p className="text-sm text-slate-500 mt-2">
                ?Estas seguro de que deseas sincronizar y finalizar la recepcion de <strong>{orden.folio}</strong>?
              </p>
            </div>
            <div className="flex w-full gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => setShowSyncConfirm(false)}
                className="flex-1 h-11 rounded-xl border-slate-200 text-sm font-bold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSincronizar}
                disabled={actionLoading}
                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-bold uppercase tracking-wider text-white"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Sincronizar y finalizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* -- Modal: Resultado sync -- */}
      <Dialog open={!!syncResult} onOpenChange={() => setSyncResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {syncResult?.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {syncResult?.success ? "Recepcion completada" : "Errores en recepcion"}
            </DialogTitle>
          </DialogHeader>
          {syncResult && (
            <div className="space-y-3 py-2">
              {syncResult.success ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                  <p className="text-sm text-emerald-800">
                    <strong>{syncResult.creados}</strong> producto(s) creado(s)
                  </p>
                  <p className="text-sm text-emerald-800">
                    <strong>{syncResult.actualizados}</strong> producto(s) actualizado(s) con costo ponderado
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-800 mb-2">Errores detectados:</p>
                  <ul className="space-y-1">
                    {syncResult.errores.map((err, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                        <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setSyncResult(null)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

