"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useThermalTicketPrint } from "@/lib/print/print-config"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, MessageCircle, Printer } from "lucide-react"
import type { RepairDetail } from "@/lib/actions/repairs-prisma"
import type { ReparacionServicio } from "@/lib/actions/servicios-prisma"
import { buildCustomerWhatsAppUrl, normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { getCodigoTelefono } from "@/lib/constants/paises"
import { getTallerSettings } from "@/lib/actions/settings-prisma"
import { RepairDeliveryTicket, type RepairDeliveryTicketData } from "@/components/printing"
import { cn } from "@/lib/utils"

export interface ModalExitoEntregaProps {
  open: boolean
  onClose: () => void
  repairId: string
  detail: RepairDetail | null
  folio: string
  clienteNombre: string
  clientePhone: string
  equipoLabel: string
  anticiposPrevios: number
  pagoFinal: number
  metodoPago: string
  servicios?: ReparacionServicio[]
}

interface TallerConfig {
  nombre: string
  telefono: string
  logoUrl: string | null
  mensajeDespedida: string | null
  terminosGarantia: string
  pais: string | null
}

const METODOS_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
}

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function garantiaUrl(repairId: string) {
  const base = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "https://reparahub.com"
  return `${base}/garantia/${encodeURIComponent(repairId)}`
}

export function ModalExitoEntrega({
  open,
  onClose,
  repairId,
  folio,
  clienteNombre,
  clientePhone,
  equipoLabel,
  anticiposPrevios,
  pagoFinal,
  metodoPago,
  servicios,
}: ModalExitoEntregaProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [tallerConfig, setTallerConfig] = useState<TallerConfig | null>(null)
  const [loadingPrint, setLoadingPrint] = useState(false)

  useEffect(() => {
    if (open) {
      getTallerSettings().then((res) => {
        if (res.settings) {
          setTallerConfig({
            nombre: res.settings.nombre_taller || "Mi Taller",
            telefono: res.settings.telefono || "",
            logoUrl: res.settings.logo_url || null,
            mensajeDespedida: res.settings.mensaje_despedida || null,
            terminosGarantia: res.settings.terminos_garantia || "Garantia de 30 dias en reparaciones",
            pais: res.settings.pais ?? null,
          })
        }
      })
    }
  }, [open])

  const handlePrint = useThermalTicketPrint({
    contentRef: printRef,
    documentTitle: () => `Ticket-${folio}`,
  })

  const handleImprimir = useCallback(() => {
    setLoadingPrint(true)
    setTimeout(() => {
      handlePrint()
      setLoadingPrint(false)
    }, 100)
  }, [handlePrint])

  const total = pagoFinal + anticiposPrevios
  const metodoLabel = METODOS_LABEL[metodoPago] || metodoPago

  const deliveryData = useMemo((): RepairDeliveryTicketData | null => {
    if (!tallerConfig) return null
    return {
      folio,
      deliveryDate: new Date().toISOString(),
      customerName: clienteNombre,
      customerPhone: clientePhone,
      deviceName: equipoLabel,
      diagnosisFinal: servicios?.map((s) => s.nombre_snapshot).join(", ") || "Reparacion completada",
      totalCost: total,
      originalDeposit: anticiposPrevios,
      remainingPayment: pagoFinal,
      remainingPaymentMethod: metodoPago,
    }
  }, [tallerConfig, clienteNombre, clientePhone, folio, equipoLabel, total, anticiposPrevios, pagoFinal, metodoPago, servicios])

  const waUrl = useMemo(() => {
    const digits = normalizePhoneForWhatsApp(clientePhone, getCodigoTelefono(tallerConfig?.pais ?? null))
    if (!digits) return null
    const msg = [
      `Hola ${clienteNombre} 👋`,
      "",
      `✅ Te confirmamos que tu equipo *${equipoLabel}* fue entregado correctamente.`,
      `📄 Folio: *${folio}*`,
      "",
      "🛡️ Tu garantia digital ya esta disponible en el siguiente enlace:",
      garantiaUrl(repairId),
      "",
      "Conserva este mensaje para cualquier seguimiento. Si tienes alguna duda sobre la reparacion o la garantia, puedes responder directamente por este medio.",
      "",
      "Gracias por tu preferencia. Fue un gusto atenderte. 🙌",
    ].join("\n")
    return buildCustomerWhatsAppUrl(digits, msg)
  }, [clienteNombre, clientePhone, equipoLabel, folio, repairId, tallerConfig?.pais])

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-h-[min(90vh,680px)] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto border border-slate-200 bg-white p-0 shadow-lg sm:w-full">
        <DialogHeader className="border-b border-slate-100 px-5 pb-4 pt-5 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900">Equipo entregado</DialogTitle>
              <p className="text-sm text-slate-500">Folio #{folio}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Resumen financiero
            </p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Total reparacion</span>
                <span className="font-bold text-slate-900">${fmt(total)}</span>
              </div>
              {anticiposPrevios > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Anticipo(s)</span>
                  <span className="font-medium text-slate-700">-${fmt(anticiposPrevios)}</span>
                </div>
              )}
              <div className="border-t border-emerald-200 pt-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Cobro final</span>
                  <span className="text-base font-bold text-emerald-700">${fmt(pagoFinal)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Metodo de pago</span>
                <span className="font-semibold uppercase">{metodoLabel}</span>
              </div>
            </div>
          </div>

          <div className={cn("flex flex-col gap-2", !servicios?.length && "hidden")}>
            {servicios && servicios.length > 0 && (
              <div className="space-y-1.5">
                {servicios.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm">
                    <span className="text-slate-700">
                      {s.nombre_snapshot}{s.cantidad > 1 ? ` x${s.cantidad}` : ""}
                    </span>
                    <span className="font-semibold text-slate-900">${fmt(s.precio_snapshot * s.cantidad)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleImprimir}
              disabled={loadingPrint || !tallerConfig}
              className="btn-glow w-full gap-2 bg-blue-600 text-sm font-bold uppercase tracking-wider text-white hover:bg-blue-700"
            >
              {loadingPrint ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Imprimir ticket
            </Button>
            <Button
              variant="outline"
              onClick={() => waUrl && window.open(waUrl, "_blank", "noopener,noreferrer")}
              disabled={!waUrl}
              className="w-full gap-2 border-emerald-300 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar por WhatsApp
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full text-sm text-slate-500">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Hidden printable ticket — offscreen, not display:none, para react-to-print */}
      {tallerConfig && deliveryData && (
        <div
          ref={printRef}
          className="hidden-print-area"
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: "72mm",
          }}
        >
          <RepairDeliveryTicket
            data={deliveryData}
            business={{
              name: tallerConfig.nombre,
              phone: tallerConfig.telefono,
              logoUrl: tallerConfig.logoUrl,
              terminosGarantia: tallerConfig.terminosGarantia,
              mensajeDespedida: tallerConfig.mensajeDespedida ?? undefined,
            }}
          />
        </div>
      )}
    </Dialog>
  )
}
