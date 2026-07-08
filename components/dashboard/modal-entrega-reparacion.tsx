"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, PackageCheck, RotateCcw, AlertTriangle, Wallet } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { confirmarEntregaConLiquidacion, entregarSinReparacionConAjuste, getCajaEfectivoDisponible } from "@/lib/actions/repairs-prisma"

function fmt(n: number) {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

type Metodo = "efectivo" | "tarjeta" | "transferencia"
type MetodoDevolucion = "efectivo" | "transferencia"

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function montosUnico(metodo: Metodo, total: number) {
  const t = round2(total)
  return {
    monto_efectivo: metodo === "efectivo" ? t : 0,
    monto_tarjeta: metodo === "tarjeta" ? t : 0,
    monto_transferencia: metodo === "transferencia" ? t : 0,
    metodoPago: metodo,
  }
}

export type EntregaCompletadaPayload = {
  /** Monto cobrado en esta operacion de entrega (liquidacion o sin reparacion) */
  pagoFinal: number
  metodoPago: "efectivo" | "tarjeta" | "transferencia"
}

export interface ModalEntregaReparacionProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repairId: string
  folio: string
  saldoPendiente: number
  /** Anticipo actual (para estimar cobro en «sin reparacion») */
  anticipoActual: number
  /** Estado actual del ticket; determina el flujo del modal */
  estado?: string
  onCompleted: (payload: EntregaCompletadaPayload) => void | Promise<void>
}

