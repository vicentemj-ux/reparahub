"use client"

import { memo, useEffect, useState } from "react"
import { ShoppingBag, Banknote, CreditCard, Landmark, Plus, Minus, X, Check, AlertCircle, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ClientAutocomplete, type ClientAutocompletePayload } from "@/components/dashboard/client-autocomplete"

export type CartItem = {
  id: string
  nombre: string
  precio: number
  costo: number
  cantidad: number
  isSpecial: boolean
  productoId?: string
  referencia?: string
  esEquipo?: boolean
  imeiSerie?: string
  color?: string
  condicion?: string
  capacidad?: string
  marca?: string
  modelo?: string
  procesador?: string
  ram?: string
  almacenamiento?: string
}

type MetodoPago = "efectivo" | "tarjeta" | "transferencia" | "mixto"

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface CartPanelProps {
  cartItems: CartItem[]
  clienteKey: number
  clienteNombre?: string
  clienteTelefono?: string
  onClientFound: (payload: ClientAutocompletePayload | null) => void
  onUsePublicGeneral: () => void
  onIncrement: (id: string) => void
  onDecrement: (id: string) => void
  onRemove: (id: string) => void
  onClear: () => void
  metodoPago: MetodoPago
  onSelectMetodo: (m: MetodoPago) => void
  montoEfectivo: string
  onSetMontoEfectivo: (v: string) => void
  montoTarjeta: string
  onSetMontoTarjeta: (v: string) => void
  montoTransferencia: string
  onSetMontoTransferencia: (v: string) => void
  referenciaPago: string
  onSetReferenciaPago: (v: string) => void
  subtotal: number
  total: number
  descuentoAplicado: number
  onOpenDescuento: () => void
  onApplyExacto: () => void
  cambio: number
  mixtoTotal: number
  saleError: string
  onSetSaleError: (v: string) => void
  onFinalizar: () => void
  onEnEspera: () => void
  cajaExists: boolean
  kioskMode?: boolean
  cashPresets?: number[]
  cashPresetsCurrency?: string
  onApplyCashPreset?: (value: number) => void
  kioskCompact?: boolean
}

