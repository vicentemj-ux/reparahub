"use client"

import { useState } from "react"
import { Printer, CreditCard, DollarSign, ShoppingBag, Store, TrendingUp, Trash2, Loader2, PackageCheck } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { HistorialVentaRow } from "@/lib/actions/sales-history-prisma"
import {
  getVentaParaTicket,
  getCobroReparacionParaTicket,
  canAnularVentas,
  type VentaCreada,
} from "@/lib/actions/ventas-prisma"
import type { RepairPaymentTicketData } from "@/components/printing"
import { formatMoneyCompact } from "@/lib/utils/currency"
import { formatFolioFecha } from "@/lib/utils/date"
import { SuccessModal } from "@/components/dashboard/ventas/SuccessModal"
import { CobroSuccessModal } from "@/components/dashboard/ventas/CobroSuccessModal"
import { AnularVentaModal, type AnularKind } from "./AnularVentaModal"

interface HistorialVentaRowCardProps {
  row: HistorialVentaRow
  tallerNombre: string
  tallerTelefono: string
  logoUrl?: string | null
  mensajeDespedida?: string
  impresoraTicket?: string | null
  impresionConfig?: Record<string, unknown> | null
  tallerId?: string | null
  tallerPais?: string | null
  onVentaAnulada?: () => void
  variant?: "row" | "card"
}

function parseHistorialRowId(rowId: string): { kind: "pdv" | "rep" | "apt"; id: string } | null {
  if (rowId.startsWith("pdv-")) return { kind: "pdv", id: rowId.slice(4) }
  if (rowId.startsWith("rep-")) return { kind: "rep", id: rowId.slice(4) }
  if (rowId.startsWith("apt-")) return { kind: "apt", id: rowId.slice(4) }
  return null
}

function MetodoIcon({ codigo }: { codigo: string }) {
  switch (codigo) {
    case "tarjeta":
      return <CreditCard className="h-3 w-3 shrink-0 text-purple-500" />
    case "efectivo":
    case "otro":
      return <DollarSign className="h-3 w-3 shrink-0 text-emerald-500" />
    case "transferencia":
      return <TrendingUp className="h-3 w-3 shrink-0 text-blue-500" />
    case "mixto":
      return <ShoppingBag className="h-3 w-3 shrink-0 text-amber-7000" />
    default:
      return <CreditCard className="h-3 w-3 shrink-0 text-slate-500" />
  }
}

function CategoriaBadge({ source }: { source: string }) {
  if (source === "mostrador") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-700">
        <Store className="h-2.5 w-2.5" />
        Mostrador
      </span>
    )
  }
  if (source === "apartado") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
        <PackageCheck className="h-2.5 w-2.5" />
        Apartado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700">
      <ShoppingBag className="h-2.5 w-2.5" />
      Reparacion
    </span>
  )
}

function EstadoBadge({ row }: { row: HistorialVentaRow }) {
  const esAnulada =
    (row.source === "mostrador" && row.ventaEstado === "anulado") || row.anulada === true
  if (esAnulada) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-600">
        Anulada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600">
      Liquidado
    </span>
  )
}

