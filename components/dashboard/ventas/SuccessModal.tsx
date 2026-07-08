"use client"

import { memo, useEffect, useRef, useState, type CSSProperties } from "react"
import { useThermalTicketPrint } from "@/lib/print/print-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { MessageCircle, Printer, Tag, X, CheckCircle2, Loader2 } from "lucide-react"
import { PosSaleTicket, type PosSaleTicketData } from "@/components/printing"
import type { ProductSaleLabelTemplateData } from "@/components/printing"
import { vincularVentaClientePorTelefono, type VentaCreada } from "@/lib/actions/ventas-prisma"
import { buildCustomerWhatsAppUrl, normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { getCodigoTelefono, PAISES } from "@/lib/constants/paises"
import { parseDirectPrintConfig, type DirectPrintConfig } from "@/lib/printing/direct-print-config"
import { printEscposWithDaemon } from "@/lib/printing/daemon-client"
import { buildPosSaleEscposBase64 } from "@/lib/printing/escpos"

// ─── Stubs de integracion Tauri (SaaS) ─────────────────────────────────
// El fork Tauri desktop (privado, no en este repo) reemplaza estos stubs
// con la implementacion real en su build de escritorio. En el SaaS siempre
// devuelven false / no-op. Este archivo no los usa activamente (su ruta
// de impresion es daemon + react-to-print), pero los declaramos como
// contrato del fork. Ver AGENTS.md → "Tauri desktop fork (not in this repo)"
// y /DISABLED/tauri-patches/ventas-success-modal.patch.txt.
// ──────────────────────────────────────────────────────────────────────
const isTauriAvailable = async () => false
const isTauriDesktop = isTauriAvailable
const domToPngBase64 = async (_el?: HTMLElement | null, _opts?: { pixelRatio?: number }) => ""
const printEscposImage = async (_printerName?: string, _base64?: string, _paperWidth?: number) => {}

const METODO_PAGO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Pago mixto",
}


function mapVentaToTicketData(venta: VentaCreada): PosSaleTicketData {
  return {
    id: venta.id,
    folio: venta.folio,
    total: venta.total,
    descuento: venta.descuento,
    metodoPago: venta.metodo_pago,
    montoEfectivo: venta.monto_efectivo,
    montoTarjeta: venta.monto_tarjeta,
    montoTransferencia: venta.monto_transferencia,
    referenciaPago: venta.referencia_pago ?? null,
    clienteNombre: venta.cliente_nombre ?? null,
    clienteTelefono: venta.cliente_telefono ?? null,
    items: (venta.items ?? []).map((i) => ({
      id: i.producto_id ?? "",
      descripcion: i.descripcion,
      cantidad: i.cantidad,
      precioUnitario: i.precio_unitario,
      categoria: i.categoria ?? null,
      marca: i.marca ?? null,
      modelo: i.modelo ?? null,
      imeiSerie: i.imei_serie ?? null,
      color: i.color ?? null,
      condicion: i.condicion ?? null,
      procesador: i.procesador ?? null,
      ram: i.ram ?? null,
      almacenamiento: i.almacenamiento ?? null,
      referencia: i.referencia ?? null,
    })),
    createdAt: venta.created_at,
    cambio: venta.cambio,
  }
}

interface SuccessModalProps {
  open: boolean
  venta: VentaCreada
  tallerNombre: string
  tallerTelefono: string
  logoUrl?: string | null
  defaultTamano?: string
  terminosGarantia?: string
  mensajeDespedida?: string
  impresoraTicket?: string | null
  impresionConfig?: Record<string, unknown> | null
  tallerId?: string | null
  direccion?: string
  tallerPais?: string | null
  onClose: () => void
}

