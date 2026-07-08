"use client"

import { memo, useEffect, useRef, useState, type CSSProperties } from "react"
import { useThermalTicketPrint } from "@/lib/print/print-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MessageCircle, Printer, X, CheckCircle2 } from "lucide-react"
import { RepairPaymentTicket, type RepairPaymentTicketData } from "@/components/printing"
import { buildCustomerWhatsAppUrl, normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { getCodigoTelefono, PAISES } from "@/lib/constants/paises"

const METODO_PAGO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Pago mixto",
}

interface CobroSuccessModalProps {
  open: boolean
  cobro: RepairPaymentTicketData
  tallerNombre: string
  tallerTelefono: string
  logoUrl?: string | null
  mensajeDespedida?: string
  clienteTelefono?: string | null
  tallerPais?: string | null
  onClose: () => void
}

export const CobroSuccessModal = memo(function CobroSuccessModal({
  open,
  cobro,
  tallerNombre,
  tallerTelefono,
  logoUrl,
  mensajeDespedida,
  clienteTelefono,
  tallerPais,
  onClose,
}: CobroSuccessModalProps) {
  const ticketPxWidth = 302

  const printRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const handleReactToPrint = useThermalTicketPrint({
    contentRef: printRef,
    documentTitle: () => `Ticket-${cobro.folio}`,
  })

  const [phoneInput, setPhoneInput] = useState("")
  const [phoneCountry, setPhoneCountry] = useState(tallerPais || "Mexico")
  const [showPhoneInput, setShowPhoneInput] = useState(false)

  useEffect(() => {
    if (!open) {
      setPhoneInput("")
      setPhoneCountry(tallerPais || "Mexico")
      setShowPhoneInput(false)
    }
  }, [open, tallerPais])

  useEffect(() => {
    if (!open) return
    let raf = 0
    raf = requestAnimationFrame(() => {
      import("canvas-confetti")
        .then((mod) => {
          const confetti = mod.default
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.65 }, colors: ["#2563eb", "#10b981", "#f59e0b"] })
        })
        .catch(() => {})
    })
    return () => cancelAnimationFrame(raf)
  }, [open])

  function handleSendWhatsApp(overridePhone?: string) {
    const resolved = overridePhone ?? clienteTelefono
    if (!resolved?.trim()) {
      setShowPhoneInput(true)
      return
    }

    const nombre = cobro.customerName || "cliente"
    const fecha = new Date(cobro.date).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    const tipoLabel = cobro.tipoMov === "liquidacion" ? "Liquidacion" : "Anticipo"
    const metodoPagoLabel = METODO_PAGO_LABEL[cobro.metodoPago] ?? cobro.metodoPago

    const msg = [
      `Hola ${nombre} 👋`,
      "",
      `Te compartimos el comprobante de tu *${tipoLabel.toLowerCase()}* en *${tallerNombre}*.`,
      "",
      `📄 Folio: *${cobro.folio}*`,
      `🗓️ Fecha: ${fecha}`,
      `📱 Concepto: ${cobro.deviceName}`,
      `💵 Monto: $${cobro.monto.toLocaleString("es-MX")}`,
      `🏦 Metodo de pago: ${metodoPagoLabel}`,
      "",
      `🧾 Tipo: ${tipoLabel} de reparacion`,
      "",
      "Si necesitas alguna aclaracion, responde a este mensaje y con gusto te apoyamos. 🤝",
    ]
      .filter(Boolean)
      .join("\n")

    const digits = normalizePhoneForWhatsApp(resolved, getCodigoTelefono(phoneCountry || tallerPais || null))
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setShowPhoneInput(false)
          setPhoneInput("")
          onClose()
        }
      }}
    >
      {/* Area de impresion aislada */}
      <div
        ref={printRef}
        className="print-ticket-offscreen-layer"
        style={{ "--pos-print-width-mm": "80mm" } as CSSProperties}
        aria-hidden
      >
        <RepairPaymentTicket
          data={cobro}
          business={{
            name: tallerNombre,
            phone: tallerTelefono,
            logoUrl: logoUrl ?? null,
            mensajeDespedida: mensajeDespedida,
          }}
        />
      </div>

      <DialogContent role="dialog" aria-modal="true" hideCloseButton className="w-[calc(100%-1rem)] max-w-lg rounded-2xl border-slate-200 bg-white p-0 shadow-lg ring-1 ring-black/5 overflow-hidden sm:w-full">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-10 w-10" strokeWidth={2} />
        </button>

        <style>{`
          @media (prefers-reduced-motion: no-preference) {
            .pos-modal-ease {
              animation: posEaseOutQuart 260ms both;
            }
            @keyframes posEaseOutQuart {
              from { opacity: 0; transform: translateY(6px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .pos-success-bounce {
              animation: posSuccessBounce 1.2s ease-in-out infinite both;
            }
            @keyframes posSuccessBounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          }
        `}</style>
        <DialogHeader className="pos-modal-ease bg-white px-6 pt-8 pb-0 text-center items-center">
          <div className="pos-success-bounce mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <DialogTitle className="text-2xl font-black italic uppercase tracking-tight text-emerald-600 text-center">
            {cobro.tipoMov === "liquidacion" ? "¡Liquidacion!" : "¡Anticipo recibido!"}
          </DialogTitle>
          <DialogDescription className="mt-0 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-center leading-none">
            #{cobro.folio}
          </DialogDescription>
        </DialogHeader>
        <div className="p-5 flex flex-col items-center gap-4 bg-slate-50">
          <div ref={previewRef} className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden" style={{ width: ticketPxWidth }}>
            <RepairPaymentTicket
              data={cobro}
              business={{
                name: tallerNombre,
                phone: tallerTelefono,
                logoUrl: logoUrl ?? null,
                mensajeDespedida: mensajeDespedida,
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
                placeholder="Numero de WhatsApp"
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
                Enviar →
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              className="h-14 gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-sm btn-glow shadow-xl shadow-blue-500/30"
              onClick={() => handleReactToPrint()}
            >
              <Printer className="h-5 w-5" />
              Imprimir
            </Button>
            <Button
              className="h-14 gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-sm shadow-lg shadow-emerald-500/25"
              onClick={() => handleSendWhatsApp()}
            >
              <MessageCircle className="h-5 w-5" />
              WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
