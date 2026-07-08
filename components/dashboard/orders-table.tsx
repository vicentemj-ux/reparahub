"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Eye,
  ArrowRight,
  Smartphone,
  Laptop,
  Gamepad2,
  Tablet,
  Wrench,
  Clock,
  CheckCircle2,
  Package,
  Inbox,
  Circle,
  AlertCircle,
  Printer,
  Watch,
  Monitor,
  Projector,
} from "lucide-react"
import type { RepairOrder } from "@/lib/actions/repairs-prisma"

// ─── Re-export Order as alias for RepairOrder ──────────────────────────────
export type Order = RepairOrder

// ─── Status config ─────────────────────────────────────────────────────────

const statusConfig: Record<string, { className: string; icon: React.ReactNode }> = {
  RECIBIDO: {
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Clock className="h-3 w-3" />,
  },
  "DIAGNOSTICO": {
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  "EN REPARACION": {
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <Wrench className="h-3 w-3" />,
  },
  "ESPERANDO REFACCION": {
    className: "bg-cyan-50 text-cyan-700 border-cyan-200",
    icon: <Clock className="h-3 w-3" />,
  },
  PENDIENTE: {
    className: "bg-cyan-50 text-cyan-700 border-cyan-200",
    icon: <Clock className="h-3 w-3" />,
  },
  LISTO: {
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  ENTREGADO: {
    className: "bg-gray-100 text-gray-700 border-gray-200",
    icon: <Package className="h-3 w-3" />,
  },
  CANCELADO: {
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: <Circle className="h-3 w-3" />,
  },
  "Sin Reparacion": {
    className: "bg-gray-100 text-gray-700 border-gray-200",
    icon: <Circle className="h-3 w-3" />,
  },
}

const defaultStatusConfig: { className: string; icon: React.ReactNode } = {
  className: "bg-gray-100 text-gray-800 border-gray-200",
  icon: <Circle className="h-3 w-3" />,
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 7) return digits
  return `${digits.slice(0, 3)}***${digits.slice(-4)}`
}

function getDeviceIcon(tipo_equipo: string) {
  const t = tipo_equipo.toLowerCase()
  if (t.includes("laptop") || t.includes("notebook") || t.includes("mac"))
    return <Laptop className="h-4 w-4 text-slate-400 shrink-0" />
  if (t.includes("videojuego") || t.includes("consola") || t.includes("playstation") || t.includes("xbox") || t.includes("nintendo") || t.includes("switch"))
    return <Gamepad2 className="h-4 w-4 text-slate-400 shrink-0" />
  if (t.includes("tablet") || t.includes("ipad"))
    return <Tablet className="h-4 w-4 text-slate-400 shrink-0" />
  if (t.includes("celular") || t.includes("smartphone") || t.includes("iphone") || t.includes("android") || t.includes("movil") || t.includes("movil"))
    return <Smartphone className="h-4 w-4 text-slate-400 shrink-0" />
  if (t.includes("impresora") || t.includes("printer"))
    return <Printer className="h-4 w-4 text-slate-400 shrink-0" />
  if (t.includes("reloj") || t.includes("watch") || t.includes("smartwatch"))
    return <Watch className="h-4 w-4 text-slate-400 shrink-0" />
  if (t.includes("computadora") || t.includes("desktop") || t.includes("pc") || t.includes("all-in-one"))
    return <Monitor className="h-4 w-4 text-slate-400 shrink-0" />
  if (t.includes("proyector") || t.includes("projector"))
    return <Projector className="h-4 w-4 text-slate-400 shrink-0" />
  return <Wrench className="h-4 w-4 text-slate-400 shrink-0" />
}

function getStatusDisplayLabel(status: string) {
  return status === "Esperando Refaccion" ? "PENDIENTE" : status || "DESCONOCIDO"
}

// ─── Component ─────────────────────────────────────────────────────────────

interface OrdersTableProps {
  orders: Order[]
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const router = useRouter()

  const emptyState = (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Inbox className="h-6 w-6 text-slate-400" />
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <p className="text-sm font-medium text-slate-700">Sin ordenes todavia</p>
        <p className="text-sm leading-relaxed text-slate-500">
          Las reparaciones que registres apareceran aqui.
        </p>
      </div>
    </div>
  )

  return (
    <>
      <Card className="gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white py-0 shadow-sm ring-1 ring-slate-900/5">
        <CardHeader className="border-b border-slate-200 px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0 text-slate-500" />
              <CardTitle className="text-sm font-bold uppercase tracking-[0.18em] text-slate-900">
                Actividad reciente
              </CardTitle>
            </div>
            <Link
              href="/dashboard/reparaciones"
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 transition-colors"
            >
              VER TODAS
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            emptyState
          ) : (
            <>
              {/* ── Desktop table ── */}
              <div className="hidden max-w-full overflow-x-auto px-4 pb-3 pt-1 md:block sm:px-5 lg:px-6 custom-scrollbar">
                <Table className="min-w-[800px]" aria-label="Actividad reciente de reparaciones">
                  <TableHeader className="bg-slate-50/90">
                    <TableRow className="border-b border-slate-200 hover:bg-transparent">
                      <TableHead className="h-10 py-2 pl-5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                        ID orden
                      </TableHead>
                      <TableHead className="h-10 py-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                        Equipo / reporte
                      </TableHead>
                      <TableHead className="h-10 py-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                        Cliente
                      </TableHead>
                      <TableHead className="h-10 py-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                        Fase
                      </TableHead>
                      <TableHead className="h-10 py-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                        Importe
                      </TableHead>
                      <TableHead className="h-10 py-2 pr-5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                        Ver
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order, index) => {
                      const currentConfig = statusConfig?.[order.status as string] ?? defaultStatusConfig
                      return (
                        <TableRow
                          key={order.id || `${order.folio}-${index}`}
                          className="border-b border-slate-100 transition-colors hover:bg-slate-50/80"
                        >
                          <TableCell className="py-3 pl-5 align-middle">
                            <span className="font-bold text-primary">{order.folio}</span>
                            <p className="mt-0.5 text-xs uppercase tracking-wider text-slate-400">
                              Folio digital
                            </p>
                          </TableCell>
                          <TableCell className="py-3 align-middle">
                            <div className="flex items-center gap-3">
                              {getDeviceIcon(order.tipo_equipo)}
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate text-sm font-medium text-foreground">
                                  {order.device}
                                </span>
                                <span className="truncate text-xs text-slate-500">{order.problem}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 align-middle">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium text-foreground">{order.customer}</span>
                              <span className="flex items-center gap-1 font-mono text-xs text-slate-500">
                                <Smartphone className="h-3 w-3 shrink-0" />
                                {maskPhone(order.phone)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 align-middle">
                            <Badge variant="outline" className={`${currentConfig.className} gap-1.5`}>
                              {currentConfig.icon}
                              <span className="text-xs font-semibold uppercase">{getStatusDisplayLabel(order.status)}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 align-middle font-semibold text-foreground">
                            {order.price}
                          </TableCell>
                          <TableCell className="py-3 pr-5 text-right align-middle">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 text-slate-400 transition-colors"
                              onClick={() => router.push(`/dashboard/reparaciones/${order.id}`)}
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">
                                Ver detalles de la orden {order.folio}
                              </span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* ── Mobile cards ── */}
              <div className="divide-y divide-slate-100 md:hidden">
                {orders.map((order, index) => {
                  const currentConfig = statusConfig?.[order.status as string] ?? defaultStatusConfig
                  return (
                    <div
                      key={order.id || `${order.folio}-${index}`}
                      className="flex flex-col gap-3 px-5 py-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {getDeviceIcon(order.tipo_equipo)}
                          <div className="min-w-0">
                            <p className="font-bold text-primary text-sm">{order.folio}</p>
                            <p className="text-sm font-medium text-foreground truncate">{order.device}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`${currentConfig.className} gap-1 shrink-0`}>
                          {currentConfig.icon}
                          <span className="text-xs font-semibold uppercase">{getStatusDisplayLabel(order.status)}</span>
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2">{order.problem}</p>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{order.customer}</p>
                          <p className="text-xs text-slate-500 font-mono">{maskPhone(order.phone)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{order.price}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 hover:bg-blue-50 hover:text-blue-600 text-slate-400"
                            onClick={() => router.push(`/dashboard/reparaciones/${order.id}`)}
                          >
                            <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="sr-only">
                              Ver detalles de la orden {order.folio}
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

    </>
  )
}
