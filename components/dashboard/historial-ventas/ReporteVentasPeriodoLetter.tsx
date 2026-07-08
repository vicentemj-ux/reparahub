"use client"

import type { HistorialVentaRow, HistorialVentasTotales } from "@/lib/actions/sales-history-prisma"
import { getPublicAppHostname } from "@/lib/app-public"

export interface ReporteVentasPeriodoLetterProps {
  /** YYYY-MM-DD */
  dateFrom: string
  /** YYYY-MM-DD */
  dateTo: string
  filterLabel: string
  searchQuery: string
  totales: HistorialVentasTotales
  rows: HistorialVentaRow[]
  tallerNombre: string
  tallerTelefono: string
  /** Logo del taller (p. ej. Storage `taller` / URL en configuracion) */
  tallerLogoUrl?: string | null
}

function fmtRange(dateFrom: string, dateTo: string) {
  const a = new Date(`${dateFrom}T12:00:00`)
  const b = new Date(`${dateTo}T12:00:00`)
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return `${dateFrom} - ${dateTo}`
  return `${a.toLocaleDateString("es-MX", opts)} - ${b.toLocaleDateString("es-MX", opts)}`
}

function fmtMoney(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" })
}

function fmtFechaHora(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })
}

export function ReporteVentasPeriodoLetter({
  dateFrom,
  dateTo,
  filterLabel,
  searchQuery,
  totales,
  rows,
  tallerNombre,
  tallerTelefono,
  tallerLogoUrl,
}: ReporteVentasPeriodoLetterProps) {
  const generatedAt = new Date().toLocaleString("es-MX", {
    dateStyle: "full",
    timeStyle: "short",
  })
  const appHost = getPublicAppHostname()

  const logoSrc =
    tallerLogoUrl &&
    (tallerLogoUrl.startsWith("https://") ||
      tallerLogoUrl.startsWith("http://") ||
      tallerLogoUrl.startsWith("/"))
      ? tallerLogoUrl
      : null

  return (
    <div className="reporte-ventas-carta box-border bg-white text-slate-900 print:bg-white">
      <header className="border-b border-slate-200 pb-6 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={tallerNombre}
                className="h-12 w-auto max-w-[220px] object-contain object-left"
              />
            ) : (
              <div className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {tallerNombre}
              </div>
            )}
            <div className="hidden h-14 w-px bg-slate-200 sm:block" aria-hidden />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Reporte operativo
              </p>
              <p className="text-lg font-bold text-slate-900">Ventas del periodo</p>
              {appHost ? (
                <p className="text-xs text-slate-500">{appHost}</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">{tallerNombre}</p>
          {tallerTelefono ? <p className="text-xs text-slate-600">Tel. {tallerTelefono}</p> : null}
        </div>
      </header>

      <section className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Parametros del reporte</h2>
        <dl className="mt-2 grid gap-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-36 shrink-0 text-slate-500">Periodo</dt>
            <dd className="font-medium text-slate-900">{fmtRange(dateFrom, dateTo)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-36 shrink-0 text-slate-500">Filtro tipo</dt>
            <dd className="font-medium text-slate-900">{filterLabel}</dd>
          </div>
          {searchQuery.trim() ? (
            <div className="flex gap-2">
              <dt className="w-36 shrink-0 text-slate-500">Busqueda</dt>
              <dd className="font-medium text-slate-900">{searchQuery.trim()}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Totales por metodo de pago</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded border border-slate-200 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Efectivo</p>
            <p className="text-base font-bold tabular-nums text-slate-900">{fmtMoney(totales.efectivo)}</p>
          </div>
          <div className="rounded border border-slate-200 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Tarjeta</p>
            <p className="text-base font-bold tabular-nums text-slate-900">{fmtMoney(totales.tarjeta)}</p>
          </div>
          <div className="rounded border border-slate-200 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Transferencia</p>
            <p className="text-base font-bold tabular-nums text-slate-900">{fmtMoney(totales.transferencia)}</p>
          </div>
          <div className="rounded border border-blue-100 bg-blue-50/80 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-blue-700">Total periodo</p>
            <p className="text-base font-bold tabular-nums text-blue-900">{fmtMoney(totales.total)}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Detalle de movimientos</h2>
        <table className="mt-3 w-full border-collapse border border-slate-200 text-xs">
          <thead>
            <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">
              <th className="border border-slate-200 px-2 py-2">Folio / Fecha</th>
              <th className="border border-slate-200 px-2 py-2">Tipo</th>
              <th className="border border-slate-200 px-2 py-2">Cliente</th>
              <th className="border border-slate-200 px-2 py-2">Conceptos</th>
              <th className="border border-slate-200 px-2 py-2">Pago</th>
              <th className="border border-slate-200 px-2 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-slate-200 px-3 py-8 text-center text-slate-500">
                  No hay movimientos en este periodo con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="border border-slate-200 px-2 py-1.5 font-mono text-[11px] text-slate-800">
                    {r.folio}
                    <br />
                    <span className="text-[10px] text-slate-500">{fmtFechaHora(r.fechaIso)}</span>
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 font-medium text-slate-800">{r.tipoLabel}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-slate-700">{r.cliente}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-slate-600">{r.conceptos}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-slate-700">{r.metodoPago}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                    {fmtMoney(r.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400">
        Documento generado el {generatedAt}
        {appHost ? ` · ${appHost}` : ""}
      </footer>
    </div>
  )
}