export const SuccessModal = memo(function SuccessModal({
  open,
  venta,
  tallerNombre,
  tallerTelefono,
  logoUrl,
  terminosGarantia,
  mensajeDespedida,
  impresoraTicket,
  impresionConfig,
  tallerId,
  direccion,
  tallerPais,
  onClose,
}: SuccessModalProps) {
  const ticketPxWidth = 302

  const printRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [printingDirecto, setPrintingDirecto] = useState(false)
  const directPrintConfig: DirectPrintConfig = parseDirectPrintConfig(impresionConfig?.directPrint)

  const handleReactToPrint = useThermalTicketPrint({
    contentRef: printRef,
    documentTitle: () => `Ticket-${venta.folio ?? venta.id}`,
  })

  const [phoneInput, setPhoneInput] = useState("")
  const [phoneCountry, setPhoneCountry] = useState(tallerPais || "Mexico")
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const [linkingPhone, setLinkingPhone] = useState(false)
  const [linkedCustomer, setLinkedCustomer] = useState<{
    cliente_id?: string | null
    cliente_nombre?: string | null
    cliente_telefono?: string | null
  } | null>(null)

  useEffect(() => {
    if (!open) {
      setPhoneInput("")
      setPhoneCountry(tallerPais || "Mexico")
      setShowPhoneInput(false)
      setLinkingPhone(false)
      setLinkedCustomer(null)
    }
  }, [open, tallerPais])

  useEffect(() => {
    if (!open) return
    let raf = 0
    raf = requestAnimationFrame(() => {
      import("canvas-confetti")
        .then(({ default: confetti }) => {
          const duration = 1800
          const end = Date.now() + duration
          const colors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"]
          const frame = () => {
            confetti({
              particleCount: 3,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 0.65 },
              colors,
              disableForReducedMotion: true,
              zIndex: 9999,
            })
            confetti({
              particleCount: 3,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 0.65 },
              colors,
              disableForReducedMotion: true,
              zIndex: 9999,
            })
            if (Date.now() < end) requestAnimationFrame(frame)
          }
          frame()
        })
        .catch(() => {})
    })
    return () => cancelAnimationFrame(raf)
  }, [open])

  async function handleSendWhatsApp(overridePhone?: string) {
    let ventaForMessage: VentaCreada = {
      ...venta,
      cliente_id: linkedCustomer?.cliente_id ?? venta.cliente_id,
      cliente_nombre: linkedCustomer?.cliente_nombre ?? venta.cliente_nombre,
      cliente_telefono: linkedCustomer?.cliente_telefono ?? venta.cliente_telefono,
    }
    const resolved = overridePhone ?? ventaForMessage.cliente_telefono
    if (!resolved?.trim()) {
      setShowPhoneInput(true)
      return
    }

    if (overridePhone?.trim()) {
      setLinkingPhone(true)
      const linked = await vincularVentaClientePorTelefono({
        ventaId: venta.id,
        telefono: overridePhone,
        nombre: ventaForMessage.cliente_nombre,
      })
      setLinkingPhone(false)

      if (linked.error || !linked.venta) {
        toast({
          title: "No se pudo guardar el telefono",
          description: linked.error ?? "Intenta de nuevo.",
          variant: "destructive",
        })
        return
      }

      setLinkedCustomer(linked.venta)
      ventaForMessage = {
        ...ventaForMessage,
        cliente_id: linked.venta.cliente_id,
        cliente_nombre: linked.venta.cliente_nombre,
        cliente_telefono: linked.venta.cliente_telefono,
      }
    }

    const nombre = ventaForMessage.cliente_nombre ?? "cliente"
    const fecha = new Date(ventaForMessage.created_at).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    const subtotal = (ventaForMessage.items ?? []).reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0)
    const metodoPagoLabel = METODO_PAGO_LABEL[ventaForMessage.metodo_pago] ?? ventaForMessage.metodo_pago
    const referenciaPago = ventaForMessage.referencia_pago?.trim()
    const referenciaLabel =
      ventaForMessage.metodo_pago === "tarjeta"
        ? "Autorizacion / voucher"
        : ventaForMessage.metodo_pago === "transferencia"
          ? "Referencia transferencia"
          : ventaForMessage.metodo_pago === "mixto"
            ? "Autorizacion / referencia"
            : "Referencia"

    const itemLines = (ventaForMessage.items ?? [])
      .map((i) => `  * ${i.descripcion} x${i.cantidad} - $${(i.precio_unitario * i.cantidad).toLocaleString("es-MX")}`)
      .join("\n")

    const pagoLines: string[] = []
    if (ventaForMessage.metodo_pago === "mixto") {
      if ((ventaForMessage.monto_efectivo ?? 0) > 0) pagoLines.push(`- Efectivo: $${ventaForMessage.monto_efectivo.toLocaleString("es-MX")}`)
      if ((ventaForMessage.monto_tarjeta ?? 0) > 0) pagoLines.push(`- Tarjeta: $${ventaForMessage.monto_tarjeta.toLocaleString("es-MX")}`)
      if ((ventaForMessage.monto_transferencia ?? 0) > 0) pagoLines.push(`- Transferencia: $${ventaForMessage.monto_transferencia.toLocaleString("es-MX")}`)
    } else if (ventaForMessage.metodo_pago === "efectivo") {
      const pagoCon = ventaForMessage.total + (ventaForMessage.cambio ?? 0)
      pagoLines.push(`- Pago con: $${pagoCon.toLocaleString("es-MX")}`)
      if ((ventaForMessage.cambio ?? 0) > 0) pagoLines.push(`- Cambio: $${ventaForMessage.cambio.toLocaleString("es-MX")}`)
    }

    const msg = [
      `Hola ${nombre} 👋`,
      "",
      `Gracias por tu compra en *${tallerNombre}*. Aqui tienes tu ticket digital:`,
      "",
      `📄 Folio: *${ventaForMessage.folio ?? ventaForMessage.id}*`,
      `🗓️ Fecha: ${fecha}`,
      "",
      `🛒 Articulos (${ventaForMessage.items.length}):`,
      itemLines || "  * Sin articulos",
      "",
      `💵 Subtotal: $${subtotal.toLocaleString("es-MX")}`,
      (ventaForMessage.descuento ?? 0) > 0 ? `🏷️ Descuento: -$${ventaForMessage.descuento.toLocaleString("es-MX")}` : null,
      `✅ Total pagado: $${ventaForMessage.total.toLocaleString("es-MX")}`,
      `🏦 Metodo de pago: ${metodoPagoLabel}`,
      referenciaPago ? `🧾 ${referenciaLabel}: ${referenciaPago}` : null,
      ...pagoLines,
      "",
      "Si necesitas alguna aclaracion, responde a este mensaje y con gusto te apoyamos. 🤝",
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n")

    const phoneForWhatsApp = ventaForMessage.cliente_telefono ?? resolved
    const digits = normalizePhoneForWhatsApp(phoneForWhatsApp, getCodigoTelefono(phoneCountry || tallerPais || null))
    if (!digits) {
      setPhoneInput(phoneForWhatsApp ?? "")
      setShowPhoneInput(true)
      return
    }
    const url = buildCustomerWhatsAppUrl(digits, msg)
    window.open(url, "_blank", "noopener,noreferrer")
    setPhoneInput(phoneForWhatsApp ?? "")
    setShowPhoneInput(true)
  }

  // Detectar items de tipo equipo (tienen marca, modelo o IMEI)
  const equipoItems = (venta.items ?? []).filter(
    (i) => i.marca || i.modelo || i.imei_serie
  )
  const tieneEquipo = equipoItems.length > 0

  function handlePrintEquipoLabel() {
    const equipo = equipoItems[0]
    const deviceName =
      [equipo.marca, equipo.modelo].filter(Boolean).join(" ") ||
      equipo.descripcion ||
      "Equipo"
    const labelData: ProductSaleLabelTemplateData = {
      kind: "product-sale-label",
      shopName: tallerNombre,
      deviceName,
      marca: equipo.marca ?? null,
      modelo: equipo.modelo ?? null,
      imei: equipo.imei_serie ?? null,
      color: equipo.color ?? null,
      condicion: equipo.condicion ?? null,
      procesador: equipo.procesador ?? null,
      ram: equipo.ram ?? null,
      almacenamiento: equipo.almacenamiento ?? null,
      precio: equipo.precio_unitario,
      folio: venta.folio ?? null,
    }
    window.localStorage.setItem("printLabel", JSON.stringify(labelData))
    window.open("/print-label", "_blank", "noopener,noreferrer,width=400,height=240")
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
      {/* Area de impresion aislada - react-to-print la copia a un iframe propio */}
      <div
        ref={printRef}
        className="print-ticket-offscreen-layer"
        style={{ "--pos-print-width-mm": "80mm" } as CSSProperties}
        aria-hidden
      >
        <PosSaleTicket
          data={mapVentaToTicketData(venta)}
          business={{
            name: tallerNombre,
            phone: tallerTelefono,
            logoUrl: logoUrl ?? null,
            terminosGarantia,
            mensajeDespedida,
          }}
        />
      </div>

      <DialogContent role="dialog" aria-modal="true" hideCloseButton className="w-[calc(100%-1rem)] max-w-lg rounded-2xl border-slate-200 bg-white p-0 shadow-lg ring-1 ring-black/5 overflow-hidden sm:w-full">
        {/* X grande custom arriba a la derecha */}
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
          <div className="pos-success-bounce mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <DialogTitle className="text-2xl font-black italic uppercase tracking-tight text-blue-600 text-center">
            ¡Venta exitosa!
          </DialogTitle>
          <DialogDescription className="mt-0 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-center leading-none">
            #{venta.folio}
          </DialogDescription>
        </DialogHeader>
        <div className="p-5 flex flex-col items-center gap-4 bg-slate-50">
          <div ref={previewRef} className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden" style={{ width: ticketPxWidth }}>
            <PosSaleTicket
              data={mapVentaToTicketData(venta)}
              business={{
                name: tallerNombre,
                phone: tallerTelefono,
                logoUrl: logoUrl ?? null,
                terminosGarantia,
                mensajeDespedida,
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
                onClick={() => void handleSendWhatsApp(phoneInput)}
                disabled={linkingPhone || phoneInput.replace(/\D/g, "").length < 6}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shrink-0 rounded-xl"
              >
                {linkingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              className="h-14 gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-sm btn-glow shadow-xl shadow-blue-500/30"
              disabled={printingDirecto}
              onClick={async () => {
                if (directPrintConfig.enabled) {
                  setPrintingDirecto(true)
                  try {
                    const ticketData = mapVentaToTicketData(venta)
                    const contentBase64 = buildPosSaleEscposBase64({
                      data: ticketData,
                      business: {
                        name: tallerNombre,
                        phone: tallerTelefono,
                        terminosGarantia,
                        mensajeDespedida,
                      },
                      paperWidth: directPrintConfig.paperWidth,
                    })
                    await printEscposWithDaemon({
                      jobId: venta.folio ?? venta.id,
                      tenantId: tallerId ?? "",
                      source: "ventas.success_modal",
                      contentBase64,
                      config: directPrintConfig,
                    })
                    toast.success("Ticket enviado")
                  } catch (e: any) {
                    if (directPrintConfig.fallbackToWeb) {
                      handleReactToPrint()
                      toast({
                        title: "Impresion web en uso",
                        description: e?.message || "No se pudo imprimir con el daemon.",
                        variant: "warning",
                      })
                    } else {
                      toast({
                        variant: "destructive",
                        title: "Error de impresion directa",
                        description: e?.message || "No se pudo imprimir.",
                      })
                    }
                  } finally {
                    setPrintingDirecto(false)
                  }
                } else {
                  handleReactToPrint()
                }
              }}
            >
              {printingDirecto && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
              <Printer className="h-5 w-5" />
              Imprimir
            </Button>
            <Button
              className="h-14 gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-sm shadow-lg shadow-emerald-500/25"
              onClick={() => void handleSendWhatsApp()}
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



