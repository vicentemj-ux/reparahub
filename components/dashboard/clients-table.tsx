"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, Mail, Edit2, Trash2, History, Inbox } from "lucide-react"
import type { Client } from "@/lib/actions/clients-prisma"

interface ClientsTableProps {
  clients: Client[]
  onView: (client: Client) => void
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
  isLoading?: boolean
}

export function ClientsTable({
  clients,
  onView,
  onEdit,
  onDelete,
  isLoading = false,
}: ClientsTableProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3 animate-pulse"
          >
            <div className="flex justify-between">
              <div className="h-5 w-20 rounded bg-slate-200" />
              <div className="h-5 w-16 rounded bg-slate-200" />
            </div>
            <div className="h-5 w-3/4 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-200" />
            <div className="h-9 w-full rounded bg-slate-200" />
          </div>
        ))}
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Inbox className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-700">No se encontraron clientes</p>
        <p className="text-xs text-slate-500">
          Intenta con otro termino de busqueda o registra un nuevo cliente.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client, index) => {
        const ticketCount = client.ordenes_count ?? 0
        return (
          <div
            key={client.id}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {/* Folio badge */}
                <span className="rounded-full bg-[#E6F1FB] text-[#185FA5] text-[11px] font-bold px-2.5 py-0.5">
                  #{(index + 1).toString().padStart(3, "0")}
                </span>
                {/* Tickets badge */}
                <Badge
                  variant="outline"
                  className={
                    ticketCount > 0
                      ? "border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-semibold"
                      : "border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-semibold"
                  }
                >
                  {ticketCount === 1 ? "1 Ticket" : `${ticketCount} Tickets`}
                </Badge>
              </div>

              {/* Action icons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                  onClick={() => onEdit(client)}
                  title="Editar cliente"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => onDelete(client)}
                  title="Eliminar cliente"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 px-4 py-3 space-y-2">
              <p className="font-bold text-slate-900 text-base leading-tight">{client.nombre}</p>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="font-mono">{client.telefono}</span>
              </div>
              {client.correo ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{client.correo}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>Sin correo</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 pb-4">
              <Button
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold tracking-tight gap-2 rounded-2xl"
                onClick={() => onView(client)}
              >
                <History className="h-3.5 w-3.5" />
                Ver Historial
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
