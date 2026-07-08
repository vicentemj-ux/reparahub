"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PrintMenuDropdown } from "@/components/dashboard/print-menu-dropdown"
import {
  getRepairDetailPageData,
  deleteRepair,
  getRepairSummaryRecipients,
  getRepairTeamMemberWhatsAppUrl,
  applyRepairStatusChange,
  getAllActiveTechnicians,
  updateRepairChecklistPro,
  updateRepairQuickNotes,
  updateRepairTechnician,
  updateRepairDeliveryDate,
  updateRepairClientSecondaryPhone,
  getCancelacionSummary,
  cancelarReparacion,
  type BitacoraRepair,
  type RepairDetail,
  type RepairSummaryRecipient,
  type HistorialReparacionAuditRow,
  type RepairChangeHistoryRow,
} from "@/lib/actions/repairs-prisma"
import { getTallerSettings } from "@/lib/actions/settings-prisma"
import { StatusChangeConfirmDialog } from "@/components/dashboard/status-change-confirm-dialog"
import { buildRepairStatusWhatsAppUrl } from "@/lib/whatsapp-repair-status"
import { buildCustomerWhatsAppUrl, normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { buildRepairWelcomeWhatsAppMessage } from "@/lib/whatsapp-repair-welcome"
import { getCodigoTelefono } from "@/lib/constants/paises"
import { getRepairStatusDisplayLabel } from "@/lib/repair-status"
import { UnlockPatternGrid } from "@/components/dashboard/unlock-pattern-grid"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import {
  Loader2,
  MessageCircle,
  Trash2,
  RotateCcw,
  Calendar,
  Clock,
  User,
  Smartphone,
  Laptop,
  Gamepad2,
  Tablet,
  Printer,
  Watch,
  Monitor,
  Projector,
  Wrench,
  AlertTriangle,
  Camera,
  Eye,
  FileText,
  PackageCheck,
  XCircle,
  Pencil,
  Plus,
  ArrowLeft,
  Phone,
} from "lucide-react"
import { AbonoModal } from "./abono-modal"
import { MonitorUtilidadOperativa } from "./monitor-utilidad-operativa"
import { PresupuestoEditModal } from "./presupuesto-edit-modal"
import { ModalEntregaReparacion } from "./modal-entrega-reparacion"
import { ModalExitoEntrega } from "./modal-exito-entrega"
import { ModalCancelarReparacion } from "./modal-cancelar-reparacion"
import { ReparacionNoExitosaModal } from "./reparacion-no-exitosa-modal"
import type { ReparacionGasto } from "@/lib/actions/gastos-prisma"
import { HealthCheckSheet } from "@/components/dashboard/health-check-sheet"
import { DiagnosisProSummaryCard } from "@/components/dashboard/diagnosis-pro-summary-card"
import { RepairPhotoGallery } from "@/components/dashboard/repair-photo-gallery"
import type { ChecklistProData } from "@/lib/reparaciones/checklist-pro"
import { safeNormalizeChecklistPro } from "@/lib/reparaciones/checklist-pro"

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)),
  ])
}

function getDeviceIcon(tipo: string | null | undefined) {
  const t = (tipo || "").toLowerCase()
  if (t.includes("laptop") || t.includes("notebook") || t.includes("mac")) return Laptop
  if (t.includes("videojuego") || t.includes("consola") || t.includes("playstation") || t.includes("xbox") || t.includes("nintendo")) return Gamepad2
  if (t.includes("tablet") || t.includes("ipad")) return Tablet
  if (t.includes("celular") || t.includes("smartphone") || t.includes("iphone") || t.includes("android") || t.includes("movil") || t.includes("movil")) return Smartphone
  if (t.includes("impresora") || t.includes("printer")) return Printer
  if (t.includes("reloj") || t.includes("watch") || t.includes("smartwatch")) return Watch
  if (t.includes("computadora") || t.includes("desktop") || t.includes("pc") || t.includes("all-in-one")) return Monitor
  if (t.includes("proyector") || t.includes("projector")) return Projector
  return Wrench
}

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDateOnlyText(value?: string | null) {
  const raw = value?.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw ?? "")
  if (!match) return "Hoy"
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  })
}

export interface RepairDetailViewProps {
  repair: BitacoraRepair | null
  onBack: () => void
  onRepairUpdated: (updated: BitacoraRepair) => void
  onDelete?: (repairId: string) => void
  onEditTicket?: (repair: BitacoraRepair) => void
  onReactivarReingreso?: () => void
}

const PROCESS_OPTIONS = [
  { value: "Recibido", label: "RECIBIDO" },
  { value: "Diagnostico", label: "DIAGNÓSTICO" },
  { value: "En Reparacion", label: "EN REPARACIÓN" },
  { value: "Esperando Refaccion", label: "PENDIENTE" },
  { value: "Listo", label: "LISTO" },
]
const PROCESS_LABEL_MAP: Record<string, string> = {
  Recibido: "RECIBIDO",
  Diagnostico: "DIAGNÓSTICO",
  "En Reparacion": "EN REPARACIÓN",
  "Esperando Refaccion": "PENDIENTE",
  Listo: "LISTO",
}

type RepairSection = "resumen" | "refacciones" | "pagos" | "historial"
const SECTION_TABS: Array<{ value: RepairSection; label: string }> = [
  { value: "resumen", label: "Resumen" },
  { value: "refacciones", label: "Refacciones" },
  { value: "pagos", label: "Pagos" },
  { value: "historial", label: "Historial" },
]