export function HistorialVentaRowCard({
  row,
  tallerNombre,
  tallerTelefono,
  logoUrl,
  mensajeDespedida,
  impresoraTicket,
  impresionConfig,
  tallerId,
  tallerPais,
  onVentaAnulada,
  variant = "row",
}: HistorialVentaRowCardProps) {
  const parsed = parseHistorialRowId(row.id)
  const [ventaParaModal, setVentaParaModal] = useState<VentaCreada | null>(null)
  const [previewRep, setPreviewRep] = useState<RepairPaymentTicketData | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [anularModalOpen, setAnularModalOpen] = useState(false)

  const esAnulada =
    (row.source === "mostrador" && row.ventaEstado === "anulado") || row.anulada === true
  const esAnulable = !!parsed && !esAnulada
  const anularKind: AnularKind | null = parsed?.kind ?? null

  const handleVerTicket = async () => {
    if (esAnulada || !parsed || parsed.kind === "apt") return
    setLoadingPreview(true)
    try {
      if (parsed.kind === "pdv") {
        const res = await getVentaParaTicket(parsed.id)
        if (res.error || !res.venta) {
          toast({ title: "No se pudo cargar el ticket", description: res.error ?? "", variant: "destructive" })
          return
        }
        setVentaParaModal(res.venta)
      } else {
        const res = await getCobroReparacionParaTicket(parsed.id)
        if (res.error || !res.data) {
          toast({ title: "No se pudo cargar el ticket", description: res.error ?? "", variant: "destructive" })
          return
        }
        setPreviewRep({
          folio: res.data.folio,
          customerName: res.data.cliente,
          customerPhone: "",
          deviceName: res.data.conceptos,
          metodoPago: res.data.metodo_pago,
          monto: res.data.monto,
          totalPagado: res.data.monto,
          presupuesto: res.data.monto,
          saldoRestante: 0,
          date: res.data.fechaIso,
          tipoMov: res.data.tipoMov,
        })
      }
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleAnularClick = async () => {
    const ok = await canAnularVentas()
    if (!ok) {
      toast({ variant: "destructive", title: "Sin permiso", description: "No tienes permiso para anular ventas." })
      return
    }
    setAnularModalOpen(true)
  }

  const rowOpacity = esAnulada ? "opacity-55" : ""

  const cardContent = (
    <div className={`flex flex-col gap-2 px-5 py-3 ${rowOpacity}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={() => void handleVerTicket()}
          disabled={loadingPreview || esAnulada || parsed?.kind === "apt"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
          title={parsed?.kind === "apt" ? "Apartado registrado en caja" : "Ver ticket"}
        >
          {loadingPreview ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
        </button>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[11px] font-bold text-blue-600">#{row.folio}</span>
          <span className="text-[10px] text-slate-500">{formatFolioFecha(row.fechaIso)}</span>
        </div>
      </div>
      <div className="min-w-0">
        <CategoriaBadge source={row.source} />
      </div>
      <div className="min-w-0">
        <span className="block truncate text-[11px] font-bold uppercase tracking-wide text-slate-800" title={row.cliente}>
          {row.cliente}
        </span>
      </div>
      <div className="min-w-0">
        <span className="block truncate text-[10px] text-slate-500" title={row.vendedor}>
          {row.vendedor}
        </span>
      </div>
      <div className="min-w-0">
        <span className="block truncate text-[11px] text-slate-600" title={row.conceptos}>
          {row.conceptos}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <MetodoIcon codigo={row.metodoPagoCodigo} />
        <span className="truncate text-[10px] font-medium text-slate-500">{row.metodoPago}</span>
      </div>
      <div className="flex min-w-0 items-center justify-between">
        <span className="text-[13px] font-black text-slate-900">{formatMoneyCompact(row.total)}</span>
        <EstadoBadge row={row} />
      </div>
      <div className="flex min-w-0 items-center justify-end">
        {esAnulable && (
          <button
            type="button"
            onClick={() => void handleAnularClick()}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            title={anularKind === "rep" ? "Anular cobro de reparacion" : "Anular venta"}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )

  const rowContent = (
    <div className={`table-row border-b border-slate-100 transition-colors hover:bg-slate-50/60 ${rowOpacity}`}>
      <div className="table-cell px-5 py-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleVerTicket()}
            disabled={loadingPreview || esAnulada || parsed?.kind === "apt"}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
            title={parsed?.kind === "apt" ? "Apartado registrado en caja" : "Ver ticket"}
          >
            {loadingPreview ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
          </button>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[11px] font-bold text-blue-600">#{row.folio}</span>
            <span className="text-[10px] text-slate-500">{formatFolioFecha(row.fechaIso)}</span>
          </div>
        </div>
      </div>
      <div className="table-cell px-2 py-3">
        <CategoriaBadge source={row.source} />
      </div>
      <div className="table-cell px-2 py-3">
        <span className="block truncate text-[11px] font-bold uppercase tracking-wide text-slate-800" title={row.cliente}>
          {row.cliente}
        </span>
      </div>
      <div className="table-cell px-2 py-3">
        <span className="block truncate text-[10px] text-slate-500" title={row.vendedor}>
          {row.vendedor}
        </span>
      </div>
      <div className="table-cell px-2 py-3">
        <span className="block truncate text-[11px] text-slate-600" title={row.conceptos}>
          {row.conceptos}
        </span>
      </div>
      <div className="table-cell px-2 py-3">
        <div className="flex items-center gap-1.5">
          <MetodoIcon codigo={row.metodoPagoCodigo} />
          <span className="truncate text-[10px] font-medium text-slate-500">{row.metodoPago}</span>
        </div>
      </div>
      <div className="table-cell px-2 py-3 text-right">
        <span className="text-[13px] font-black text-slate-900">{formatMoneyCompact(row.total)}</span>
        <div className="mt-0.5 flex justify-end">
          <EstadoBadge row={row} />
        </div>
      </div>
      <div className="table-cell pl-2 py-3 text-right">
        {esAnulable && (
          <button
            type="button"
            onClick={() => void handleAnularClick()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            title={anularKind === "rep" ? "Anular cobro de reparacion" : "Anular venta"}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {variant === "card" ? cardContent : rowContent}

      {/* Modal Exito Venta (POS) - para ventas PDV */}
      {ventaParaModal && (
        <SuccessModal
          open={!!ventaParaModal}
          venta={ventaParaModal}
          tallerNombre={tallerNombre}
          tallerTelefono={tallerTelefono}
          logoUrl={logoUrl}
          mensajeDespedida={mensajeDespedida}
          impresoraTicket={impresoraTicket}
          impresionConfig={impresionConfig}
          tallerId={tallerId}
          tallerPais={tallerPais ?? null}
          onClose={() => setVentaParaModal(null)}
        />
      )}

      {/* Modal Cobro Reparacion - con Imprimir + WhatsApp */}
      {previewRep && (
        <CobroSuccessModal
          open={!!previewRep}
          cobro={previewRep}
          tallerNombre={tallerNombre}
          tallerTelefono={tallerTelefono}
          logoUrl={logoUrl}
          mensajeDespedida={mensajeDespedida}
          tallerPais={tallerPais ?? null}
          onClose={() => setPreviewRep(null)}
        />
      )}

      {/* Modal Anular Venta / Cobro */}
      {anularKind && (
        <AnularVentaModal
          open={anularModalOpen}
          targetId={parsed!.id}
          folio={row.folio}
          kind={anularKind}
          onClose={() => setAnularModalOpen(false)}
          onAnulada={() => {
            onVentaAnulada?.()
          }}
        />
      )}
    </>
  )
}