export function ModalEntregaReparacion({
  open,
  onOpenChange,
  repairId,
  folio,
  saldoPendiente,
  anticipoActual,
  estado,
  onCompleted,
}: ModalEntregaReparacionProps) {
  const esSinReparacion = estado === "Sin Reparacion" || estado === "Cancelado"

  const [nota, setNota] = useState("")
  const [metodo, setMetodo] = useState<Metodo>("efectivo")
  const [saving, setSaving] = useState(false)

  // Sin reparacion
  const [cargoRevision, setCargoRevision] = useState("")
  const [metodoDevolucion, setMetodoDevolucion] = useState<MetodoDevolucion>("efectivo")
  const [metodoCargoExtra, setMetodoCargoExtra] = useState<Metodo>("efectivo")
  const [savingSinRep, setSavingSinRep] = useState(false)
  const [cajaEfectivo, setCajaEfectivo] = useState<{ disponible: number; cajaAbierta: boolean; error?: string } | null>(null)
  const [loadingCaja, setLoadingCaja] = useState(false)

  useEffect(() => {
    if (!open) {
      setNota("")
      setMetodo("efectivo")
      setCargoRevision("")
      setMetodoDevolucion("efectivo")
      setMetodoCargoExtra("efectivo")
      setCajaEfectivo(null)
    }
  }, [open])

  useEffect(() => {
    if (!open || !esSinReparacion) return
    let cancelled = false
    setLoadingCaja(true)
    void getCajaEfectivoDisponible()
      .then((res) => {
        if (!cancelled) setCajaEfectivo(res)
      })
      .finally(() => {
        if (!cancelled) setLoadingCaja(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, esSinReparacion])

  const cargoRevNum = useMemo(() => {
    const raw = parseFloat(String(cargoRevision).replace(",", "."))
    return Number.isFinite(raw) ? Math.max(0, raw) : 0
  }, [cargoRevision])

  // Calculos para sin reparacion
  const montoADevolver = useMemo(() => {
    if (cargoRevNum <= anticipoActual) {
      return round2(anticipoActual - cargoRevNum)
    }
    return 0
  }, [cargoRevNum, anticipoActual])

  const cargoExtra = useMemo(() => {
    if (cargoRevNum > anticipoActual) {
      return round2(cargoRevNum - anticipoActual)
    }
    return 0
  }, [cargoRevNum, anticipoActual])

  const hayDevolucion = montoADevolver > 0.005
  const hayCargoExtra = cargoExtra > 0.005

  // Pre-check de caja cuando la devolucion sera en efectivo
  const cajaInsuficienteEfectivo =
    hayDevolucion &&
    metodoDevolucion === "efectivo" &&
    cajaEfectivo !== null &&
    cajaEfectivo.cajaAbierta &&
    cajaEfectivo.disponible + 0.005 < montoADevolver
  const cajaCerradaParaEfectivo =
    hayDevolucion && metodoDevolucion === "efectivo" && cajaEfectivo !== null && !cajaEfectivo.cajaAbierta
  const bloqueaDevolucionEfectivo = cajaInsuficienteEfectivo || cajaCerradaParaEfectivo

  // ── Entrega EXITOSA (estado Listo) ─────────────────────────────────────────
  const saldo = round2(Math.max(0, saldoPendiente))
  const tieneSaldo = saldo > 0.005

  const handleConfirmarEntrega = async () => {
    setSaving(true)
    try {
      const { monto_efectivo, monto_tarjeta, monto_transferencia, metodoPago } = tieneSaldo
        ? montosUnico(metodo, saldo)
        : { monto_efectivo: 0, monto_tarjeta: 0, monto_transferencia: 0, metodoPago: "efectivo" as Metodo }

      const res = await confirmarEntregaConLiquidacion({
        repairId,
        metodoPago,
        monto_efectivo,
        monto_tarjeta,
        monto_transferencia,
        notaTecnica: nota.trim() || undefined,
      })

      if (!res.success) {
        toast({ title: "No se pudo entregar", description: res.error, variant: "destructive" })
        return
      }
      toast({ title: "Entrega registrada", description: "Historial actualizado; caja y venta si aplica." })
      onOpenChange(false)
      await onCompleted({ pagoFinal: tieneSaldo ? saldo : 0, metodoPago })
    } finally {
      setSaving(false)
    }
  }

  // ── Entrega SIN REPARACION ────────────────────────────────────────────────
  const handleSinReparacion = async () => {
    setSavingSinRep(true)
    try {
      const cargoExtraMontos = hayCargoExtra
        ? montosUnico(metodoCargoExtra, cargoExtra)
        : { monto_efectivo: 0, monto_tarjeta: 0, monto_transferencia: 0, metodoPago: "efectivo" as Metodo }

      const res = await entregarSinReparacionConAjuste({
        repairId,
        costoRevision: cargoRevNum,
        metodoPago: cargoExtraMontos.metodoPago,
        monto_efectivo: cargoExtraMontos.monto_efectivo,
        monto_tarjeta: cargoExtraMontos.monto_tarjeta,
        monto_transferencia: cargoExtraMontos.monto_transferencia,
        metodoDevolucion: hayDevolucion ? metodoDevolucion : undefined,
        montoDevolucionEfectivo: hayDevolucion && metodoDevolucion === "efectivo" ? montoADevolver : 0,
        montoDevolucionTransferencia: hayDevolucion && metodoDevolucion === "transferencia" ? montoADevolver : 0,
        notaTecnica: nota.trim() || undefined,
      })

      if (!res.success) {
        toast({ title: "No se pudo completar", description: res.error, variant: "destructive" })
        return
      }
      if (res.warning) {
        toast({ title: "Reembolso no registrado", description: res.warning, variant: "destructive" })
      } else {
        toast({ title: "Entrega sin reparacion", description: "Orden cerrada." })
      }
      onOpenChange(false)
      await onCompleted({ pagoFinal: hayCargoExtra ? cargoExtra : 0, metodoPago: cargoExtraMontos.metodoPago })
    } finally {
      setSavingSinRep(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (esSinReparacion) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[min(90vh,680px)] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto border border-slate-200 bg-white p-0 text-slate-900 shadow-lg sm:w-full">
          <DialogHeader className="border-b border-slate-100 px-5 pb-3 pt-4 text-left">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <RotateCcw className="h-4 w-4 text-amber-600" aria-hidden />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">Entregar sin reparacion</DialogTitle>
                <DialogDescription className="text-xs text-slate-600">
                  Folio <span className="font-mono font-semibold">{folio}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-5 py-3">
            {/* Anticipo + Cargo en 2 columnas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Anticipo</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">{fmt(anticipoActual)}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cargo-revision" className="text-xs font-semibold text-slate-700">
                  Cargo por revision
                </Label>
                <Input
                  id="cargo-revision"
                  inputMode="decimal"
                  value={cargoRevision}
                  onChange={(e) => setCargoRevision(e.target.value)}
                  placeholder="0.00"
                  className="h-9 rounded-lg border-slate-200 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Resultado del calculo */}
            {hayDevolucion ? (
              <div className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-700">Monto a devolver al cliente</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-red-700">{fmt(montoADevolver)}</p>
                <p className="text-[11px] text-red-800">
                  {fmt(anticipoActual)} − {fmt(cargoRevNum)} = {fmt(montoADevolver)} devolucion
                </p>

                <div className="mt-2 space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Metodo de devolucion</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["efectivo", "Efectivo"],
                        ["transferencia", "Transferencia"],
                      ] as const
                    ).map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setMetodoDevolucion(v)}
                        className={`rounded-lg border-2 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                          metodoDevolucion === v
                            ? "border-red-600 bg-red-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {metodoDevolucion === "efectivo" ? "Salida de caja registrada." : "Devolucion por transferencia registrada."}
                  </p>

                  {metodoDevolucion === "efectivo" ? (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white/70 px-2.5 py-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                        <Wallet className="h-3 w-3" />
                        Efectivo en caja
                      </div>
                      {loadingCaja ? (
                        <p className="mt-0.5 text-[11px] text-slate-500">Consultando caja...</p>
                      ) : cajaEfectivo === null ? (
                        <p className="mt-0.5 text-[11px] text-slate-500">Sin datos de caja.</p>
                      ) : !cajaEfectivo.cajaAbierta ? (
                        <p className="mt-0.5 text-[11px] font-semibold text-red-700">No hay caja abierta. Abre caja para registrar la devolucion en efectivo.</p>
                      ) : (
                        <div className="mt-0.5 flex items-baseline justify-between">
                          <span className="text-[11px] text-slate-600">Disponible:</span>
                          <span className={`text-[12px] font-bold tabular-nums ${cajaInsuficienteEfectivo ? "text-red-700" : "text-slate-900"}`}>
                            {fmt(cajaEfectivo.disponible)}
                          </span>
                        </div>
                      )}
                      {cajaInsuficienteEfectivo ? (
                        <div className="mt-1.5 flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50/80 px-2 py-1.5">
                          <AlertTriangle className="mt-px h-3 w-3 shrink-0 text-red-600" />
                          <p className="text-[10.5px] leading-tight text-red-800">
                            Efectivo insuficiente. Disponible {fmt(cajaEfectivo!.disponible)} &mdash; se necesitan {fmt(montoADevolver)}. Cambia a transferencia o reabre caja con mas efectivo.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : hayCargoExtra ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Saldo adicional a cobrar</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-blue-700">{fmt(cargoExtra)}</p>
                <p className="text-[11px] text-blue-800">
                  Cargo ({fmt(cargoRevNum)}) mayor al anticipo ({fmt(anticipoActual)}).
                </p>

                <div className="mt-2 space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Metodo de pago</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["efectivo", "Efectivo"],
                        ["tarjeta", "Tarjeta"],
                        ["transferencia", "Transferencia"],
                      ] as const
                    ).map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setMetodoCargoExtra(v)}
                        className={`rounded-lg border-2 py-2 text-[11px] font-semibold uppercase transition-colors ${
                          metodoCargoExtra === v
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sin movimiento de dinero</p>
                <p className="text-xs text-slate-600">
                  Cargo igual al anticipo. No hay devolucion ni cobro adicional.
                </p>
              </div>
            )}

            {/* Nota */}
            <div className="space-y-1.5">
              <Label htmlFor="nota-sin-rep" className="text-xs font-medium text-slate-700">
                Nota <span className="font-normal text-slate-400">(opcional)</span>
              </Label>
              <Textarea
                id="nota-sin-rep"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={2}
                placeholder="Motivo de la no reparacion..."
                className="resize-none rounded-lg border-slate-200 text-sm"
              />
            </div>

            <Button
              type="button"
              className="h-10 w-full rounded-xl bg-amber-600 font-semibold text-white hover:bg-amber-700"
              disabled={savingSinRep || saving || bloqueaDevolucionEfectivo}
              onClick={() => void handleSinReparacion()}
            >
              {savingSinRep ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : hayDevolucion ? (
                bloqueaDevolucionEfectivo
                  ? "Efectivo insuficiente en caja"
                  : "Confirmar entrega y reembolso"
              ) : hayCargoExtra ? (
                "Confirmar entrega y cobro"
              ) : (
                "Confirmar entrega"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Entrega EXITOSA (Listo) ───────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto border border-slate-200 bg-white p-0 text-slate-900 shadow-lg sm:w-full">
        <DialogHeader className="border-b border-slate-100 px-5 pb-4 pt-5 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <PackageCheck className="h-5 w-5 text-emerald-600" aria-hidden />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900">Entregar equipo</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                Folio <span className="font-mono font-semibold">{folio}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 px-5 py-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {tieneSaldo ? "Monto exacto a cobrar" : "Saldo pendiente"}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{fmt(saldo)}</p>
            {tieneSaldo ? (
              <p className="mt-2 text-xs text-slate-600">
                Equivale a costo total menos abonos registrados. Se creara venta y movimiento en caja abierta.
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-600">Sin cargo pendiente: confirmacion sin venta en caja.</p>
            )}
          </div>

          {tieneSaldo ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Metodo de pago del saldo</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["efectivo", "Efectivo"],
                    ["tarjeta", "Tarjeta"],
                    ["transferencia", "Transferencia"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMetodo(v)}
                    className={`rounded-xl border-2 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                      metodo === v
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="nota-entrega" className="text-sm font-medium text-slate-700">
              Nota <span className="font-normal text-slate-400">(opcional)</span>
            </Label>
            <Textarea
              id="nota-entrega"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              placeholder="Observaciones internas..."
              className="resize-none rounded-xl border-slate-200"
            />
          </div>

          <Button
            type="button"
            className="h-11 w-full rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
            disabled={saving || savingSinRep}
            onClick={() => void handleConfirmarEntrega()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : tieneSaldo ? (
              "Confirmar entrega y cobro"
            ) : (
              "Confirmar entrega"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
