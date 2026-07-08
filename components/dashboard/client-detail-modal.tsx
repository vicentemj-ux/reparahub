"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, Mail, Plus, ExternalLink, Inbox, Copy, Receipt, ShoppingCart, Video, PackageCheck } from "lucide-react"
import { WhatsAppButton } from "./whatsapp-button"
import type { ClientDetail } from "@/lib/actions/clients-prisma"
import { useActiveCustomer } from "@/lib/context/active-customer-context"
import { useToast } from "@/hooks/use-toast"

interface ClientDetailModalProps {
  client: ClientDetail | null
  isOpen: boolean
  onClose: () => void
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  Recibido: { label: "RECIBIDO", className: "bg-blue-50 text-blue-700 border-blue-200" },
  Diagnostico: { label: "DIAGNOSTICO", className: "bg-amber-50 text-amber-700 border-amber-200" },
  "En Reparacion": { label: "EN REPARACION", className: "bg-orange-50 text-orange-700 border-orange-200" },
  Listo: { label: "LISTO", className: "bg-green-50 text-green-700 border-green-200" },
  Entregado: { label: "ENTREGADO", className: "bg-purple-50 text-purple-700 border-purple-200" },
  Cancelado: { label: "CANCELADO", className: "bg-red-50 text-red-700 border-red-200" },
  "Sin Reparacion": { label: "SIN REPARACION", className: "bg-slate-50 text-slate-700 border-slate-200" },
  Reingreso: { label: "REINGRESO", className: "bg-orange-50 text-orange-700 border-orange-200" },
}

function getStatusConfig(estatus: string) {
  return STATUS_CONFIG[estatus] ?? { label: estatus, className: "bg-slate-50 text-slate-600 border-slate-200" }
}

