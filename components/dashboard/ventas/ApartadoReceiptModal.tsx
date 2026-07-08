"use client"

import type { CSSProperties } from "react"
import { useRef } from "react"
import { Loader2, MessageCircle, PackageCheck, Printer, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ApartadoTicket, type ApartadoTicketBusiness, type ApartadoTicketData } from "@/components/printing"
import type { ApartadoResumen } from "@/lib/actions/apartados-prisma"
import { useThermalTicketPrint } from "@/lib/print/print-config"
import { buildCustomerWhatsAppUrl, normalizePhoneForWhatsApp, withReparaHubWhatsAppSignature } from "@/lib/whatsapp-utils"
import { getCodigoTelefono } from "@/lib/constants/paises"

export type ApartadoReceiptKind = "apartado" | "abono" | "liquidado" | "entregado"

function money(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" })
}

function dateShort(value: string) {
  // "YYYY-MM-DD" -> Date local. Sin esto, `new Date("2026-07-16")` se
  // parsea como UTC midnight y se muestra como 15/jul en Mexico (UTC-6).
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

export function buildApartadoWhatsAppMessage(apartado: ApartadoResumen, kind: ApartadoReceiptKind) {
  const total = apartado.precio_acordado * apartado.cantidad
  let message: string
  if (kind === "entregado") {
    message = `Hola ${apartado.cliente_nombre} ?\n\nTe confirmamos que tu apartado *${apartado.folio}* ya fue *entregado* correctamente.\n\n?? Producto: ${apartado.producto_nombre}\n?? Total: ${money(total)}\n? Pagado: ${money(apartado.total_abonado)}\n\nGracias por tu compra.`
  } else if (kind === "liquidado") {
    message = `Hola ${apartado.cliente_nombre} ??\n\nTu apartado *${apartado.folio}* quedo *liquidado* y ya esta listo para entrega.\n\n?? Producto: ${apartado.producto_nombre}\n?? Total: ${money(total)}\n? Pagado: ${money(apartado.total_abonado)}\n?? Saldo: ${money(apartado.saldo)}\n\nGracias por tu preferencia. Cuando gustes, puedes pasar por tu producto. ??`
  } else if (kind === "abono") {
    message = `Hola ${apartado.cliente_nombre} ??\n\nRegistramos un abono a tu apartado *${apartado.folio}*.\n\n?? Producto: ${apartado.producto_nombre}\n? Total abonado: ${money(apartado.total_abonado)}\n?? Saldo pendiente: ${money(apartado.saldo)}\n?? Fecha limite: ${dateShort(apartado.fecha_limite)}\n\nGracias por seguir tu apartado con nosotros.`
  } else {
    message = `Hola ${apartado.cliente_nombre} ??\n\nTu apartado *${apartado.folio}* ya quedo registrado correctamente.\n\n?? Producto: ${apartado.producto_nombre}\n?? Total: ${money(total)}\n?? Anticipo: ${money(apartado.total_abonado)}\n?? Saldo pendiente: ${money(apartado.saldo)}\n?? Fecha limite: ${dateShort(apartado.fecha_limite)}\n\nTu producto queda reservado hasta la fecha limite indicada.`
  }
  return withReparaHubWhatsAppSignature(message)
}

export function openApartadoWhatsApp(apartado: ApartadoResumen, kind: ApartadoReceiptKind, business?: ApartadoTicketBusiness) {
  const phone = normalizePhoneForWhatsApp(
    apartado.cliente_telefono,
    getCodigoTelefono(business?.countryName ?? null),
  )
  if (!phone) return false
  window.open(buildCustomerWhatsAppUrl(phone, buildApartadoWhatsAppMessage(apartado, kind)), "_blank", "noopener,noreferrer")
  return true
}

export function buildApartadoTicketData(
  apartado: ApartadoResumen,
  kind: ApartadoReceiptKind,
  movimiento?: Partial<Pick<ApartadoTicketData, "movimientoLabel" | "movimientoMonto" | "movimientoFecha" | "metodoPago" | "referenciaPago">>,
): ApartadoTicketData {
  return {
    folio: apartado.folio,
    kind,
    clienteNombre: apartado.cliente_nombre,
    clienteTelefono: apartado.cliente_telefono,
    productoNombre: apartado.producto_nombre,
    cantidad: apartado.cantidad,
    precioAcordado: apartado.precio_acordado,
    totalAbonado: apartado.total_abonado,
    saldo: apartado.saldo,
    fechaLimite: apartado.fecha_limite,
    ...movimiento,
  }
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export function printApartadoReceipt(apartado: ApartadoResumen, kind: ApartadoReceiptKind, business?: ApartadoTicketBusiness) {
  const title =
    kind === "entregado"
      ? "Apartado entregado"
      : kind === "liquidado"
        ? "Apartado liquidado"
        : kind === "abono"
          ? "Comprobante de abono"
          : "Comprobante de apartado"
  const total = apartado.precio_acordado * apartado.cantidad
  const businessName = business?.name || "Mi Taller"
  const status =
    kind === "liquidado"
      ? "LIQUIDADO"
      : kind === "entregado"
        ? "ENTREGADO"
        : kind === "abono"
          ? "ABONO REGISTRADO"
          : "PRODUCTO RESERVADO"
  const win = window.open("", "_blank", "width=420,height=720")
  if (!win) return false
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    @page{size:80mm auto;margin:0}*{box-sizing:border-box}body{font-family:Verdana,Tahoma,sans-serif;margin:0;padding:0;color:#000;background:#fff}.ticket{width:72mm;max-width:72mm;margin:0 auto;padding:0 3mm 4mm}
    .center{text-align:center}.logo{max-height:34px;max-width:54mm;object-fit:contain;display:block;margin:0 auto 3px}.shop{font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:.02em}.phone{font-size:10px;font-weight:800;margin-top:2px}
    h1{font-size:11px;margin:3px 0 2px;text-transform:uppercase;letter-spacing:.08em}.folio{font-family:monospace;font-size:14px;font-weight:900;margin:4px 0}.divider{border-top:1px dashed #000;margin:7px 0}
    .status{font-size:15px;font-weight:900;letter-spacing:.08em;text-align:center}.row{display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:11px;font-weight:700}.row strong{text-align:right;font-weight:900}.box{border:1px solid #000;padding:5px;margin:6px 0}.total{font-size:15px;font-weight:900}.muted{font-size:10px;line-height:1.35;margin-top:8px;font-weight:700;text-align:left}.thanks{text-align:center;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-top:8px}
  </style></head><body><div class="ticket"><div class="center">
    ${business?.logoUrl ? `<img class="logo" src="${escapeHtml(business.logoUrl)}" alt="">` : `<div class="shop">${escapeHtml(businessName)}</div>`}
    <h1>${escapeHtml(title)}</h1>
    ${business?.phone ? `<div class="phone">${escapeHtml(business.phone)}</div>` : ""}
    <div class="divider"></div><div class="status">${status}</div><div class="folio">${escapeHtml(apartado.folio)}</div>
    </div><div class="divider"></div>
    <div class="row"><span>Cliente</span><strong>${escapeHtml(apartado.cliente_nombre)}</strong></div>
    <div class="row"><span>Telefono</span><strong>${escapeHtml(apartado.cliente_telefono || "-")}</strong></div>
    <div class="row"><span>Fecha limite</span><strong>${dateShort(apartado.fecha_limite)}</strong></div>
    <div class="divider"></div><div class="box"><div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em">Producto apartado</div><div class="row"><span>${escapeHtml(`${apartado.cantidad}x ${apartado.producto_nombre}`)}</span><strong>${money(total)}</strong></div></div>
    <div class="row"><span>Total apartado</span><strong>${money(total)}</strong></div>
    <div class="row"><span>Total abonado</span><strong>${money(apartado.total_abonado)}</strong></div>
    <div class="row total"><span>SALDO</span><strong>${money(Math.max(0, apartado.saldo))}</strong></div>
    <div class="divider"></div>
    <p class="muted">El producto queda reservado hasta la fecha limite indicada. Los abonos se registran en caja y el producto se entrega al liquidar el saldo.</p>
    <div class="divider"></div><p class="thanks">${escapeHtml(business?.mensajeDespedida || "Gracias por tu preferencia")}</p>
  </div><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`)
  win.document.close()
  return true
}

interface ApartadoReceiptModalProps {
  apartado: ApartadoResumen | null
  kind: ApartadoReceiptKind
  onClose: () => void
  onMarkDelivered?: () => void
  markingDelivered?: boolean
  business?: ApartadoTicketBusiness
}

export function ApartadoReceiptModal({
  apartado,
  kind,
  onClose,
  onMarkDelivered,
  markingDelivered = false,
  business,
}: ApartadoReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const ticketBusiness: ApartadoTicketBusiness = {
    name: business?.name || "Mi Taller",
    phone: business?.phone || "",
    logoUrl: business?.logoUrl || null,
    mensajeDespedida: business?.mensajeDespedida || "Gracias por tu preferencia",
    countryName: business?.countryName || null,
  }
  const handlePrint = useThermalTicketPrint({
    contentRef: printRef,
    documentTitle: `Apartado-${apartado?.folio ?? "ticket"}`,
  })
  if (!apartado) return null
  const ticketData = buildApartadoTicketData(apartado, kind)
  const title =
    kind === "entregado"
      ? "Apartado entregado"
      : kind === "liquidado"
        ? "Apartado liquidado"
        : kind === "abono"
          ? "Abono registrado"
          : "Apartado creado"

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-200/75 px-3 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div
        ref={printRef}
        className="print-ticket-offscreen-layer"
        style={{ "--pos-print-width-mm": "80mm" } as CSSProperties}
        aria-hidden
      >
        <ApartadoTicket data={ticketData} business={ticketBusiness} />
      </div>
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
        <div className="relative shrink-0 bg-gradient-to-br from-white via-blue-50 to-blue-100 px-5 py-4 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-2 text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            aria-label="Cerrar comprobante"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-950/30">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-200">{apartado.folio}</p>
              <h2 className="text-lg font-black italic tracking-tight">{title}</h2>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ width: 302, maxWidth: "100%" }}>
            <ApartadoTicket data={ticketData} business={ticketBusiness} />
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <Button variant="outline" onClick={() => void handlePrint()} className="h-11 rounded-2xl"><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
          <Button onClick={() => openApartadoWhatsApp(apartado, kind, ticketBusiness)} className="h-11 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 btn-glow"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</Button>
        </div>
        {kind === "liquidado" ? (
          <div className="grid shrink-0 grid-cols-1 gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 rounded-2xl">
              Entregar despues
            </Button>
            <Button type="button" onClick={onMarkDelivered} disabled={markingDelivered} className="h-11 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700">
              {markingDelivered ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Entregar ahora
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
