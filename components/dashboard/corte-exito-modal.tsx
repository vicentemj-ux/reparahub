"use client"

import { memo, useEffect, useRef, useState, type CSSProperties } from "react"
import { useThermalTicketPrint } from "@/lib/print/print-config"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Printer, MessageCircle, Mail, X, CheckCircle2, Loader2 } from "lucide-react"
import { CashRegisterCutTicket, type CashRegisterCutData } from "@/components/printing"
import { enviarCorteCajaEmailAction, type CortePrintData } from "@/lib/actions/ventas-prisma"
import { getCurrentOwnerIdentity } from "@/lib/actions/auth-prisma"
import { toast } from "@/hooks/use-toast"
import { normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { getCodigoTelefono } from "@/lib/constants/paises"

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface CorteExitoModalProps {
  open: boolean
  cortes: CortePrintData
  tallerNombre: string
  tallerTelefono: string
  tallerPais?: string | null
  tallerEmail?: string
  /** Telefono del responsable del local (dueno/gerente/encargado). Es a
   *  este numero al que se envia el resumen del corte por WhatsApp. Si
   *  esta vacio, cae al `tallerTelefono` (mostrador). */
  responsableTelefono?: string
  montoCierre: number
  onClose: () => void
}

function mapCorteToTicketData(cortes: CortePrintData, montoCierre: number, cajeroName: string): CashRegisterCutData {
  const totalAbonosEfectivo = cortes.total_abonos_efectivo ?? 0
  const totalAbonosTarjeta = cortes.total_abonos_tarjeta ?? 0
  const totalAbonosTransferencia = cortes.total_abonos_transferencia ?? 0
  const totalGastosEfectivo = cortes.total_gastos_efectivo ?? cortes.total_gastos
  const totalGastosTarjeta = cortes.total_gastos_tarjeta ?? 0
  const totalGastosTransferencia = cortes.total_gastos_transferencia ?? 0
  const totalAnulacionesEfectivo = cortes.total_anulaciones_efectivo ?? 0
  const totalAnulacionesTarjeta = cortes.total_anulaciones_tarjeta ?? 0
  const totalAnulacionesTransferencia = cortes.total_anulaciones_transferencia ?? 0

  const efectivoIngresos = cortes.total_efectivo + totalAbonosEfectivo
  const tarjetaIngresos = cortes.total_tarjeta + totalAbonosTarjeta
  const transferenciaIngresos = cortes.total_transferencia + totalAbonosTransferencia

  const egresos = [
    ...(cortes.listaGastos ?? []).map((g) => ({ concepto: g.descripcion ?? "Gasto", monto: g.monto })),
    ...(cortes.anulaciones ?? []).map((a) => ({ concepto: `Anulación ${a.folio ?? ""}`.trim(), monto: a.monto })),
  ]

  const totalEgresos = (cortes.total_gastos ?? 0) + (cortes.totalAnulaciones ?? 0)
  const diferencia = montoCierre - (cortes.saldo_final ?? 0)

  return {
    cajaId: `#${String(cortes.numero_corte).padStart(3, "0")}`,
    cajeroName,
    openedAt: cortes.fecha_apertura,
    closedAt: cortes.fecha_cierre,
    fondoInicial: cortes.monto_inicial,
    ingresos: {
      efectivo: efectivoIngresos,
      tarjeta: tarjetaIngresos,
      transferencia: transferenciaIngresos,
    },
    posSales: cortes.totalVentasPdv,
    repairIncome: cortes.total_abonos,
    egresos,
    totalEgresos,
    totalEsperado: cortes.saldo_final ?? 0,
    totalReal: montoCierre,
    diferencia,
  }
}

export const CorteExitoModal = memo(function CorteExitoModal({
  open,
  cortes,
  tallerNombre,
  tallerTelefono,
  tallerPais,
  tallerEmail,
  responsableTelefono,
  montoCierre,
  onClose,
}: CorteExitoModalProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [cajeroName, setCajeroName] = useState("Cajero")

  useEffect(() => {
    getCurrentOwnerIdentity()
      .then((r) => setCajeroName(r.nombre || "Cajero"))
      .catch(() => {})
  }, [])

  const handleReactToPrint = useThermalTicketPrint({
    contentRef: printRef,
    documentTitle: () => `Corte-${cortes.numero_corte}`,
  })

  const diferencia = montoCierre - (cortes.saldo_final ?? 0)

  function handleSendWhatsApp() {
    const phoneForCorte = responsableTelefono?.trim() || tallerTelefono
    const digits = normalizePhoneForWhatsApp(phoneForCorte, getCodigoTelefono(tallerPais ?? null))

    // ENTRADAS (ventas + cobros reparacion) por metodo de pago
    const entradas = cortes.ventas.length + cortes.cobrosRep.length
    const cobrosTotal = cortes.cobrosRep.reduce((s, c) => s + c.monto, 0)
    const totalCobrosEf = cortes.cobrosRep.filter((c) => c.metodo_pago === "efectivo").reduce((s, c) => s + c.monto, 0)
    const totalCobrosTj = cortes.cobrosRep.filter((c) => c.metodo_pago === "tarjeta").reduce((s, c) => s + c.monto, 0)
    const totalCobrosTr = cortes.cobrosRep.filter((c) => c.metodo_pago === "transferencia").reduce((s, c) => s + c.monto, 0)

    // SALIDAS (gastos + anulaciones) por metodo de pago
    const totalGastosEf = cortes.listaGastos.filter((g) => g.metodo_pago === "efectivo").reduce((s, g) => s + g.monto, 0)
    const totalGastosTj = cortes.listaGastos.filter((g) => g.metodo_pago === "tarjeta").reduce((s, g) => s + g.monto, 0)
    const totalGastosTr = cortes.listaGastos.filter((g) => g.metodo_pago === "transferencia").reduce((s, g) => s + g.monto, 0)
    const totalAnulEf = cortes.anulaciones.filter((a) => a.metodo_pago === "efectivo").reduce((s, a) => s + a.monto, 0)
    const totalAnulTj = cortes.anulaciones.filter((a) => a.metodo_pago === "tarjeta").reduce((s, a) => s + a.monto, 0)
    const totalAnulTr = cortes.anulaciones.filter((a) => a.metodo_pago === "transferencia").reduce((s, a) => s + a.monto, 0)

    // Saldo final = fondo inicial + entradas en efectivo - salidas en efectivo.
    // Las ventas/cobros en tarjeta o transferencia NO afectan la caja fisica.
    const entradasEfectivo = cortes.total_efectivo + totalCobrosEf
    const salidasEfectivo = totalGastosEf + totalAnulEf
    const saldoEsperadoEfectivo =
      (cortes.monto_inicial ?? 0) + entradasEfectivo - salidasEfectivo

    const lineas: string[] = [
      `🧾 *CORTE DE CAJA #${cortes.numero_corte}*`,
      `📅 ${fmtDate(cortes.fecha_apertura)} - ${fmtDate(cortes.fecha_cierre)}`,
      ``,
      `💰 *ENTRADAS* (${entradas} mov.)`,
      `Ventas PDV (${cortes.ventas.length}): $${fmt(cortes.totalVentasPdv)}`,
      `  Ef: $${fmt(cortes.total_efectivo)}  ·  Tj: $${fmt(cortes.total_tarjeta)}  ·  Tr: $${fmt(cortes.total_transferencia)}`,
      `Cobros reparación (${cortes.cobrosRep.length}): $${fmt(cobrosTotal)}`,
      `  Ef: $${fmt(totalCobrosEf)}  ·  Tj: $${fmt(totalCobrosTj)}  ·  Tr: $${fmt(totalCobrosTr)}`,
      ``,
      `💸 *SALIDAS* (${cortes.listaGastos.length + cortes.anulaciones.length} mov.)`,
      `Gastos (${cortes.listaGastos.length}): -$${fmt(cortes.total_gastos)}`,
      `  Ef: -$${fmt(totalGastosEf)}  ·  Tj: -$${fmt(totalGastosTj)}  ·  Tr: -$${fmt(totalGastosTr)}`,
      `Anulaciones (${cortes.anulaciones.length}): -$${fmt(cortes.totalAnulaciones)}`,
      `  Ef: -$${fmt(totalAnulEf)}  ·  Tj: -$${fmt(totalAnulTj)}  ·  Tr: -$${fmt(totalAnulTr)}`,
      ``,
      `📊 *SALDO FINAL (efectivo en caja):*`,
      `Fondo inicial: $${fmt(cortes.monto_inicial)}`,
      `+ Entradas efectivo: $${fmt(entradasEfectivo)}`,
      `- Salidas efectivo: -$${fmt(salidasEfectivo)}`,
      `= Esperado: $${fmt(saldoEsperadoEfectivo)}`,
      `Contado: $${fmt(montoCierre || 0)}`,
      diferencia !== 0
        ? `${diferencia < 0 ? "❌" : "⚠️"} *Diferencia:* ${diferencia < 0 ? "-" : "+"}$${fmt(Math.abs(diferencia))}  ${diferencia < 0 ? "(FALTANTE)" : "(SOBRANTE)"}`
        : `✅ *Diferencia:* $0.00 (cuadre exacto)`,
    ]

    const msg = lineas.join("\n")
    const url = `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(msg)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  async function handleSendEmail() {
    if (sendingEmail) return
    setSendingEmail(true)
    try {
      const res = await enviarCorteCajaEmailAction({
        cortes,
        tallerNombre,
        montoCierre: montoCierre || null,
      })
      if (res.success) {
        toast({
          title: "Corte enviado por correo",
          description: `Enviado a ${res.sentTo || "tu correo configurado"}.`,
        })
      } else {
        toast({
          title: "No se pudo enviar el correo",
          description: res.error || "Verifica la configuracion y vuelve a intentar.",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Error al enviar",
        description: e instanceof Error ? e.message : "Error inesperado.",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <div
        ref={printRef}
        className="print-ticket-offscreen-layer"
        style={{ "--pos-print-width-mm": "80mm" } as CSSProperties}
        aria-hidden
      >
        <CashRegisterCutTicket
          data={mapCorteToTicketData(cortes, montoCierre, cajeroName)}
          business={{
            name: tallerNombre,
            phone: tallerTelefono,
            logoUrl: null,
          }}
        />
      </div>

      <DialogContent role="dialog" aria-modal="true" hideCloseButton className="max-w-lg rounded-2xl border-slate-200 bg-white p-0 shadow-lg ring-1 ring-black/5 overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-10 w-10" strokeWidth={2} />
        </button>

        <style>{`
          @media (prefers-reduced-motion: no-preference) {
            .corte-modal-ease {
              animation: cortEaseOutQuart 260ms both;
            }
            @keyframes cortEaseOutQuart {
              from { opacity: 0; transform: translateY(6px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .corte-success-bounce {
              animation: cortSuccessBounce 1.2s ease-in-out infinite both;
            }
            @keyframes cortSuccessBounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          }
        `}</style>

        <DialogHeader className="corte-modal-ease bg-white px-6 pt-8 pb-0 text-center items-center">
          <div className="corte-success-bounce mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <DialogTitle className="text-2xl font-black italic uppercase tracking-tight text-blue-600 text-center">
            Corte exitoso
          </DialogTitle>
          <DialogDescription className="mt-0 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 text-center leading-none">
            Corte #{cortes.numero_corte}
          </DialogDescription>
        </DialogHeader>

        {/* Resumen */}
        <div className="px-6 py-4 bg-slate-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ventas PDV</span>
              <span className="text-sm font-black text-slate-900">${fmt(cortes.totalVentasPdv)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Efectivo</span>
              <span className="text-sm font-black text-slate-900">${fmt(cortes.total_efectivo)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tarjeta</span>
              <span className="text-sm font-black text-slate-900">${fmt(cortes.total_tarjeta)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Transferencia</span>
              <span className="text-sm font-black text-slate-900">${fmt(cortes.total_transferencia)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gastos</span>
              <span className="text-sm font-black text-red-500">-${fmt(cortes.total_gastos)}</span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">Saldo Final</span>
              <span className="text-lg font-black text-blue-600">${fmt(cortes.saldo_final)}</span>
            </div>
            {diferencia !== 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider text-red-500">Diferencia</span>
                <span className="text-sm font-black text-red-500">${fmt(diferencia)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-3 px-6 pb-6 bg-slate-50">
          <div className="grid grid-cols-3 gap-3">
            <Button
              className="h-14 gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-sm btn-glow shadow-xl shadow-blue-500/30"
              onClick={() => handleReactToPrint()}
            >
              <Printer className="h-5 w-5" />
              Imprimir
            </Button>
            <Button
              className="h-14 gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-sm shadow-lg shadow-emerald-500/25"
              onClick={handleSendWhatsApp}
            >
              <MessageCircle className="h-5 w-5" />
              WhatsApp
            </Button>
            <Button
              className="h-14 gap-2 rounded-2xl bg-slate-700 hover:bg-blue-600 text-white font-black uppercase tracking-wider text-sm shadow-lg shadow-slate-500/25"
              onClick={() => void handleSendEmail()}
              disabled={sendingEmail}
            >
              {sendingEmail ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
              {sendingEmail ? "Enviando" : "Correo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
