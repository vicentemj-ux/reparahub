"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { AbonoModal } from "./abono-modal"
import { PrintMenuDropdown } from "@/components/dashboard/print-menu-dropdown"
import { type BitacoraRepair } from "@/lib/actions/repairs-prisma"
import { buildCustomerWhatsAppUrl, normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { getCodigoTelefono } from "@/lib/constants/paises"
import { getTallerSettings } from "@/lib/actions/settings-prisma"
import {
  Inbox,
  DollarSign,
  MessageSquare,
  ExternalLink,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface BitacoraTableProps {
  repairs: BitacoraRepair[]
  onRepairUpdated: (updated: BitacoraRepair) => void
  onRepairDeleted?: (repairId: string) => void
  /** Abre el formulario de ticket para modificar este folio (solo en pagina Reparaciones). */
  onEditTicket?: (repair: BitacoraRepair) => void
}

const statusConfig: Record<BitacoraRepair["status"], { className: string; label: string }> = {
  Recibido: {
    className: "bg-blue-50 text-blue-700 border-blue-200/80",
    label: "RECIBIDO",
  },
  Diagnostico: {
    className: "bg-amber-50 text-amber-700 border-amber-200/80",
    label: "DIAGNOSTICO",
  },
  "En Reparacion": {
    className: "bg-orange-50 text-orange-700 border-orange-200/80",
    label: "EN REPARACION",
  },
  "Esperando Refaccion": {
    className: "bg-cyan-50 text-cyan-700 border-cyan-200/80",
    label: "PENDIENTE",
  },
  Listo: {
    className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    label: "LISTO",
  },
  Entregado: {
    className: "bg-purple-50 text-purple-700 border-purple-200/80",
    label: "ENTREGADO",
  },
  Cancelado: {
    className: "bg-red-50 text-red-700 border-red-200/80",
    label: "CANCELADO",
  },
  "Sin Reparacion": {
    className: "bg-slate-50 text-slate-700 border-slate-200/80",
    label: "SIN REPARACION",
  },
  Reingreso: {
    className: "bg-orange-50 text-orange-700 border-orange-200/80 font-bold",
    label: "REINGRESO",
  },
}

export function BitacoraTable({ repairs, onRepairUpdated, onRepairDeleted, onEditTicket }: BitacoraTableProps) {
  const router = useRouter()
  const [abonoRepair, setAbonoRepair] = useState<BitacoraRepair | null>(null)
  const [abonoModalOpen, setAbonoModalOpen] = useState(false)
  const [tallerPais, setTallerPais] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getTallerSettings()
      .then((res) => {
        if (cancelled) return
        setTallerPais(res?.settings?.pais ?? null)
      })
      .catch(() => {
        if (!cancelled) setTallerPais(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const goToDetail = (repair: BitacoraRepair) => {
    router.push(`/dashboard/reparaciones/${repair.id}`)
  }

  const openAbono = (repair: BitacoraRepair) => {
    setAbonoRepair(repair)
    setAbonoModalOpen(true)
  }

  const closeAbono = () => {
    setAbonoModalOpen(false)
    setAbonoRepair(null)
  }

  const formatCurrency = (amount: number | null | undefined) => {
    return (amount || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }

  const formatDate = (date: string | null | undefined, rawDate?: string | null) => {
    const source = rawDate || date
    if (!source) return "-"
    const d = new Date(source)
    if (isNaN(d.getTime())) return "-"
    return d.toLocaleDateString("es-MX", { month: "short", day: "numeric" })
  }

  const getDebt = (repair: BitacoraRepair) => {
    if (isBudgetPending(repair)) return null
    const estimated = repair.estimatedPrice || 0
    return Math.max(0, estimated - repair.anticipo)
  }

  const isBudgetPending = (repair: BitacoraRepair) => {
    return repair.estimatedPrice == null || Number(repair.estimatedPrice) <= 0
  }

  const BudgetPendingBadge = () => (
    <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 shadow-sm">
      Pendiente
    </span>
  )

  const handleWhatsAppClick = (repair: BitacoraRepair, estadoLabel: string) => {
    const digits = normalizePhoneForWhatsApp(repair.clientePhone, getCodigoTelefono(tallerPais))
    if (!digits) return

    const cliente = repair.clienteName || "cliente"
    const marca = repair.deviceBrand || ""
    const modelo = repair.deviceModel || ""
    const trackingUrl = `${window.location.origin}/track/${encodeURIComponent(repair.id)}`

    const message = `Hola ${cliente}, te informamos que tu equipo ${marca} ${modelo} (Ticket #${repair.folio}) se encuentra en estado: ${estadoLabel}. Puedes consultar el avance aqui: ${trackingUrl}`

    const url = buildCustomerWhatsAppUrl(digits, message)
    window.open(url, "_blank")
  }

  if (repairs.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 shadow-sm">
            <Inbox className="h-7 w-7 text-slate-600" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold text-slate-700">Sin reparaciones</p>
            <p className="text-xs text-slate-500">
              No hay reparaciones que coincidan con los filtros.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <TooltipProvider>
        <Card className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/30 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">

            {/* ── Mobile cards ── */}
            <div className="md:hidden divide-y divide-slate-200/60">
              {repairs.map((repair) => {
                const config = statusConfig[repair.status]
                const debt = getDebt(repair)
                const budgetPending = isBudgetPending(repair)
                const createdDate = formatDate(repair.createdAt, repair.createdAtRaw)
                return (
                  <div
                    key={repair.id}
                    role="button"
                    tabIndex={0}
                    className="flex cursor-pointer flex-col gap-3 p-4 text-left hover:bg-slate-50/50 transition-colors"
                    onClick={() => goToDetail(repair)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        goToDetail(repair)
                      }
                    }}
                  >
                    {/* Header: folio + status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white text-sm font-bold shadow-sm shadow-blue-500/20">
                        {repair.folio}
                      </span>
                      <Badge
                        variant="outline"
                        className={`${config.className} font-bold text-[10px] border px-2 py-0.5 rounded-lg shadow-sm`}
                      >
                        {config.label}
                      </Badge>
                    </div>

                    {/* Cliente + equipo */}
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{repair.clienteName || "Cliente"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-slate-600">
                          {repair.deviceBrand} {repair.deviceModel}
                        </p>
                        {repair.tecnico && repair.tecnico !== "Sin asignar" && (
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200/80 font-bold rounded-lg shadow-sm">
                            {repair.tecnico}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Financiero: presupuesto + deuda + fecha */}
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Presupuesto</p>
                        {budgetPending ? (
                          <BudgetPendingBadge />
                        ) : (
                          <p className="font-bold text-emerald-600">{formatCurrency(repair.estimatedPrice)}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Deuda</p>
                        {budgetPending ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Sin calcular</span>
                        ) : debt != null && debt <= 0 ? (
                          <span className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm">
                            LIQUIDADO
                          </span>
                        ) : (
                          <p className="font-bold text-red-600">{formatCurrency(debt)}</p>
                        )}
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entrega</p>
                        {repair.status === "Entregado" ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700 shadow-sm mt-0.5">
                            <span className="text-[10px]">✓</span>
                            <div>
                              <div className="font-bold text-[11px] leading-tight">CONCLUIDO</div>
                              <div className="text-[9px] opacity-60 leading-none">FASE FINAL</div>
                            </div>
                          </div>
                        ) : (
                          <p className="font-bold text-orange-600">EN PROCESO</p>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div
                      className="flex items-center gap-2 border-t border-slate-200/60 pt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 flex-1 gap-1.5 border-emerald-200/80 text-emerald-700 hover:bg-emerald-50 rounded-lg font-semibold text-xs shadow-sm"
                        onClick={() => openAbono(repair)}
                      >
                        <DollarSign className="h-4 w-4" />
                        Abono
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 flex-1 gap-1.5 border-emerald-200/80 text-emerald-500 hover:bg-emerald-50 rounded-lg font-semibold text-xs shadow-sm"
                        onClick={() => handleWhatsAppClick(repair, config.label)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp
                      </Button>
                      <PrintMenuDropdown repair={repair} trigger="icon" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 border-blue-200/80 p-0 text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm"
                        onClick={() => goToDetail(repair)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Desktop table ── */}
            <div className="hidden md:block max-w-full overflow-x-auto custom-scrollbar pb-4">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    <TableHead className="pl-6 font-bold text-slate-900 sticky left-0 z-10 bg-slate-50 text-[11px] uppercase tracking-widest">
                      TICKET
                    </TableHead>
                    <TableHead className="font-bold text-slate-900 text-[11px] uppercase tracking-widest">CLIENTE / EQUIPO</TableHead>
                    <TableHead className="font-bold text-slate-900 text-[11px] uppercase tracking-widest">ESTADO</TableHead>
                    <TableHead className="font-bold text-slate-900 text-right text-[11px] uppercase tracking-widest">VENTA</TableHead>
                    <TableHead className="font-bold text-slate-900 text-right text-[11px] uppercase tracking-widest">DEUDA</TableHead>
                    <TableHead className="font-bold text-slate-900 text-right text-[11px] uppercase tracking-widest">ENTREGA</TableHead>
                    <TableHead className="pr-6 font-bold text-slate-900 text-right text-[11px] uppercase tracking-widest">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repairs.map((repair) => {
                    const config = statusConfig[repair.status]
                    const debt = getDebt(repair)
                    const budgetPending = isBudgetPending(repair)
                    const createdDate = formatDate(repair.createdAt, repair.createdAtRaw)

                    return (
                      <TableRow
                        key={repair.id}
                        role="link"
                        tabIndex={0}
                        className="cursor-pointer border-b border-slate-200/60 hover:bg-slate-50/50 transition-colors"
                        onClick={() => goToDetail(repair)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            goToDetail(repair)
                          }
                        }}
                      >
                        {/* Ticket Pill */}
                        <TableCell className="pl-6 sticky left-0 z-0 bg-white">
                          <div className="flex flex-col items-start gap-1">
                            <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm shadow-blue-500/20">
                              <span className="font-bold text-white text-sm">{repair.folio}</span>
                            </div>
                            <span className="text-xs text-slate-500">{createdDate}</span>
                          </div>
                        </TableCell>

                        {/* Cliente / Equipo */}
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <span className="font-bold text-slate-900">
                              {repair.clienteName || "Cliente"}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-600">
                                {repair.deviceBrand} {repair.deviceModel}
                              </span>
                              {repair.tecnico && repair.tecnico !== "Sin asignar" && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs bg-blue-500/10 text-blue-700 border-blue-200 font-semibold"
                                >
                                  {repair.tecnico}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Estado Badge */}
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`${config.className} font-bold text-[10px] border px-2 py-0.5 rounded-lg shadow-sm`}
                          >
                            {config.label}
                          </Badge>
                        </TableCell>

                        {/* Venta (Presupuesto) */}
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            {budgetPending ? (
                              <BudgetPendingBadge />
                            ) : (
                              <>
                                <span className="font-bold text-green-600 text-sm">
                                  {formatCurrency(repair.estimatedPrice)}
                                </span>
                                <span className="text-xs text-slate-500">PRESUPUESTO</span>
                              </>
                            )}
                          </div>
                        </TableCell>

                        {/* Deuda */}
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            {budgetPending ? (
                              <>
                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Sin calcular</span>
                                <span className="text-xs text-slate-500">PENDIENTE</span>
                              </>
                            ) : debt != null && debt <= 0 ? (
                              <span className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm">
                                LIQUIDADO
                              </span>
                            ) : (
                              <>
                                <span className="font-bold text-sm text-red-600">
                                  {formatCurrency(debt)}
                                </span>
                                <span className="text-xs text-slate-500">PENDIENTE</span>
                              </>
                            )}
                          </div>
                        </TableCell>

                        {/* Entrega */}
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            {repair.status === "Entregado" ? (
                              <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1 text-blue-700 shadow-sm">
                                <span className="text-[11px]">✓</span>
                                <div>
                                  <div className="font-bold text-[12px] leading-tight">CONCLUIDO</div>
                                  <div className="text-[9px] opacity-60 leading-none">FASE FINAL</div>
                                </div>
                              </div>
                            ) : (
                              <span className="font-bold text-sm text-orange-600">EN PROCESO</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {/* Registrar Abono */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-600 hover:text-green-600 hover:bg-green-50 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openAbono(repair)
                                  }}
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Registrar abono</TooltipContent>
                            </Tooltip>

                            {/* WhatsApp */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-600 hover:text-green-500 hover:bg-green-50 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleWhatsAppClick(repair, config.label)
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>WhatsApp</TooltipContent>
                            </Tooltip>

                            {/* Imprimir - menu unificado (Ticket / Carta / Garantia / Etiqueta) */}
                            <div onClick={(e) => e.stopPropagation()} className="inline-flex">
                              <PrintMenuDropdown repair={repair} trigger="icon" />
                            </div>

                            {/* Detalles */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    goToDetail(repair)
                                  }}
                                  className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalles</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>

      <AbonoModal
        isOpen={abonoModalOpen}
        repairId={abonoRepair?.id ?? null}
        repairFolio={abonoRepair?.folio ?? ""}
        estimatedPrice={abonoRepair?.estimatedPrice}
        onClose={closeAbono}
        onSuccess={(nuevoAnticipo) => {
          if (abonoRepair) onRepairUpdated({ ...abonoRepair, anticipo: nuevoAnticipo })
          closeAbono()
        }}
      />
    </>
  )
}
