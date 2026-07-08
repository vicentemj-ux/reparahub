"use client"

import { useState, useEffect, useRef, type CSSProperties } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, DollarSign, Loader2, MessageCircle, Printer, X } from "lucide-react"
import {
  getRepairDetail,
  registrarAbono,
  applyRepairStatusChange,
} from "@/lib/actions/repairs-prisma"
import { getTallerSettings, type TallerSettings } from "@/lib/actions/settings-prisma"
import { toast } from "@/hooks/use-toast"
import { RepairPaymentTicket } from "@/components/printing"
import { useThermalTicketPrint } from "@/lib/print/print-config"
import { buildCustomerWhatsAppUrl, normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { getCodigoTelefono, PAISES } from "@/lib/constants/paises"

// --- Types --------------------------------------------------------------------

type MetodoPago = "efectivo" | "tarjeta" | "transferencia"

interface PaymentInfo {
  monto: number
  metodo: string
  referenciaPago: string | null
  nuevoAnticipo: number
  movimientoCajaId: string | null
  dateISO: string
}

export interface AbonoModalProps {
  isOpen: boolean
  repairId: string | null
  repairFolio: string
  estimatedPrice?: number | null
  onClose: () => void
  /** Called after the abono is saved and the user dismisses the success modal. */
  onSuccess: (nuevoAnticipo: number) => void
}

// --- Helpers ------------------------------------------------------------------

function fmtPeso(n: number) {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function metodoLabel(m: string): string {
  const map: Record<string, string> = {
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    transferencia: "Transferencia",
    mixto: "Mixto",
  }
  return map[m] ?? m
}

// --- Method button ------------------------------------------------------------

function MetodoBtn({
  value,
  current,
  label,
  onChange,
}: {
  value: MetodoPago
  current: MetodoPago
  label: string
  onChange: (v: MetodoPago) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`min-h-[44px] rounded-xl border px-2 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
        current === value
          ? "border-slate-950 bg-blue-600 text-white shadow-md shadow-slate-900/15"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      {label}
    </button>
  )
}

// --- Component ----------------------------------------------------------------

export function AbonoModal({
  isOpen,
  repairId,
  repairFolio,
  estimatedPrice,
  onClose,
  onSuccess,
}: AbonoModalProps) {
  // Loading / saving
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Fetched financial data
  const [currentAnticipo, setCurrentAnticipo] = useState(0)
  const [presupuesto, setPresupuesto] = useState(0)

  // Fetched customer / device info (for comprobante)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [deviceBrand, setDeviceBrand] = useState("")
  const [deviceModel, setDeviceModel] = useState("")

  // Form state
  const [monto, setMonto] = useState("")
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo")
  const [referenciaPago, setReferenciaPago] = useState("")
  const [efectivoRecibido, setEfectivoRecibido] = useState("")

  // Post-save "change to Listo?" dialog
  const [listoDialogOpen, setListoDialogOpen] = useState(false)
  const [pendingAnticipo, setPendingAnticipo] = useState<number | null>(null)

  // Success modal
  const [showSuccess, setShowSuccess] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  // WhatsApp phone override (cuando el cliente no trae telefono)
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const [phoneInput, setPhoneInput] = useState("")
  const [phoneCountry, setPhoneCountry] = useState("Mexico")

  // Settings for hidden ticket render
  const [shopSettings, setShopSettings] = useState<TallerSettings | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // React-to-print para el comprobante de abono (iframe termico).
  const handleReactToPrint = useThermalTicketPrint({
    contentRef: printRef,
    documentTitle: () => `Abono-${repairFolio}`,
  })

  // -- Load detail on open ---------------------------------------------------

  useEffect(() => {
    if (!isOpen || !repairId) {
      setCurrentAnticipo(0)
      setPresupuesto(estimatedPrice ?? 0)
      setCustomerName("")
      setCustomerPhone("")
      setDeviceBrand("")
      setDeviceModel("")
      setMonto("")
      setEfectivoRecibido("")
      setReferenciaPago("")
      setMetodoPago("efectivo")
      setPaymentInfo(null)
      setShowSuccess(false)
      setPendingAnticipo(null)
      setShowPhoneInput(false)
      setPhoneInput("")
      setPhoneCountry("Mexico")
      return
    }
    const load = async () => {
      setIsLoading(true)
      const [{ data }, { settings }] = await Promise.all([
        getRepairDetail(repairId),
        getTallerSettings(),
      ])
      if (data) {
        setCurrentAnticipo(data.anticipo ?? 0)
        setPresupuesto(data.estimatedPrice ?? estimatedPrice ?? 0)
        setCustomerName(data.clienteName || "")
        setCustomerPhone(data.clientePhone || "")
        setDeviceBrand(data.deviceBrand || "")
        setDeviceModel(data.deviceModel || "")
      } else if (estimatedPrice != null) {
        setPresupuesto(estimatedPrice)
      }
      setShopSettings(settings)
      setPhoneCountry(settings?.pais || "Mexico")
      setIsLoading(false)
    }
    load()
  }, [isOpen, repairId]) // eslint-disable-line react-hooks/exhaustive-deps

  // -- Derived values --------------------------------------------------------

  const saldoPendiente = Math.max(0, presupuesto - currentAnticipo)

  const montoNum = parseFloat(monto) || 0

  // When paying with cash and the entered amount exceeds the balance,
  // Cap the abono at saldo; the rest is change returned to the customer.
  const montoEfectivoReal = metodoPago === "efectivo" && montoNum > saldoPendiente ? saldoPendiente : montoNum
  const abonoTotal = montoEfectivoReal

  const efectivoNum = parseFloat(efectivoRecibido) || 0
  const cambio = metodoPago === "efectivo" && montoEfectivoReal > 0 && efectivoNum > montoEfectivoReal ? efectivoNum - montoEfectivoReal : 0

  const nuevoSaldo = Math.max(0, saldoPendiente - abonoTotal)

  // -- Submit ----------------------------------------------------------------

  const handleSubmit = async () => {
    if (!repairId) return
    if (saldoPendiente <= 0) {
      toast({
        title: "Folio liquidado",
        description: "Este ticket ya no tiene saldo pendiente para registrar abonos.",
        variant: "destructive",
      })
      return
    }
    if (abonoTotal <= 0) {
      toast({
        title: "Monto invalido",
        description: "Ingresa un monto mayor a $0 y menor o igual al saldo pendiente.",
        variant: "destructive",
      })
      return
    }
    if (metodoPago !== "efectivo" && !referenciaPago.trim()) {
      toast({
        title: "Referencia requerida",
        description: metodoPago === "tarjeta"
          ? "Captura el numero de autorizacion o voucher de la tarjeta."
          : "Captura la cuenta, clave o referencia de la transferencia.",
        variant: "destructive",
      })
      return
    }

    const metodoFinal: "efectivo" | "tarjeta" | "transferencia" = metodoPago
    const referenciaFinal = metodoFinal === "efectivo" ? null : referenciaPago.trim()
    const dateISO = new Date().toISOString()

    setIsSaving(true)
    try {
      const result = await registrarAbono({
        repairId,
        monto: abonoTotal,
        metodoPago: metodoFinal,
        referenciaPago: referenciaFinal,
      })
      if (!result.success) {
        toast({ title: "Error", description: result.error ?? "No se pudo registrar el abono.", variant: "destructive" })
        return
      }

      const info: PaymentInfo = {
        monto: abonoTotal,
        metodo: metodoFinal,
        referenciaPago: referenciaFinal,
        nuevoAnticipo: result.nuevoAnticipo!,
        movimientoCajaId: result.movimientoCajaId ?? null,
        dateISO,
      }
      setPaymentInfo(info)

      if (result.liquidado) {
        setPendingAnticipo(result.nuevoAnticipo!)
        setListoDialogOpen(true)
      } else {
        setShowSuccess(true)
      }
    } finally {
      setIsSaving(false)
    }
  }

  // -- Post-liquidation: ask to change status --------------------------------

  const handleListoChoice = async (cambiarAListo: boolean) => {
    setListoDialogOpen(false)
    if (pendingAnticipo !== null && repairId) {
      if (cambiarAListo) {
        const { data: d } = await getRepairDetail(repairId)
        const prev = d?.status ?? "Recibido"
        await applyRepairStatusChange({
          repairId,
          estadoAnterior: prev,
          estadoNuevo: "Listo",
          notaTecnica: "Liquidacion de pago",
        })
      }
    }
    setShowSuccess(true)
  }

  // -- Success modal actions -------------------------------------------------

  const handleSuccessClose = () => {
    const nuevoAnticipo = paymentInfo?.nuevoAnticipo ?? pendingAnticipo ?? currentAnticipo
    setShowSuccess(false)
    setPaymentInfo(null)
    onSuccess(nuevoAnticipo)
    onClose()
  }

  const handlePrint = async () => {
    if (!paymentInfo) return
    setIsPrinting(true)
    try {
      handleReactToPrint()
    } finally {
      // El dialogo de impresion del navegador es sincronico, pero por
      // consistencia dejamos el spinner durante ~600ms para que el
      // usuario perciba feedback de que algo paso.
      window.setTimeout(() => setIsPrinting(false), 600)
    }
  }

  // --- WhatsApp share ---------------------------------------------------------
  const handleSendWhatsApp = (overridePhone?: string) => {
    if (!paymentInfo) return
    const resolved = overridePhone ?? customerPhone
    if (!resolved?.trim()) {
      setShowPhoneInput(true)
      return
    }

    const fecha = new Date().toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    const isLiquidacion =
      paymentInfo.nuevoAnticipo >= presupuesto && presupuesto > 0
    const tipoLabel = isLiquidacion ? "liquidacion" : "anticipo"
    const metodoPagoLabel = metodoLabel(paymentInfo.metodo)
    const totalPagado = paymentInfo.nuevoAnticipo
    const saldoRestante = Math.max(0, presupuesto - totalPagado)
    const equipo = `${deviceBrand} ${deviceModel}`.trim() || "tu equipo"
    const taller = shopSettings?.nombre_taller || "Mi Taller"

    const msg = [
      `Hola ${customerName || "cliente"} ??`,
      "",
      `Te compartimos el comprobante de tu *${tipoLabel}* en *${taller}*.`,
      "",
      `?? Folio: *#${repairFolio}*`,
      `??? Fecha: ${fecha}`,
      `?? Equipo: ${equipo}`,
      `?? Monto registrado: ${fmtPeso(paymentInfo.monto)}`,
      `?? Metodo de pago: ${metodoPagoLabel}`,
      paymentInfo.referenciaPago ? `?? Referencia: ${paymentInfo.referenciaPago}` : null,
      "",
      `?? Tipo: ${isLiquidacion ? "Liquidacion" : "Anticipo"} de reparacion`,
      `? Total pagado: ${fmtPeso(totalPagado)}`,
      `?? Presupuesto: ${fmtPeso(presupuesto)}`,
      `?? Saldo restante: ${fmtPeso(saldoRestante)}`,
      "",
      "Si necesitas alguna aclaracion, responde a este mensaje y con gusto te apoyamos. ??",
    ]
      .filter(Boolean)
      .join("\n")

    const digits = normalizePhoneForWhatsApp(resolved, getCodigoTelefono(phoneCountry || shopSettings?.pais || null))
    if (!digits) {
      setPhoneInput(resolved)
      setShowPhoneInput(true)
      return
    }
    const url = buildCustomerWhatsAppUrl(digits, msg)
    window.open(url, "_blank", "noopener,noreferrer")
    setPhoneInput(resolved)
    setShowPhoneInput(true)
  }

  // -- Render ----------------------------------------------------------------

  return (
    <>
      {/* -- Main abono form dialog -- */}
      <Dialog open={isOpen && !showSuccess} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-md">
          <DialogHeader className="border-b border-slate-100 px-5 pb-4 pt-5">
            <DialogTitle className="flex items-center gap-2 text-base font-black uppercase tracking-[0.14em] text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <DollarSign className="h-4 w-4" />
              </span>
              REGISTRAR ABONO
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500">
              Ticket #{repairFolio} · Saldo pendiente: <span className="font-bold text-slate-900">{fmtPeso(saldoPendiente)}</span>
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center px-5 py-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : (
            <div className="space-y-4 px-5 py-5">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Monto a abonar
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder={`Max. ${fmtPeso(saldoPendiente)}`}
                    inputMode="decimal"
                    className="min-h-[48px] rounded-xl border-slate-200 bg-white text-lg font-black shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/60"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Metodo de pago
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <MetodoBtn value="efectivo" current={metodoPago} label="EFECTIVO" onChange={setMetodoPago} />
                    <MetodoBtn value="tarjeta" current={metodoPago} label="TARJETA" onChange={setMetodoPago} />
                    <MetodoBtn value="transferencia" current={metodoPago} label="TRANSF." onChange={setMetodoPago} />
                  </div>
                </div>

                {metodoPago !== "efectivo" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="referencia-pago-abono" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {metodoPago === "tarjeta" ? "Autorizacion / voucher" : "Cuenta / referencia"}
                    </Label>
                    <Input
                      id="referencia-pago-abono"
                      value={referenciaPago}
                      onChange={(e) => setReferenciaPago(e.target.value)}
                      placeholder={metodoPago === "tarjeta" ? "Ej: 123456 / voucher" : "Ej: Cuenta Banamex 1234"}
                      className="min-h-[46px] rounded-xl border-slate-200 bg-white text-sm font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/60"
                    />
                    <p className="text-[11px] text-slate-500">
                      Esta referencia queda guardada para corte, historial y comprobante.
                    </p>
                  </div>
                )}

                {metodoPago === "efectivo" && montoNum > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Efectivo recibido
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={efectivoRecibido}
                        onChange={(e) => setEfectivoRecibido(e.target.value)}
                        placeholder="0.00"
                        inputMode="decimal"
                        className="min-h-[44px] rounded-xl border-slate-200 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Cambio
                      </Label>
                      <div
                        className={`flex items-center min-h-[44px] rounded-md border px-3 text-base font-bold ${
                          cambio > 0
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {cambio > 0 ? fmtPeso(cambio) : "-"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Balance summary */}
              {presupuesto > 0 && (
                <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Presupuesto total</span>
                    <span className="font-semibold text-slate-700">{fmtPeso(presupuesto)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ya abonado</span>
                    <span className="font-semibold text-amber-600">{fmtPeso(currentAnticipo)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5">
                    <span className="font-semibold">Saldo restante</span>
                    <span className={`font-bold ${nuevoSaldo <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {nuevoSaldo <= 0 ? "LIQUIDADO ?" : fmtPeso(nuevoSaldo)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
            <Button variant="outline" onClick={onClose} disabled={isSaving} className="h-11 flex-1 rounded-xl bg-white">
              CANCELAR
            </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSaving || isLoading || saldoPendiente <= 0}
                className="h-11 flex-1 gap-2 rounded-xl bg-emerald-600 font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700"
              >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4" />
              )}
              + REGISTRAR ABONO
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* -- Liquidation: ask to change status to Listo -- */}
      <AlertDialog open={listoDialogOpen} onOpenChange={setListoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Saldo liquidado</AlertDialogTitle>
            <AlertDialogDescription>
              Este abono cubre el total del presupuesto. ¿Deseas cambiar el estado del ticket a{" "}
              <strong>Finalizado</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleListoChoice(false)}>
              No, mantener estado actual
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleListoChoice(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Si, marcar como Listo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Abono registrado: preview + imprimir / whatsapp --- */}
      {paymentInfo && (
        <Dialog
          open={showSuccess}
          onOpenChange={(next) => {
            if (!next) handleSuccessClose()
          }}
        >
          {/* Area de impresion aislada - react-to-print la copia a un iframe propio */}
          <div
            ref={printRef}
            className="print-ticket-offscreen-layer"
            style={{ "--pos-print-width-mm": "80mm" } as CSSProperties}
            aria-hidden
          >
            <RepairPaymentTicket
              data={{
                folio: repairFolio,
                customerName,
                customerPhone,
                deviceName: `${deviceBrand} ${deviceModel}`.trim() || "N/A",
                metodoPago: paymentInfo.metodo,
                referenciaPago: paymentInfo.referenciaPago,
                monto: paymentInfo.monto,
                totalPagado: paymentInfo.nuevoAnticipo,
                presupuesto,
                saldoRestante: Math.max(0, presupuesto - paymentInfo.nuevoAnticipo),
                date: paymentInfo.dateISO,
                tipoMov: paymentInfo.nuevoAnticipo >= presupuesto && presupuesto > 0 ? "liquidacion" : "anticipo",
              }}
              business={{
                name: shopSettings?.nombre_taller || "Mi Taller",
                phone: shopSettings?.telefono || "",
                logoUrl: shopSettings?.logo_url || null,
                mensajeDespedida: shopSettings?.mensaje_despedida || undefined,
              }}
            />
          </div>

          <DialogContent
            role="dialog"
            aria-modal="true"
            hideCloseButton
            className="w-[calc(100%-1rem)] max-w-lg rounded-2xl border-slate-200 bg-white p-0 shadow-lg ring-1 ring-black/5 overflow-hidden sm:w-full"
          >
            {/* X grande custom arriba a la derecha */}
            <button
              type="button"
              onClick={handleSuccessClose}
              className="absolute top-3 right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-10 w-10" strokeWidth={2} />
            </button>

            <style>{`
              @media (prefers-reduced-motion: no-preference) {
                .abono-modal-ease {
                  animation: abonoEaseOutQuart 260ms both;
                }
                @keyframes abonoEaseOutQuart {
                  from { opacity: 0; transform: translateY(6px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .abono-success-bounce {
                  animation: abonoSuccessBounce 1.2s ease-in-out infinite both;
                }
                @keyframes abonoSuccessBounce {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-8px); }
                }
              }
            `}</style>
            <DialogHeader className="abono-modal-ease bg-white px-6 pt-8 pb-0 text-center items-center">
              <div className="abono-success-bounce mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <DialogTitle className="text-2xl font-black italic uppercase tracking-tight text-emerald-600 text-center">
                {paymentInfo.nuevoAnticipo >= presupuesto && presupuesto > 0
                  ? "¡Liquidacion!"
                  : "¡Anticipo recibido!"}
              </DialogTitle>
              <DialogDescription className="mt-0 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 text-center leading-none">
                #{repairFolio}
              </DialogDescription>
            </DialogHeader>
            <div className="p-5 flex flex-col items-center gap-4 bg-slate-50">
              <div
                ref={previewRef}
                className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden"
                style={{ width: 302 }}
              >
                <RepairPaymentTicket
                  data={{
                    folio: repairFolio,
                    customerName,
                    customerPhone,
                    deviceName: `${deviceBrand} ${deviceModel}`.trim() || "N/A",
                    metodoPago: paymentInfo.metodo,
                    referenciaPago: paymentInfo.referenciaPago,
                    monto: paymentInfo.monto,
                    totalPagado: paymentInfo.nuevoAnticipo,
                    presupuesto,
                    saldoRestante: Math.max(0, presupuesto - paymentInfo.nuevoAnticipo),
                    date: paymentInfo.dateISO,
                    tipoMov: paymentInfo.nuevoAnticipo >= presupuesto && presupuesto > 0 ? "liquidacion" : "anticipo",
                  }}
                  business={{
                    name: shopSettings?.nombre_taller || "Mi Taller",
                    phone: shopSettings?.telefono || "",
                    logoUrl: shopSettings?.logo_url || null,
                    mensajeDespedida: shopSettings?.mensaje_despedida || undefined,
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 bg-slate-50 p-5 pt-0">
              {showPhoneInput && (
                <div className="grid grid-cols-[112px_1fr_auto] gap-2">
                  <Select value={phoneCountry} onValueChange={setPhoneCountry}>
                    <SelectTrigger className="h-10 rounded-xl bg-white text-xs">
                      <SelectValue placeholder="Pais" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAISES.map((pais) => (
                        <SelectItem key={pais.nombre} value={pais.nombre}>
                          {pais.nombre} +{pais.codigoTelefono}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    placeholder="Numero de WhatsApp del cliente"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="flex-1 text-sm rounded-xl"
                    autoFocus
                  />
                  <Button
                    onClick={() => handleSendWhatsApp(phoneInput)}
                    disabled={phoneInput.replace(/\D/g, "").length < 6}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shrink-0 rounded-xl"
                  >
                    Enviar
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  className="h-14 gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-sm btn-glow shadow-xl shadow-blue-500/30"
                  onClick={handlePrint}
                  disabled={isPrinting}
                >
                  {isPrinting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
                  {isPrinting ? "Imprimiendo..." : "Imprimir"}
                </Button>
                <Button
                  className="h-14 gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-sm shadow-lg shadow-emerald-500/25"
                  onClick={() => handleSendWhatsApp()}
                >
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp
                </Button>
              </div>
              <button
                type="button"
                onClick={handleSuccessClose}
                className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cerrar y volver al ticket
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}