export function ClientDetailModal({ client, isOpen, onClose }: ClientDetailModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { activeCustomer, setActiveCustomer } = useActiveCustomer()
  const [rfcCopied, setRfcCopied] = useState(false)

  if (!client) return null

  const copyRfc = () => {
    if (!client.rfc) return
    void navigator.clipboard.writeText(client.rfc).then(() => {
      setRfcCopied(true)
      setTimeout(() => setRfcCopied(false), 2000)
    })
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })

  const formatCurrency = (amount: number | null) =>
    amount != null
      ? amount.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 })
      : "-"

  const isActiveClient =
    activeCustomer.mode === "selected" && activeCustomer.telefono === client.telefono.replace(/\D/g, "")

  const activateClient = () => {
    setActiveCustomer({
      id: client.id,
      nombre: client.nombre,
      telefono: client.telefono,
      correo: client.correo ?? "",
    })
    toast.success("Cliente activo actualizado")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl border-slate-200 bg-white p-0 gap-0 shadow-sm">
        <DialogHeader className="shrink-0 border-b border-slate-100 px-6 py-5">
          <DialogDescription className="sr-only">Informacion detallada del cliente</DialogDescription>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-xl font-bold text-slate-900">{client.nombre}</DialogTitle>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono">{client.telefono}</span>
                  <WhatsAppButton phone={client.telefono} customerName={client.nombre} size="sm" />
                </div>
                {client.correo && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{client.correo}</span>
                  </div>
                )}
                {client.rfc && (
                  <button
                    type="button"
                    onClick={copyRfc}
                    title="Copiar RFC"
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Receipt className="h-3 w-3" />
                    {client.rfc}
                    <Copy className="h-3 w-3" />
                    {rfcCopied && <span className="font-sans not-italic text-green-600">Copiado</span>}
                  </button>
                )}
                <Badge variant="outline" className={client.ordenes.length > 0 ? "border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold" : "border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold"}>
                  {client.ordenes.length} {client.ordenes.length === 1 ? "orden" : "ordenes"}
                </Badge>
                <Badge variant="outline" className={client.ventas.length > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold" : "border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold"}>
                  {client.ventas.length} {client.ventas.length === 1 ? "compra" : "compras"}
                </Badge>
                <Badge variant="outline" className={client.apartados.length > 0 ? "border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold" : "border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold"}>
                  {client.apartados.length} {client.apartados.length === 1 ? "apartado" : "apartados"}
                </Badge>
                <Badge variant="outline" className={client.visitas.length > 0 ? "border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold" : "border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold"}>
                  {client.visitas.length} {client.visitas.length === 1 ? "visita" : "visitas"}
                </Badge>
                {isActiveClient && (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    Cliente activo
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          {client.ordenes.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Inbox className="h-7 w-7 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">Sin ordenes de reparacion</p>
                <p className="mt-1 text-sm text-slate-500">Este cliente aun no tiene ordenes registradas.</p>
              </div>
              <Button
                className="mt-2 h-10 gap-2 rounded-2xl bg-blue-600 tracking-tight text-white hover:bg-blue-700"
                onClick={() => {
                  activateClient()
                  onClose()
                  router.push("/dashboard/reparaciones/nueva")
                }}
              >
                <Plus className="h-4 w-4" />
                Nueva Reparacion
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Historial de Ordenes</p>
              {client.ordenes.map((order) => {
                const sc = getStatusConfig(order.estatus)
                return (
                  <div
                    key={order.id}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-[80px] shrink-0 flex flex-col gap-1">
                      <span className="font-mono text-sm font-bold text-slate-900">{order.folio}</span>
                      <span className="text-[10px] text-slate-400">{formatDate(order.created_at)}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {order.marca} {order.modelo}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {order.falla?.slice(0, 48)}{order.falla && order.falla.length > 48 ? "..." : ""}
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold ${sc.className}`}>
                        {sc.label}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-700">{formatCurrency(order.precio_estimado)}</span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      title="Ver detalle"
                      onClick={() => {
                        activateClient()
                        onClose()
                        router.push(`/dashboard/reparaciones/${order.id}`)
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-600" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Compras POS</p>
            </div>
            {client.ventas.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-400">
                Sin compras registradas.
              </p>
            ) : (
              client.ventas.map((venta) => (
                <div key={venta.id} className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{venta.folio}</p>
                    <p className="text-xs text-slate-500">{formatDate(venta.created_at)} - {venta.metodo_pago}</p>
                  </div>
                  <p className="text-sm font-black text-emerald-700">{formatCurrency(venta.total)}</p>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Apartados</p>
            </div>
            {client.apartados.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-400">
                Sin apartados registrados.
              </p>
            ) : (
              client.apartados.map((apartado) => (
                <div key={apartado.id} className="flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{apartado.folio} - {apartado.producto_nombre}</p>
                    <p className="text-xs text-slate-500">{formatDate(apartado.created_at)} - Saldo {formatCurrency(apartado.saldo)}</p>
                  </div>
                  <Badge variant="outline" className="border-blue-200 bg-white text-[10px] font-bold uppercase text-blue-700">
                    {apartado.estado}
                  </Badge>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Bitacora de Visitas</p>
            </div>
            {client.visitas.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-400">
                Sin visitas vinculadas.
              </p>
            ) : (
              client.visitas.map((visita) => (
                <div key={visita.id} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{visita.motivo_visita || "Visita"}</p>
                    <p className="text-xs text-slate-500">{formatDate(visita.created_at)}</p>
                  </div>
                  <Badge variant="outline" className="border-amber-200 bg-white text-[10px] font-bold uppercase text-amber-700">
                    {visita.estado_atencion}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant={isActiveClient ? "secondary" : "outline"}
            onClick={activateClient}
            className={isActiveClient ? "rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "rounded-2xl border-blue-200 text-blue-700 hover:bg-blue-50"}
          >
            {isActiveClient ? "Cliente activo del turno" : "Usar como cliente activo"}
          </Button>
          <Button variant="outline" onClick={onClose} className="rounded-2xl border-slate-200">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
