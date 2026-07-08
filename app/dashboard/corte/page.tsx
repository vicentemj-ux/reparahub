"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Banknote,
  Calculator,
  CreditCard,
  DollarSign,
  Loader2,
  Receipt,
  TrendingUp,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getCajaConDetalle, cerrarCaja, getCajaAbierta } from "@/lib/actions/ventas-prisma"
import { verificarVisitasPendientesCierre, getCurrentTallerIdPublic } from "@/lib/actions/bitacora-visitas-prisma"
import { getTallerSettings } from "@/lib/actions/settings-prisma"
import { CorteExitoModal } from "@/components/dashboard/corte-exito-modal"
import type { CajaRow, CortePrintData } from "@/lib/actions/ventas-prisma"

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CortePage() {
  const router = useRouter()
  const [caja, setCaja] = useState<CajaRow | null>(null)
  const [preview, setPreview] = useState<CortePrintData | null>(null)
  const [montoCierre, setMontoCierre] = useState("")
  const [conteoConfirmado, setConteoConfirmado] = useState(false)
  const [observaciones, setObservaciones] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fetching, setFetching] = useState(true)
  const [tallerId, setTallerId] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [tallerNombre, setTallerNombre] = useState("Mi Taller")
  const [tallerTelefono, setTallerTelefono] = useState("")
  const [tallerPais, setTallerPais] = useState<string | null>(null)
  const [tallerEmail, setTallerEmail] = useState("")
  const [responsableTelefono, setResponsableTelefono] = useState("")

  useEffect(() => {
    async function init() {
      const id = await getCurrentTallerIdPublic()
      setTallerId(id)

      getTallerSettings().then(({ settings }) => {
        if (settings) {
          setTallerNombre(settings.nombre_taller)
          setTallerTelefono(settings.telefono)
          setTallerPais(settings.pais ?? null)
          setTallerEmail(settings.email_contacto ?? "")
          setResponsableTelefono(settings.responsable_telefono ?? "")
        }
      })

      const { caja: c } = await getCajaAbierta()
      if (!c) {
        router.replace("/dashboard")
        return
      }
      setCaja(c)
      const { data } = await getCajaConDetalle(c.id)
      if (data) setPreview(data)
      setFetching(false)
    }
    void init()
  }, [router])

  const totalAbonosEfectivo = preview?.total_abonos_efectivo ?? 0
  const totalAbonosTarjeta = preview?.total_abonos_tarjeta ?? 0
  const totalAbonosTransferencia = preview?.total_abonos_transferencia ?? 0
  const totalAnulacionesEfectivo = preview?.total_anulaciones_efectivo ?? 0
  const totalAnulacionesTarjeta = preview?.total_anulaciones_tarjeta ?? 0
  const totalAnulacionesTransferencia = preview?.total_anulaciones_transferencia ?? 0
  const totalGastosEfectivo = preview?.total_gastos_efectivo ?? 0
  const totalGastosTarjeta = preview?.total_gastos_tarjeta ?? 0
  const totalGastosTransferencia = preview?.total_gastos_transferencia ?? 0
  const totalApartadosEfectivo =
    preview?.cobrosRep
      .filter((c) => c.tipo === "apartado_abono" && c.metodo_pago === "efectivo")
      .reduce((sum, c) => sum + c.monto, 0) ?? 0
  const totalReparacionesEfectivo = Math.max(0, totalAbonosEfectivo - totalApartadosEfectivo)

  const totalSistema = caja
    ? caja.monto_inicial + caja.total_efectivo + totalAbonosEfectivo - totalGastosEfectivo - totalAnulacionesEfectivo
    : 0
  const totalTarjeta = caja ? caja.total_tarjeta + totalAbonosTarjeta - totalGastosTarjeta - totalAnulacionesTarjeta : 0
  const totalTransferencia = caja ? caja.total_transferencia + totalAbonosTransferencia - totalGastosTransferencia - totalAnulacionesTransferencia : 0
  const totalVentas = preview?.totalVentasPdv ?? 0

  const diferencia = useMemo(() => {
    const contado = montoCierre ? parseFloat(montoCierre.replace(",", ".")) : null
    return contado !== null && !isNaN(contado) ? contado - totalSistema : null
  }, [montoCierre, totalSistema])

  async function handleCerrar() {
    if (!caja) return
    const montoCapturado = montoCierre.trim()
    if (!montoCapturado) {
      setError("Captura el efectivo fisico contado antes de cerrar caja.")
      return
    }

    const val = parseFloat(montoCapturado.replace(",", "."))
    if (isNaN(val) || val < 0) {
      setError("Ingresa el monto contado en caja para continuar")
      return
    }
    if (!conteoConfirmado) {
      setError("Marca la confirmacion de conteo fisico para ejecutar el cierre.")
      return
    }
    if (diferencia !== null && Math.abs(diferencia) > 0.009 && !observaciones.trim()) {
      setError("Hay diferencia contra sistema. Agrega una observacion de auditoria antes de cerrar.")
      return
    }

    // Bloquear si hay visitas pendientes desde la apertura de caja
    if (tallerId) {
      const { puedeCerrar, visitasPendientes } = await verificarVisitasPendientesCierre(tallerId, caja.fecha_apertura)
      if (!puedeCerrar) {
        setError(`No puedes cerrar caja: hay ${visitasPendientes} visita(s) pendiente(s) en la Bitacora de Visitas. Registra las atenciones antes de cerrar.`)
        return
      }
    }

    setLoading(true)
    const { error: err } = await cerrarCaja({
      cajaId: caja.id,
      montoCierre: val,
      conteoFisicoConfirmado: true,
    })
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    setShowSuccess(true)
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-dashboard-surface flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!caja) return null

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-slate-700 transition-colors mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <h1 className="text-3xl font-black italic uppercase tracking-tight text-slate-900">
              CIERRE DE CAJA DIARIO
            </h1>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mt-1">
              RECONCILIACION DE EFECTIVO · {caja.numero_corte ? `CORTE #${String(caja.numero_corte).padStart(3, "0")}` : "CAJA"}
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
              TERMINAL ID: CAJA
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Registros Sistema */}
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                <Calculator className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Registros Sistema
              </h2>
            </div>

            <div className="space-y-3">
              <RegistroRow
                icon={<Banknote className="h-4 w-4" />}
                label="FONDO INICIAL"
                value={caja.monto_inicial}
                variant="default"
              />
              <RegistroRow
                icon={<DollarSign className="h-4 w-4" />}
                label="VENTAS EFECTIVO"
                value={caja.total_efectivo}
                variant="green"
              />
              <RegistroRow
                icon={<Receipt className="h-4 w-4" />}
                label="COBROS REPARACION"
                value={totalReparacionesEfectivo}
                variant="green"
              />
              <RegistroRow
                icon={<Receipt className="h-4 w-4" />}
                label="COBROS APARTADOS"
                value={totalApartadosEfectivo}
                variant="green"
              />
              <RegistroRow
                icon={<Receipt className="h-4 w-4" />}
                label="GASTOS EFECTIVO"
                value={-totalGastosEfectivo}
                variant="red"
                signed
              />
              {totalGastosTarjeta > 0 && (
                <RegistroRow
                  icon={<CreditCard className="h-4 w-4" />}
                  label="GASTOS TARJETA"
                  value={-totalGastosTarjeta}
                  variant="red"
                  signed
                />
              )}
              {totalGastosTransferencia > 0 && (
                <RegistroRow
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="GASTOS TRANSFERENCIA"
                  value={-totalGastosTransferencia}
                  variant="red"
                  signed
                />
              )}
              <RegistroRow
                icon={<Receipt className="h-4 w-4" />}
                label="ANULACIONES EFECTIVO"
                value={-totalAnulacionesEfectivo}
                variant="red"
                signed
              />
              <RegistroRow
                icon={<CreditCard className="h-4 w-4" />}
                label="TARJETA"
                value={totalTarjeta}
                variant="purple"
              />
              <RegistroRow
                icon={<TrendingUp className="h-4 w-4" />}
                label="TRANSFERENCIA"
                value={totalTransferencia}
                variant="cyan"
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  MONTO VENDIDO
                </span>
                <span className="text-2xl font-black text-blue-600">${fmt(totalVentas)}</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">
                {caja.total_ventas} VENTAS POS CAPTURADAS. LOS COBROS DE REPARACION Y APARTADOS SE MUESTRAN COMO COBROS.
              </p>
            </div>
          </div>

          {/* Right: Arqueo Manual */}
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
                <DollarSign className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Arqueo Manual
              </h2>
            </div>

            <div className="rounded-2xl bg-slate-50/70 border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Sistema espera
                </span>
                <span className="text-lg font-black tabular-nums text-slate-900">
                  ${fmt(totalSistema)}
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 mt-1.5 leading-relaxed">
                Fondo + ventas efectivo + abonos efectivo − gastos
              </p>
            </div>

            <div>
              <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
                EFECTIVO FISICO EN CAJA
              </Label>
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montoCierre}
                  onChange={(e) => {
                    setMontoCierre(e.target.value)
                    setConteoConfirmado(false)
                    setError("")
                  }}
                  className="pl-10 text-2xl font-bold h-14 rounded-2xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                  placeholder="0.00"
                />
              </div>
            </div>

            {diferencia !== null && (
              <div
                className={`rounded-2xl border px-4 py-3 ${
                  diferencia === 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  {diferencia === 0 ? (
                    <Calculator className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">
                      DIFERENCIA: $ {fmt(diferencia)}
                    </p>
                    {diferencia !== 0 ? (
                      <p className="mt-1 text-[11px] font-semibold leading-relaxed">
                        Si decides cerrar con diferencia, deja una observacion para auditoria.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
                OBSERVACIONES DE AUDITORIA
              </Label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={4}
                className="w-full mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                placeholder="Anota cualquier novedad..."
              />
            </div>

            {error && (
              <p className="flex items-center gap-1 text-xs text-red-500 font-medium">
                {error}
              </p>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={conteoConfirmado}
                onChange={(e) => {
                  setConteoConfirmado(e.target.checked)
                  setError("")
                }}
                disabled={!montoCierre.trim()}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-bold leading-relaxed text-slate-600">
                Confirmo que ya conte fisicamente el efectivo en caja y quiero cerrar este corte con el monto capturado.
              </span>
            </label>

            <Button
              onClick={() => void handleCerrar()}
              disabled={loading || !montoCierre.trim() || !conteoConfirmado}
              className="w-full h-14 rounded-2xl bg-slate-700 hover:bg-blue-600 text-white font-black uppercase tracking-wider text-sm"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "EJECUTAR CIERRE MAESTRO"
              )}
            </Button>
          </div>
        </div>
      </div>

      {preview && (
        <CorteExitoModal
          open={showSuccess}
          cortes={preview}
          tallerNombre={tallerNombre}
          tallerTelefono={tallerTelefono}
          tallerPais={tallerPais}
          tallerEmail={tallerEmail}
          responsableTelefono={responsableTelefono || tallerTelefono}
          montoCierre={parseFloat(montoCierre.replace(",", ".")) || 0}
          onClose={() => router.push("/dashboard")}
        />
      )}
    </div>
  )
}

function RegistroRow({
  icon,
  label,
  value,
  variant = "default",
  signed = false,
}: {
  icon: React.ReactNode
  label: string
  value: number
  variant?: "default" | "green" | "purple" | "cyan" | "red"
  signed?: boolean
}) {
  const variantClasses = {
    default: "bg-slate-100 text-slate-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    cyan: "bg-cyan-50 text-cyan-600",
    red: "bg-red-50 text-red-500",
  }
  const valueColor =
    variant === "red"
      ? "text-red-500"
      : variant === "green"
        ? "text-emerald-600"
        : "text-slate-900"
  const prefix = signed && value > 0 ? "+$" : signed && value < 0 ? "-$" : "$"
  const display = signed ? `${prefix}${fmt(Math.abs(value))}` : `$${fmt(value)}`
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-100 px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center ${variantClasses[variant]}`}
        >
          {icon}
        </div>
        <span className="text-xs font-black uppercase tracking-wider text-slate-600">
          {label}
        </span>
      </div>
      <span className={`text-sm font-black tabular-nums ${valueColor}`}>{display}</span>
    </div>
  )
}



