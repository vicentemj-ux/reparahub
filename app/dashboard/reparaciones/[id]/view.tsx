"use client"

import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { getRepairDetailPageData, reactivarReingreso } from "@/lib/actions/repairs-prisma"
import type { BitacoraRepair, RepairDetail } from "@/lib/actions/repairs-prisma"
import { RepairDetailView } from "@/components/dashboard/repair-detail-view"
import { ReparacionEditDialog } from "@/components/dashboard/reparacion-edit-dialog"
import { Button } from "@/components/ui/button"
import { Loader2, RotateCcw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)),
  ])
}

function detailToBitacoraRepair(d: RepairDetail): BitacoraRepair {
  return {
    id: d.id,
    folio: d.folio,
    clienteName: d.clienteName,
    clientePhone: d.clientePhone,
    deviceBrand: d.deviceBrand,
    deviceModel: d.deviceModel,
    estimatedPrice: d.estimatedPrice,
    anticipo: d.anticipo ?? 0,
    status: (d.status ?? "Recibido") as BitacoraRepair["status"],
    createdAt: d.createdAt,
    tecnico: d.tecnico,
    falla: d.falla,
  }
}

export default function ReparacionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === "string" ? params.id : ""

  const [repair, setRepair] = useState<BitacoraRepair | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [reingresoOpen, setReingresoOpen] = useState(false)
  const [reingresoMotivo, setReingresoMotivo] = useState("")
  const [reingresoLoading, setReingresoLoading] = useState(false)
  const [reingresoError, setReingresoError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    try {
      const page = await withTimeout(getRepairDetailPageData(id), 15000, "getRepairDetailPageData")
      if (!page.detail) {
        setNotFound(true)
        setRepair(null)
      } else {
        setRepair(detailToBitacoraRepair(page.detail))
      }
    } catch (error) {
      console.error("[reparacion-detail] load:", error)
      toast({
        title: "No se pudo cargar el detalle completo",
        description: "Mostrando informacion parcial. Intenta recargar.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (notFound) {
      router.replace("/dashboard/reparaciones")
    }
  }, [notFound, router])

  const handleBack = useCallback(() => {
    router.push("/dashboard/reparaciones")
  }, [router])

  const handleDelete = useCallback(() => {
    router.push("/dashboard/reparaciones")
  }, [router])

  const handleRepairUpdated = useCallback((updated: BitacoraRepair) => {
    setRepair(updated)
  }, [])

  const handleOpenEdit = useCallback(() => {
    setEditOpen(true)
  }, [])

  const handleConfirmReingreso = useCallback(async () => {
    if (!repair) return
    setReingresoLoading(true)
    setReingresoError(null)
    try {
      const result = await reactivarReingreso({ repairId: repair.id, motivo: reingresoMotivo })
      if (!result.success) {
        const errMsg = result.error ?? "No se pudo reactivar el reingreso."
        setReingresoError(errMsg)
        toast({
          variant: "destructive",
          title: "No se pudo reactivar",
          description: errMsg,
        })
        return
      }
      toast({
        title: "Reingreso activado y registrado en historial",
        description: `Folio ${repair.folio} reactiva por garantia.`,
      })
      setReingresoOpen(false)
      setReingresoMotivo("")
      await load()
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      const msg =
        raw.trim() ||
        "Error de red o del servidor al confirmar el reingreso. Intenta de nuevo o revisa la consola."
      setReingresoError(msg)
      toast({
        variant: "destructive",
        title: "Error al confirmar",
        description: msg,
      })
    } finally {
      setReingresoLoading(false)
    }
  }, [repair, reingresoMotivo, load])

  if (!id) {
    return null
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-dashboard-surface px-4">
        <div role="status" aria-live="polite" className="flex items-center gap-3 px-4 py-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm font-medium tracking-tight text-slate-600">Cargando detalle...</span>
        </div>
      </div>
    )
  }

  if (notFound || !repair) {
    return (
      <div className="min-h-0 w-full bg-dashboard-surface">
        <div className="flex w-full px-4 py-10 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-semibold tracking-tight text-slate-900">
              Esta reparacion no esta disponible.
            </p>
            <p className="mt-2 text-sm tracking-tight text-slate-500">
              Te estamos redirigiendo al listado.
            </p>
            <Button
              variant="outline"
              className="mt-6 rounded-xl border-slate-200 px-5 font-semibold text-slate-700 hover:bg-slate-50"
              onClick={handleBack}
            >
              Volver a Reparaciones
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-dashboard-surface">
      <div className="flex w-full flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">

        {/* Reingreso financial hint - visible when status is Reingreso */}
        {repair.status === "Reingreso" && repair.estimatedPrice != null && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm">
            <p className="font-bold text-orange-800 uppercase tracking-wide text-[11px] mb-1">Reingreso activo - saldo pendiente</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-orange-900 tabular-nums">
              <span>Presupuesto: <strong>${repair.estimatedPrice.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></span>
              <span>Pagado: <strong>${(repair.anticipo ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></span>
              <span>Saldo a cobrar: <strong>${Math.max(0, repair.estimatedPrice - (repair.anticipo ?? 0)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></span>
            </div>
          </div>
        )}

        {/* Monitor de Utilidad Operativa */}
        <RepairDetailView
          repair={repair}
          onBack={handleBack}
          onRepairUpdated={handleRepairUpdated}
          onDelete={handleDelete}
          onEditTicket={handleOpenEdit}
          onReactivarReingreso={() => { setReingresoMotivo(""); setReingresoError(null); setReingresoOpen(true) }}
        />
      </div>

      <ReparacionEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editingRepairId={editOpen ? repair.id : null}
        onEditSuccess={() => void load()}
      />

      {/* Reactivar como Reingreso modal */}
      <Dialog
        open={reingresoOpen}
        onOpenChange={(open) => {
          if (!reingresoLoading) setReingresoOpen(open)
        }}
      >
        <DialogContent className="max-w-sm rounded-2xl border-slate-200 bg-white p-0 gap-0 overflow-hidden shadow-lg">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
            <DialogTitle className="flex items-center gap-2 text-base text-slate-900">
              <RotateCcw className="h-4 w-4 text-orange-600" aria-hidden />
              Reactivar como Reingreso
            </DialogTitle>
            <DialogDescription className="text-left text-sm text-slate-600">
              Folio <strong>{repair?.folio}</strong> volvera a estado activo para recibir atencion por garantia o falla recurrente.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Motivo del reingreso <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Ej: El cliente reporta que el problema persiste despues de 3 dias de la entrega..."
                value={reingresoMotivo}
                onChange={(e) => { setReingresoMotivo(e.target.value); setReingresoError(null) }}
                className="resize-none text-sm min-h-[90px]"
                maxLength={500}
                disabled={reingresoLoading}
              />
              <p className="text-right text-[10px] text-slate-400">{reingresoMotivo.length}/500</p>
            </div>
            {reingresoError && (
              <p className="text-xs text-red-600 font-medium">{reingresoError}</p>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto border-slate-200 text-slate-700"
              onClick={() => setReingresoOpen(false)}
              disabled={reingresoLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="w-full sm:flex-1 gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold"
              onClick={handleConfirmReingreso}
              disabled={reingresoLoading || reingresoMotivo.trim().length === 0}
            >
              {reingresoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Confirmar Reingreso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}



