"use client"

import { useParams } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import {
  RepairDeliveryTicket,
} from "@/components/printing"
import { getWarrantyPrintData } from "@/lib/actions/print-formatter-prisma"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, MessageCircle, Printer, ShieldCheck } from "lucide-react"
import { useThermalTicketPrint } from "@/lib/print/print-config"
import { cn } from "@/lib/utils"
import { normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { getCodigoTelefono } from "@/lib/constants/paises"

type GarantiaRow = {
  folio: string
  marca: string | null
  modelo: string | null
  numero_serie?: string | null
  falla: string | null
  costo_total: number
  anticipo: number
  fecha_entrega: string
  nombre_taller: string
  logo_url: string | null
  direccion: string | null
  telefono: string | null
  terminos_garantia: string
  pie_pagina: string | null
  tamano_papel: string
  pais: string | null
  /** Dias de garantia calculados desde terminos */
  dias_garantia?: number
}

const DEFAULT_WARRANTY_DAYS = 30

function truncateLegal(s: string, max = 280) {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}...`
}

function fmtMx(n: number) {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function soporteWhatsAppUrl(tallerPhone: string, tallerNombre: string, folio: string, countryCode: string | null) {
  const digits = normalizePhoneForWhatsApp(tallerPhone, countryCode)
  if (!digits) return null
  const msg = `Hola ${tallerNombre}, tengo una duda sobre mi garantia del folio ${folio}.`
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(msg)}`
}

/** Impresion: contenedor fuera de pantalla pero con ancho real para react-to-print */
function PrintOffscreen({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none fixed left-[-9999px] top-0 z-[-1] w-[80mm] max-w-[80mm] print:left-0 print:top-0 print:z-auto"
      aria-hidden
    >
      {children}
    </div>
  )
}