export function RepairDetailView({
  repair,
  onBack,
  onRepairUpdated,
  onDelete,
  onEditTicket,
  onReactivarReingreso,
}: RepairDetailViewProps) {
  const [detail, setDetail] = useState<RepairDetail | null>(null)
  const [presupuesto, setPresupuesto] = useState("")
  const [estado, setEstado] = useState<string>("")
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSendingResponsibleSummary, setIsSendingResponsibleSummary] = useState(false)
  const [summaryRecipients, setSummaryRecipients] = useState<RepairSummaryRecipient[]>([])
  const [loadingSummaryRecipients, setLoadingSummaryRecipients] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [abonoModalOpen, setAbonoModalOpen] = useState(false)
  const [presupuestoModalOpen, setPresupuestoModalOpen] = useState(false)
  const [deliveryDateDialogOpen, setDeliveryDateDialogOpen] = useState(false)
  const [deliveryDateDraft, setDeliveryDateDraft] = useState("")
  const [savingDeliveryDate, setSavingDeliveryDate] = useState(false)
  const [history, setHistory] = useState<RepairChangeHistoryRow[]>([])
  const [historialAudit, setHistorialAudit] = useState<HistorialReparacionAuditRow[]>([])

  const [entregaModalOpen, setEntregaModalOpen] = useState(false)
  const anticipoAntesEntregaRef = useRef(0)
  const [exitoEntregaOpen, setExitoEntregaOpen] = useState(false)
  const [exitoEntregaSnapshot, setExitoEntregaSnapshot] = useState<{
    pagoFinal: number
    anticiposPrevios: number
    metodoPago: string
    detail: RepairDetail | null
  } | null>(null)

  /** Confirmacion de cambio de estado (no guardar directo) */
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [pendingEstado, setPendingEstado] = useState<string | null>(null)
  const [statusNota, setStatusNota] = useState("")
  const [esperaRefaccionConcepto, setEsperaRefaccionConcepto] = useState("")
  const [esperaRefaccionEta, setEsperaRefaccionEta] = useState("")
  const [esperaRefaccionNota, setEsperaRefaccionNota] = useState("")
  const [statusPendingKind, setStatusPendingKind] = useState<"historial" | "whatsapp" | null>(null)
  const [nombreTallerSetting, setNombreTallerSetting] = useState("Mi Taller")
  const [tallerPais, setTallerPais] = useState<string | null>(null)
  const [warrantyHint, setWarrantyHint] = useState("30 dias")
  const [technicians, setTechnicians] = useState<Array<{ id: string; nombre: string }>>([])
  const [editingTechnician, setEditingTechnician] = useState(false)
  const [savingTechnician, setSavingTechnician] = useState(false)
  const [activeSection, setActiveSection] = useState<RepairSection>("resumen")

  // Gastos del ticket — solo lectura (para mostrar utilidad estimada)
  const [gastos, setGastos] = useState<ReparacionGasto[]>([])
  const [servicios, setServicios] = useState<import("@/lib/actions/servicios-prisma").ReparacionServicio[]>([])
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelSummary, setCancelSummary] = useState<{ total: number; movements: Array<{ id: string; tipo: string; monto: number; metodo_pago: string; caja_id: string | null }> } | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [healthSheetOpen, setHealthSheetOpen] = useState(false)

  // -- Inline quick-edit state --
  const [editingObservaciones, setEditingObservaciones] = useState(false)
  const [observacionesDraft, setObservacionesDraft] = useState("")
  const [editingNotas, setEditingNotas] = useState(false)
  const [notasDraft, setNotasDraft] = useState("")
  const [savingQuickNotes, setSavingQuickNotes] = useState(false)
  const [editingSecondaryPhone, setEditingSecondaryPhone] = useState(false)
  const [secondaryPhoneDraft, setSecondaryPhoneDraft] = useState("")
  const [savingSecondaryPhone, setSavingSecondaryPhone] = useState(false)

  // -- Modal reparacion no exitosa --
  const [noExitosaOpen, setNoExitosaOpen] = useState(false)
  const [noExitosaTipo, setNoExitosaTipo] = useState<"sin_reparar" | "cancelar">("sin_reparar")
  const [noExitosaPending, setNoExitosaPending] = useState(false)

  // -- Modal decision LISTO (exitosa / no exitosa) --
  const [listoDecisionOpen, setListoDecisionOpen] = useState(false)

  const [checklistProDraft, setChecklistProDraft] = useState<ChecklistProData>({
    funcional: {},
    expressOmitReason: null,
  })

  useEffect(() => {
    if (!detail) return
    setChecklistProDraft(safeNormalizeChecklistPro(detail?.checklistPro))
  }, [detail])

  useEffect(() => {
    setActiveSection("resumen")
  }, [repair?.id])

  useEffect(() => {
    let cancelled = false
    void getAllActiveTechnicians()
      .then((res) => {
        if (!cancelled) setTechnicians(res.technicians ?? [])
      })
      .catch(() => {
        if (!cancelled) setTechnicians([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const currentTechnician = detail?.tecnico?.trim() || repair?.tecnico?.trim() || "Sin asignar"

  const handleTechnicianChange = async (nextTechnician: string) => {
    if (!repair) return
    setSavingTechnician(true)
    try {
      const result = await updateRepairTechnician(repair.id, nextTechnician)
      if (!result.success) {
        toast({
          title: "No se pudo asignar tecnico",
          description: result.error ?? "Intenta de nuevo.",
          variant: "destructive",
        })
        return
      }
      const tecnico = result.tecnico ?? nextTechnician
      setDetail((prev) => (prev ? { ...prev, tecnico } : prev))
      onRepairUpdated({ ...repair, tecnico })
      setEditingTechnician(false)
      toast.success("Tecnico actualizado")
    } finally {
      setSavingTechnician(false)
    }
  }

  const openHealthDetails = useCallback(() => {
    setChecklistProDraft(safeNormalizeChecklistPro(detail?.checklistPro))
    setHealthSheetOpen(true)
  }, [detail?.checklistPro])

  const handleCancelClick = async () => {
    if (!repair) return
    const summary = await getCancelacionSummary(repair.id)
    if (summary.error) {
      toast({ title: "Error", description: summary.error, variant: "destructive" })
      return
    }
    setCancelSummary(summary)
    setCancelDialogOpen(true)
  }

  const handleCancelConfirm = async () => {
    if (!repair) return
    setIsCancelling(true)
    try {
      const result = await cancelarReparacion(repair.id)
      if (result.success) {
        setCancelDialogOpen(false)
        onRepairUpdated({ ...repair, status: "Cancelado" as BitacoraRepair["status"] })
        setEstado("Cancelado")
      } else {
        toast({ title: "Error", description: result.error ?? "No se pudo cancelar la reparacion.", variant: "destructive" })
        setCancelDialogOpen(false)
      }
    } finally {
      setIsCancelling(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!repair) return
    setIsDeleting(true)
    try {
      const result = await deleteRepair(repair.id)
      if (result.success) {
        onDelete?.(repair.id)
        onBack()
        setDeleteDialogOpen(false)
      } else {
        toast({ title: "Error", description: result.error ?? "No se pudo eliminar.", variant: "destructive" })
      }
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    if (!repair) {
      setDetail(null)
      setHistory([])
      setHistorialAudit([])
      setGastos([])
      setServicios([])
      setEstado("")
      setEntregaModalOpen(false)
      setStatusDialogOpen(false)
      setPendingEstado(null)
      setStatusNota("")
      setChecklistProDraft({ funcional: {}, expressOmitReason: null })
      return
    }
    setPresupuesto(repair.estimatedPrice?.toString() ?? "")
    setEstado(repair.status ?? "")
    const load = async () => {
      setIsLoadingDetail(true)
      try {
        const [page, settingsRes] = await Promise.all([
          withTimeout(getRepairDetailPageData(repair.id), 15000, "getRepairDetailPageData"),
          withTimeout(getTallerSettings(), 15000, "getTallerSettings"),
        ])
        if (settingsRes.settings?.nombre_taller) setNombreTallerSetting(settingsRes.settings.nombre_taller)
        setTallerPais(settingsRes.settings?.pais ?? null)
        if (settingsRes.settings?.terminos_garantia?.trim()) {
          const t = settingsRes.settings.terminos_garantia.trim()
          setWarrantyHint(t.length > 48 ? `${t.slice(0, 45)}...` : t)
        }
        const data = page.detail
        setDetail(data ?? null)
        if (data) {
          setPresupuesto(data.estimatedPrice?.toString() ?? "")
          setEstado(data.status ?? repair.status ?? "")
        }
        setHistory(page.changes ?? [])
        setHistorialAudit(page.historialAudit ?? [])
        setGastos(page.gastos ?? [])
        setServicios(page.servicios ?? [])
      } catch (error) {
        console.error("[repair-detail-view] load:", error)
        toast({
          title: "No se pudo cargar el detalle",
          description: "Intenta recargar el folio.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingDetail(false)
      }
    }
    load()
  }, [repair?.id])

  useEffect(() => {
    if (!editingSecondaryPhone) {
      setSecondaryPhoneDraft(detail?.clientePhoneSecondary ?? "")
    }
  }, [detail?.clientePhoneSecondary, editingSecondaryPhone])

  useEffect(() => {
    if (!repair) {
      setSummaryRecipients([])
      return
    }
    let cancelled = false
    const loadRecipients = async () => {
      setLoadingSummaryRecipients(true)
      try {
        const result = await getRepairSummaryRecipients()
        if (!cancelled) setSummaryRecipients(result.recipients ?? [])
      } catch (error) {
        console.error("[repair-detail-view] recipients:", error)
        if (!cancelled) setSummaryRecipients([])
      } finally {
        if (!cancelled) setLoadingSummaryRecipients(false)
      }
    }
    void loadRecipients()
    return () => {
      cancelled = true
    }
  }, [repair?.id])

  const refreshDetail = async () => {
    if (!repair) return
    const page = await getRepairDetailPageData(repair.id)
    setHistory(page.changes ?? [])
    setHistorialAudit(page.historialAudit ?? [])
    setGastos(page.gastos ?? [])
    setServicios(page.servicios ?? [])
    if (page.detail) {
      setDetail(page.detail)
      setPresupuesto(page.detail.estimatedPrice?.toString() ?? "")
      setEstado(page.detail.status ?? repair.status ?? "")
    }
  }

  const handleSendResponsibleSummary = useCallback(async (recipient: RepairSummaryRecipient) => {
    if (!repair) return
    setIsSendingResponsibleSummary(true)
    try {
      const result = await getRepairTeamMemberWhatsAppUrl(repair.id, recipient.id)
      if (!result.url) {
        toast({
          title: "No se pudo preparar el resumen",
          description: result.error ?? "Revisa el telefono del miembro en Mi Equipo.",
          variant: "destructive",
        })
        return
      }
      window.open(result.url, "_blank", "noopener,noreferrer")
      toast.success(`Resumen listo para ${recipient.nombre}`)
    } catch (error) {
      console.error("[handleSendResponsibleSummary]", error)
      toast({
        title: "WhatsApp no disponible",
        description: "No se pudo abrir el resumen para el responsable.",
        variant: "destructive",
      })
    } finally {
      setIsSendingResponsibleSummary(false)
    }
  }, [repair])

  // -- Inline quick-edit handlers --
  const startEditObservaciones = useCallback(() => {
    setObservacionesDraft(detail?.checklistIngreso?.observacionesEsteticas ?? "")
    setEditingObservaciones(true)
  }, [detail?.checklistIngreso?.observacionesEsteticas])

  const cancelEditObservaciones = useCallback(() => {
    setEditingObservaciones(false)
    setObservacionesDraft("")
  }, [])

  const startEditNotas = useCallback(() => {
    setNotasDraft(detail?.notasInternas ?? "")
    setEditingNotas(true)
  }, [detail?.notasInternas])

  const cancelEditNotas = useCallback(() => {
    setEditingNotas(false)
    setNotasDraft("")
  }, [])

  const openDeliveryDateEditor = useCallback(() => {
    setDeliveryDateDraft(detail?.fechaPromesaEntrega ? detail.fechaPromesaEntrega.slice(0, 10) : toDateInputValue())
    setDeliveryDateDialogOpen(true)
  }, [detail?.fechaPromesaEntrega])

  const saveDeliveryDate = useCallback(async () => {
    if (!repair) return
    setSavingDeliveryDate(true)
    try {
      const result = await updateRepairDeliveryDate(repair.id, deliveryDateDraft)
      if (!result.success) {
        toast({ title: "No se pudo actualizar", description: result.error ?? "Intenta de nuevo.", variant: "destructive" })
        return
      }
      setDeliveryDateDialogOpen(false)
      await refreshDetail()
      toast.success("Fecha de entrega actualizada")
    } finally {
      setSavingDeliveryDate(false)
    }
  }, [repair, deliveryDateDraft])

  const saveQuickNotes = useCallback(
    async (field: "observaciones" | "notas") => {
      if (!repair) return
      setSavingQuickNotes(true)
      try {
        const payload: { observacionesEsteticas?: string; notasInternas?: string } = {}
        if (field === "observaciones") payload.observacionesEsteticas = observacionesDraft
        if (field === "notas") payload.notasInternas = notasDraft

        const result = await updateRepairQuickNotes(repair.id, payload)
        if (!result.success) {
          toast({ title: "Error", description: result.error ?? "No se pudo guardar.", variant: "destructive" })
          return
        }
        if (field === "observaciones") setEditingObservaciones(false)
        if (field === "notas") setEditingNotas(false)
        await refreshDetail()
        toast({ title: "Guardado", description: "Cambios actualizados correctamente." })
      } finally {
        setSavingQuickNotes(false)
      }
    },
    [repair, observacionesDraft, notasDraft],
  )

  const handleStatusOptionClick = (value: string) => {
    if (value === estado) return
    if (value === "En Reparacion") {
      const currentBudget = Number(detail?.estimatedPrice ?? repair?.estimatedPrice ?? presupuestoNum)
      if (!Number.isFinite(currentBudget) || currentBudget <= 0) {
        toast({
          title: "Presupuesto pendiente",
          description: "Asigna un presupuesto mayor a 0 antes de pasar el folio a En Reparacion.",
          variant: "warning",
        })
        return
      }
    }
    if (value === "Listo") {
      setListoDecisionOpen(true)
      return
    }
    // Process options: direct change with confirmation dialog
    if (["Recibido", "Diagnostico", "En Reparacion", "Esperando Refaccion"].includes(value)) {
      setPendingEstado(value)
      setStatusNota("")
      setEsperaRefaccionConcepto(detail?.esperaRefaccionConcepto ?? "")
      setEsperaRefaccionEta(detail?.esperaRefaccionEta ? detail.esperaRefaccionEta.slice(0, 10) : "")
      setEsperaRefaccionNota(detail?.esperaRefaccionNota ?? "")
      setStatusDialogOpen(true)
      return
    }
  }

  const handleListoDecision = (exitosa: boolean) => {
    setListoDecisionOpen(false)
    if (exitosa) {
      setPendingEstado("Listo")
      setStatusNota("")
      setStatusDialogOpen(true)
    } else {
      setNoExitosaTipo("sin_reparar")
      setNoExitosaOpen(true)
    }
  }

  const handleEntregarClick = () => {
    anticipoAntesEntregaRef.current = anticipoNum
    setEntregaModalOpen(true)
  }

  const handleNoExitosaClick = (tipo: "sin_reparar" | "cancelar") => {
    setNoExitosaTipo(tipo)
    setNoExitosaOpen(true)
  }

  const confirmarNoExitosa = async (data: { razon: string; nota: string }) => {
    if (!repair) return
    const notaCompleta = [data.razon, data.nota].filter(Boolean).join(" — ")
    const nuevoEstado = noExitosaTipo === "sin_reparar" ? "Sin Reparacion" : "Cancelado"
    setNoExitosaPending(true)
    try {
      if (noExitosaTipo === "cancelar") {
        const res = await cancelarReparacion(repair.id, notaCompleta)
        if (!res.success) {
          toast({ title: "No se pudo cancelar", description: res.error ?? "Error inesperado.", variant: "destructive" })
          return
        }
        toast({ title: "Reparacion cancelada", description: "Se registro la devolucion en caja si aplica." })
      } else {
        const res = await applyRepairStatusChange({
          repairId: repair.id,
          estadoAnterior: estado,
          estadoNuevo: nuevoEstado,
          notaTecnica: notaCompleta,
        })
        if (!res.success) {
          toast({ title: "Error", description: res.error ?? "No se pudo actualizar.", variant: "destructive" })
          return
        }
        toast({
          title: "Marcado sin reparar",
          description: "Razon registrada para metricas.",
        })
      }
      setEstado(nuevoEstado)
      setNoExitosaOpen(false)
      const page = await getRepairDetailPageData(repair.id)
      setHistory(page.changes ?? [])
      setHistorialAudit(page.historialAudit ?? [])
      if (page.detail) setDetail(page.detail)
      onRepairUpdated({ ...repair, status: nuevoEstado as BitacoraRepair["status"] })
    } catch {
      toast({ title: "Error", description: "Error de red al guardar.", variant: "destructive" })
    } finally {
      setNoExitosaPending(false)
    }
  }

  const confirmStatusChange = async (mode: "historial" | "whatsapp") => {
    if (!repair || pendingEstado == null) return
    const nuevoEstado = pendingEstado
    const notaCaptured = statusNota
    setStatusPendingKind(mode)
    try {
      const res = await applyRepairStatusChange({
        repairId: repair.id,
        estadoAnterior: estado,
        estadoNuevo: nuevoEstado,
        notaTecnica: notaCaptured,
        esperaRefaccionConcepto: nuevoEstado === "Esperando Refaccion" ? esperaRefaccionConcepto : null,
        esperaRefaccionEta: nuevoEstado === "Esperando Refaccion" ? esperaRefaccionEta : null,
        esperaRefaccionNota: nuevoEstado === "Esperando Refaccion" ? esperaRefaccionNota : null,
      })
      if (!res.success) {
        toast({ title: "Error", description: res.error ?? "No se pudo actualizar.", variant: "destructive" })
        return
      }
      setEstado(nuevoEstado)
      setStatusDialogOpen(false)
      setPendingEstado(null)
      setStatusNota("")
      setEsperaRefaccionConcepto("")
      setEsperaRefaccionEta("")
      setEsperaRefaccionNota("")
      const page = await getRepairDetailPageData(repair.id)
      setHistory(page.changes ?? [])
      setHistorialAudit(page.historialAudit ?? [])
      if (page.detail) setDetail(page.detail)
      onRepairUpdated({ ...repair, status: nuevoEstado as BitacoraRepair["status"] })
      toast({ title: "Estado actualizado", description: "Cambio registrado en historial." })

      if (mode === "whatsapp") {
        try {
          const d = page.detail
          const total = d?.costoTotal ?? d?.estimatedPrice ?? presupuestoNum
          const rest =
            d?.restante ??
            Math.max(0, (d?.estimatedPrice ?? presupuestoNum) - (d?.anticipo ?? anticipoNum))
          const costoRevision = d?.estimatedPrice ?? presupuestoNum
          const baseUrl =
            typeof window !== "undefined"
              ? window.location.origin
              : (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") || ""
          const url = buildRepairStatusWhatsAppUrl({
            phoneRaw: d?.clientePhone ?? repair?.clientePhone,
            countryCode: getCodigoTelefono(tallerPais) ?? undefined,
            nombreTaller: nombreTallerSetting,
            cliente: d?.clienteName ?? repair?.clienteName,
            equipo: `${d?.deviceBrand ?? repair?.deviceBrand ?? ""} ${d?.deviceModel ?? repair?.deviceModel ?? ""}`.trim(),
            folio: d?.folio ?? repair?.folio,
            repairId: repair.id,
            estadoNuevo: nuevoEstado,
            notaTecnica: notaCaptured,
            esperaRefaccionConcepto: d?.esperaRefaccionConcepto ?? esperaRefaccionConcepto,
            esperaRefaccionEta: d?.esperaRefaccionEta ?? esperaRefaccionEta,
            esperaRefaccionNota: d?.esperaRefaccionNota ?? esperaRefaccionNota,
            total,
            restante: rest,
            costoRevision,
            baseUrl,
          })
          if (url) window.open(url)
          else
            toast({
              title: "Sin telefono",
              description: "No hay numero de cliente para abrir WhatsApp.",
              variant: "destructive",
            })
        } catch (waErr) {
          console.error("[confirmStatusChange] WhatsApp:", waErr)
          toast({
            title: "WhatsApp",
            description: "El estado se guardo; no se pudo abrir el mensaje.",
            variant: "destructive",
          })
        }
      }
    } finally {
      setStatusPendingKind(null)
    }
  }

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0)
  const presupuestoNum = presupuesto ? parseFloat(presupuesto) : 0
  const presupuestoPendiente =
    (detail?.estimatedPrice == null && repair?.estimatedPrice == null && presupuesto.trim() === "") ||
    Number(detail?.estimatedPrice ?? repair?.estimatedPrice ?? presupuestoNum) <= 0
  const anticipoNum = detail?.anticipo ?? repair?.anticipo ?? 0
  const utilidadEstimada = presupuestoPendiente ? 0 : presupuestoNum - totalGastos
  const utilidadEsPositiva = !presupuestoPendiente && utilidadEstimada > 0
  const utilidadEsNegativa = !presupuestoPendiente && utilidadEstimada < 0
  const utilidadEsNeutra = !presupuestoPendiente && utilidadEstimada === 0
  const margenUtilidad =
    !presupuestoPendiente && presupuestoNum > 0 ? (utilidadEstimada / presupuestoNum) * 100 : 0
  const saldoPendiente = useMemo(() => {
    if (presupuestoPendiente) return 0
    if (detail?.restante != null && !Number.isNaN(Number(detail.restante))) {
      return Math.max(0, Number(detail.restante))
    }
    const ct = detail?.costoTotal ?? presupuestoNum
    return Math.max(0, ct - anticipoNum)
  }, [detail?.restante, detail?.costoTotal, presupuestoNum, anticipoNum, presupuestoPendiente])
  const tieneSaldoPendiente = !presupuestoPendiente && saldoPendiente > 0.005

  const badgeLabel = getRepairStatusDisplayLabel(estado)
  const registradoText = detail?.createdAtRaw
    ? new Date(detail.createdAtRaw).toLocaleDateString("es-MX", { day: "numeric", month: "numeric", year: "numeric" })
    : detail?.createdAt ?? "—"
  const fechaEntregaText = formatDateOnlyText(detail?.fechaPromesaEntrega)
  const formatTimestamp = (iso: string) =>
    new Date(iso).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  const formatMoney = (value: number) =>
    `$${value.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

  const getLatestStatusNote = useCallback(
    (status: string | null | undefined) => {
      const normalized = status?.trim()
      if (!normalized) return null
      const latest = historialAudit
        .filter((row) => row.estado_nuevo === normalized && row.nota_tecnica?.trim())
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]
      return latest?.nota_tecnica?.trim() || null
    },
    [historialAudit],
  )

  const openCustomerWhatsApp = useCallback((phoneRaw: string, emptyDescription: string) => {
    if (!repair && !detail) return
    const countryCode = getCodigoTelefono(tallerPais)
    const digits = normalizePhoneForWhatsApp(phoneRaw, countryCode)
    if (!digits) {
      toast({
        title: "Telefono invalido",
        description: emptyDescription,
        variant: "destructive",
      })
      return
    }

    const currentStatus = detail?.status ?? repair?.status ?? estado
    const repairId = detail?.id ?? repair?.id ?? ""
    const folio = detail?.folio ?? repair?.folio ?? ""
    const customerName = detail?.clienteName ?? repair?.clienteName ?? "cliente"
    const deviceBrand = detail?.deviceBrand ?? repair?.deviceBrand ?? ""
    const deviceModel = detail?.deviceModel ?? repair?.deviceModel ?? ""
    const equipo = `${deviceBrand} ${deviceModel}`.trim() || "equipo"
    const total = detail?.costoTotal ?? detail?.estimatedPrice ?? repair?.estimatedPrice ?? presupuestoNum
    const restante =
      detail?.restante ??
      Math.max(0, (detail?.estimatedPrice ?? repair?.estimatedPrice ?? presupuestoNum) - (detail?.anticipo ?? repair?.anticipo ?? 0))

    let url: string | null = null
    if (currentStatus === "Recibido") {
      const message = buildRepairWelcomeWhatsAppMessage({
        folio,
        repairId,
        customerName,
        customerPhone: phoneRaw,
        countryCode: countryCode ?? undefined,
        deviceBrand,
        deviceModel,
        reportedFault: detail?.falla ?? repair?.falla ?? "",
      })
      url = buildCustomerWhatsAppUrl(digits, message)
    } else {
      url = buildRepairStatusWhatsAppUrl({
        phoneRaw,
        countryCode: countryCode ?? undefined,
        nombreTaller: nombreTallerSetting,
        cliente: customerName,
        equipo,
        folio,
        repairId,
        estadoNuevo: currentStatus,
        notaTecnica: currentStatus === "Sin Reparacion" ? getLatestStatusNote(currentStatus) : undefined,
        total,
        restante,
        costoRevision: total,
      })
    }

    if (!url) {
      toast({
        title: "WhatsApp no disponible",
        description: "No se pudo preparar el mensaje para el cliente.",
        variant: "destructive",
      })
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }, [detail, estado, getLatestStatusNote, nombreTallerSetting, presupuestoNum, repair, tallerPais])

  const handleContactCustomerWhatsApp = useCallback(() => {
    const customerPhone = detail?.clientePhone ?? repair?.clientePhone ?? ""
    openCustomerWhatsApp(customerPhone, "No hay numero de cliente para abrir WhatsApp.")
  }, [detail?.clientePhone, openCustomerWhatsApp, repair?.clientePhone])

  const handleContactSecondaryWhatsApp = useCallback(() => {
    const secondaryPhone = detail?.clientePhoneSecondary ?? ""
    openCustomerWhatsApp(secondaryPhone, "No hay telefono alterno para abrir WhatsApp.")
  }, [detail?.clientePhoneSecondary, openCustomerWhatsApp])

  const handleSaveSecondaryPhone = useCallback(async () => {
    const repairId = detail?.id ?? repair?.id
    if (!repairId) return

    setSavingSecondaryPhone(true)
    try {
      const result = await updateRepairClientSecondaryPhone(repairId, secondaryPhoneDraft)
      if (!result.success) {
        toast({
          title: "No se guardo el alterno",
          description: result.error ?? "Revisa el numero e intenta de nuevo.",
          variant: "destructive",
        })
        return
      }

      const savedPhone = result.telefonoSecundario ?? null
      setDetail((prev) => (prev ? { ...prev, clientePhoneSecondary: savedPhone } : prev))
      setSecondaryPhoneDraft(savedPhone ?? "")
      setEditingSecondaryPhone(false)
      toast.success(savedPhone ? "Telefono alterno guardado" : "Telefono alterno eliminado")
    } catch (error) {
      console.error("[handleSaveSecondaryPhone]", error)
      toast({
        title: "No se guardo el alterno",
        description: "Intenta de nuevo en unos segundos.",
        variant: "destructive",
      })
    } finally {
      setSavingSecondaryPhone(false)
    }
  }, [detail?.id, repair?.id, secondaryPhoneDraft])

  const gastosManoObra = useMemo(
    () => gastos.filter((g) => g.tipo === "mano_obra").reduce((s, g) => s + g.monto, 0),
    [gastos]
  )
  const gastosRefaccion = useMemo(
    () => gastos.filter((g) => g.tipo === "refaccion").reduce((s, g) => s + g.monto, 0),
    [gastos]
  )

  const formatLogTipo = (tipo: string) => {
    const m: Record<string, string> = {
      presupuesto: "Presupuesto",
      abono: "Abono / pago",
      tecnico: "Tecnico asignado",
      estado: "Cambio de estado",
      gasto: "Gasto de refacciones",
    }
    return m[tipo] ?? tipo
  }

  const auditFeedItems = useMemo(() => {
    const estadoRows = historialAudit.map((h) => ({
      key: `h-${h.id}`,
      kind: "estado" as const,
      fecha: h.fecha,
      usuario: h.usuario_nombre,
      anterior: h.estado_anterior,
      nuevo: h.estado_nuevo,
      nota: h.nota_tecnica,
    }))
    const logRows = history
      .filter((c) => c.tipo_cambio !== "estado")
      .map((c) => ({
        key: `c-${c.id}`,
        kind: "log" as const,
        fecha: c.created_at,
        usuario: c.usuario ?? "Sistema",
        tipo: c.tipo_cambio,
        descripcion: c.descripcion,
        valorAnterior: c.valor_anterior ?? null,
        valorNuevo: c.valor_nuevo ?? null,
        nota: c.nota ?? null,
      }))
    const loggedExpenseCounts = new Map<string, number>()
    for (const row of logRows) {
      if (row.tipo !== "gasto") continue
      const key = row.descripcion.trim()
      loggedExpenseCounts.set(key, (loggedExpenseCounts.get(key) ?? 0) + 1)
    }
    const gastoRows = gastos.map((gasto) => ({
      key: `g-${gasto.id}`,
      kind: "log" as const,
      fecha: gasto.created_at,
      usuario: gasto.creado_por_nombre ?? "Sistema",
      tipo: "gasto",
      descripcion: `${gasto.tipo === "mano_obra" ? "Mano de obra" : gasto.tipo === "refaccion" ? "Refaccion" : gasto.tipo === "maquila" ? "Maquila / externo" : gasto.tipo === "insumo" ? "Insumo" : "Otro"}: ${gasto.concepto} - $${gasto.monto.toFixed(2)}${gasto.metodo_pago ? ` (${gasto.metodo_pago})` : ""}`,
      valorAnterior: null,
      valorNuevo: null,
      nota: null,
    })).filter((row) => {
      const remaining = loggedExpenseCounts.get(row.descripcion.trim()) ?? 0
      if (remaining > 0) {
        loggedExpenseCounts.set(row.descripcion.trim(), remaining - 1)
        return false
      }
      return true
    })
    /* Cronologico: el ingreso basal (Recibido) primero, lo mas reciente al final */
    const merged = [...estadoRows, ...logRows, ...gastoRows].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    )
    if (merged.length > 0) return merged
    if (detail?.createdAtRaw && detail.creadoPorNombre) {
      return [
        {
          key: "creacion-sin-historial",
          kind: "estado" as const,
          fecha: detail.createdAtRaw,
          usuario: detail.creadoPorNombre,
          anterior: null,
          nuevo: estado || "Recibido",
          nota: `EQUIPO RECIBIDO${detail.creadoPorNombre ? ` — Recibido por ${detail.creadoPorNombre}` : ""}`,
        },
      ]
    }
    return merged
  }, [gastos, historialAudit, history, detail?.createdAtRaw, detail?.creadoPorNombre, estado])

  const lastEstadoTimelineIndex = useMemo(() => {
    for (let i = auditFeedItems.length - 1; i >= 0; i--) {
      if (auditFeedItems[i].kind === "estado") return i
    }
    return -1
  }, [auditFeedItems])

  const paymentEntries = useMemo(
    () =>
      history
        .filter((item) => item.tipo_cambio === "abono")
        .map((item) => ({
          ...item,
          amountLabel: item.valor_nuevo?.trim() || item.descripcion.match(/\$[\d,]+(?:\.\d{1,2})?/)?.[0] || null,
        })),
    [history],
  )

  return (
    <>
      <div className="relative z-0 min-h-0 w-full bg-slate-50 text-slate-900">
        {/* Encabezado: folio, estado, acciones */}
        <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-4 sm:px-8 sm:py-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* Folio */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="group h-10 gap-2 rounded-xl bg-slate-100 px-3 text-slate-900 hover:bg-blue-50 hover:text-blue-700"
              aria-label="Regresar a reparaciones"
              title="Regresar a reparaciones"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-slate-200 transition-transform group-hover:-translate-x-0.5">
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-lg font-bold tracking-tight sm:text-xl">
                {repair?.folio ?? detail?.folio ?? "—"}
              </span>
            </Button>
            {/* Estado */}
            <span className="inline-flex rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-bold uppercase text-blue-800">
              {badgeLabel}
            </span>
            {/* Tecnico */}
            {editingTechnician ? (
              <div className="min-w-[210px]">
                <Select
                  value={currentTechnician === "No asignado" ? "Sin asignar" : currentTechnician}
                  onValueChange={(value) => void handleTechnicianChange(value)}
                  disabled={savingTechnician}
                >
                  <SelectTrigger className="h-9 rounded-lg border-blue-200 bg-blue-50 text-sm font-bold uppercase tracking-wide text-blue-800">
                    <SelectValue placeholder="Asignar tecnico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sin asignar">Sin asignar</SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.nombre}>
                        {tech.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingTechnician(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                title="Cambiar tecnico asignado"
              >
                <Wrench className="h-4 w-4" aria-hidden />
                {currentTechnician === "No asignado" ? "Sin asignar" : currentTechnician}
              </button>
            )}
            {/* Reingreso */}
            {repair?.status === "Entregado" && onReactivarReingreso && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 font-semibold text-xs"
                onClick={onReactivarReingreso}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reingreso
              </Button>
            )}
            {/* Entregar (cuando esta Listo, Sin Reparacion o Cancelado) */}
            {(estado === "Listo" || estado === "Sin Reparacion" || estado === "Cancelado") && (
              <Button
                type="button"
                size="sm"
                onClick={handleEntregarClick}
                className="gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-emerald-700"
              >
                <PackageCheck className="h-4 w-4" aria-hidden />
                Entregar equipo
              </Button>
            )}
            {/* Cancelar (estados no terminales que aun no estan cancelados) */}
            {estado && !["Entregado", "Cancelado", "Sin Reparacion"].includes(estado) && (
              <Button
                type="button"
                size="sm"
                onClick={() => setCancelModalOpen(true)}
                className="btn-glow gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-red-700"
              >
                <XCircle className="h-4 w-4" aria-hidden />
                Cancelar
              </Button>
            )}
            {/* Spacer */}
            <span className="hidden lg:inline-flex flex-1" aria-hidden />
            {/* Acciones */}
            <div className="flex flex-wrap items-center gap-2">
              {repair && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      className="gap-2 border-emerald-200 bg-emerald-50 font-semibold text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800"
                      disabled={isSendingResponsibleSummary || loadingSummaryRecipients}
                      title="Enviar resumen interno por WhatsApp"
                    >
                      {isSendingResponsibleSummary || loadingSummaryRecipients ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MessageCircle className="h-4 w-4" />
                      )}
                      Enviar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Enviar resumen a</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {summaryRecipients.length === 0 ? (
                      <DropdownMenuItem disabled>Sin miembros disponibles</DropdownMenuItem>
                    ) : (
                      summaryRecipients.map((recipient) => {
                        const hasPhone = Boolean(recipient.telefono?.trim())
                        return (
                          <DropdownMenuItem
                            key={recipient.id}
                            disabled={!hasPhone || isSendingResponsibleSummary}
                            onClick={() => hasPhone && void handleSendResponsibleSummary(recipient)}
                            className="flex cursor-pointer flex-col items-start gap-0.5"
                          >
                            <span className="font-semibold text-slate-900">{recipient.nombre}</span>
                            <span className="text-xs text-slate-500">
                              {hasPhone ? `${recipient.rol} · ${recipient.telefono}` : `${recipient.rol} · Sin telefono en Mi Equipo`}
                            </span>
                          </DropdownMenuItem>
                        )
                      })
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {onEditTicket && repair && (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="gap-2 border-[#2563eb] font-semibold text-[#2563eb] hover:bg-[#2563eb]/5"
                  onClick={() => onEditTicket(repair)}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
              )}
              {repair && (
                <PrintMenuDropdown
                  repair={repair}
                  detail={detail as any}
                  trigger="headerIcon"
                  shopName={nombreTallerSetting}
                  warrantyText={warrantyHint}
                  estado={estado}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setDeleteDialogOpen(true)}
                aria-label="Eliminar"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <Dialog open={deliveryDateDialogOpen} onOpenChange={setDeliveryDateDialogOpen}>
          <DialogContent className="max-w-sm rounded-2xl border-slate-200 bg-white p-0 shadow-xl">
            <DialogHeader className="border-b border-slate-100 px-5 pb-4 pt-5">
              <DialogTitle className="text-base font-bold text-slate-900">Fecha estimada de entrega</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Esta fecha alimenta la Agenda de hoy y ayuda al equipo a priorizar entregas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 px-5 py-4">
              <Label htmlFor="delivery-date-editor" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Entrega programada
              </Label>
              <Input
                id="delivery-date-editor"
                type="date"
                value={deliveryDateDraft}
                onChange={(event) => setDeliveryDateDraft(event.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold focus-visible:ring-2 focus-visible:ring-blue-500/60"
              />
            </div>
            <div className="flex gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 rounded-xl bg-white"
                disabled={savingDeliveryDate}
                onClick={() => setDeliveryDateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
                disabled={savingDeliveryDate || !deliveryDateDraft}
                onClick={() => void saveDeliveryDate()}
              >
                {savingDeliveryDate ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar fecha"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-md border-red-200 bg-red-50">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center text-xl font-bold text-red-800">
                ATENCION
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-base text-red-800">
                Estas a punto de borrar permanentemente este folio. Esta accion no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col-reverse gap-2 pt-4 sm:flex-row">
              <AlertDialogCancel className="border-red-300 text-red-800 hover:bg-red-100">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleDeleteConfirm()
                }}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wide w-full sm:w-auto"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  "CONFIRMAR BORRADO PERMANENTE"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center text-xl font-bold text-slate-900">
                ¿Cancelar esta reparacion?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-center text-base text-slate-700">
                <span className="block">Esta accion cancelara el folio y generara devoluciones automaticas.</span>
                {cancelSummary && cancelSummary.total > 0 ? (
                  <span className="block font-semibold text-red-600">
                    Total a devolver:{" "}
                    {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cancelSummary.total)}
                  </span>
                ) : (
                  <span className="block text-slate-500">Sin pagos registrados — no se generaran devoluciones.</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col-reverse gap-2 pt-4 sm:flex-row">
              <AlertDialogCancel disabled={isCancelling} className="border-slate-300 text-slate-700">
                Volver
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isCancelling}
                onClick={(e) => {
                  e.preventDefault()
                  handleCancelConfirm()
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isCancelling ? "Cancelando..." : "Confirmar cancelacion"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isLoadingDetail && !detail ? (
          <div className="flex min-h-[40vh] flex-1 items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando detalle...
          </div>
        ) : (
          <div className="w-full overflow-x-hidden pb-6 sm:pb-8">
            <section className="px-4 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 md:gap-3">
                <Select value={estado} onValueChange={handleStatusOptionClick}>
                  <SelectTrigger
                    className="h-10 min-w-[220px] rounded-xl border-blue-200 bg-white text-sm font-semibold text-slate-900 shadow-sm focus:ring-2 focus:ring-blue-500/40"
                    aria-label="Cambiar estado"
                  >
                    <SelectValue placeholder="Cambiar estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCESS_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        disabled={
                          (opt.value === "En Reparacion" && presupuestoPendiente && estado !== "En Reparacion") ||
                          (opt.value === "Esperando Refaccion" && !["Diagnostico", "En Reparacion", "Esperando Refaccion"].includes(estado))
                        }
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                  <span className="uppercase tracking-wide text-slate-500">Ingreso</span>
                  <span className="tabular-nums text-slate-700">{registradoText}</span>
                </span>
                <button
                  type="button"
                  onClick={openDeliveryDateEditor}
                  disabled={!repair}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-100 disabled:cursor-default disabled:opacity-70"
                  title="Editar fecha de entrega"
                >
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden />
                  <span className="uppercase tracking-wide text-blue-500">Entrega</span>
                  <span className="tabular-nums text-blue-900">{fechaEntregaText}</span>
                  <Pencil className="h-3 w-3 text-blue-500" aria-hidden />
                </button>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 md:ml-2">
                  {SECTION_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveSection(tab.value)}
                      className={cn(
                        "relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                        activeSection === tab.value
                          ? "bg-blue-50 text-blue-700 shadow-[inset_0_-2px_0_0_#2563eb]"
                          : "text-slate-500 hover:text-slate-900",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {activeSection === "resumen" ? (
              <div className="mt-6 grid grid-cols-1 gap-6 p-4 sm:p-6 md:grid-cols-3 md:gap-6 lg:p-8">
                <div className="min-w-0 space-y-6 md:col-span-2">
                  <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
                      <div className="flex min-h-0 flex-col gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Falla reportada
                        </Label>
                        <div className="flex min-h-[72px] flex-1 items-center rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-gray-900">
                          <p className="text-base font-semibold leading-relaxed text-gray-900">
                            {detail?.falla ? (
                              <>
                                <span className="text-gray-400">&ldquo;</span>
                                {detail.falla}
                                <span className="text-gray-400">&rdquo;</span>
                              </>
                            ) : (
                              <span className="italic text-gray-500">Sin descripcion de falla</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex min-h-0 flex-col gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Pruebas del equipo
                        </Label>
                        <DiagnosisProSummaryCard
                          encendido={detail?.checklistIngreso?.encendido ?? null}
                          checklistPro={detail?.checklistPro ?? null}
                          tipoEquipo={detail?.tipo_equipo ?? "Otro"}
                          onOpenDetails={openHealthDetails}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.45)]">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Presupuesto</p>
                        {presupuestoPendiente ? (
                          <div className="mt-2 inline-flex rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                            Pendiente
                          </div>
                        ) : (
                          <>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                              {formatMoney(presupuestoNum)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Valor total acordado con el cliente para esta reparación.
                            </p>
                          </>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          className="mt-3 w-full gap-1.5 bg-[#2563eb] text-xs font-semibold text-white hover:bg-[#1d4ed8]"
                          onClick={() => setPresupuestoModalOpen(true)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          EDITAR
                        </Button>
                      </div>
                      <div
                        className={cn(
                          "rounded-[24px] border p-4 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.45)]",
                          presupuestoPendiente
                            ? "border-slate-200/90 bg-white"
                            : tieneSaldoPendiente
                              ? "border-red-200 bg-red-50/90"
                              : "border-emerald-200 bg-emerald-50/90"
                        )}
                      >
                        <p
                          className={cn(
                            "text-[11px] font-bold uppercase tracking-wide",
                            presupuestoPendiente
                              ? "text-slate-500"
                              : tieneSaldoPendiente
                                ? "text-red-700"
                                : "text-emerald-700"
                          )}
                        >
                          Saldo pendiente
                        </p>
                        {presupuestoPendiente ? (
                          <p className="mt-2 text-sm font-bold text-amber-700">Asigna presupuesto para calcular saldo</p>
                        ) : (
                          <>
                            <p
                              className={cn(
                                "mt-1 text-3xl font-black tabular-nums",
                                tieneSaldoPendiente ? "text-red-600" : "text-emerald-700"
                              )}
                            >
                              {formatMoney(saldoPendiente)}
                            </p>
                            <p className={cn("mt-1 text-xs", tieneSaldoPendiente ? "text-red-800/80" : "text-emerald-800/80")}>
                              {tieneSaldoPendiente
                                ? "Cobrar este monto antes de entregar el equipo."
                                : "El folio ya esta liquidado para entrega."}
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant={tieneSaldoPendiente ? "default" : "outline"}
                              className={cn(
                                "mt-3 w-full gap-1.5 text-xs font-semibold",
                                tieneSaldoPendiente
                                  ? "bg-red-600 text-white hover:bg-red-700"
                                  : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                              )}
                              onClick={() => setAbonoModalOpen(true)}
                              disabled={!tieneSaldoPendiente}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              {tieneSaldoPendiente ? "Cobrar saldo" : "Liquidado"}
                            </Button>
                          </>
                        )}
                      </div>
                      <div
                        className={cn(
                          "rounded-[24px] border p-4 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.45)]",
                          presupuestoPendiente
                            ? "border-slate-200/90 bg-white"
                            : utilidadEsNegativa
                              ? "border-rose-200 bg-rose-50/80"
                              : utilidadEsPositiva
                                ? "border-emerald-200 bg-emerald-50/80"
                                : "border-amber-200 bg-amber-50/80"
                        )}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p
                              className={cn(
                                "text-[11px] font-bold uppercase tracking-wide",
                                presupuestoPendiente
                                  ? "text-slate-500"
                                  : utilidadEsNegativa
                                    ? "text-rose-700"
                                    : utilidadEsPositiva
                                      ? "text-emerald-700"
                                      : "text-amber-700"
                              )}
                            >
                              Utilidad estimada
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              Presupuesto menos gastos internos aplicados al folio.
                            </p>
                          </div>
                          {!presupuestoPendiente ? (
                            <div className="rounded-2xl bg-white/75 px-3 py-2 text-right">
                              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                Margen
                              </span>
                              <span
                                className={cn(
                                  "text-sm font-semibold",
                                  utilidadEsNegativa
                                    ? "text-rose-700"
                                    : utilidadEsPositiva
                                      ? "text-emerald-700"
                                      : "text-amber-700"
                                )}
                              >
                                {margenUtilidad.toFixed(0)}%
                              </span>
                            </div>
                          ) : null}
                        </div>
                        {presupuestoPendiente ? (
                          <p className="mt-2 text-sm font-bold text-amber-700">Sin calcular hasta asignar presupuesto</p>
                        ) : (
                          <>
                            <p
                              className={cn(
                                "mt-1 text-2xl font-bold tabular-nums",
                                utilidadEsNegativa
                                  ? "text-rose-600"
                                  : utilidadEsPositiva
                                    ? "text-emerald-600"
                                    : "text-amber-600"
                              )}
                            >
                              {formatMoney(utilidadEstimada)}
                            </p>
                            <p className="mt-3 text-xs text-slate-600">
                              {utilidadEsNegativa
                                ? "Los costos ya superan el presupuesto actual del folio."
                                : utilidadEsNeutra
                                  ? "El folio está en punto de equilibrio con los costos registrados."
                                  : "Todavía queda utilidad disponible después de descontar los gastos del folio."}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                  {/* Servicios aplicados */}
                  {servicios.length > 0 && (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          Servicios aplicados
                        </p>
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-700">
                          PRO
                        </span>
                      </div>
                      <div className="space-y-2">
                        {servicios.map((s) => (
                          <div key={s.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-3.5 w-3.5 text-blue-600" />
                              <span className="font-semibold text-slate-800">{s.nombre_snapshot}</span>
                              {s.cantidad > 1 && (
                                <span className="text-xs text-slate-500">x{s.cantidad}</span>
                              )}
                            </div>
                            <span className="font-bold text-slate-900">
                              ${(s.precio_snapshot * s.cantidad).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          Total servicios
                        </span>
                        <span className="text-lg font-black text-slate-900">
                          ${servicios.reduce((sum, s) => sum + s.precio_snapshot * s.cantidad, 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* -- Observaciones esteticas -- */}
                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-4 w-4 text-slate-500" aria-hidden />
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          OBSERVACIONES Y ACCESORIOS al ingreso
                        </Label>
                      </div>
                      <button
                        type="button"
                        onClick={editingObservaciones ? cancelEditObservaciones : startEditObservaciones}
                        disabled={savingQuickNotes}
                        className="inline-flex items-center gap-1 rounded-md p-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                      >
                        <Pencil className="h-3 w-3" aria-hidden />
                        {editingObservaciones ? "Cancelar" : "Editar"}
                      </button>
                    </div>
                    {editingObservaciones ? (
                      <div className="space-y-2">
                        <Textarea
                          value={observacionesDraft}
                          onChange={(e) => setObservacionesDraft(e.target.value)}
                          placeholder="Golpes, rayones o accesorios"
                          className="min-h-[72px] resize-y rounded-lg border-slate-200 bg-white text-sm"
                          disabled={savingQuickNotes}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-[#2563eb] text-xs font-semibold text-white hover:bg-[#1d4ed8]"
                            disabled={savingQuickNotes}
                            onClick={() => void saveQuickNotes("observaciones")}
                          >
                            {savingQuickNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs font-semibold text-slate-600"
                            disabled={savingQuickNotes}
                            onClick={cancelEditObservaciones}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5">
                        {detail?.checklistIngreso?.observacionesEsteticas?.trim() ? (
                          <p className="text-sm font-medium leading-relaxed text-gray-800">
                            {detail.checklistIngreso.observacionesEsteticas.trim()}
                          </p>
                        ) : (
                          <p className="text-sm italic text-gray-400">Sin observaciones esteticas registradas</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* -- Notas internas -- */}
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-amber-7000" aria-hidden />
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          Notas internas
                        </Label>
                      </div>
                      <button
                        type="button"
                        onClick={editingNotas ? cancelEditNotas : startEditNotas}
                        disabled={savingQuickNotes}
                        className="inline-flex items-center gap-1 rounded-md p-1 text-[10px] font-semibold text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                      >
                        <Pencil className="h-3 w-3" aria-hidden />
                        {editingNotas ? "Cancelar" : detail?.notasInternas ? "Editar" : "Agregar"}
                      </button>
                    </div>
                    {editingNotas ? (
                      <div className="space-y-2">
                        <Textarea
                          value={notasDraft}
                          onChange={(e) => setNotasDraft(e.target.value)}
                          placeholder="Notas solo para el taller..."
                          className="min-h-[72px] resize-y rounded-lg border-amber-200 bg-white text-sm"
                          disabled={savingQuickNotes}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700"
                            disabled={savingQuickNotes}
                            onClick={() => void saveQuickNotes("notas")}
                          >
                            {savingQuickNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs font-semibold text-slate-600"
                            disabled={savingQuickNotes}
                            onClick={cancelEditNotas}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : detail?.notasInternas?.trim() ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                        <p className="text-sm font-medium leading-relaxed text-amber-900">
                          {detail.notasInternas.trim()}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  </section>
                </div>

                <div className="flex min-w-0 flex-col gap-5 md:col-span-1">
                  <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-[#2563eb]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Cliente</h3>
                    </div>
                    <p className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                      {(detail?.clienteName ?? repair?.clienteName) || "—"}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-gray-800">
                      {(detail?.clientePhone ?? repair?.clientePhone) || "—"}
                    </p>
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            Contacto alterno
                          </p>
                          {detail?.clientePhoneSecondary ? (
                            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                              {detail.clientePhoneSecondary}
                            </p>
                          ) : (
                            <p className="mt-1 text-sm font-medium text-slate-500">
                              Para cuando el equipo del cliente esta en reparacion.
                            </p>
                          )}
                        </div>
                        {detail?.clientePhoneSecondary ? (
                          <button
                            type="button"
                            onClick={handleContactSecondaryWhatsApp}
                            title="Enviar WhatsApp al telefono alterno"
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
                          >
                            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                            WhatsApp
                          </button>
                        ) : null}
                      </div>

                      {editingSecondaryPhone ? (
                        <div className="mt-3 space-y-2">
                          <Input
                            value={secondaryPhoneDraft}
                            onChange={(event) => setSecondaryPhoneDraft(event.target.value)}
                            placeholder="Telefono alterno"
                            inputMode="tel"
                            autoFocus
                            disabled={savingSecondaryPhone}
                            className="h-10 bg-white"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSaveSecondaryPhone}
                              disabled={savingSecondaryPhone}
                              className="h-9 bg-blue-600 px-3 text-xs font-bold hover:bg-blue-700"
                            >
                              {savingSecondaryPhone ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                              ) : (
                                <Phone className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                              )}
                              Guardar alterno
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingSecondaryPhone(false)
                                setSecondaryPhoneDraft(detail?.clientePhoneSecondary ?? "")
                              }}
                              disabled={savingSecondaryPhone}
                              className="h-9 px-3 text-xs font-bold"
                            >
                              Cancelar
                            </Button>
                            {detail?.clientePhoneSecondary ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setSecondaryPhoneDraft("")}
                                disabled={savingSecondaryPhone}
                                className="h-9 px-3 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                Limpiar
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSecondaryPhoneDraft(detail?.clientePhoneSecondary ?? "")
                            setEditingSecondaryPhone(true)
                          }}
                          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {detail?.clientePhoneSecondary ? (
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {detail?.clientePhoneSecondary ? "Editar alterno" : "Agregar alterno"}
                        </button>
                      )}
                    </div>
                    {(detail?.clientePhone ?? repair?.clientePhone) ? (
                      <button
                        type="button"
                        onClick={handleContactCustomerWhatsApp}
                        title="Enviar mensaje segun el estado actual del folio"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-emerald-700"
                      >
                        <MessageCircle className="h-4 w-4" aria-hidden />
                        WhatsApp inteligente
                      </button>
                    ) : null}
                  </section>

                  <section className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex items-center gap-2">
                      {(() => {
                        const Icon = getDeviceIcon(detail?.tipo_equipo ?? repair?.tipo_equipo)
                        return <Icon className="h-5 w-5 text-[#2563eb]" />
                      })()}
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Equipo</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-2xl font-bold uppercase tracking-tight text-gray-900">
                          {(detail?.tipo_equipo ?? repair?.tipo_equipo ?? "").trim() || "—"} · {(detail?.deviceBrand ?? repair?.deviceBrand ?? "").trim() || "—"}
                        </p>
                        <p className="text-xl font-bold text-[#2563eb] sm:text-2xl">
                          {(detail?.deviceModel ?? repair?.deviceModel ?? "").trim() || "—"}
                        </p>
                        {detail?.color ? (
                          <p className="mt-0.5 text-base font-semibold text-gray-600">
                            Color: <span className="text-gray-900">{detail.color}</span>
                          </p>
                        ) : null}
                      </div>
                      <dl className="grid grid-cols-1 gap-3 text-sm">
                        <div>
                          <dt className="text-[11px] font-semibold uppercase text-gray-500">IMEI / SN</dt>
                          <dd className="mt-0.5 font-mono text-gray-900">{detail?.imei ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase text-gray-500">Color</dt>
                          <dd className="mt-0.5 text-gray-900">{detail?.color ?? "—"}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-[11px] font-semibold uppercase text-gray-500">Seguridad del equipo</dt>
                          <dd className="mt-2 space-y-3">
                            {detail?.securityType === "none" || !detail?.securityType ? (
                              <p className="text-sm text-gray-500">Sin bloqueo registrado.</p>
                            ) : detail.securityType === "pattern" ? (
                              <div>
                                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Patron
                                </p>
                                <UnlockPatternGrid
                                  pattern={detail.securityValue ?? detail.patronDesbloqueo ?? undefined}
                                  size={100}
                                />
                                {detail.securityValue ? (
                                  <p className="mt-2 font-mono text-xs text-gray-600">
                                    Secuencia: {detail.securityValue.replace(/-/g, " ? ")}
                                  </p>
                                ) : null}
                              </div>
                            ) : detail.securityType === "pin" ? (
                              <div>
                                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-500">PIN</p>
                                <p className="font-mono text-base font-semibold text-gray-900">
                                  {detail.securityValue ?? detail.pinContrasena ?? "—"}
                                </p>
                              </div>
                            ) : detail.securityType === "password" ? (
                              <div>
                                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Contrasena
                                </p>
                                <p className="font-mono text-base font-semibold text-gray-900 break-all">
                                  {detail.securityValue ?? detail.pinContrasena ?? "—"}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">—</p>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <p className="mt-4 border-t border-gray-100 pt-3 text-[11px] text-amber-800">
                      Solo personal autorizado. No compartir con terceros.
                    </p>
                  </section>

                  <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Camera className="h-5 w-5 text-[#2563eb]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                        Fotos del dispositivo
                      </h3>
                    </div>
                    <RepairPhotoGallery
                      photos={(detail?.fotosSignedUrls ?? []).slice(0, 9).map((url, index) => ({
                        id: `${detail?.id ?? "repair"}-photo-${index}`,
                        url,
                        alt: `Foto ${index + 1}`,
                      }))}
                    />
                  </section>
                </div>
              </div>
            ) : null}
            {activeSection === "refacciones" ? (
              <section className="mt-6">
                <MonitorUtilidadOperativa
                  repairId={repair?.id ?? ""}
                  folio={repair?.folio ?? ""}
                  presupuesto={presupuestoNum}
                  initialGastos={gastos}
                />
              </section>
            ) : null}
            {activeSection === "pagos" ? (
              <section className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pagos</p>
                      <p className="text-sm text-slate-500">Abonos y liquidaciones del folio.</p>
                    </div>
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 px-2 py-0 text-[9px] font-bold uppercase tracking-wider text-blue-700">
                      Interno
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Presupuesto</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                        ${presupuestoNum.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Abonado</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-orange-600">
                        ${anticipoNum.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Saldo</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-red-600">
                        ${saldoPendiente.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                <Button
                  type="button"
                  className="mt-4 w-full gap-1.5 bg-[#2563eb] text-sm font-semibold text-white hover:bg-[#1d4ed8]"
                  onClick={() => setAbonoModalOpen(true)}
                  disabled={saldoPendiente <= 0}
                >
                  <Plus className="h-4 w-4" />
                  Registrar abono
                  </Button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pagos registrados</p>
                  {paymentEntries.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {paymentEntries.map((item) => (
                        <li key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{item.descripcion}</p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {formatTimestamp(item.created_at)} · {item.usuario ?? "Sistema"}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-700">
                              {item.amountLabel ?? `#${item.valor_nuevo ?? "0"}`}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">Sin pagos registrados.</p>
                  )}
                </div>
              </section>
            ) : null}
            {activeSection === "historial" ? (
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Clock className="h-5 w-5 text-[#2563eb]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Historial de actividad
                  </h3>
                </div>
                <div className="max-h-[min(50vh,480px)] overflow-y-auto pr-1 sm:max-h-none">
                  {auditFeedItems.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">Sin movimientos registrados aun.</p>
                  ) : (
                    <ul className="relative space-y-0 border-l-2 border-gray-200 pl-5">
                      {auditFeedItems.map((item, idx) => {
                        const showEstadoActualBadge =
                          item.kind === "estado" && idx === lastEstadoTimelineIndex
                        return (
                          <li key={item.key} className="relative pb-8 last:pb-0">
                            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2563eb] ring-2 ring-[#2563eb]/20" />
                            {item.kind === "estado" ? (
                              <div>
                                {showEstadoActualBadge ? (
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                                    Estado actual
                                  </p>
                                ) : null}
                                {item.anterior != null && item.anterior !== "" ? (
                                  <p className="text-xs font-bold uppercase leading-snug text-gray-900">
                                    <span className="text-emerald-700">
                                      {getRepairStatusDisplayLabel(item.anterior)}
                                    </span>
                                    <span className="mx-1.5 text-gray-300">?</span>
                                    <span className="text-[#2563eb]">{getRepairStatusDisplayLabel(item.nuevo)}</span>
                                  </p>
                                ) : (
                                  <p className="text-xs font-bold uppercase text-[#2563eb]">
                                    {getRepairStatusDisplayLabel(item.nuevo)}
                                  </p>
                                )}
                                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                                  {formatTimestamp(item.fecha)} — {item.usuario}
                                  {item.nota?.trim() ? ` — ${item.nota.trim()}` : ""}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-xs font-bold uppercase text-gray-900">{formatLogTipo(item.tipo)}</p>
                                {item.tipo === "gasto" ? (
                                  <p className="mt-1 text-base font-bold tabular-nums text-red-600">
                                    -{item.descripcion.match(/\$[\d,]+(?:\.\d{2})?/)?.[0] ?? "$0.00"}
                                  </p>
                                ) : item.tipo === "presupuesto" && (item.valorAnterior != null || item.valorNuevo != null) ? (
                                  <p className="mt-1 text-base font-bold tabular-nums text-gray-900">
                                    ${Number(item.valorAnterior || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span className="text-gray-400">?</span> ${Number(item.valorNuevo || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </p>
                                ) : null}
                                <p className={cn("mt-1 text-sm italic text-gray-600", item.tipo === "gasto" ? "not-italic text-gray-700" : "")}>
                                  &ldquo;{item.descripcion}&rdquo;
                                </p>
                                {item.nota?.trim() ? (
                                  <p className="mt-2 text-xs font-medium text-amber-700">
                                    Motivo: {item.nota.trim()}
                                  </p>
                                ) : null}
                                <p className="mt-2 text-[11px] text-gray-500">
                                  {formatTimestamp(item.fecha)} · {item.usuario}
                                </p>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </section>
            ) : null}
          </div>
        )}

      </div>

      <AbonoModal
        isOpen={abonoModalOpen}
        repairId={repair?.id ?? null}
        repairFolio={repair?.folio ?? ""}
        estimatedPrice={repair?.estimatedPrice}
        onClose={() => setAbonoModalOpen(false)}
        onSuccess={async (nuevoAnticipo) => {
          setAbonoModalOpen(false)
          setDetail((prev) => (prev ? { ...prev, anticipo: nuevoAnticipo } : prev))
          await refreshDetail()
          if (repair) {
            onRepairUpdated({ ...repair, anticipo: nuevoAnticipo })
          }
        }}
      />

      <PresupuestoEditModal
        isOpen={presupuestoModalOpen}
        repairId={repair?.id ?? null}
        presupuestoActual={presupuestoNum}
        onClose={() => setPresupuestoModalOpen(false)}
        onSuccess={async (nuevoPresupuesto) => {
          setPresupuestoModalOpen(false)
          setPresupuesto(nuevoPresupuesto.toString())
          setDetail((prev) => (prev ? { ...prev, estimatedPrice: nuevoPresupuesto } : prev))
          await refreshDetail()
          if (repair) {
            onRepairUpdated({ ...repair, estimatedPrice: nuevoPresupuesto })
          }
        }}
      />

      {repair ? (
        <ModalEntregaReparacion
          open={entregaModalOpen}
          onOpenChange={setEntregaModalOpen}
          repairId={repair.id}
          folio={repair.folio}
          saldoPendiente={saldoPendiente}
          anticipoActual={anticipoNum}
          estado={estado}
          onCompleted={async (payload) => {
            const page = await getRepairDetailPageData(repair.id)
            if (page.detail) {
              setDetail(page.detail)
              setPresupuesto(page.detail.estimatedPrice?.toString() ?? "")
              setEstado("Entregado")
            }
            setHistory(page.changes ?? [])
            setHistorialAudit(page.historialAudit ?? [])
            setGastos(page.gastos ?? [])
            setServicios(page.servicios ?? [])
            onRepairUpdated({ ...repair, status: "Entregado" })

            // Solo mostrar ticket de salida para entregas exitosas (no para Sin Reparacion/Cancelado)
            const fueSinReparacion = estado === "Sin Reparacion" || estado === "Cancelado"
            if (!fueSinReparacion) {
              setExitoEntregaSnapshot({
                pagoFinal: payload.pagoFinal,
                anticiposPrevios: anticipoAntesEntregaRef.current,
                metodoPago: payload.metodoPago,
                detail: page.detail ?? null,
              })
              setExitoEntregaOpen(true)
            }
          }}
        />
      ) : null}

      <ReparacionNoExitosaModal
        open={noExitosaOpen}
        onOpenChange={setNoExitosaOpen}
        tipo={noExitosaTipo}
        onConfirm={confirmarNoExitosa}
        pending={noExitosaPending}
      />

      {/* Modal decision LISTO */}
      <Dialog open={listoDecisionOpen} onOpenChange={setListoDecisionOpen}>
        <DialogContent className="max-w-sm gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-lg">
          <DialogHeader className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-5 text-left">
            <DialogTitle className="text-base font-bold text-slate-900">Reparacion exitosa?</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Define el resultado antes de marcar como finalizado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-5 py-5">
            <Button
              type="button"
              onClick={() => handleListoDecision(true)}
              className="w-full gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-emerald-700"
            >
              <PackageCheck className="h-5 w-5" aria-hidden />
              Si, reparacion exitosa
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleListoDecision(false)}
              className="w-full gap-2 rounded-xl border-slate-200 py-3 text-sm font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
            >
              <AlertTriangle className="h-5 w-5" aria-hidden />
              No, no se pudo reparar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {repair && exitoEntregaSnapshot ? (
        <ModalExitoEntrega
          open={exitoEntregaOpen}
          onClose={() => {
            setExitoEntregaOpen(false)
            setExitoEntregaSnapshot(null)
            onBack()
          }}
          repairId={repair.id}
          detail={exitoEntregaSnapshot.detail as any}
          folio={repair.folio}
          clienteNombre={exitoEntregaSnapshot.detail?.clienteName ?? repair.clienteName}
          clientePhone={exitoEntregaSnapshot.detail?.clientePhone ?? repair.clientePhone}
          equipoLabel={
            `${exitoEntregaSnapshot.detail?.deviceBrand ?? repair.deviceBrand ?? ""} ${exitoEntregaSnapshot.detail?.deviceModel ?? repair.deviceModel ?? ""}`.trim() ||
            "—"
          }
          anticiposPrevios={exitoEntregaSnapshot.anticiposPrevios}
          pagoFinal={exitoEntregaSnapshot.pagoFinal}
          metodoPago={exitoEntregaSnapshot.metodoPago}
          servicios={servicios}
        />
      ) : null}

    {repair ? (
      <ModalCancelarReparacion
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        repairId={repair.id}
        folio={repair.folio}
        onCompleted={async () => {
          setEstado("Cancelado")
          const page = await getRepairDetailPageData(repair.id)
          setHistory(page.changes ?? [])
          setHistorialAudit(page.historialAudit ?? [])
          if (page.detail) setDetail(page.detail)
          onRepairUpdated({ ...repair, status: "Cancelado" as BitacoraRepair["status"] })
        }}
      />
    ) : null}

    {repair && detail ? (
      <HealthCheckSheet
        open={healthSheetOpen}
        onOpenChange={setHealthSheetOpen}
        tipo_equipo={detail.tipo_equipo ?? "Otro"}
        value={checklistProDraft}
        onChange={setChecklistProDraft}
        persistRepair={{
          repairId: repair.id,
          save: (d) => updateRepairChecklistPro(repair.id, d),
          onSaved: () => void refreshDetail(),
        }}
      />
    ) : null}

    <StatusChangeConfirmDialog
      open={statusDialogOpen && !!repair}
      onOpenChange={(open) => {
        if (!open && statusPendingKind !== null) return
        setStatusDialogOpen(open)
        if (!open) {
          setPendingEstado(null)
          setStatusNota("")
        }
      }}
      estadoAnteriorLabel={getRepairStatusDisplayLabel(estado)}
      estadoNuevoLabel={pendingEstado ? getRepairStatusDisplayLabel(pendingEstado) : "—"}
      notaTecnica={statusNota}
      onNotaTecnicaChange={setStatusNota}
      waitingPartsMode={pendingEstado === "Esperando Refaccion"}
      esperaRefaccionConcepto={esperaRefaccionConcepto}
      esperaRefaccionEta={esperaRefaccionEta}
      esperaRefaccionNota={esperaRefaccionNota}
      onEsperaRefaccionConceptoChange={setEsperaRefaccionConcepto}
      onEsperaRefaccionEtaChange={setEsperaRefaccionEta}
      onEsperaRefaccionNotaChange={setEsperaRefaccionNota}
      onSoloHistorial={() => void confirmStatusChange("historial")}
      onActualizarYWhatsApp={() => void confirmStatusChange("whatsapp")}
      pendingKind={statusPendingKind}
    />
    </>
  )
}