export const CartPanel = memo(function CartPanel({
  cartItems,
  clienteKey,
  clienteNombre = "",
  clienteTelefono = "",
  onClientFound,
  onUsePublicGeneral,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  metodoPago,
  onSelectMetodo,
  montoEfectivo,
  onSetMontoEfectivo,
  montoTarjeta,
  onSetMontoTarjeta,
  montoTransferencia,
  onSetMontoTransferencia,
  referenciaPago,
  onSetReferenciaPago,
  subtotal,
  total,
  descuentoAplicado,
  onOpenDescuento,
  onApplyExacto,
  cambio,
  mixtoTotal,
  saleError,
  onSetSaleError,
  onFinalizar,
  onEnEspera,
  cajaExists,
  kioskMode = false,
  cashPresets = [],
  cashPresetsCurrency = "MXN",
  onApplyCashPreset,
  kioskCompact = false,
}: CartPanelProps) {
  const itemCount = cartItems.reduce((s, i) => s + i.cantidad, 0)
  const pagoMode = metodoPago === "mixto" ? "mixto" : "unico"
  const [showClientCapture, setShowClientCapture] = useState(false)
  const hasClient = clienteTelefono.trim().length >= 6

  useEffect(() => {
    if (hasClient) setShowClientCapture(false)
  }, [hasClient])

  const handleSelectUnico = (m: MetodoPago) => {
    onSelectMetodo(m)
    onSetSaleError("")
  }

  const handleSelectMixto = () => {
    onSelectMetodo("mixto")
    onSetSaleError("")
  }

  return (
    <Card className={`overflow-hidden rounded-3xl border-slate-100 bg-white shadow-sm ${kioskMode ? "xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto" : ""}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 border-b border-slate-100 px-5 ${kioskMode ? "py-5" : "py-4"}`}>
        <div className={`flex items-center justify-center rounded-xl bg-blue-600 text-white ${kioskMode ? "h-10 w-10" : "h-8 w-8"}`}>
          <ShoppingBag className={kioskMode ? "h-5 w-5" : "h-4 w-4"} />
        </div>
        <div>
          <p className={`font-black uppercase tracking-widest text-slate-900 ${kioskMode ? "text-sm" : "text-xs"}`}>Tu Carrito</p>
          <p className={`font-bold uppercase tracking-wider text-slate-400 ${kioskMode ? "text-[10px]" : "text-[10px]"}`}>
            {itemCount} articulo{itemCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Cliente */}
      <div className={`border-b border-slate-100 bg-gradient-to-br from-white via-white to-slate-50/80 px-5 ${kioskCompact ? "py-3" : "py-4"}`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cliente</p>
            <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-500">
              {hasClient
                ? "Venta vinculada a historial y ticket digital."
                : kioskMode
                  ? "Captura telefono para ticket digital o usa publico general."
                  : "Venta rapida sin datos obligatorios."}
            </p>
          </div>
          {hasClient && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-600">
              Activo
            </span>
          )}
        </div>

        {hasClient ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">
                  {clienteNombre.trim() || "Cliente sin nombre"}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-700">{clienteTelefono}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onUsePublicGeneral()
                  setShowClientCapture(false)
                }}
                className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 hover:bg-emerald-100"
              >
                Liberar
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowClientCapture((value) => !value)}
              className="mt-3 w-full rounded-xl border border-dashed border-emerald-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:bg-emerald-50"
            >
              {showClientCapture ? "Ocultar captura" : "Cambiar cliente"}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <ClientAutocomplete
              key={clienteKey}
              compact
              minPhoneDigits={8}
              emitProvisional={false}
              onClientFound={(payload) => {
                onClientFound(payload)
                if (payload?.id) setShowClientCapture(false)
              }}
            />
            <button
              type="button"
              onClick={() => onUsePublicGeneral()}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100"
            >
              Publico general
            </button>
          </div>
        )}

        {showClientCapture && hasClient && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <ClientAutocomplete
              key={clienteKey}
              compact
              minPhoneDigits={8}
              emitProvisional={false}
              onClientFound={(payload) => {
                onClientFound(payload)
                if (payload?.id) setShowClientCapture(false)
              }}
            />
          </div>
        )}
        </div>

      {/* Cart items or empty state */}
      <div className={`${kioskMode ? "px-4 py-4" : "px-5 py-6"} min-h-[180px]`}>
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="h-12 w-12 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-300">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Carrito vacio</p>
          </div>
        ) : (
          <div className={`${kioskMode ? "grid gap-3" : "space-y-3"}`}>
            {cartItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border border-slate-100 bg-white ${kioskMode ? "p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]" : "px-4 py-3"}`}
              >
                {/* Fila 1: nombre + cantidad */}
                <div className={`flex items-start justify-between gap-3 ${kioskMode ? "mb-2" : ""}`}>
                  <p className={`font-black uppercase tracking-wide text-slate-800 truncate pr-2 ${kioskMode ? "text-sm" : "text-xs"}`}>
                    {item.nombre}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onDecrement(item.id)}
                      className={`flex items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 ${kioskMode ? "h-10 w-10" : "h-9 w-9"}`}
                    >
                      <Minus className={kioskMode ? "h-3.5 w-3.5" : "h-3 w-3"} />
                    </button>
                    <span className={`w-6 text-center font-bold text-slate-800 ${kioskMode ? "text-base" : "text-sm"}`}>{item.cantidad}</span>
                    <button
                      type="button"
                      onClick={() => onIncrement(item.id)}
                      className={`flex items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 ${kioskMode ? "h-10 w-10" : "h-9 w-9"}`}
                    >
                      <Plus className={kioskMode ? "h-3.5 w-3.5" : "h-3 w-3"} />
                    </button>
                  </div>
                </div>

                {/* Fila 2: precio + inversion + eliminar */}
                <div className={`flex items-center justify-between ${kioskMode ? "mt-3" : "mt-2"}`}>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Precio</p>
                      <p className={`${kioskMode ? "text-base" : "text-sm"} font-black italic text-blue-600`}>${fmt(item.precio)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-rose-300">Inversion</p>
                      <p className={`${kioskMode ? "text-base" : "text-sm"} font-black italic text-rose-300`}>${fmt(item.costo)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className={`flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors ${kioskMode ? "h-9 w-9" : "h-8 w-8"}`}
                  >
                    <X className={kioskMode ? "h-4 w-4" : "h-4 w-4"} />
                  </button>
                </div>
              </div>
            ))}

            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="w-full text-center text-xs text-slate-400 hover:text-red-500 py-1 transition-colors"
              >
                Vaciar carrito
              </button>
            )}
          </div>
        )}
      </div>

      {/* Payment section */}
      <div className={`border-t border-slate-100 bg-slate-50/50 space-y-4 ${kioskMode ? "px-5 py-6" : "px-5 py-5"}`}>
        {/* Subtotal + descuento + total */}
        {descuentoAplicado > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Subtotal</p>
              <p className="text-lg font-black italic text-slate-400 line-through">${fmt(subtotal)}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3 w-3 text-blue-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Descuento</p>
              </div>
              <p className="text-lg font-black italic text-blue-500">- ${fmt(descuentoAplicado)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total a cobrar</p>
              <p className={`${kioskMode ? "text-4xl" : "text-3xl"} font-black italic text-slate-900`}>${fmt(total)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total a cobrar</p>
            <p className={`${kioskMode ? "text-4xl" : "text-3xl"} font-black italic text-slate-900`}>${fmt(total)}</p>
          </div>
        )}

        {/* Aplicar descuento button */}
        {cartItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenDescuento}
              className={`flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-blue-600 hover:bg-blue-100 transition-colors ${kioskMode ? "w-full justify-center" : ""}`}
            >
              <Tag className="h-3 w-3" />
              Aplicar Descuento
            </button>
            <button
              type="button"
              onClick={onApplyExacto}
              disabled={cartItems.length === 0}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-colors ${
                cartItems.length === 0
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <Check className="h-3 w-3" />
              Exacto
            </button>
          </div>
        )}

        {/* Efectivo recibido + cambio */}
        {(metodoPago === "efectivo" || metodoPago === "mixto") && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Efectivo recibido</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={montoEfectivo}
                  onChange={(e) => {
                    onSetMontoEfectivo(e.target.value)
                    onSetSaleError("")
                  }}
                  className="h-11 rounded-xl border-slate-200 bg-white pl-7 text-sm font-bold text-slate-800"
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Cambio</p>
              <p className="text-2xl font-black italic text-slate-400">${fmt(cambio)}</p>
            </div>
          </div>
        )}
        {kioskMode && metodoPago === "efectivo" && cashPresets.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Cobro rapido ({cashPresetsCurrency})</p>
            <div className={`grid gap-2 ${kioskCompact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3"}`}>
              {cashPresets.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onApplyCashPreset?.(v)}
                  className={`rounded-xl border border-blue-200 bg-blue-50 font-black text-blue-700 hover:bg-blue-100 ${kioskMode ? "h-12 text-sm" : "h-11 text-[11px]"}`}
                >
                  ${fmt(v)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mixto inputs */}
        {metodoPago === "mixto" && (
          <div className="space-y-2">
            {(
              [
                { label: "Efectivo", value: montoEfectivo, set: onSetMontoEfectivo, icon: Banknote },
                { label: "Tarjeta", value: montoTarjeta, set: onSetMontoTarjeta, icon: CreditCard },
                { label: "Transferencia", value: montoTransferencia, set: onSetMontoTransferencia, icon: Landmark },
              ] as const
            ).map(({ label, value, set, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={value}
                    onChange={(e) => {
                      set(e.target.value)
                      onSetSaleError("")
                    }}
                    className="h-11 rounded-xl border-slate-200 bg-white pl-6 text-sm"
                  />
                </div>
                <span className="text-[10px] font-bold uppercase text-slate-400 w-14 shrink-0">{label}</span>
              </div>
            ))}
            {mixtoTotal > 0 && (
              <p className={`text-xs font-semibold ${Math.abs(mixtoTotal - total) < 0.01 ? "text-emerald-600" : "text-red-500"}`}>
                {Math.abs(mixtoTotal - total) < 0.01
                  ? <><Check className="h-3 w-3 inline mr-0.5" />Correcto</>
                  : `Diferencia: $${fmt(Math.abs(mixtoTotal - total))}`}
              </p>
            )}
          </div>
        )}

        {/* Pago unico / Pago mixto tabs */}
        {!kioskMode && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSelectUnico("efectivo")}
            className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
              pagoMode === "unico"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            PAGO UNICO
          </button>
          <button
            type="button"
            onClick={handleSelectMixto}
            className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
              pagoMode === "mixto"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            PAGO MIXTO
          </button>
        </div>
        )}

        {/* Method buttons (only for pago unico) */}
        {pagoMode === "unico" && !kioskMode && (
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { m: "efectivo" as const, label: "EFECTIVO", icon: Banknote },
                { m: "tarjeta" as const, label: "TARJETA", icon: CreditCard },
                { m: "transferencia" as const, label: "TRANSF.", icon: Landmark },
              ]
            ).map(({ m, label, icon: Icon }) => (
              <button
                key={m}
                type="button"
                onClick={() => handleSelectUnico(m)}
                className={`flex flex-col items-center justify-center gap-1 h-16 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                  metodoPago === m
                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Referencia de pago (tarjeta / transferencia) */}
        {(metodoPago === "tarjeta" || metodoPago === "transferencia") && (
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              {metodoPago === "tarjeta" ? "No. de transaccion / voucher" : "No. de cuenta / referencia"}
            </p>
            <Input
              type="text"
              placeholder={metodoPago === "tarjeta" ? "Ej: 1234567890" : "Ej: Cuenta Banamex 12345678"}
              value={referenciaPago}
              onChange={(e) => {
                onSetReferenciaPago(e.target.value)
                onSetSaleError("")
              }}
              className="h-11 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-800"
            />
          </div>
        )}

        {/* Referencia de pago mixto (si tiene tarjeta o transferencia) */}
        {metodoPago === "mixto" && (parseFloat(montoTarjeta) > 0 || parseFloat(montoTransferencia) > 0) && (
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              No. de transaccion / referencia
            </p>
            <Input
              type="text"
              placeholder="Ej: 1234567890, Cuenta: 12345678"
              value={referenciaPago}
              onChange={(e) => {
                onSetReferenciaPago(e.target.value)
                onSetSaleError("")
              }}
              className="h-11 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-800"
            />
          </div>
        )}

        {/* Error */}
        {saleError && (
          <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {saleError}
          </p>
        )}

        {/* Finalizar + En espera */}
        <div className={`grid gap-2 ${kioskMode ? "grid-cols-1" : "grid-cols-2"}`}>
          <Button
            onClick={onFinalizar}
            disabled={cartItems.length === 0 || !cajaExists}
            className={`rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider disabled:opacity-40 btn-glow ${kioskMode ? "h-12" : "h-11"}`}
          >
            Finalizar Venta
          </Button>
          {!kioskMode && (
          <Button
            variant="outline"
            onClick={onEnEspera}
            disabled={cartItems.length === 0}
            className="h-11 rounded-xl border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100 font-black text-xs uppercase tracking-wider disabled:opacity-40"
          >
            En espera
          </Button>
          )}
        </div>
      </div>
    </Card>
  )
})