export default function GarantiaDigitalPage() {
  const params = useParams()
  const ticketId = (params?.id as string) || ""

  const [last4, setLast4] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<GarantiaRow | null>(null)

  const printRef = useRef<HTMLDivElement>(null)

  const fechaEntregaFmt = useMemo(() => {
    if (!data?.fecha_entrega) return "-"
    return new Date(data.fecha_entrega).toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }, [data?.fecha_entrega])

  const fechaVencimientoDate = useMemo(() => {
    if (!data) return null
    const days = (data as any).dias_garantia ?? DEFAULT_WARRANTY_DAYS
    const base = new Date(data.fecha_entrega)
    const end = new Date(base)
    end.setDate(end.getDate() + days)
    return end
  }, [data])

  const fechaVencimientoFmt = useMemo(() => {
    if (!fechaVencimientoDate) return "-"
    return fechaVencimientoDate.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }, [fechaVencimientoDate])

  const garantiaActiva = useMemo(() => {
    if (!fechaVencimientoDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = new Date(fechaVencimientoDate)
    end.setHours(0, 0, 0, 0)
    return today <= end
  }, [fechaVencimientoDate])

  const solucionRealizada = useMemo(() => {
    if (!data) return ""
    const f = data.falla?.trim()
    if (f) return `${f} - Trabajo completado y entrega verificada.`
    return "Reparacion completada segun estandares del taller. Equipo entregado en condiciones de uso."
  }, [data])

  const equipoLabel = useMemo(() => {
    if (!data) return "-"
    const s = `${data.marca ?? ""} ${data.modelo ?? ""}`.trim()
    return s || "-"
  }, [data])

  const handlePrint = useThermalTicketPrint({
    contentRef: printRef,
    documentTitle: data ? `Garantia-${data.folio}` : "Garantia",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketId || last4.trim().length !== 4) return
    setLoading(true)
    setError(null)
    try {
      const result = await getWarrantyPrintData(ticketId, last4.trim())

      if (result.error || !result.data) {
        setError(
          "No se encontro el comprobante. Verifica el enlace o los ultimos 4 digitos del telefono registrado.",
        )
        setData(null)
        return
      }

      const w = result.data
      setData({
        folio: w.folio,
        marca: w.marca,
        modelo: w.modelo,
        numero_serie: w.numeroSerie,
        falla: w.falla,
        costo_total: w.costoTotal,
        anticipo: w.anticipo,
        fecha_entrega: w.fechaEntrega,
        nombre_taller: w.nombreTaller,
        logo_url: w.logoUrl,
        direccion: w.direccion,
        telefono: w.telefono,
        terminos_garantia: w.terminosGarantia,
        pie_pagina: w.piePagina,
        tamano_papel: w.tamanoPapel,
        pais: w.pais ?? null,
      })
    } catch (err) {
      console.error(err)
      setError("No se pudo cargar la garantia. Intenta de nuevo mas tarde.")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4)
    setLast4(value)
  }

  if (!ticketId) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center px-4 pb-[env(safe-area-inset-bottom)]">
        <p className="text-slate-600 text-center">Enlace no valido.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="mx-auto w-full max-w-md px-4 pt-10 pb-12 sm:pt-14">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 shadow-sm ring-1 ring-blue-600/15">
              <ShieldCheck className="h-9 w-9 text-blue-600" aria-hidden />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">ReparaHub</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Garantia digital</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Tu comprobante de salida y garantia. Ingresa los ultimos 4 digitos del celular que registraste en
              el taller.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(15,23,42,0.06)]"
          >
            <label htmlFor="garantia-last4" className="block text-sm font-medium text-slate-700">
              Ultimos 4 digitos del telefono
            </label>
            <Input
              id="garantia-last4"
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              placeholder="* * * *"
              value={last4}
              onChange={handleInputChange}
              className="mt-3 h-14 text-center text-2xl font-semibold tracking-[0.35em] text-slate-900"
              maxLength={4}
            />
            {error ? (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="mt-6 h-12 w-full rounded-xl bg-blue-600 text-base font-semibold shadow-sm hover:bg-blue-700"
              disabled={loading || last4.length !== 4}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Ver mi comprobante"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-500">
            Tus datos estan protegidos. Solo tu puedes ver este comprobante con tu telefono.
          </p>
        </div>
      </div>
    )
  }

  const costo = Number(data.costo_total) || 0
  const anticipoTotal = Number(data.anticipo) || 0
  const saldoPendienteRaw = Math.round((costo - anticipoTotal) * 100) / 100
  const saldoPendiente = Math.abs(saldoPendienteRaw) < 0.01 ? 0 : Math.max(0, saldoPendienteRaw)
  const whatsappSoporte = data.telefono ? soporteWhatsAppUrl(data.telefono, data.nombre_taller, data.folio, getCodigoTelefono(data.pais)) : null

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 via-white to-slate-50 pb-10">
      {/* Impresion termica (fuera de vista; react-to-print) */}
      <PrintOffscreen>
        <div ref={printRef}>
          <RepairDeliveryTicket
            data={{
              folio: data.folio,
              deliveryDate: data.fecha_entrega,
              customerName: "",
              customerPhone: "",
              deviceName: equipoLabel,
              diagnosisFinal: solucionRealizada,
              totalCost: costo,
              originalDeposit: anticipoTotal,
              remainingPayment: 0,
              warrantyDays: (data as any).dias_garantia ?? DEFAULT_WARRANTY_DAYS,
              warrantyExpiration: fechaVencimientoDate?.toISOString(),
            }}
            business={{
              name: data.nombre_taller,
              phone: data.telefono ?? "",
              logoUrl: data.logo_url,
              terminosGarantia: data.terminos_garantia,
              mensajeDespedida: data.pie_pagina ?? undefined,
            }}
          />
        </div>
      </PrintOffscreen>

      <div className="mx-auto w-full max-w-md px-4 pt-6 sm:pt-10">
        {/* Header */}
        <header className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col items-center gap-4">
            {data.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL dinamica del taller (Supabase / externa)
              <img
                src={data.logo_url}
                alt=""
                className="max-h-14 w-auto max-w-[200px] object-contain object-center"
              />
            ) : (
              <p className="text-center text-lg font-bold uppercase tracking-tight text-slate-900">
                {data.nombre_taller}
              </p>
            )}
            <div
              className={cn(
                "w-full rounded-xl px-4 py-3 text-center text-sm font-bold uppercase tracking-wide shadow-sm ring-1",
                garantiaActiva
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
                  : "bg-red-50 text-red-800 ring-red-200/80",
              )}
            >
              {garantiaActiva ? "GARANTIA ACTIVA" : "GARANTIA VENCIDA"}
            </div>
          </div>
          {!data.logo_url ? null : (
            <p className="mt-4 text-center text-sm font-semibold text-slate-700">{data.nombre_taller}</p>
          )}
        </header>

        {/* Ticket digital */}
        <div className="mt-5 space-y-4">
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.05)]">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">Comprobante</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Folio</dt>
                <dd className="font-semibold tabular-nums text-slate-900">{data.folio}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Fecha de entrega</dt>
                <dd className="max-w-[60%] text-right font-medium leading-snug text-slate-900">{fechaEntregaFmt}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.05)]">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">Equipo</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Marca</dt>
                <dd className="font-medium text-slate-900">{data.marca?.trim() || "-"}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Modelo</dt>
                <dd className="max-w-[65%] text-right font-medium text-slate-900">{data.modelo?.trim() || "-"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">IMEI / Serie</dt>
                <dd className="max-w-[60%] break-all text-right font-mono text-xs text-slate-900">
                  {(data.numero_serie ?? "").trim() || "-"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.05)]">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">Solucion realizada</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{solucionRealizada}</p>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.05)]">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">Resumen financiero</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex justify-between gap-3">
                <span className="text-slate-500">Costo total</span>
                <span className="font-semibold tabular-nums text-slate-900">{fmtMx(costo)}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-slate-500">Anticipos</span>
                <span className="tabular-nums text-slate-800">− {fmtMx(anticipoTotal)}</span>
              </li>
              <li className="flex justify-between gap-3 border-t border-slate-200 pt-3">
                <span className="font-semibold text-slate-900">Saldo pendiente</span>
                <span className="font-bold tabular-nums text-emerald-700">{fmtMx(saldoPendiente)}</span>
              </li>
            </ul>
          </section>

          <section
            className={cn(
              "rounded-2xl border-2 p-5 shadow-sm",
              garantiaActiva
                ? "border-blue-200 bg-blue-50/80 ring-1 ring-blue-100"
                : "border-slate-200 bg-slate-50",
            )}
          >
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600">Vencimiento de garantia</h2>
            <p className="mt-3 text-center text-lg font-bold tabular-nums text-slate-900">{fechaVencimientoFmt}</p>
            <p className="mt-2 text-center text-xs leading-relaxed text-slate-600">
              {truncateLegal(data.terminos_garantia, 320)}
            </p>
          </section>

          {data.pie_pagina ? (
            <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-center text-xs text-slate-600">
              {data.pie_pagina}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl border-slate-200 font-semibold text-slate-800"
              onClick={() => handlePrint()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir comprobante
            </Button>
          </div>

          <div className="pt-2">
            {whatsappSoporte ? (
              <Button
                type="button"
                className="h-12 w-full rounded-xl bg-blue-600 text-base font-semibold shadow-md hover:bg-blue-700"
                asChild
              >
                <a href={whatsappSoporte} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Contactar soporte
                </a>
              </Button>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
                Para dudas, visita a <span className="font-semibold text-slate-800">{data.nombre_taller}</span>
                {data.direccion ? ` · ${data.direccion}` : ""}.
              </p>
            )}
          </div>
        </div>

        <footer className="mt-8 border-t border-slate-200/80 pt-6 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">ReparaHub</p>
          <p className="mt-1 text-xs text-slate-500">Comprobante digital · no reemplaza el ticket fisico si aplica</p>
        </footer>
      </div>
    </div>
  )
}
