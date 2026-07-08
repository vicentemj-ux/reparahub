"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import {
  Activity,
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  MessageCircle,
  Printer,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react"
import {
  getHistorialCaja,
  getDetalleCaja,
  reenviarCorteEmail,
  type HistorialCajaItem,
  type DetalleCajaData,
  type CortePrintData,
} from "@/lib/actions/ventas-prisma"
import { getTallerSettings } from "@/lib/actions/settings-prisma"
import { getCurrentOwnerIdentity } from "@/lib/actions/auth-prisma"
import {
  buildWaMeUrl,
  formatCorteOwnerWhatsAppMessage,
  resolveOwnerWhatsAppDigits,
} from "@/lib/corte-owner-whatsapp"
import { StatusBadgeFinancial } from "@/components/dashboard/status-badge-financial"
import { CashRegisterCutTicket, type CashRegisterCutData } from "@/components/printing"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"
import { useThermalTicketPrint } from "@/lib/print/print-config"
import { PRO_FEATURES_TEMP_DISABLED } from "@/lib/runtime-flags"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function money(n: number) {
  return `$${fmt(n)}`
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "-"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "-"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fmtCorte(n: number | null) {
  if (n === null) return "-"
  return `#${String(n).padStart(3, "0")}`
}

// ─── Detalle modal ────────────────────────────────────────────────────────────

function DetalleModal({ data, onClose }: { data: DetalleCajaData; onClose: () => void }) {
  const { caja, ventas, movimientos } = data
  const isCobroOperacion = (tipo: string) =>
    tipo === "anticipo_reparacion" ||
    tipo === "liquidacion_reparacion" ||
    tipo === "liquidacion" ||
    tipo === "apartado_abono"

  const cobrosRep = movimientos.filter(
    (m) => isCobroOperacion(m.tipo)
  )
  const gastosMovs = movimientos.filter(
    (m) => m.tipo === "gasto" || m.tipo === "gasto_reparacion"
  )
  const anulacionesMovs = movimientos.filter(
    (m) => m.tipo === "anulacion_venta_pdv" || m.tipo === "anulacion_reparacion_abono" || m.tipo === "anulacion_apartado_abono",
  )

  const totalVentasPDV = ventas.reduce((s, v) => s + v.total, 0)
  const totalCobrosRep = cobrosRep.reduce((s, m) => s + m.monto, 0)
  const totalGastos = gastosMovs.reduce((s, m) => s + Math.abs(m.monto), 0)
  const totalAnulaciones = anulacionesMovs.reduce((s, m) => s + Math.abs(m.monto), 0)
  const totalAnulacionesEfectivo = anulacionesMovs
    .filter((m) => (m.metodo_pago ?? "").toLowerCase() === "efectivo")
    .reduce((s, m) => s + Math.abs(m.monto), 0)
  const totalAnulacionesTarjeta = anulacionesMovs
    .filter((m) => (m.metodo_pago ?? "").toLowerCase() === "tarjeta")
    .reduce((s, m) => s + Math.abs(m.monto), 0)
  const totalAnulacionesTransferencia = anulacionesMovs
    .filter((m) => (m.metodo_pago ?? "").toLowerCase() === "transferencia")
    .reduce((s, m) => s + Math.abs(m.monto), 0)
  const totalGastosEfectivo = gastosMovs
    .filter((m) => (m.metodo_pago ?? "").toLowerCase() === "efectivo" || !m.metodo_pago)
    .reduce((s, m) => s + Math.abs(m.monto), 0)
  const totalGastosTarjeta = gastosMovs
    .filter((m) => (m.metodo_pago ?? "").toLowerCase() === "tarjeta")
    .reduce((s, m) => s + Math.abs(m.monto), 0)
  const totalGastosTransferencia = gastosMovs
    .filter((m) => (m.metodo_pago ?? "").toLowerCase() === "transferencia")
    .reduce((s, m) => s + Math.abs(m.monto), 0)

  const totalAbonosEfectivo = cobrosRep
    .filter((m) => (m.metodo_pago ?? "").toLowerCase() === "efectivo")
    .reduce((s, m) => s + m.monto, 0)
  const totalAbonosTarjeta = cobrosRep
    .filter((m) => (m.metodo_pago ?? "").toLowerCase() === "tarjeta")
    .reduce((s, m) => s + m.monto, 0)
  const totalAbonosTransferencia = cobrosRep
    .filter((m) => (m.metodo_pago ?? "").toLowerCase() === "transferencia")
    .reduce((s, m) => s + m.monto, 0)

  const efectivoEsperado = caja.monto_inicial + caja.total_efectivo + totalAbonosEfectivo - totalGastos - totalAnulacionesEfectivo
  const diferencia = caja.monto_cierre !== null ? caja.monto_cierre - efectivoEsperado : null

  const [businessName, setBusinessName] = useState("Mi Taller")
  const [telefonoTaller, setTelefonoTaller] = useState<string | null>(null)
  const [cajeroName, setCajeroName] = useState("Cajero")
  const [sendingEmail, setSendingEmail] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const handleReactToPrint = useThermalTicketPrint({
    contentRef: printRef,
    documentTitle: () => `Corte-${String(caja.numero_corte ?? 0).padStart(3, "0")}`,
  })

  const handleReenviarEmail = async () => {
    setSendingEmail(true)
    const res = await reenviarCorteEmail(caja.id)
    setSendingEmail(false)
    if (res.success) {
      toast({
        title: "Correo enviado",
        description: `Corte #${fmtCorte(caja.numero_corte)} enviado a ${res.sentTo || "el correo registrado"}.`,
      })
    } else {
      toast({
        title: "Error al enviar",
        description: res.error || "No se pudo reenviar el correo.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    getTallerSettings().then(({ settings }) => {
      if (settings?.nombre_taller) setBusinessName(settings.nombre_taller.trim())
      setTelefonoTaller(settings?.telefono?.trim() || null)
    }).catch(() => {})
    getCurrentOwnerIdentity()
      .then((r) => setCajeroName(r.nombre || "Cajero"))
      .catch(() => {})
  }, [])

  const ticketData: CashRegisterCutData = {
    cajaId: `#${String(caja.numero_corte ?? 0).padStart(3, "0")}`,
    cajeroName,
    openedAt: caja.fecha_apertura,
    closedAt: caja.fecha_cierre ?? caja.fecha_apertura,
    fondoInicial: caja.monto_inicial,
    ingresos: {
      efectivo: caja.total_efectivo + totalAbonosEfectivo,
      tarjeta: caja.total_tarjeta + totalAbonosTarjeta,
      transferencia: caja.total_transferencia + totalAbonosTransferencia,
    },
    posSales: totalVentasPDV,
    repairIncome: totalCobrosRep,
    egresos: [
      ...gastosMovs.map((m) => ({ concepto: m.descripcion ?? "Gasto", monto: Math.abs(m.monto) })),
      ...anulacionesMovs.map((m) => ({ concepto: m.descripcion ?? "Anulacion", monto: Math.abs(m.monto) })),
    ],
    totalEgresos: totalGastos + totalAnulaciones,
    totalEsperado: efectivoEsperado,
    totalReal: caja.monto_cierre ?? 0,
    diferencia: diferencia ?? 0,
  }

  const ownerDigits = useMemo(
    () => resolveOwnerWhatsAppDigits({
      envOwnerPhone: process.env.NEXT_PUBLIC_OWNER_WHATSAPP,
      telefonoTaller,
    }),
    [telefonoTaller]
  )

  const whatsappHref = useMemo(() => {
    if (!ownerDigits || !caja.fecha_cierre) return null
    const cortePrintData: CortePrintData = {
      numero_corte: caja.numero_corte ?? 0,
      fecha_apertura: caja.fecha_apertura,
      fecha_cierre: caja.fecha_cierre,
      monto_inicial: caja.monto_inicial,
      total_ventas: caja.total_ventas,
      total_efectivo: caja.total_efectivo,
      total_tarjeta: caja.total_tarjeta,
      total_transferencia: caja.total_transferencia,
      total_abonos: totalCobrosRep,
      total_abonos_efectivo: totalAbonosEfectivo,
      total_abonos_tarjeta: totalAbonosTarjeta,
      total_abonos_transferencia: totalAbonosTransferencia,
      total_gastos: totalGastos,
      total_gastos_efectivo: totalGastosEfectivo,
      total_gastos_tarjeta: totalGastosTarjeta,
      total_gastos_transferencia: totalGastosTransferencia,
      total_anulaciones_efectivo: totalAnulacionesEfectivo,
      total_anulaciones_tarjeta: totalAnulacionesTarjeta,
      total_anulaciones_transferencia: totalAnulacionesTransferencia,
      saldo_final: efectivoEsperado,
      monto_cierre: caja.monto_cierre,
      cobrosRep: cobrosRep.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        descripcion: m.descripcion,
        folio: m.folio,
        monto: m.monto,
        metodo_pago: m.metodo_pago,
        fecha: m.fecha,
      })),
      listaGastos: gastosMovs.map((m) => ({
        id: m.id,
        descripcion: m.descripcion,
        monto: Math.abs(m.monto),
        metodo_pago: m.metodo_pago,
      })),
      anulaciones: anulacionesMovs.map((m) => ({
        id: m.id,
        descripcion: m.descripcion,
        folio: m.folio,
        monto: Math.abs(m.monto),
        metodo_pago: m.metodo_pago,
        fecha: m.fecha,
      })),
      ventas: ventas.map((v) => ({
        id: v.id,
        folio: v.folio,
        cliente_nombre: v.cliente_nombre,
        total: v.total,
        metodo_pago: v.metodo_pago,
        monto_efectivo: v.monto_efectivo,
        monto_tarjeta: v.monto_tarjeta,
        monto_transferencia: v.monto_transferencia,
        created_at: v.created_at,
      })),
      totalVentasPdv: caja.total_ventas,
      totalAnulaciones,
      visitasDelDia: [],
    }
    const msg = formatCorteOwnerWhatsAppMessage(businessName, cortePrintData)
    return buildWaMeUrl(ownerDigits, msg)
  }, [
    ownerDigits,
    caja,
    businessName,
    totalCobrosRep,
    totalAbonosEfectivo,
    totalAbonosTarjeta,
    totalAbonosTransferencia,
    totalGastos,
    totalGastosEfectivo,
    totalGastosTarjeta,
    totalGastosTransferencia,
    efectivoEsperado,
    totalAnulaciones,
    totalAnulacionesEfectivo,
    totalAnulacionesTarjeta,
    totalAnulacionesTransferencia,
    cobrosRep,
    gastosMovs,
    anulacionesMovs,
    ventas,
  ])

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      {/* Area de impresion oculta */}
      <div
        ref={printRef}
        className="print-ticket-offscreen-layer"
        style={{ width: "80mm" }}
        aria-hidden
      >
        <CashRegisterCutTicket
          data={ticketData}
          business={{
            name: businessName,
            phone: telefonoTaller || "",
            logoUrl: null,
          }}
        />
      </div>

      <DialogContent className="w-full max-w-md flex flex-col bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden p-0 gap-0">
        <DialogTitle className="sr-only">Detalle de corte de caja</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Corte de Caja {fmtCorte(caja.numero_corte)}
            </p>
            <h2 className="text-lg font-bold text-slate-900">{fmtDate(caja.fecha_apertura)}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body - ticket preview only */}
        <div className="flex-1 overflow-y-auto max-h-[min(70vh,580px)] px-5 py-4 bg-slate-50">
          <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm mx-auto" style={{ width: 288 }}>
            <CashRegisterCutTicket
              data={ticketData}
              business={{
                name: businessName,
                phone: telefonoTaller || "",
                logoUrl: null,
              }}
            />
          </div>
        </div>

        {/* Footer - actions */}
        <DialogFooter className="flex-col sm:flex-row gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          {whatsappHref ? (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:flex-1 gap-2 border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/80 hover:text-emerald-900"
              asChild
            >
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 shrink-0" />
                Enviar al Dueno
              </a>
            </Button>
          ) : null}
          {!PRO_FEATURES_TEMP_DISABLED && (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:flex-1 gap-2 border-blue-200 bg-blue-50/50 text-blue-800 hover:bg-blue-100/80 hover:text-blue-900"
              onClick={handleReenviarEmail}
              disabled={sendingEmail}
            >
              {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Reenviar correo
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full sm:flex-1 gap-2 border-slate-200 text-slate-700"
            onClick={() => handleReactToPrint()}
          >
            <Printer className="h-4 w-4" />
            Imprimir Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── HistorialCaja ────────────────────────────────────────────────────────────

const PAGE_SIZE_CAJA = 30

export function HistorialCaja({ autoOpenId, onAutoOpenHandled }: { autoOpenId?: string | null; onAutoOpenHandled?: () => void } = {}) {
  const [historial, setHistorial] = useState<HistorialCajaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detalleData, setDetalleData] = useState<DetalleCajaData | null>(null)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  const [ownerIdentity, setOwnerIdentity] = useState<{ nombre: string; email: string }>({
    nombre: "Usuario activo",
    email: "",
  })

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    const { data, error: err, total: t } = await getHistorialCaja(p, PAGE_SIZE_CAJA)
    if (err) setError(err)
    setHistorial(data)
    setTotal(t)
    setLoading(false)
  }, [])

  useEffect(() => { load(page) }, [load, page])

  useEffect(() => {
    getCurrentOwnerIdentity()
      .then((r) => {
        setOwnerIdentity({
          nombre: r.nombre || "Usuario activo",
          email: r.email || "",
        })
      })
      .catch(() => {
        setOwnerIdentity({ nombre: "Usuario activo", email: "" })
      })
  }, [])

  const handleVerDetalle = async (id: string) => {
    setSelectedId(id)
    setDetalleData(null)
    setDetalleLoading(true)
    const { data } = await getDetalleCaja(id)
    setDetalleData(data)
    setDetalleLoading(false)
  }

  useEffect(() => {
    if (!autoOpenId) return
    handleVerDetalle(autoOpenId)
    onAutoOpenHandled?.()
  }, [autoOpenId, onAutoOpenHandled])

  const handleCloseDetalle = () => {
    setSelectedId(null)
    setDetalleData(null)
  }

  /** KPIs sobre la pagina cargada (misma fuente que la lista). */
  const kpiVista = useMemo(() => {
    let sumaDiferencia = 0
    let sumaEfectivoSistema = 0
    for (const c of historial) {
      const esperado = c.saldo_final
      sumaEfectivoSistema += esperado
      if (c.monto_cierre !== null) {
        sumaDiferencia += c.monto_cierre - esperado
      }
    }
    const promedioPorTurno =
      historial.length > 0 ? sumaEfectivoSistema / historial.length : 0
    return { sumaDiferencia, promedioPorTurno }
  }, [historial])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Cargando historial de caja...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700 font-medium">Error al cargar el historial</p>
        <p className="text-xs text-red-500 mt-1 font-mono">{error}</p>
        <Button variant="outline" size="sm" onClick={() => load(page)} className="mt-4">
          Reintentar
        </Button>
      </div>
    )
  }

  if (historial.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-xl border border-dashed border-slate-200">
        <p className="text-slate-500 font-medium">No hay cortes de caja registrados</p>
        <p className="text-xs text-slate-500">
          Los cortes apareceran aqui una vez que cierres la caja por primera vez
        </p>
      </div>
    )
  }

  const tendenciaIcon =
    kpiVista.sumaDiferencia > 0.01 ? (
      <TrendingUp className="h-5 w-5 text-rose-600" aria-hidden />
    ) : kpiVista.sumaDiferencia < -0.01 ? (
      <TrendingDown className="h-5 w-5 text-rose-600" aria-hidden />
    ) : (
      <Activity className="h-5 w-5 text-blue-600" aria-hidden />
    )

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Turnos auditados
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{total}</p>
              <p className="mt-1 text-xs text-slate-500">
                Cortes cerrados en el historial
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <CheckCircle2 className="h-5 w-5 text-blue-600" aria-hidden />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Diferencia neta
              </p>
              <p
                className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${
                  Math.abs(kpiVista.sumaDiferencia) > 0.01 ? "text-rose-700" : "text-slate-900"
                }`}
              >
                {kpiVista.sumaDiferencia >= 0 ? "" : "−"}
                {money(Math.abs(kpiVista.sumaDiferencia))}
              </p>
              <p className="mt-1 text-xs text-slate-500">Suma en la vista actual</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
              {tendenciaIcon}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Promedio / turno
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
                {money(kpiVista.promedioPorTurno)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Efectivo sistema (vista actual)</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <Wallet className="h-5 w-5 text-blue-600" aria-hidden />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">
        <div className="hidden min-w-[920px] grid-cols-[minmax(200px,1.1fr)_minmax(200px,1fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(168px,auto)_88px] gap-4 border-b border-slate-100 bg-slate-50/90 px-5 py-3 lg:grid">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Periodo auditoria
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Cajero responsable
          </span>
          <span className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Efectivo sistema
          </span>
          <span className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Efectivo fisico
          </span>
          <span className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Cuadre
          </span>
          <span className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Accion
          </span>
        </div>

        <div className="min-w-0 divide-y divide-slate-100">
          {historial.map((c) => {
            const efectivoSistema = c.saldo_final
            const diferencia =
              c.monto_cierre !== null ? c.monto_cierre - efectivoSistema : null
            const avatarLabel = (ownerIdentity.nombre || ownerIdentity.email || "UA")
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("") || "UA"

            return (
              <div
                key={c.id}
                className="group grid grid-cols-1 gap-5 px-5 py-5 transition-colors hover:bg-blue-50/30 lg:min-w-[920px] lg:grid-cols-[minmax(200px,1.1fr)_minmax(200px,1fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(168px,auto)_88px] lg:items-center lg:gap-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:hidden">
                    Periodo auditoria
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {fmtDate(c.fecha_apertura)}
                  </p>
                  <p className="text-sm tabular-nums text-slate-500">
                    {fmtTime(c.fecha_apertura)}
                    <span className="mx-1.5 text-slate-600">→</span>
                    {c.fecha_cierre ? fmtTime(c.fecha_cierre) : "-"}
                  </p>
                  <p className="text-xs font-medium text-blue-600">
                    Corte {fmtCorte(c.numero_corte)}
                    {c.nota_cierre ? " · Cierre automatico" : " · Cierre manual"}
                  </p>
                </div>

                <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:hidden">
                    Cajero responsable
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 shrink-0 ring-2 ring-white shadow-sm">
                      <AvatarFallback className="bg-blue-100 text-sm font-bold text-blue-700">
                        {avatarLabel}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{ownerIdentity.nombre}</p>
                      <p className="text-[11px] text-slate-500">{ownerIdentity.email || "sin-correo@reparahub.com"}</p>
                    </div>
                  </div>
                </div>

                <div className="text-left lg:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:hidden">
                    Efectivo sistema
                  </p>
                  <p className="text-base font-bold tracking-tight tabular-nums text-slate-900">
                    {money(efectivoSistema)}
                  </p>
                </div>

                <div className="text-left lg:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:hidden">
                    Efectivo fisico
                  </p>
                  <p className="text-base font-bold tracking-tight tabular-nums text-slate-900">
                    {c.monto_cierre !== null ? money(c.monto_cierre) : "-"}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-2 lg:items-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:hidden">
                    Cuadre
                  </p>
                  <StatusBadgeFinancial diferencia={diferencia} />
                </div>

                <div className="flex flex-col gap-2 lg:items-end">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:hidden">
                    Accion
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleVerDetalle(c.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                      aria-label="Ver ticket del corte"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detalle modal */}
      {selectedId && (
        detalleLoading || !detalleData ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-200/80">
            <div className="bg-white rounded-2xl p-10 flex items-center gap-3 shadow-2xl">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              <span className="text-slate-600 font-medium">Cargando detalle...</span>
            </div>
          </div>
        ) : (
          <DetalleModal data={detalleData} onClose={handleCloseDetalle} />
        )
      )}

      {/* Paginacion historial de caja */}
      {total > PAGE_SIZE_CAJA && (
        <div className="flex items-center justify-between text-sm text-slate-500 pt-3">
          <span>
            Mostrando {page * PAGE_SIZE_CAJA + 1}-{Math.min((page + 1) * PAGE_SIZE_CAJA, total)} de {total} cortes
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              disabled={(page + 1) * PAGE_SIZE_CAJA >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </>
  )
}


