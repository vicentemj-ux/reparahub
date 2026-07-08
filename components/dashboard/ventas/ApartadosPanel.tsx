"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { AlertTriangle, Banknote, CheckCircle2, Clock3, Eye, Loader2, MessageCircle, PackageCheck, PlusCircle, Printer, RotateCcw, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  cancelarApartado,
  entregarApartado,
  getApartadoDetalle,
  getApartados,
  registrarAbonoApartado,
  type ApartadoAbonoResumen,
  type ApartadoDetalle,
  type ApartadoEstado,
  type ApartadoMetodoPago,
  type ApartadoResumen,
} from "@/lib/actions/apartados-prisma"
import {
  ApartadoReceiptModal,
  type ApartadoReceiptKind,
} from "@/components/dashboard/ventas/ApartadoReceiptModal"
import type { ApartadoTicketBusiness } from "@/components/printing"
import { buildCustomerWhatsAppUrl, normalizePhoneForWhatsApp, withReparaHubWhatsAppSignature } from "@/lib/whatsapp-utils"
import { getCodigoTelefono } from "@/lib/constants/paises"

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

function dateTimeShort(value: string) {
  return new Date(value).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function movimientoLabel(index: number) {
  return index === 0 ? "Anticipo inicial" : `Abono ${index}`
}

function buildMovimientoMessage(apartado: ApartadoDetalle, mov: ApartadoAbonoResumen, index: number) {
  return withReparaHubWhatsAppSignature(
    `Hola ${apartado.cliente_nombre} ??\n\nRegistramos ${movimientoLabel(index).toLowerCase()} de tu apartado *${apartado.folio}*.\n\n?? Producto: ${apartado.producto_nombre}\n?? Monto: ${money(mov.monto)}\n?? Metodo: ${mov.metodo_pago}\n? Total abonado: ${money(apartado.total_abonado)}\n?? Saldo pendiente: ${money(apartado.saldo)}\n?? Fecha limite: ${dateShort(apartado.fecha_limite)}\n\nGracias por mantener tu apartado al corriente.`,
  )
}

function openMovimientoWhatsApp(
  apartado: ApartadoDetalle,
  mov: ApartadoAbonoResumen,
  index: number,
  business?: ApartadoTicketBusiness,
) {
  const phone = normalizePhoneForWhatsApp(
    apartado.cliente_telefono,
    getCodigoTelefono(business?.countryName ?? null),
  )
  if (!phone) return false
  window.open(buildCustomerWhatsAppUrl(phone, buildMovimientoMessage(apartado, mov, index)), "_blank", "noopener,noreferrer")
  return true
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function printMovimientoReceipt(apartado: ApartadoDetalle, mov: ApartadoAbonoResumen, index: number, business?: ApartadoTicketBusiness) {
  const title = movimientoLabel(index)
  const businessName = business?.name || "Mi Taller"
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
    <div class="divider"></div><div class="status">ABONO REGISTRADO</div><div class="folio">${escapeHtml(apartado.folio)}</div>
    </div><div class="divider"></div>
    <div class="row"><span>Cliente</span><strong>${escapeHtml(apartado.cliente_nombre)}</strong></div>
    <div class="row"><span>Producto</span><strong>${escapeHtml(apartado.producto_nombre)}</strong></div>
    <div class="row"><span>Fecha</span><strong>${dateTimeShort(mov.created_at)}</strong></div>
    <div class="divider"></div><div class="box">
    <div class="row"><span>Metodo</span><strong>${escapeHtml(mov.metodo_pago)}</strong></div>
    ${mov.referencia_pago ? `<div class="row"><span>Referencia</span><strong>${escapeHtml(mov.referencia_pago)}</strong></div>` : ""}
    <div class="row total"><span>Monto</span><strong>${money(mov.monto)}</strong></div></div>
    <div class="row"><span>Total abonado</span><strong>${money(apartado.total_abonado)}</strong></div>
    <div class="row total"><span>SALDO</span><strong>${money(Math.max(0, apartado.saldo))}</strong></div>
    <div class="divider"></div>
    <p class="muted">Conserva este comprobante. El producto se entrega al liquidar el saldo del apartado.</p>
    <div class="divider"></div><p class="thanks">${escapeHtml(business?.mensajeDespedida || "Gracias por tu preferencia")}</p>
  </div><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`)
  win.document.close()
  return true
}

const statusConfig: Record<ApartadoEstado, { label: string; className: string; icon: typeof Clock3 }> = {
  activo: { label: "Activo", className: "border-blue-200 bg-blue-50 text-blue-700", icon: Clock3 },
  vencido: { label: "Vencido", className: "border-amber-200 bg-amber-50 text-amber-700", icon: AlertTriangle },
  liquidado: { label: "Liquidado", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  entregado: { label: "Entregado", className: "border-slate-300 bg-slate-100 text-slate-700", icon: PackageCheck },
  cancelado: { label: "Cancelado", className: "border-red-200 bg-red-50 text-red-700", icon: XCircle },
}

interface ApartadosPanelProps {
  refreshKey?: number
  business?: ApartadoTicketBusiness
}

export function ApartadosPanel({ refreshKey = 0, business }: ApartadosPanelProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<ApartadoResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ApartadoEstado | "todos">("activo")
  const [selected, setSelected] = useState<ApartadoResumen | null>(null)
  const [abono, setAbono] = useState("")
  const [metodo, setMetodo] = useState<ApartadoMetodoPago>("efectivo")
  const [referencia, setReferencia] = useState("")
  const [receipt, setReceipt] = useState<{ apartado: ApartadoResumen; kind: ApartadoReceiptKind } | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ApartadoResumen | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [detail, setDetail] = useState<ApartadoDetalle | null>(null)
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    setLoading(true)
    const result = await getApartados("todos")
    if (result.error) toast({ title: "No se cargaron apartados", description: result.error, variant: "destructive" })
    setItems(result.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const counts = useMemo(() => ({
    todos: items.length,
    activo: items.filter((i) => i.estado === "activo").length,
    vencido: items.filter((i) => i.estado === "vencido").length,
    liquidado: items.filter((i) => i.estado === "liquidado").length,
    entregado: items.filter((i) => i.estado === "entregado").length,
    cancelado: items.filter((i) => i.estado === "cancelado").length,
  }), [items])

  const visible = useMemo(() => filter === "todos" ? items : items.filter((i) => i.estado === filter), [items, filter])

  const submitAbono = () => {
    if (!selected) return
    startTransition(async () => {
      const result = await registrarAbonoApartado({ apartado_id: selected.id, monto: Number(abono), metodo_pago: metodo, referencia_pago: referencia })
      if (result.error || !result.data) {
        toast({ title: "No se registro abono", description: result.error ?? "Intenta de nuevo.", variant: "destructive" })
        return
      }
      toast.success("Abono registrado")
      setReceipt({ apartado: result.data, kind: result.data.saldo <= 0 ? "liquidado" : "abono" })
      setSelected(null)
      setAbono("")
      setReferencia("")
      await load()
    })
  }

  const requestCancel = (apartado: ApartadoResumen) => {
    setCancelTarget(apartado)
    setCancelReason("")
  }

  const handleDeliverApartado = (apartado: ApartadoResumen) => {
    startTransition(async () => {
      const result = await entregarApartado(apartado.id)
      if (result.error || !result.data) {
        toast({ title: "No se pudo entregar", description: result.error ?? "Intenta de nuevo.", variant: "destructive" })
        return
      }
      toast.success("Apartado entregado")
      setReceipt((prev) => (prev ? { apartado: result.data!, kind: "entregado" } : prev))
      setDetail((prev) => (prev && prev.id === result.data!.id ? { ...prev, ...result.data!, abonos: prev.abonos } : prev))
      await load()
    })
  }

  const confirmCancel = () => {
    if (!cancelTarget) return
    const motivo = cancelReason.trim()
    if (!motivo) {
      toast({ title: "Motivo requerido", description: "Indica por que se cancela este apartado.", variant: "warning" })
      return
    }
    startTransition(async () => {
      const result = await cancelarApartado({ apartado_id: cancelTarget.id, motivo })
      if (result.error) {
        toast({ title: "No se cancelo apartado", description: result.error, variant: "destructive" })
        return
      }
      toast.success("Apartado cancelado")
      setCancelTarget(null)
      setCancelReason("")
      await load()
    })
  }

  const openDetail = async (apartado: ApartadoResumen) => {
    setDetailLoadingId(apartado.id)
    const result = await getApartadoDetalle(apartado.id)
    setDetailLoadingId(null)
    if (result.error || !result.data) {
      toast({ title: "No se cargo detalle", description: result.error ?? "Intenta de nuevo.", variant: "destructive" })
      return
    }
    setDetail(result.data)
  }

  return (
    <section id="panel-apartados" role="tabpanel" className="space-y-4">
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black italic tracking-tight text-slate-950">Apartados</h3>
              <p className="text-xs font-semibold text-slate-500">Reserva stock, registra abonos y controla entregas.</p>
            </div>
          </div>
          <Badge className="w-fit bg-blue-50 px-3 py-1 text-blue-700">PRO</Badge>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {([
            ["activo", "Activos"], ["vencido", "Vencidos"], ["liquidado", "Liquidados"], ["entregado", "Entregados"], ["cancelado", "Cancelados"], ["todos", "Todos"],
          ] as Array<[ApartadoEstado | "todos", string]>).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-black uppercase tracking-wider transition ${filter === key ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {label}
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${filter === key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando apartados...</div>
        ) : visible.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><PackageCheck className="h-7 w-7" /></div>
            <div>
              <p className="font-black text-slate-800">Sin apartados en esta vista</p>
              <p className="text-sm text-slate-500">Usa el boton Apartar desde un producto con stock.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {visible.map((a) => {
              const sc = statusConfig[a.estado]
              const Icon = sc.icon
              return (
                <article key={a.id} className="rounded-[26px] border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-black text-slate-950">{a.folio}</p>
                        <Badge variant="outline" className={`${sc.className} text-[10px] font-black uppercase`}><Icon className="mr-1 h-3 w-3" />{sc.label}</Badge>
                      </div>
                      <p className="mt-1 truncate text-sm font-black text-slate-900">{a.producto_nombre}</p>
                      <p className="text-xs font-semibold text-slate-500">{a.cliente_nombre} · {a.cliente_telefono || "sin telefono"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Saldo</p>
                      <p className="text-lg font-black text-slate-950">{money(a.saldo)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total</p><p className="text-sm font-bold">{money(a.precio_acordado * a.cantidad)}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Abonado</p><p className="text-sm font-bold text-emerald-700">{money(a.total_abonado)}</p></div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Limite</p><p className="text-sm font-bold">{dateShort(a.fecha_limite)}</p></div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      onClick={() => (a.estado === "liquidado" ? handleDeliverApartado(a) : setSelected(a))}
                      disabled={a.estado === "cancelado" || a.estado === "entregado" || ((a.estado === "activo" || a.estado === "vencido") && a.saldo <= 0)}
                      className={`h-10 min-w-0 rounded-2xl px-2 text-xs font-black text-white disabled:opacity-45 ${a.estado === "liquidado" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}
                    >
                      {a.estado === "liquidado" ? <PackageCheck className="mr-1 h-4 w-4 shrink-0" /> : <PlusCircle className="mr-1 h-4 w-4 shrink-0" />}
                      <span className="truncate">{a.estado === "liquidado" ? "Entregar" : "Abonar"}</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDetail(a)} className="h-10 min-w-0 rounded-2xl px-2 text-xs font-black">
                      {detailLoadingId === a.id ? <Loader2 className="mr-1 h-4 w-4 shrink-0 animate-spin" /> : <Eye className="mr-1 h-4 w-4 shrink-0" />}
                      <span className="truncate">Detalle</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => requestCancel(a)}
                      disabled={!(a.estado === "activo" || a.estado === "vencido")}
                      className="h-10 min-w-0 rounded-2xl border-red-100 bg-red-50/60 px-2 text-xs font-black text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-45"
                    >
                      <RotateCcw className="mr-1 h-4 w-4 shrink-0" /><span className="truncate">Cancelar</span>
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-200/75 px-3 py-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">Abono apartado</p>
                <h3 className="text-xl font-black italic text-slate-950">{selected.folio}</h3>
                <p className="text-sm font-semibold text-slate-500">Saldo actual {money(selected.saldo)}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"><XCircle className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 space-y-3">
              <Input value={abono} onChange={(e) => setAbono(e.target.value)} type="number" min={1} max={selected.saldo} className="h-12 rounded-2xl text-lg font-black" placeholder="Monto del abono" />
              <div className="grid grid-cols-3 gap-2">
                {(["efectivo", "tarjeta", "transferencia"] as ApartadoMetodoPago[]).map((m) => (
                  <button key={m} type="button" onClick={() => setMetodo(m)} className={`h-12 rounded-2xl border text-[10px] font-black uppercase tracking-wider ${metodo === m ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{m === "transferencia" ? "Transf." : m}</button>
                ))}
              </div>
              {metodo !== "efectivo" && <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} className="h-11 rounded-2xl" placeholder="Referencia / autorizacion" />}
              <Button onClick={submitAbono} disabled={isPending} className="h-12 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-700 btn-glow">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
                Registrar abono
              </Button>
            </div>
          </div>
        </div>
      )}
      <ApartadoReceiptModal
        apartado={receipt?.apartado ?? null}
        kind={receipt?.kind ?? "abono"}
        onClose={() => setReceipt(null)}
        onMarkDelivered={receipt?.apartado && receipt.kind === "liquidado" ? () => handleDeliverApartado(receipt.apartado) : undefined}
        markingDelivered={isPending}
        business={business}
      />

      {detail && (
        <div className="fixed inset-0 z-[97] flex items-end justify-center bg-slate-200/75 px-3 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="relative bg-gradient-to-br from-white via-blue-50 to-blue-100 px-6 py-6 text-white">
              <button type="button" onClick={() => setDetail(null)} className="absolute right-4 top-4 rounded-full bg-blue-50 p-2 text-slate-700 hover:bg-blue-100 hover:text-blue-700">
                <XCircle className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-950/30">
                  <PackageCheck className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-200">Estado de cuenta</p>
                  <h3 className="truncate text-xl font-black italic tracking-tight">{detail.folio}</h3>
                  <p className="truncate text-sm text-slate-600">{detail.producto_nombre}</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total</p><p className="text-sm font-black">{money(detail.precio_acordado * detail.cantidad)}</p></div>
                <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Abonado</p><p className="text-sm font-black text-emerald-700">{money(detail.total_abonado)}</p></div>
                <div className="rounded-2xl bg-blue-50 p-3 ring-1 ring-blue-100"><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Saldo</p><p className="text-sm font-black text-blue-700">{money(detail.saldo)}</p></div>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">{detail.cliente_nombre}</p>
                    <p className="text-xs font-semibold text-slate-500">{detail.cliente_telefono || "Sin telefono"} · Limite {dateShort(detail.fecha_limite)}</p>
                  </div>
                  <Badge variant="outline" className={`${statusConfig[detail.estado].className} text-[10px] font-black uppercase`}>
                    {statusConfig[detail.estado].label}
                  </Badge>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Movimientos del apartado</p>
                {detail.abonos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-500">Sin movimientos registrados.</div>
                ) : (
                  detail.abonos.map((mov, index) => (
                    <div key={mov.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{movimientoLabel(index)}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">
                          {dateTimeShort(mov.created_at)} · {mov.metodo_pago}{mov.referencia_pago ? ` · Ref. ${mov.referencia_pago}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className="mr-1 text-sm font-black text-emerald-700">{money(mov.monto)}</p>
                        <button
                          type="button"
                          onClick={() => printMovimientoReceipt(detail, mov, index, business)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          title="Imprimir movimiento"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!openMovimientoWhatsApp(detail, mov, index, business)) {
                              toast({ title: "Sin telefono", description: "Este cliente no tiene telefono para WhatsApp.", variant: "warning" })
                            }
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          title="Enviar movimiento por WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <Button variant="outline" onClick={() => setDetail(null)} className="h-11 rounded-2xl">Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-[98] flex items-end justify-center bg-slate-200/75 px-3 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-red-100 bg-white shadow-2xl">
            <div className="relative bg-gradient-to-br from-white via-blue-50 to-red-100 px-6 py-6 text-white">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="absolute right-4 top-4 rounded-full bg-blue-50 p-2 text-slate-700 hover:bg-blue-100 hover:text-blue-700"
              >
                <XCircle className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 shadow-lg shadow-red-950/30">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-200">Cancelacion excepcional</p>
                  <h3 className="text-xl font-black italic tracking-tight">Cancelar {cancelTarget.folio}</h3>
                </div>
              </div>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                Cancelar un apartado libera el producto al inventario. Usalo solo si el cliente ya no continuara, el plazo vencio o el taller acordo cancelar la reserva.
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">{cancelTarget.producto_nombre}</p>
                <p className="text-xs font-semibold text-slate-500">
                  {cancelTarget.cliente_nombre} · Saldo {money(cancelTarget.saldo)} · Limite {dateShort(cancelTarget.fecha_limite)}
                </p>
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Motivo de cancelacion</label>
                <Textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  className="mt-2 min-h-24 rounded-2xl border-slate-200 bg-white text-sm"
                  placeholder="Ej. Plazo vencido sin liquidacion, cliente solicito cancelar, acuerdo con gerencia..."
                />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setCancelTarget(null)} className="h-11 rounded-2xl">
                Mantener apartado
              </Button>
              <Button
                type="button"
                onClick={confirmCancel}
                disabled={isPending || cancelReason.trim().length < 5}
                className="h-11 rounded-2xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                Confirmar cancelacion
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

