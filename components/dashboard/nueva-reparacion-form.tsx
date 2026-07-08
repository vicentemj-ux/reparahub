"use client"

import dynamic from "next/dynamic"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { flushSync } from "react-dom"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import {
  User,
  Smartphone,
  FileText,
  Save,
  Tag,
  CheckCircle2,
  Loader2,
  X,
  Camera,
  Image as ImageIconLucide,
  ImagePlus,
  Lock,
  ClipboardList,
  ArrowUp,
  Search,
  UserCog,
  Circle,
  Wrench,
  BadgeDollarSign,
  ArrowLeft,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { getTallerPlanType, getTallerSettings, type TallerPlanTipo, type TallerSettings } from "@/lib/actions/settings-prisma"
import { getPublicAppBaseUrl } from "@/lib/app-public"
import { cn } from "@/lib/utils"
import { type RepairIntakeTicketData } from "@/components/printing"
import type { RepairOrderLabelProData } from "@/components/printing"
import { ClientAutocomplete } from "@/components/dashboard/client-autocomplete"
import { ActiveCustomerIndicator } from "@/components/dashboard/active-customer-indicator"
import {
  getAllActiveTechnicians,
  getRepairDetail,
  type CreateRepairInput,
} from "@/lib/actions/repairs-prisma"
import { enqueueRepairQueueItem } from "@/lib/offline/repair-sync-queue"
import {
  clearNuevaReparacionDraft,
  loadNuevaReparacionDraft,
  saveNuevaReparacionDraft,
  type NuevaReparacionDraftV1,
} from "@/lib/offline/nueva-reparacion-draft"
import { dataUrlToFile } from "@/lib/offline/photo-data-url"
import { beginCameraTrace } from "@/lib/camera-performance"
import { prepareGalleryFiles } from "@/lib/gallery-photo-utils"
import { SecurityInputV2 } from "@/components/reparaciones/SecurityInputV2"
import { ModalPatronSeguridad } from "@/components/reparaciones/ModalPatronSeguridad"
import { type SecurityValue } from "@/lib/reparaciones/security"
import { toast } from "@/hooks/use-toast"
import { CameraModal } from "@/components/dashboard/camera-modal"
import { openRepairWelcomeWhatsApp } from "@/lib/whatsapp-repair-welcome"
import { getCodigoTelefono } from "@/lib/constants/paises"
import type { VictoryLaunchPayload } from "@/components/dashboard/victory-launch-success-dialog"
import { triggerVictoryLaunch } from "@/lib/victory-launch"
import { RevisionRapidaEncendido } from "@/components/dashboard/revision-rapida-encendido"
import { ProBarcodeButton } from "@/components/dashboard/pro-barcode-button"
import { HealthCheckSheet } from "@/components/dashboard/health-check-sheet"
import {
  ServiceSelector,
  type SelectedServicio,
} from "@/components/dashboard/servicios/ServiceSelector"
import { getServiciosReparacion } from "@/lib/actions/servicios-prisma"
import { printWithProvider } from "@/lib/printing/repair-print-service"
import { parseDirectPrintConfig } from "@/lib/printing/direct-print-config"
import { printEscposWithDaemon } from "@/lib/printing/daemon-client"
import { buildRepairIntakeEscposBase64 } from "@/lib/printing/escpos"
import { PRO_FEATURES_TEMP_DISABLED } from "@/lib/runtime-flags"


const VictoryLaunchSuccessDialog = dynamic(() => import("@/components/dashboard/victory-launch-success-dialog").then(m => m.VictoryLaunchSuccessDialog), { ssr: false })
import {
  type ChecklistIngreso,
  checklistIngresoToJson,
  ensureChecklistIngreso,
  itemsForDeviceType,
} from "@/lib/reparaciones/checklist-ingreso"
import { getRecommendedRepairBrands } from "@/lib/reparaciones/device-catalog"
import type { ChecklistProData } from "@/lib/reparaciones/checklist-pro"

// --- Stubs de integracion Tauri (SaaS) ---------------------------------
// El fork Tauri desktop (privado, no en este repo) reemplaza estos stubs
// con la implementacion real en su build de escritorio. En el SaaS siempre
// devuelven false / no-op. La rama tauriPrint en printWithProvider se
// evalua, lanza "Tauri no disponible", y el orquestador cae a webPrint.
// Ver AGENTS.md ? "Tauri desktop fork (not in this repo)" y
// /DISABLED/tauri-patches/nueva-reparacion-form.patch.txt.
// ----------------------------------------------------------------------
const isTauriAvailable = async () => false
const domToPngBase64 = async (_el?: HTMLElement | null, _opts?: { pixelRatio?: number }) => ""
const printEscposImage = async (_printerName?: string, _base64?: string, _paperWidth?: number) => {}

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

interface ClienteBasico {
  id: string
  nombre: string
  telefono: string
  correo: string
}

interface Tecnico {
  id: string
  nombre: string
}

type RepairSuccessPayload = VictoryLaunchPayload

export interface ModalOrderTypeProps {
  isReingreso: boolean
  setIsReingreso: (v: boolean) => void
  previousFolio: string
  setPreviousFolio: (v: string) => void
}

interface NuevaReparacionFormProps {
  onSuccess?: (repairId: string) => void
  isModal?: boolean
  onSubmit?: (formData: FormData) => Promise<{ repairId?: string; folio?: string } | void>
  /** Cuando hay un ID de reparacion cargado (edicion), se muestra el boton AGREGAR DETALLES y se puede pre-llenar el formulario. */
  editingRepairId?: string | null
  /** Solo modo modal: notifica si hay cambios respecto al ultimo punto guardado (cierre con confirmacion). */
  onModalDirtyChange?: (dirty: boolean) => void
  /** Tipo de ticket (Orden normal / Reingreso) controlado por el shell del modal. */
  modalOrderType?: ModalOrderTypeProps | null
  /** Cliente activo global para alta rapida desde la barra superior. */
  initialClient?: ClienteBasico | null
  /** En nueva recepcion page-first evitamos pedir el mismo cliente dos veces. */
  clientCaptureMode?: "default" | "session-priority"
}

async function filesToBase64(files: File[]): Promise<string[]> {
  if (!files.length) return []
  return Promise.all(
    files.map(
      (f) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error("lectura de archivo"))
          reader.readAsDataURL(f)
        }),
    ),
  )
}

export function NuevaReparacionForm({
  onSuccess,
  isModal = false,
  onSubmit: onSubmitProp,
  editingRepairId,
  onModalDirtyChange,
  modalOrderType = null,
  initialClient = null,
  clientCaptureMode = "default",
}: NuevaReparacionFormProps) {
  /** Ticket ya persistido (props o creado al iniciar firma). */
  const [bootstrapRepairId, setBootstrapRepairId] = useState<string | null>(null)
  const effectiveRepairId = editingRepairId || bootstrapRepairId || null
  const hasRepairId = Boolean(effectiveRepairId)
  const router = useRouter()
  const [folio, setFolio] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [registerErrorOpen, setRegisterErrorOpen] = useState(false)
  const [registerErrorDetail, setRegisterErrorDetail] = useState("")
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClienteBasico | null>(null)
  const [technicians, setTechnicians] = useState<Tecnico[]>([])
  const [loadingTechnicians, setLoadingTechnicians] = useState(true)
  const [security, setSecurity] = useState<SecurityValue>({ type: "none", value: "" })
  const handleSecurityChange = useCallback((next: SecurityValue) => {
    setSecurity(next)
  }, [])
  const [photos, setPhotos] = useState<File[]>([])
  const [compressingPhotos, setCompressingPhotos] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [tipo_equipo, setDeviceType] = useState("")
  const [problemDesc, setProblemDesc] = useState("")
  const [internalReingreso, setInternalReingreso] = useState(false)
  const [internalPreviousFolio, setInternalPreviousFolio] = useState("")
  const isReingreso = modalOrderType?.isReingreso ?? internalReingreso
  const previousFolio = modalOrderType?.previousFolio ?? internalPreviousFolio
  const setIsReingreso = useCallback(
    (v: boolean) => {
      if (modalOrderType) modalOrderType.setIsReingreso(v)
      else setInternalReingreso(v)
    },
    [modalOrderType],
  )
  const setPreviousFolio = useCallback(
    (v: string) => {
      if (modalOrderType) modalOrderType.setPreviousFolio(v)
      else setInternalPreviousFolio(v)
    },
    [modalOrderType],
  )
  const [estimatedPrice, setEstimatedPrice] = useState("")
  const [deposit, setDeposit] = useState("")
  const [selectedServices, setSelectedServices] = useState<SelectedServicio[]>([])
  const [metodoPagoAnticipo, setMetodoPagoAnticipo] = useState("efectivo")
  const [selectedBrand, setSelectedBrand] = useState("")
  const [showCustomBrand, setShowCustomBrand] = useState(false)
  const [customBrand, setCustomBrand] = useState("")
  const [deviceModel, setDeviceModel] = useState("")
  const [loadingModification, setLoadingModification] = useState(false)
  const [imeiValue, setImeiValue] = useState("")
  const [colorValue, setColorValue] = useState("")
  const [notasInternas, setNotasInternas] = useState("")
  const [fechaPromesaEntrega, setFechaPromesaEntrega] = useState(() => toDateInputValue())
  const [checklistIngreso, setChecklistIngreso] = useState<ChecklistIngreso>(() =>
    ensureChecklistIngreso("", null),
  )
  const [selectedTechnician, setSelectedTechnician] = useState("Sin asignar")
  const [shopSettings, setShopSettings] = useState<TallerSettings | null>(null)
  /** Raw paths/URLs stored in DB — used for keptPhotos in updateRepairFull */
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])
  /** Signed URLs for display — parallel array to existingPhotos */
  const [existingPhotosDisplay, setExistingPhotosDisplay] = useState<string[]>([])
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([])
  const photoInputRef = useRef<HTMLInputElement>(null)
  /** Modal: envio silencioso para generar firma con ticket real en BD (misma ruta que edicion). */

  const shouldUseSessionPriorityClient =
    clientCaptureMode === "session-priority" && !hasRepairId && !!selectedClient
  const isPageFirstLayout = isModal && clientCaptureMode === "session-priority"
  const modalFormRef = useRef<HTMLFormElement>(null)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])

  useEffect(() => {
    if (hasRepairId) return
    if (!initialClient) {
      if (clientCaptureMode === "session-priority") {
        setSelectedClient(null)
      }
      return
    }
    const nextPhone = initialClient.telefono.replace(/\D/g, "")
    setSelectedClient((prev) => {
      if (
        prev?.id === initialClient.id &&
        prev?.nombre === initialClient.nombre &&
        prev?.telefono.replace(/\D/g, "") === nextPhone
      ) {
        return prev
      }
      return {
        id: initialClient.id,
        nombre: initialClient.nombre,
        telefono: nextPhone,
        correo: initialClient.correo ?? "",
      }
    })
  }, [clientCaptureMode, hasRepairId, initialClient])

  const serviciosTotal = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.precio * s.cantidad, 0),
    [selectedServices],
  )

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f))
    setPhotoUrls(urls)
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)) }
  }, [photos])

  useEffect(() => {
    void getTallerSettings().then(({ settings }) => setShopSettings(settings))
  }, [])

  /** Modal de exito tras crear orden (folio + impresion / WhatsApp) */
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successPayload, setSuccessPayload] = useState<RepairSuccessPayload | null>(null)

  const [ingresoACotizar, setIngresoACotizar] = useState(false)
  const [planTipo, setPlanTipo] = useState<TallerPlanTipo>("prueba")
  const [planTipoLoaded, setPlanTipoLoaded] = useState(false)
  const [proBenefitsOpen, setProBenefitsOpen] = useState(false)

  const isProPlan = planTipo === "activo"
  const serviciosProEnabled = isProPlan && !PRO_FEATURES_TEMP_DISABLED

  const [healthCheckOpen, setHealthCheckOpen] = useState(false)
  const [checklistProHealth, setChecklistProHealth] = useState<ChecklistProData>({
    funcional: {},
    expressOmitReason: null,
  })
  const [patternModalOpen, setPatternModalOpen] = useState(false)
  const modalBaselineRef = useRef<string | null>(null)
  const [modalBaselineVersion, setModalBaselineVersion] = useState(0)
  const defaultTechAssignedRef = useRef(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftRestoredRef = useRef(false)

  const serializeModalState = useCallback(() => {
    return JSON.stringify({
      client: selectedClient
        ? {
            id: selectedClient.id,
            nombre: selectedClient.nombre,
            telefono: selectedClient.telefono,
            correo: selectedClient.correo,
          }
        : null,
      tipo_equipo,
      brand: showCustomBrand ? customBrand : selectedBrand,
      showCustomBrand,
      deviceModel,
      imei: imeiValue,
      color: colorValue,
      notasInternas,
      fechaPromesaEntrega,
      problemDesc,
      checklistIngreso,
      checklistProHealth,
      estimatedPrice,
      deposit,
      ingresoACotizar,
      security,
      technician: selectedTechnician,
      photoCount: photos.length,
      existingPhotos: [...existingPhotos].sort().join("|"),
      removedPhotos: [...removedPhotos].sort().join("|"),
      isReingreso,
      previousFolio,
      folio,
    })
  }, [
    selectedClient,
    tipo_equipo,
    showCustomBrand,
    customBrand,
    selectedBrand,
    deviceModel,
    imeiValue,
    colorValue,
    notasInternas,
    fechaPromesaEntrega,
    problemDesc,
    checklistIngreso,
    checklistProHealth,
    estimatedPrice,
    deposit,
    ingresoACotizar,
    security,
    selectedTechnician,
    photos.length,
    existingPhotos,
    removedPhotos,
    isReingreso,
    previousFolio,
    folio,
  ])

  useEffect(() => {
    if (!isModal) return
    if (editingRepairId && loadingModification) return
    modalBaselineRef.current = serializeModalState()
    setModalBaselineVersion((v) => v + 1)
  }, [isModal, editingRepairId, loadingModification, serializeModalState])

  const modalDirty = useMemo(() => {
    if (!isModal) return false
    if (modalBaselineRef.current === null) return false
    return serializeModalState() !== modalBaselineRef.current
  }, [isModal, serializeModalState, modalBaselineVersion])

  useEffect(() => {
    if (!isModal) return
    onModalDirtyChange?.(modalDirty)
  }, [isModal, modalDirty, onModalDirtyChange])

  useEffect(() => {
    if (!isModal) return
    if (editingRepairId) {
      defaultTechAssignedRef.current = false
      return
    }
    if (loadingTechnicians) return
    if (technicians.length === 0) return
    if (defaultTechAssignedRef.current) return
    setSelectedTechnician(technicians[0].nombre)
    defaultTechAssignedRef.current = true
  }, [isModal, editingRepairId, loadingTechnicians, technicians])

  useEffect(() => {
    if (!isModal) return
    void getTallerPlanType()
      .then((t) => {
        setPlanTipo(t)
        setPlanTipoLoaded(true)
      })
      .catch(() => {
        setPlanTipo("prueba")
        setPlanTipoLoaded(true)
      })
  }, [isModal])

  useEffect(() => {
    if (editingRepairId) setBootstrapRepairId(null)
  }, [editingRepairId])

  useEffect(() => {
    if (ingresoACotizar) setEstimatedPrice("")
  }, [ingresoACotizar])

  useEffect(() => {
    if (!isModal || editingRepairId) return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const photoB64 = await filesToBase64(photos)
          const brand = showCustomBrand ? customBrand : selectedBrand
          const draft: NuevaReparacionDraftV1 = {
            v: 1,
            savedAt: Date.now(),
            client: selectedClient
              ? {
                  id: selectedClient.id,
                  nombre: selectedClient.nombre,
                  telefono: selectedClient.telefono,
                  correo: selectedClient.correo,
                }
              : null,
            tipo_equipo,
            brand,
            showCustomBrand,
            selectedBrand,
            customBrand,
            deviceModel,
            imei: imeiValue,
            color: colorValue,
            notasInternas,
            fechaPromesaEntrega,
            problemDesc,
            checklistIngreso,
            checklistProHealth,
            estimatedPrice,
            deposit,
            ingresoACotizar,
            security,
            technician: selectedTechnician,
            selectedServices,
            isReingreso,
            previousFolio,
            folio,
            photosBase64: photoB64,
          }
          await saveNuevaReparacionDraft(draft)
        } catch {
          /* quota / IDB */
        }
      })()
    }, 750)
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [
    isModal,
    editingRepairId,
    selectedClient,
    tipo_equipo,
    showCustomBrand,
    customBrand,
    selectedBrand,
    deviceModel,
    imeiValue,
    colorValue,
    notasInternas,
    fechaPromesaEntrega,
    problemDesc,
    checklistIngreso,
    checklistProHealth,
    estimatedPrice,
    deposit,
    ingresoACotizar,
    security,
    selectedTechnician,
    selectedServices,
    photos,
    isReingreso,
    previousFolio,
    folio,
  ])

  useEffect(() => {
    if (!isModal || editingRepairId || loadingTechnicians) return
    if (draftRestoredRef.current) return
    draftRestoredRef.current = true
    void loadNuevaReparacionDraft().then((d) => {
      if (!d) return
      if (d.client) {
        setSelectedClient({
          id: d.client.id,
          nombre: d.client.nombre,
          telefono: d.client.telefono,
          correo: d.client.correo ?? "",
        })
      }
      setDeviceType(d.tipo_equipo)
      setShowCustomBrand(d.showCustomBrand)
      setSelectedBrand(d.selectedBrand)
      setCustomBrand(d.customBrand)
      setDeviceModel(d.deviceModel)
      setImeiValue(d.imei)
      setColorValue(d.color)
      setNotasInternas(d.notasInternas)
      setFechaPromesaEntrega(d.fechaPromesaEntrega || toDateInputValue())
      setProblemDesc(d.problemDesc)
      setChecklistIngreso(ensureChecklistIngreso(d.tipo_equipo || "", d.checklistIngreso))
      setChecklistProHealth(d.checklistProHealth ?? { funcional: {}, expressOmitReason: null })
      setEstimatedPrice(d.estimatedPrice)
      setDeposit(d.deposit)
      setIngresoACotizar(d.ingresoACotizar)
      setSecurity(d.security)
      setSelectedTechnician(d.technician)
      setSelectedServices(d.selectedServices ?? [])
      setIsReingreso(d.isReingreso)
      setPreviousFolio(d.previousFolio)
      setFolio(d.folio)
      setPhotos(d.photosBase64.map((url, i) => dataUrlToFile(url, `borrador-${i + 1}.jpg`)))
    })
  }, [isModal, editingRepairId, loadingTechnicians, setIsReingreso, setPreviousFolio])

  const isClientDataValid =
    selectedClient !== null &&
    selectedClient.telefono.replace(/\D/g, "").length >= 6 &&
    (selectedClient.id.trim().length > 0 || selectedClient.nombre.trim().length > 0)

  const showRegisterError = useCallback((detail: string) => {
    let d = detail
      .replace(/^\s*(?:❌|✖|x)\s*/i, "")
      .replace(/^\s*error al registrar:\s*/i, "")
      .trim() || "Error desconocido"
    if (
      /^no se pudo registrar\.?$/i.test(d) ||
      d === "Error desconocido al guardar." ||
      d === "Error desconocido"
    ) {
      d =
        "Respuesta generica del servidor. Revisa en Supabase que existan las columnas requeridas en `reparaciones`, que RLS permita el insert y mira los logs de la funcion `createRepair` en Vercel."
    }
    setRegisterErrorDetail(d)
    if (!isPageFirstLayout) {
      setRegisterErrorOpen(true)
    }
    toast({
      variant: "destructive",
      title: "Error al Registrar",
      description: d,
    })
  }, [isPageFirstLayout])

  const buildCreateRepairInputFromForm = useCallback(async (): Promise<CreateRepairInput> => {
    if (!selectedClient) {
      throw new Error("Selecciona o registra un cliente.")
    }
    const brandVal = showCustomBrand ? customBrand.trim() : selectedBrand.trim()
    const photoB64 = await filesToBase64(photos)
    const email = selectedClient.correo?.trim() ?? ""
    const input: CreateRepairInput = {
      customerName: selectedClient.nombre.trim(),
      customerPhone: selectedClient.telefono.trim(),
      customerEmail: email || undefined,
      tipo_equipo: tipo_equipo || undefined,
      deviceBrand: brandVal,
      deviceModel,
      deviceSerial: imeiValue || undefined,
      deviceColor: colorValue || undefined,
      reportedFault: problemDesc,
      estimatedPrice: ingresoACotizar ? undefined : estimatedPrice,
      fechaPromesaEntrega,
      deposit: deposit?.trim() ? deposit : undefined,
      metodoPagoAnticipo: deposit?.trim() ? metodoPagoAnticipo : undefined,
      clienteId: selectedClient.id?.trim() ? selectedClient.id : undefined,
      technician: selectedTechnician !== "Sin asignar" ? selectedTechnician : undefined,
      securityType: security.type,
      securityValue: security.value,
      notasInternas: notasInternas?.trim() ? notasInternas.trim() : undefined,
      checklistIngreso,
      checklist_pro: checklistProHealth,
      photos: photoB64,
      servicios: serviciosProEnabled
        ? selectedServices.map((s) => ({ servicio_id: s.servicio_id, cantidad: s.cantidad }))
        : [],
    }
    if (folio.trim()) input.folio = folio.trim()
    return input
  }, [
    selectedClient,
    showCustomBrand,
    customBrand,
    selectedBrand,
    tipo_equipo,
    deviceModel,
    imeiValue,
    problemDesc,
    ingresoACotizar,
    estimatedPrice,
    fechaPromesaEntrega,
    deposit,
    selectedTechnician,
    security,
    notasInternas,
    checklistIngreso,
    checklistProHealth,
    photos,
    folio,
  ])

  const handleClientFound = useCallback((client: ClienteBasico | null) => {
    setSelectedClient(client)
  }, [])

  /** Click en el badge PUBLICO GENERAL: guia al empleado al buscador de la
   *  active top bar en vez de permitir capturar el cliente a la antigua. */
  const handleFocusCustomerSearch = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      window.scrollTo(0, 0)
    }
    window.dispatchEvent(new CustomEvent("tc:focus-customer-search"))
  }, [])

  const brandFilled = useMemo(
    () => (showCustomBrand ? customBrand.trim().length > 0 : selectedBrand.trim().length > 0),
    [showCustomBrand, customBrand, selectedBrand],
  )
  const recommendedBrands = useMemo(() => getRecommendedRepairBrands(tipo_equipo), [tipo_equipo])

  useEffect(() => {
    if (!selectedBrand || showCustomBrand) return
    if (recommendedBrands.includes(selectedBrand)) return
    setCustomBrand(selectedBrand)
    setSelectedBrand("")
    setShowCustomBrand(true)
  }, [recommendedBrands, selectedBrand, showCustomBrand])

  const criticalItems = useMemo(() => {
    const items: { key: string; label: string; done: boolean }[] = []
    items.push({ key: "cliente", label: "Cliente", done: isClientDataValid })
    items.push({ key: "equipo", label: "Equipo", done: Boolean(tipo_equipo) })
    items.push({ key: "marca", label: "Marca", done: brandFilled })
    items.push({ key: "falla", label: "Falla", done: problemDesc.trim().length > 0 })
    if (isModal) {
      items.push({
        key: "revision",
        label: "Revision rapida",
        done: checklistIngreso.encendido !== null,
      })
    }
    return items
  }, [isClientDataValid, tipo_equipo, brandFilled, problemDesc, isModal, checklistIngreso.encendido])

  const pendingCriticalLabels = useMemo(
    () => criticalItems.filter((c) => !c.done).map((c) => c.label),
    [criticalItems],
  )

  const criticalReadyModal = pendingCriticalLabels.length === 0

  useEffect(() => {
    if (!editingRepairId) {
      setFolio("")
    }
    loadTechnicians()
  }, [editingRepairId])

  // Al abrir en modo edicion, cargar datos del ticket para pre-rellenar
  useEffect(() => {
    if (!editingRepairId || !isModal) return
    const load = async () => {
      setLoadingModification(true)
      const [repairResult, serviciosResult] = await Promise.all([
        getRepairDetail(editingRepairId),
        serviciosProEnabled ? getServiciosReparacion(editingRepairId) : Promise.resolve({ data: [] as Awaited<ReturnType<typeof getServiciosReparacion>>["data"] }),
      ])
      const data = repairResult.data
      const serviciosData = serviciosResult.data
      if (data) {
        setFolio(data.folio)
        setProblemDesc(data.falla ?? "")
        setDeposit(data.anticipo != null ? String(data.anticipo) : "")
        setSecurity({
          type: (data.securityType as "none" | "pin" | "password" | "pattern" | null) ?? "none",
          value: data.securityValue ?? "",
        })
        setDeviceModel(data.deviceModel ?? "")
        setDeviceType(data.tipo_equipo ?? "")
        setImeiValue(data.imei ?? "")
        setColorValue(data.color ?? "")
        setNotasInternas(data.notasInternas?.trim() ? data.notasInternas : "")
        setFechaPromesaEntrega(data.fechaPromesaEntrega ? data.fechaPromesaEntrega.slice(0, 10) : toDateInputValue())
        setChecklistIngreso(ensureChecklistIngreso(data.tipo_equipo ?? "", data.checklistIngreso ?? null))
        setSelectedTechnician(data.tecnico && data.tecnico !== "No asignado" ? data.tecnico : "Sin asignar")
        setExistingPhotos(data.fotos ?? [])
        const displayUrls = data.fotosSignedUrls?.length ? data.fotosSignedUrls : (data.fotos ?? [])
        setExistingPhotosDisplay(displayUrls)
        setRemovedPhotos([])
        // Brand: check if it matches the recommended list for the selected device type or use custom.
        const knownBrands = getRecommendedRepairBrands(data.tipo_equipo ?? "")
        const brand = data.deviceBrand ?? ""
        if (knownBrands.includes(brand)) {
          setSelectedBrand(brand)
          setShowCustomBrand(false)
          setCustomBrand("")
        } else if (brand) {
          setSelectedBrand("")
          setShowCustomBrand(true)
          setCustomBrand(brand)
        } else {
          setSelectedBrand("")
          setShowCustomBrand(false)
          setCustomBrand("")
        }
        setSelectedClient({
          id: "",
          nombre: data.clienteName ?? "",
          telefono: data.clientePhone ?? "",
          correo: data.clienteEmail ?? "",
        })
        const hasPendingBudget = data.estimatedPrice == null || Number(data.estimatedPrice) <= 0
        setIngresoACotizar(hasPendingBudget)
        // Load linked services and split stored total into services + extra
        if (serviciosProEnabled && serviciosData && serviciosData.length > 0) {
          const mapped = serviciosData.map((s) => ({
            servicio_id: s.servicio_id ?? "",
            nombre: s.nombre_snapshot,
            precio: s.precio_snapshot,
            cantidad: s.cantidad,
          }))
          setSelectedServices(mapped)
          const totalServ = mapped.reduce((sum, s) => sum + s.precio * s.cantidad, 0)
          const storedTotal = hasPendingBudget ? 0 : Number(data.estimatedPrice)
          const extra = Math.max(0, storedTotal - totalServ)
          setEstimatedPrice(extra > 0 ? String(extra) : "")
        } else {
          setSelectedServices([])
          setEstimatedPrice(hasPendingBudget ? "" : String(data.estimatedPrice))
        }
      }
      setLoadingModification(false)
    }
    load()
  }, [editingRepairId, isModal])

  const loadTechnicians = async () => {
    try {
      const result = await getAllActiveTechnicians()
      setTechnicians(result.technicians || [])
    } catch (error) {
      console.error("Error loading technicians:", error)
    } finally {
      setLoadingTechnicians(false)
    }
  }

  function handleReset() {
    if (!editingRepairId) {
      void clearNuevaReparacionDraft()
      setFolio("")
      setBootstrapRepairId(null)
    }
    setShowSuccessDialog(false)
    setSuccessPayload(null)
    setSubmitted(false)
    setSaving(false)
    setRegisterErrorOpen(false)
    setRegisterErrorDetail("")
    setSelectedClient(null)
    setPhotos([])
    setDeviceType("")
    setProblemDesc("")
    setIsReingreso(false)
    setPreviousFolio("")
    setEstimatedPrice("")
    setDeposit("")
    setSelectedBrand("")
    setShowCustomBrand(false)
    setCustomBrand("")
    setDeviceModel("")
    setImeiValue("")
    setColorValue("")
    setNotasInternas("")
    setFechaPromesaEntrega(toDateInputValue())
    setChecklistIngreso(ensureChecklistIngreso("", null))
    setChecklistProHealth({ funcional: {}, expressOmitReason: null })
    setSecurity({ type: "none", value: "" })
    setSelectedTechnician("Sin asignar")
    setExistingPhotos([])
    setExistingPhotosDisplay([])
    setRemovedPhotos([])
    setIngresoACotizar(false)
    setSelectedServices([])
  }

  function buildReceiptFromSuccess(p: RepairSuccessPayload): RepairIntakeTicketData {
    return {
      folio: p.folio,
      date: new Date().toLocaleDateString("es-MX", {
        year: "numeric", month: "long", day: "numeric",
      }),
      customerName: p.customerName,
      customerPhone: p.customerPhone,
      deviceType: p.tipo_equipo,
      deviceBrand: p.deviceBrand,
      deviceModel: p.deviceModel,
      imei: undefined,
      color: undefined,
      reportedFault: p.reportedFault,
      estimatedPrice: p.estimatedPrice || undefined,
      deposit: p.deposit?.trim() ? p.deposit : undefined,
      repairId: p.repairId,
      trackingUrl: `${getPublicAppBaseUrl()}/track/${encodeURIComponent(p.repairId)}`,
      checklistIngreso: p.checklistIngreso ? {
        ...p.checklistIngreso,
        encendido: p.checklistIngreso.encendido ?? undefined,
      } : undefined,
    }
  }

  // Ref declarado para satisfaser el callback `tauriPrint` (rama inactiva en el SaaS:
  // isTauriAvailable() siempre devuelve false, asi que el callback lanza "Tauri no
  // disponible" antes de tocar este ref). El fork Tauri desktop debe re-poblar el DOM
  // oculto que consume este ref al integrarse. Ver /DISABLED/components/dashboard/
  // nueva-reparacion-form-hidden-div.txt para el bloque extraido.
  const hiddenTicketRef = useRef<HTMLDivElement>(null)

  async function handlePrintTicketSuccess() {
    const folio = successPayload?.folio?.trim()
    if (!folio) return
    const repairData = successPayload ? buildReceiptFromSuccess(successPayload) : null
    const result = await printWithProvider({
      directPrintConfig: parseDirectPrintConfig(shopSettings?.impresion_config?.directPrint),
      tenantId: shopSettings?.taller_id,
      daemonPrint: async (config, tenantId) => {
        if (!repairData) throw new Error("Datos de ticket no disponibles")
        const contentBase64 = buildRepairIntakeEscposBase64({
          data: repairData,
          business: {
            name: shopSettings?.nombre_taller || "Mi Taller",
            phone: shopSettings?.telefono || "",
            terminosGarantia: shopSettings?.terminos_garantia || undefined,
            mensajeDespedida: shopSettings?.mensaje_despedida || undefined,
          },
          paperWidth: config.paperWidth,
        })
        await printEscposWithDaemon({
          jobId: folio,
          tenantId,
          source: "reparaciones.ticket",
          contentBase64,
          config,
        })
      },
      tauriPrint: async () => {
        if (!(await isTauriAvailable())) throw new Error("Tauri no disponible")
        const { settings } = await getTallerSettings()
        const printerName = settings?.impresora_ticket?.trim()
        if (!printerName) throw new Error("Impresora no configurada")
        flushSync(() => {})
        await new Promise<void>((resolve) => setTimeout(resolve, 100))
        if (!hiddenTicketRef.current) throw new Error("Vista de ticket no disponible")
        const base64 = await domToPngBase64(hiddenTicketRef.current, { pixelRatio: 2 })
        await printEscposImage(printerName, base64, 576)
      },
      webPrint: () => {
        window.open(`/print-ticket/${encodeURIComponent(folio)}`, "_blank", "noopener,noreferrer,width=400,height=700")
      },
    })

    if (result.provider === "tauri") {
      toast({ title: "Ticket enviado a impresora" })
    } else if (result.usedFallback) {
      toast({
        title: "Impresion web en uso",
        description: `${result.errorMessage || "Se uso impresion web como respaldo."}`,
      })
    }
  }

  async function handlePrintLabelSuccess() {
    if (!successPayload?.repairId?.trim() || !successPayload?.folio?.trim()) return

    const result = await printWithProvider({
      webPrint: fallbackPrintLabel,
    })

    if (result.usedFallback) {
      toast({
        title: "Impresion web en uso",
        description: `${result.errorMessage || "Se uso impresion web como respaldo."}`,
      })
    }
  }

  function fallbackPrintLabel() {
    if (!successPayload?.repairId?.trim() || !successPayload?.folio?.trim()) return

    // Derivar accessCode desde el estado de seguridad capturado en el formulario
    const st = (security.type ?? "").toLowerCase()
    const sv = (security.value ?? "").trim()
    let accessCode: string | null = null
    if (sv && st && st !== "none") {
      if (st === "pattern") accessCode = `PATRON: ${sv}`
      else if (st === "pin") accessCode = `PIN: ${sv}`
      else accessCode = `PASS: ${sv}`
    }

    const labelData: RepairOrderLabelProData = {
      kind: "repair-label-pro",
      shopName: shopSettings?.nombre_taller || null,
      folio: successPayload.folio,
      entryDate: new Date().toISOString(),
      deviceType: successPayload.tipo_equipo || tipo_equipo || null,
      deviceDescription: `${successPayload.deviceBrand} ${successPayload.deviceModel}`.trim() || "",
      customerName: successPayload.customerName,
      customerPhone: successPayload.customerPhone || "",
      reportedFault: successPayload.reportedFault || "",
      estimatedBudget: successPayload.estimatedPrice != null ? Number(successPayload.estimatedPrice) : null,
      accessCode,
    }
    window.localStorage.setItem("printLabel", JSON.stringify(labelData))
    window.open("/print-label", "_blank", "noopener,noreferrer,width=520,height=300")
  }

  /** Cierra el modal de exito, resetea el formulario y notifica al padre (lista / cierre modal) */
  function handleCloseSuccessDialog() {
    const rid = successPayload?.repairId
    setShowSuccessDialog(false)
    setSuccessPayload(null)
    setSubmitted(false)
    handleReset()
    if (rid) onSuccess?.(rid)
    if (!isModal) {
      router.push("/dashboard")
    }
  }

  function handleSendWhatsAppSuccess() {
    if (!successPayload?.repairId?.trim() || !successPayload?.folio?.trim()) return
    if (!successPayload.customerPhone || successPayload.customerPhone.replace(/\D/g, "").length < 6) {
      toast({ title: "Telefono invalido", description: "Se requiere un numero de telefono valido para enviar WhatsApp.", variant: "destructive" })
      return
    }
    void openRepairWelcomeWhatsApp(successPayload)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isPageFirstLayout && pendingCriticalLabels.length > 0) {
      toast({
        title: "Completa lo necesario para guardar",
        description: `Falta: ${pendingCriticalLabels.join(", ")}.`,
        variant: "warning",
      })
      return
    }

    if (!e.currentTarget.reportValidity()) {
      return
    }

    setSaving(true)
    setRegisterErrorOpen(false)

    const effectiveEditEarly = editingRepairId || bootstrapRepairId

    try {
      if (
        onSubmitProp &&
        isModal &&
        !effectiveEditEarly &&
        typeof navigator !== "undefined" &&
        !navigator.onLine
      ) {
        const input = await buildCreateRepairInputFromForm()
        await enqueueRepairQueueItem(input)
        await clearNuevaReparacionDraft()
        setEmergencyModalOpen(true)
        setSaving(false)
        handleReset()
        return
      }

      if (
        effectiveEditEarly &&
        typeof navigator !== "undefined" &&
        !navigator.onLine
      ) {
        showRegisterError(
          "Sin conexion no se pueden guardar los cambios del ticket. Espera a recuperar la senal o revisa tu red.",
        )
        setSaving(false)
        return
      }

      const formData = new FormData(e.currentTarget)
      formData.set("clienteId", selectedClient?.id || "")
      formData.set("clienteNombre", selectedClient?.nombre || "")
      formData.set("clienteTelefono", selectedClient?.telefono || "")
      formData.set("isReingreso", isReingreso.toString())
      formData.set("previousFolio", previousFolio || "")
      const effectiveEdit = editingRepairId || bootstrapRepairId
      if (effectiveEdit) {
        formData.set("editingRepairId", effectiveEdit)
        formData.set("existingPhotos", JSON.stringify(existingPhotos))
        formData.set("removedPhotos", JSON.stringify(removedPhotos))
      }

      // Add photos
      photos.forEach((photo, index) => {
        formData.append(`photo_${index}`, photo)
      })

      const manualBudget = parseFloat((formData.get("estimated-price") as string) || "0") || 0
      const effectiveBudget = serviciosTotal + manualBudget
      if (!ingresoACotizar && effectiveBudget <= 0) {
        showRegisterError("Ingresa un presupuesto mayor a 0 o marca Presupuesto pendiente.")
        setSaving(false)
        return
      }
      if (ingresoACotizar) {
        formData.set("estimated-price", "")
      }
      formData.set("notas-internas", notasInternas.trim())
      formData.set("metodo-pago-anticipo", metodoPagoAnticipo)

      if (isModal) {
        formData.set("checklist-ingreso", JSON.stringify(checklistIngresoToJson(checklistIngreso)))
        formData.set("checklist-pro-json", JSON.stringify(checklistProHealth))
      }

      // Incluir servicios del catalogo en formData + total estimado
      if (serviciosProEnabled) {
        formData.set("servicios", JSON.stringify(
          selectedServices.map((s) => ({ servicio_id: s.servicio_id, cantidad: s.cantidad }))
        ))
        if (!ingresoACotizar) {
          const currentEst = parseFloat(formData.get("estimated-price") as string || "0")
          const totalConServicios = serviciosTotal + (isNaN(currentEst) ? 0 : currentEst)
          formData.set("estimated-price", String(totalConServicios))
        }
      }

      if (onSubmitProp) {
        const out = await onSubmitProp(formData)
        setSaving(false)

        if (effectiveEdit && out?.repairId) {
          setSubmitted(true)
          onSuccess?.(out.repairId)
        } else if (!effectiveEdit && out?.repairId && out?.folio) {
          void clearNuevaReparacionDraft()
          const nameCliente =
            ((formData.get("clienteNombre") as string) || "").trim() ||
            ((formData.get("customer-name") as string) || "").trim() ||
            selectedClient?.nombre ||
            ""
          const telRaw =
            ((formData.get("clienteTelefono") as string) || "").trim() ||
            ((formData.get("customer-phone") as string) || "").trim() ||
            selectedClient?.telefono ||
            ""
          setSuccessPayload({
            folio: out.folio,
            repairId: out.repairId,
            customerName: nameCliente,
            customerPhone: telRaw.replace(/\D/g, ""),
            countryCode: getCodigoTelefono(shopSettings?.pais) ?? undefined,
            deviceBrand: (formData.get("brand") as string) || "",
            deviceModel: (formData.get("model") as string) || "",
            tipo_equipo: tipo_equipo || undefined,
            reportedFault: (formData.get("problem-desc") as string) || "",
            estimatedPrice: (formData.get("estimated-price") as string) || "",
            deposit: (formData.get("deposit") as string) || "",
            checklistIngreso: isModal ? checklistIngreso : undefined,
          })
          await triggerVictoryLaunch()
          setShowSuccessDialog(true)
        } else if (!effectiveEdit && out && (!out.repairId || !out.folio)) {
          showRegisterError("No se recibio el folio de la orden. Intenta de nuevo.")
        }
      } else {
        setSubmitted(true)
        setSaving(false)
      }
    } catch (error) {
      console.error("Error submitting repair form:", error)
      const raw = error instanceof Error ? error.message : String(error)
      const errorMsg =
        raw.includes("An error occurred in the Server Components render") ||
        raw.includes("omitted in production")
          ? "Error al guardar (el servidor no expuso el detalle en produccion). Revisa sesion, columnas en BD o intenta sin fotos. En desarrollo veras el error real en la consola."
          : raw.trim() || "Error al guardar el ticket"
      showRegisterError(errorMsg)
      setSaving(false)
    }
  }

  const handleGallerySelection = async (incomingFiles: File[] | FileList) => {
    setCompressingPhotos(true)
    try {
      const totalUsed = existingPhotos.length + photos.length
      const processedFiles = await prepareGalleryFiles(incomingFiles, {
        currentCount: totalUsed,
        maxFiles: 3,
      })

      if (processedFiles.length === 0) {
        toast({
          variant: "destructive",
          title: totalUsed >= 3 ? "Limite de fotos" : "No se detectaron imagenes",
          description:
            totalUsed >= 3
              ? "Ya alcanzaste el maximo de 3 fotos por ticket."
              : "Intenta de nuevo o selecciona archivos de imagen validos.",
        })
        return
      }
      setPhotos((prev) => [...prev, ...processedFiles].slice(0, 3))
    } catch {
      toast({
        variant: "destructive",
        title: "No se pudo guardar la foto",
        description: "Intenta de nuevo o sube una imagen desde la galeria.",
      })
    } finally {
      setCompressingPhotos(false)
    }
  }

  const openCamera = () => {
    beginCameraTrace("nueva-reparacion")
    setCameraOpen(true)
  }

  const renderEmergencyModal = () => (
    <Dialog open={emergencyModalOpen} onOpenChange={setEmergencyModalOpen}>
      <DialogContent
        showCloseButton
        className="z-[110] max-w-md border border-amber-200 bg-white text-slate-900 shadow-xl"
      >
        <DialogHeader>
          <DialogTitle className="text-slate-900">Modo de Emergencia Activo</DialogTitle>
          <DialogDescription className="text-slate-600">
            Guardando localmente. El ticket quedo en cola y se subira cuando vuelva la conexion.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setEmergencyModalOpen(false)}
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const repairVictoryDialog = (
    <VictoryLaunchSuccessDialog
      open={showSuccessDialog && !!successPayload}
      onOpenChange={(open) => {
        if (!open) handleCloseSuccessDialog()
      }}
      payload={successPayload}
      onPrintTicket={handlePrintTicketSuccess}
      onPrintLabel={handlePrintLabelSuccess}
      onSendWhatsApp={handleSendWhatsAppSuccess}
      onDone={handleCloseSuccessDialog}
    />
  )

  const registerErrorDialog = (
    <AlertDialog open={registerErrorOpen} onOpenChange={setRegisterErrorOpen}>
      <AlertDialogContent overlayClassName="z-[200]" className="z-[200] sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold text-slate-900">
            Error al registrar el ticket
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <p className="text-base leading-relaxed text-slate-800">
              <span className="break-words">{registerErrorDetail}</span>
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setRegisterErrorOpen(false)}
          >
            Entendido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (isModal) {
    return (
      <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <form
        ref={modalFormRef}
        onSubmit={handleSubmit}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >

        {/* Hidden inputs for FormData */}
        <input type="hidden" name="folio" value={folio} />
        <input type="hidden" name="clienteId" value={selectedClient?.id || ""} />
        <input type="hidden" name="clienteNombre" value={selectedClient?.nombre || ""} />
        <input type="hidden" name="clienteTelefono" value={selectedClient?.telefono || ""} />
        <input type="hidden" name="customer-email" value={selectedClient?.correo || ""} />
        <input type="hidden" name="checklist-pro-json" value={JSON.stringify(checklistProHealth)} readOnly />

        {isPageFirstLayout ? (
          <div className="shrink-0 border-b border-slate-200 bg-[#eef2f8]/95 px-3 pb-3 pt-2 backdrop-blur sm:px-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/reparaciones")}
                  className="h-10 rounded-full border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a reparaciones
                </Button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end xl:shrink-0">
                {!hasRepairId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleReset}
                    disabled={saving}
                    className="h-10 rounded-full px-4 text-sm text-slate-500 hover:bg-white hover:text-slate-700"
                  >
                    Limpiar
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  disabled={saving}
                  className="btn-glow h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold uppercase tracking-tight text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving
                    ? photos.length > 0 || (hasRepairId && existingPhotos.length > 0)
                      ? "Subiendo fotos..."
                      : "Guardando..."
                    : "Guardar"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Cuerpo: scroll interno; el dialogo usa max-h sin hueco inferior extra ── */}
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-0 pt-2 sm:px-4 sm:pt-3">
          <div className="w-full min-w-0 space-y-2">
          <div
            className={cn(
              "grid min-w-0 grid-cols-1 items-start gap-3",
              isPageFirstLayout
                ? "xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)_minmax(320px,0.88fr)]"
                : "lg:grid-cols-1 xl:grid-cols-3 xl:gap-2",
            )}
          >
            {/* ── Columna 1: Cliente y Equipo ── */}
            <div className="flex flex-col gap-1.5">
            <Card
              className={cn(
                "min-w-0 w-full overflow-hidden border border-slate-200 bg-white shadow-sm transition-shadow",
                !isPageFirstLayout &&
                  !isClientDataValid &&
                  "ring-2 ring-blue-500/35 ring-offset-1 focus-within:ring-blue-500/50",
              )}
            >
            <CardContent className={cn("space-y-3 p-3 sm:p-4", isPageFirstLayout && "space-y-4")}>
              <div className="mb-1 flex items-center gap-2 border-b border-slate-100 pb-2">
                <User className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                <h2 className="text-[11px] font-semibold tracking-[0.18em] text-slate-700">
                  CLIENTE Y EQUIPO
                </h2>
              </div>
              {!isPageFirstLayout && <ActiveCustomerIndicator compact />}
              {isPageFirstLayout ? (
                selectedClient ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3 py-3 shadow-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                        <User className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          Cliente en sesion
                        </p>
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {selectedClient.nombre}
                        </p>
                        <p className="truncate text-xs text-slate-600">{selectedClient.telefono}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleFocusCustomerSearch}
                    aria-label="Buscar cliente en la barra superior"
                    className="group flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/70 px-3 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm transition-colors group-hover:bg-blue-100">
                      <Search className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                        Cliente en sesion
                      </p>
                      <p className="truncate text-sm font-bold text-slate-900">
                        Publico general
                      </p>
                      <p className="truncate text-xs font-medium text-slate-600">
                        Toca aqui para identificar al cliente en la barra superior.
                      </p>
                    </div>
                    <ArrowUp
                      className="h-4 w-4 shrink-0 text-blue-500 transition-transform group-hover:-translate-y-0.5"
                      aria-hidden
                    />
                  </button>
                )
              ) : null}
              {/**
               * En page-first, el cliente SIEMPRE viene de la active top bar:
               *  - Con cliente en sesion: shouldUseSessionPriorityClient = true -> ya oculto
               *  - Sin cliente (PUBLICO GENERAL): el badge CTA de arriba guia al
               *    usuario al buscador; no mostramos campos libres que inviten a
               *    capturar el cliente "a la antigua".
               * En flujos no-page-first (modal clasico) seguimos mostrando el
               * ClientAutocomplete normal para no romper la captura libre.
               */}
              {!isPageFirstLayout && !shouldUseSessionPriorityClient && (
                <div className="space-y-2">
                  <ClientAutocomplete
                    onClientFound={handleClientFound}
                    initialClient={selectedClient}
                    compact
                  />
                </div>
              )}

            <div className="space-y-2 border-t border-slate-100 pt-2">
              <Label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Detalles del equipo
              </Label>
              <div
                className={cn(
                  "grid grid-cols-1 gap-2",
                  isPageFirstLayout
                    ? "sm:grid-cols-[minmax(150px,0.9fr)_minmax(240px,1.45fr)_minmax(150px,0.95fr)]"
                    : "sm:grid-cols-2",
                )}
              >
                <Select
                  name="device-type"
                  value={tipo_equipo}
                  onValueChange={(v) => {
                    setDeviceType(v)
                    setChecklistIngreso((prev) => ensureChecklistIngreso(v, prev))
                  }}
                  required
                >
                  <SelectTrigger
                    className={cn(
                      "h-11 w-full min-w-[136px] rounded-lg border-slate-200 bg-white px-3 py-0 text-base md:text-sm focus:ring-2 focus:ring-blue-500/60 focus:ring-offset-0",
                      !tipo_equipo && "ring-2 ring-blue-500/40 focus-visible:ring-blue-600/70",
                    )}
                  >
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Celular">?? Celular</SelectItem>
                    <SelectItem value="Tablet">?? Tablet</SelectItem>
                    <SelectItem value="Laptop">?? Laptop</SelectItem>
                    <SelectItem value="Videojuego">?? Videojuego</SelectItem>
                    <SelectItem value="Impresora">??? Impresora</SelectItem>
                    <SelectItem value="Reloj">? Reloj</SelectItem>
                    <SelectItem value="Computadora">??? Computadora</SelectItem>
                    <SelectItem value="Proyector">??? Proyector</SelectItem>
                    <SelectItem value="Otro">?? Otro</SelectItem>
                  </SelectContent>
                </Select>

                {!showCustomBrand ? (
                  <Select
                    value={selectedBrand}
                    onValueChange={(value) => {
                      if (value === "otra") {
                        setShowCustomBrand(true)
                        setSelectedBrand("")
                        setCustomBrand("")
                      } else if (value) {
                        setShowCustomBrand(false)
                        setSelectedBrand(value)
                        setCustomBrand("")
                      }
                    }}
                    required
                  >
                    <SelectTrigger
                      className={cn(
                        "h-11 w-full min-w-[220px] rounded-lg border-slate-200 bg-white px-3 py-0 text-base md:text-sm focus:ring-2 focus:ring-blue-500/60 focus:ring-offset-0",
                        !brandFilled && "ring-2 ring-blue-500/40 focus-visible:ring-blue-600/70",
                      )}
                    >
                      <SelectValue placeholder="Marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {recommendedBrands.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                      <SelectItem value="otra">Otra</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-1.5">
                    <Select
                      value="otra"
                      onValueChange={(value) => {
                        if (value !== "otra") {
                          setShowCustomBrand(false)
                          setSelectedBrand(value)
                          setCustomBrand("")
                        }
                      }}
                      required
                    >
                    <SelectTrigger
                      className={cn(
                        "h-11 w-[132px] shrink-0 rounded-lg border-slate-200 bg-white px-3 py-0 text-base md:text-sm focus:ring-2 focus:ring-blue-500/60 focus:ring-offset-0",
                        !customBrand.trim() && "ring-2 ring-blue-500/40 focus-visible:ring-blue-600/70",
                      )}
                    >
                      <SelectValue placeholder="Marca" />
                    </SelectTrigger>
                      <SelectContent>
                        {recommendedBrands.map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))}
                        <SelectItem value="otra">Otra</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Especifica la marca"
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      className={cn(
                        "h-11 min-w-0 flex-1 rounded-lg border-slate-200 bg-white px-2.5 text-base md:text-sm focus-visible:ring-2 focus-visible:ring-blue-500/60",
                        !customBrand.trim() && "ring-2 ring-blue-500/40 focus-visible:ring-blue-600/70",
                      )}
                      required
                    />
                  </div>
                )}

                {isPageFirstLayout ? (
                  <Select
                    value={colorValue}
                    onValueChange={(v) => setColorValue(v)}
                  >
                    <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-3 py-0 text-base md:text-sm focus:ring-2 focus:ring-blue-500/60 focus:ring-offset-0">
                      <SelectValue placeholder="Color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Negro">? Negro</SelectItem>
                      <SelectItem value="Blanco">? Blanco</SelectItem>
                      <SelectItem value="Gris">?? Plata</SelectItem>
                      <SelectItem value="Azul">?? Azul</SelectItem>
                      <SelectItem value="Rojo">?? Rojo</SelectItem>
                      <SelectItem value="Dorado">?? Dorado</SelectItem>
                      <SelectItem value="Verde">?? Verde</SelectItem>
                      <SelectItem value="Rosa">?? Rosa</SelectItem>
                      <SelectItem value="Otro">?? Otro</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
              <input type="hidden" name="brand" value={showCustomBrand ? customBrand : selectedBrand} />
              <input type="hidden" name="color" value={colorValue} />
              {isPageFirstLayout ? (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(240px,1fr)_minmax(300px,1.15fr)]">
                    <Input
                      name="model"
                      placeholder="Modelo (Ej: S21 Ultra)"
                      className="h-11 rounded-lg border-slate-200 bg-white px-2.5 text-base md:text-sm focus-visible:ring-2 focus-visible:ring-blue-500/60"
                      value={deviceModel}
                      onChange={(e) => setDeviceModel(e.target.value)}
                    />
                    <div className="relative">
                      {/* Futuro: comparar TAC del IMEI (primeros 8 digitos) contra una base local para sugerir marca y modelo automaticamente. */}
                      <Input
                        name="imei"
                        placeholder="IMEI / Serial"
                        className="h-11 rounded-lg border-slate-200 bg-white px-2.5 pr-12 text-base md:text-sm focus-visible:ring-2 focus-visible:ring-blue-500/60"
                        value={imeiValue}
                        onChange={(e) => setImeiValue(e.target.value)}
                      />
                      <div className="absolute inset-y-0 right-1.5 flex items-center">
                        <ProBarcodeButton
                          onScan={(code) => setImeiValue(code)}
                          buttonSize="compact"
                          iconSize="md"
                          enabledTooltip="Escanear IMEI o codigo con la camara"
                          ariaLabel="Escanear IMEI o codigo"
                          className="bg-blue-50 text-blue-500 hover:bg-blue-600 hover:text-blue-700"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-1">
                <Input
                  name="model"
                  placeholder="Modelo (Ej: S21 Ultra)"
                  className="h-11 rounded-lg border-slate-200 bg-white px-2.5 text-base md:text-sm focus-visible:ring-2 focus-visible:ring-blue-500/60"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(110px,0.8fr)]">
                  <Input
                    name="imei"
                    placeholder="IMEI / Serial"
                    className="h-11 rounded-lg border-slate-200 bg-white px-2.5 text-base md:text-sm focus-visible:ring-2 focus-visible:ring-blue-500/60"
                    value={imeiValue}
                    onChange={(e) => setImeiValue(e.target.value)}
                  />
                  <Select
                    value={colorValue}
                    onValueChange={(v) => setColorValue(v)}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-11 rounded-lg border-slate-200 bg-white py-0 text-base md:text-sm focus:ring-2 focus:ring-blue-500/60 focus:ring-offset-0",
                      )}
                    >
                      <SelectValue placeholder="Color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Negro">? Negro</SelectItem>
                      <SelectItem value="Blanco">? Blanco</SelectItem>
                      <SelectItem value="Gris">?? Plata</SelectItem>
                      <SelectItem value="Azul">?? Azul</SelectItem>
                      <SelectItem value="Rojo">?? Rojo</SelectItem>
                      <SelectItem value="Dorado">?? Dorado</SelectItem>
                      <SelectItem value="Verde">?? Verde</SelectItem>
                      <SelectItem value="Rosa">?? Rosa</SelectItem>
                      <SelectItem value="Otro">?? Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                </div>
              )}
            </div>

            <input type="hidden" name="notas-internas" value={notasInternas} />

            <div className="border-t border-slate-100 pt-2">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Seguridad (PIN / contrasena)
              </p>
              <SecurityInputV2
                value={security}
                onChange={handleSecurityChange}
                patternPlacement="external"
                onRequestPatternEditor={() => setPatternModalOpen(true)}
                className="w-full min-w-0 max-w-none border-slate-200 bg-slate-50/50 p-2.5 shadow-sm"
              />
            </div>
            </CardContent>
          </Card>
            </div>

            {/* ── Columna 2: Diagnostico Tecnico ── */}
            <div className="flex flex-col gap-1.5">
            <Card className="min-w-0 w-full overflow-hidden border border-slate-200 bg-white shadow-sm">
              <CardContent className={cn("space-y-3 p-3 sm:p-4", isPageFirstLayout && "space-y-4")}>
                <div className="mb-1 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Wrench className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                  <h2 className="text-[11px] font-semibold tracking-[0.18em] text-slate-700">
                    DIAGNOSTICO
                  </h2>
                </div>

              <div className="space-y-1">
                <Label
                  htmlFor="modal-technician-select"
                  className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  <UserCog className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
                  Tecnico asignado
                </Label>
                <Select name="technician" value={selectedTechnician} onValueChange={setSelectedTechnician}>
                  <SelectTrigger
                    id="modal-technician-select"
                    className="h-11 w-full rounded-lg border-slate-200 bg-white py-0 text-base md:text-sm focus:ring-2 focus:ring-blue-500/60 focus:ring-offset-0"
                  >
                    <SelectValue placeholder="Sin asignar" />
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

              <div className="space-y-1">
                <Label
                  htmlFor="fecha-promesa-entrega"
                  className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Fecha estimada de entrega
                </Label>
                <Input
                  id="fecha-promesa-entrega"
                  name="fecha-promesa-entrega"
                  type="date"
                  value={fechaPromesaEntrega}
                  onChange={(e) => setFechaPromesaEntrega(e.target.value)}
                  className="h-11 rounded-lg border-slate-200 bg-white px-2.5 text-base md:text-sm focus-visible:ring-2 focus-visible:ring-blue-500/60"
                />
                <p className="text-[11px] text-slate-500">
                  Se mostrara en Agenda de hoy cuando llegue esta fecha.
                </p>
              </div>

              <div
                className={cn(
                  "rounded-xl border border-slate-200 bg-slate-50/60 p-2 transition-shadow",
                  checklistIngreso.encendido === null && "ring-2 ring-blue-500/40 ring-offset-0",
                )}
              >
                <RevisionRapidaEncendido value={checklistIngreso} onChange={setChecklistIngreso} variant="icons" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Falla reportada
                </Label>
                <Textarea
                  name="problem-desc"
                  placeholder="Describe la falla del equipo..."
                  className={cn(
                    "min-h-[min(100px,22vh)] w-full resize-y rounded-lg border-slate-200 bg-white py-2 text-base md:text-sm leading-snug focus-visible:ring-2 focus-visible:ring-blue-500/60",
                    !problemDesc.trim() && "ring-2 ring-blue-500/40 focus-visible:ring-blue-600/70",
                  )}
                  value={problemDesc}
                  onChange={(e) => setProblemDesc(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  OBSERVACIONES Y ACCESORIOS
                </Label>
                <Textarea
                  id="obs-est-modal"
                  placeholder="Golpes, rayones o accesorios"
                  className="min-h-[72px] resize-y rounded-lg border-slate-200 bg-white py-2 text-base md:text-sm"
                  value={checklistIngreso.observacionesEsteticas}
                  onChange={(e) =>
                    setChecklistIngreso((prev) => ({ ...prev, observacionesEsteticas: e.target.value }))
                  }
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-0 h-11 w-full gap-1.5 border-amber-200 bg-amber-50/90 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-100"
                onClick={() => {
                  if (!isProPlan) {
                    router.push("/dashboard/facturacion?feature=health")
                    return
                  }
                  setHealthCheckOpen(true)
                }}
              >
                {isProPlan ? (
                  <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <Lock className="h-4 w-4 shrink-0 text-amber-800" aria-hidden />
                )}
                Iniciar Health Check PRO
              </Button>
            </CardContent>
          </Card>
            </div>

            {/* ── Columna 3: Precios + Servicios + Evidencia ── */}
            <div className="flex flex-col gap-1.5">
              <Card className="min-w-0 w-full border border-slate-200 bg-white shadow-sm">
                <CardContent className={cn("space-y-3 p-3 sm:p-4", isPageFirstLayout && "space-y-4")}>
                  {/* Header */}
                  <div className="mb-1 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <BadgeDollarSign className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                    <h2 className="text-[11px] font-semibold tracking-[0.18em] text-slate-700">
                      PRECIOS Y EVIDENCIA
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/85 px-3 py-2.5 shadow-sm">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Modo de presupuesto
                      </p>
                      <p className="text-xs font-medium text-slate-800">
                        {ingresoACotizar ? "Pendiente de cotizacion" : "Con total estimado"}
                      </p>
                    </div>
                    <label
                      htmlFor="ingreso-cotizar"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 transition-colors hover:border-slate-300"
                    >
                      <Checkbox
                        id="ingreso-cotizar"
                        checked={ingresoACotizar}
                        onCheckedChange={(v) => setIngresoACotizar(v === true)}
                      />
                      Presupuesto pendiente
                    </label>
                  </div>

                  {/* 2. Servicios (PRO) */}
                  {serviciosProEnabled ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Catalogo de servicios
                          </p>
                          <p className="text-[11px] text-slate-600">Agrega refacciones o mano de obra sugerida.</p>
                        </div>
                        <Badge className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-purple-700 shadow-none">
                          Pro
                        </Badge>
                      </div>
                      <ServiceSelector selected={selectedServices} onChange={setSelectedServices} />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Catalogo de servicios
                        </p>
                        <Badge className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-purple-700 shadow-none">
                          Pro
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-700">
                        Disponible solo en plan PRO.
                        {PRO_FEATURES_TEMP_DISABLED ? " Temporalmente desactivado para el MVP." : ""}
                      </p>
                    </div>
                  )}

                  {/* 3. Desglose + Total */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1.5 rounded-lg bg-slate-50/70 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-600">
                          Servicios del catalogo
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          ${serviciosTotal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <Label
                            htmlFor="estimated-price"
                            className="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                          >
                            Presupuesto adicional
                          </Label>
                          <Input
                            id="estimated-price"
                            name="estimated-price"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="Mano de obra, refacciones"
                            value={estimatedPrice}
                            onChange={(e) => setEstimatedPrice(e.target.value)}
                            disabled={ingresoACotizar}
                            className={cn(
                              "h-11 w-full rounded-lg border-slate-200 bg-white px-2.5 text-base md:text-sm focus-visible:ring-2 focus-visible:ring-blue-500/60",
                              ingresoACotizar && "cursor-not-allowed opacity-50",
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Total estimado */}
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Total estimado
                      </span>
                      {ingresoACotizar ? (
                        <span className="text-sm font-bold text-amber-600">Pendiente</span>
                      ) : (
                        <span className="text-base font-black text-blue-700">
                          ${(serviciosTotal + (parseFloat(estimatedPrice || "0") || 0)).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4. Evidencia */}
                  <div className="mt-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                    <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                        Evidencia
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <ImageIconLucide className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="text-[10px] font-semibold tabular-nums text-slate-600">
                          {existingPhotos.length + photos.length}/3
                        </span>
                      </div>
                    </div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const newFiles = Array.from(e.target.files || [])
                        const totalUsed = existingPhotos.length + photos.length
                        const slot = Math.max(0, 3 - totalUsed)
                        if (slot === 0 || newFiles.length === 0) {
                          e.target.value = ""
                          return
                        }
                        const toAdd = newFiles.slice(0, slot)
                        setCompressingPhotos(true)
                        try {
                          const prepared = await prepareGalleryFiles(toAdd, {
                            currentCount: totalUsed,
                            maxFiles: 3,
                          })
                          setPhotos((prev) => [...prev, ...prepared].slice(0, 3))
                        } finally {
                          setCompressingPhotos(false)
                          e.target.value = ""
                        }
                      }}
                    />
                    <div className="px-3 pb-3">
                      <div className="grid min-h-[120px] grid-cols-3 content-start items-start gap-2 rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-inner sm:grid-cols-4">
                        {existingPhotos.map((rawUrl, index) => (
                          <div key={`existing-${index}`} className="relative aspect-square w-full min-w-0">
                            <img
                              src={existingPhotosDisplay[index] ?? rawUrl}
                              alt=""
                              className="h-full w-full rounded-md border border-slate-200 object-cover"
                            />
                            <button
                              type="button"
                              aria-label={`Quitar foto ${index + 1}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setRemovedPhotos((prev) => [...prev, rawUrl])
                                setExistingPhotos((prev) => prev.filter((_, i) => i !== index))
                                setExistingPhotosDisplay((prev) => prev.filter((_, i) => i !== index))
                              }}
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white"
                            >
                              <X className="h-2.5 w-2.5" aria-hidden />
                            </button>
                          </div>
                        ))}
                        {photos.map((photo, index) => (
                          <div key={`new-${index}`} className="relative aspect-square w-full min-w-0">
                            <img
                              src={photoUrls[index] ?? ""}
                              alt=""
                              className="h-full w-full rounded-md border border-blue-200 object-cover"
                            />
                            <button
                              type="button"
                              aria-label={`Quitar nueva ${index + 1}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setPhotos((prev) => prev.filter((_, i) => i !== index))
                              }}
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white"
                            >
                              <X className="h-2.5 w-2.5" aria-hidden />
                            </button>
                          </div>
                        ))}
                        {existingPhotos.length + photos.length < 3 && (
                          <button
                            type="button"
                            disabled={compressingPhotos}
                            onClick={() => photoInputRef.current?.click()}
                            className="flex aspect-square w-full min-w-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/80 text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50/80 disabled:opacity-50"
                            aria-label="Subir foto desde galeria"
                          >
                            <ImagePlus className="h-7 w-7" aria-hidden />
                          </button>
                        )}
                      </div>
                      {existingPhotos.length + photos.length < 3 && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={compressingPhotos}
                          onClick={openCamera}
                          className="mt-2 h-11 w-full border-slate-200 bg-white text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 gap-2"
                        >
                          <Camera className="h-4 w-4" />Abrir Camara
                        </Button>
                      )}
                      {compressingPhotos ? (
                        <p className="mt-1.5 text-center text-[10px] text-slate-500">Optimizando...</p>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          {/* NOTE: La seccion de costos se movio al componente MonitorUtilidadOperativa en la pagina de detalle */}

        </div>
        </div>
        {/* -- END scrollable content ------------------------------------------ */}

        {/* Footer checklist + crear (compacto, oro pulido) */}
        {!isPageFirstLayout ? (
        <div className="sticky bottom-0 z-30 min-h-0 shrink-0 border-t border-slate-200 bg-white px-3 py-2 shadow-[0_-1px_6px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex min-w-0 max-w-[min(100%,420px)] cursor-help flex-col items-stretch gap-1 rounded-lg border border-transparent bg-transparent p-0 text-left sm:max-w-[min(100%,520px)]"
                  >
                    {criticalReadyModal ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        Listo para crear
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        Faltan {pendingCriticalLabels.length}{" "}
                        {pendingCriticalLabels.length === 1 ? "punto" : "puntos"}
                      </span>
                    )}
                    <ul className="flex flex-wrap gap-x-1.5 gap-y-0.5" aria-label="Requisitos del ticket">
                      {criticalItems.map((item) => (
                        <li
                          key={item.key}
                          className="inline-flex items-center gap-0.5 rounded-full border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-700"
                        >
                          {item.done ? (
                            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
                          ) : (
                            <Circle className="h-3 w-3 shrink-0 text-slate-600" aria-hidden />
                          )}
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={6}
                  className="max-w-xs border border-slate-200 bg-white text-slate-900 shadow-lg"
                >
                  {criticalReadyModal ? (
                    <p className="text-xs text-slate-700">Todos los datos criticos estan completos.</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-800">
                        Faltan {pendingCriticalLabels.length}{" "}
                        {pendingCriticalLabels.length === 1 ? "elemento" : "elementos"}
                      </p>
                      <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-600">
                        {pendingCriticalLabels.map((label) => (
                          <li key={label}>{label}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:shrink-0 sm:items-center">
            {!hasRepairId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={saving}
                className="h-11 w-full text-sm text-slate-500 hover:text-slate-700 sm:w-auto"
              >
                Limpiar
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={saving || !criticalReadyModal}
              className="h-11 w-full shrink-0 rounded-xl bg-blue-600 px-5 text-sm font-semibold uppercase tracking-tight text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 btn-glow sm:w-auto sm:rounded-full"
            >
              {saving
                ? photos.length > 0 || (hasRepairId && existingPhotos.length > 0)
                  ? "Subiendo fotos..."
                  : "Guardando..."
                : hasRepairId
                  ? "Guardar Cambios"
                  : "Crear Ticket"}
            </Button>
          </div>
          </div>
        </div>
        ) : null}
      </form>
      </div>

      <ModalPatronSeguridad
        open={patternModalOpen}
        onOpenChange={setPatternModalOpen}
        initialPattern={security.type === "pattern" ? security.value : ""}
        onSave={(encoded) => {
          handleSecurityChange({ type: "pattern", value: encoded })
          toast({
            title: "Patron guardado",
            description: "La secuencia quedo registrada para este equipo.",
          })
        }}
      />

      <HealthCheckSheet
        open={healthCheckOpen}
        onOpenChange={setHealthCheckOpen}
        tipo_equipo={tipo_equipo || "Otro"}
        value={checklistProHealth}
        onChange={setChecklistProHealth}
      />

      <CameraModal
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCaptureAll={(files) => { void handleGallerySelection(files) }}
      />

      {repairVictoryDialog}
      {renderEmergencyModal()}
      {registerErrorDialog}
    </>
    )
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[calc(90vh-120px)] overflow-y-auto pr-6">
      {/* Client Section */}
      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="border-b border-border py-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Informacion del Cliente</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-5">
          <ClientAutocomplete onClientFound={handleClientFound} initialClient={selectedClient} />
          {selectedClient && (
            <div className="grid grid-cols-2 gap-3">
              <Input 
                value={selectedClient.telefono || ""} 
                disabled 
                placeholder="Telefono"
                className="text-xs"
              />
              <Input 
                value={selectedClient.correo || ""} 
                disabled 
                placeholder="Email"
                className="text-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Section */}
      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="border-b border-border py-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Datos del Equipo</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="device-type">Tipo de Dispositivo</Label>
            <Select name="device-type" required>
              <SelectTrigger id="device-type">
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Smartphone">Smartphone</SelectItem>
                <SelectItem value="Tablet">Tablet</SelectItem>
                <SelectItem value="Laptop">Laptop</SelectItem>
                <SelectItem value="Desktop">Desktop</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
                </Select>
                <input type="hidden" name="color" value={colorValue} />
              </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="brand">Marca</Label>
            <Input id="brand" name="brand" placeholder="Apple, Samsung, etc." />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="model">Modelo</Label>
            <Input id="model" name="model" placeholder="Ej: iPhone 15 Pro" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="imei">IMEI / Serial</Label>
            <Input id="imei" name="imei" placeholder="Numero IMEI o Serial" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="color">Color</Label>
            <Input id="color" name="color" placeholder="Color del dispositivo" defaultValue={colorValue} />
          </div>
        </CardContent>
      </Card>

      {/* Problem Description */}
      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="border-b border-border py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Detalles de la Falla</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="problem-desc">Descripcion del problema</Label>
            <Textarea
              id="problem-desc"
              name="problem-desc"
              placeholder="Describe la falla..."
              className="min-h-20"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Technician */}
      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="border-b border-border py-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Tecnico Asignado</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          <Select name="technician">
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tecnico" />
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="fecha-promesa-entrega-simple">Fecha estimada de entrega</Label>
            <Input
              id="fecha-promesa-entrega-simple"
              name="fecha-promesa-entrega"
              type="date"
              value={fechaPromesaEntrega}
              onChange={(e) => setFechaPromesaEntrega(e.target.value)}
            />
            <p className="text-xs text-slate-500">Inicialmente queda en hoy. Agenda de hoy usa esta fecha.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden border-slate-200 bg-white py-0">
        <CardHeader className="border-b border-slate-100 py-4">
          <CardTitle className="text-base text-slate-900">Seguridad del equipo</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            PIN, contrasena o patron para desbloqueo en taller
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <SecurityInputV2 value={security} onChange={handleSecurityChange} />
        </CardContent>
      </Card>

      {/* Investment Section */}
      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="border-b border-border py-4">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Precio acordado</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="estimated-price">Precio estimado</Label>
            <Input id="estimated-price" name="estimated-price" placeholder="0.00" type="number" step="0.01" min="0.01" />
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="border-b border-border py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📷</span>
            <CardTitle className="text-base">Fotos del Equipo</CardTitle>
          </div>
          <CardDescription>Opcional · max. 3 fotos (se optimizan automaticamente)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          <input 
            ref={photoInputRef}
            type="file" 
            accept="image/*" 
            multiple
            className="hidden"
            onChange={async (e) => {
              const newFiles = Array.from(e.target.files || [])
              const slot = Math.max(0, 3 - photos.length)
              if (slot === 0 || newFiles.length === 0) {
                e.target.value = ""
                return
              }
              const toAdd = newFiles.slice(0, slot)
              setCompressingPhotos(true)
              try {
                const prepared = await prepareGalleryFiles(toAdd, {
                  currentCount: photos.length,
                  maxFiles: 3,
                })
                setPhotos((prev) => [...prev, ...prepared].slice(0, 3))
              } finally {
                setCompressingPhotos(false)
                e.target.value = ""
              }
            }}
          />
          
          {/* Upload Area */}
          <button
            type="button"
            disabled={compressingPhotos || photos.length >= 3}
            onClick={() => photoInputRef.current?.click()}
            className={`
              w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors
              ${compressingPhotos ? "opacity-70 cursor-wait" : ""}
              ${photos.length > 0 ? 'border-border/50 bg-muted/30' : 'border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/20'}
              disabled:opacity-50
            `}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="text-3xl" aria-hidden>📤</div>
              <p className="text-sm font-medium text-foreground">
                {compressingPhotos ? "Optimizando fotos…" : "Toca aqui para subir fotos"}
              </p>
              <p className="text-xs text-muted-foreground">
                Opcional · max. 3 fotos · se optimizan automaticamente
              </p>
            </div>
          </button>

          {photos.length < 3 && (
            <button
              type="button"
              onClick={openCamera}
              disabled={compressingPhotos}
              className="w-full rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <Camera className="h-4 w-4" />
                + Tomar Foto con Camara
              </span>
            </button>
          )}

          {/* Photo Thumbnails */}
          {photos.length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative"
                >
                  <img
                    src={photoUrls[index] ?? ""}
                    alt={`Foto ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    aria-label={`Eliminar foto ${index + 1}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setPhotos(prev => prev.filter((_, i) => i !== index))
                    }}
                    className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200/80 text-white transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Photo count */}
          <p className="text-xs text-muted-foreground text-right">
            {photos.length}/3 fotos
          </p>
        </CardContent>
      </Card>

      {/* Success message */}
      {submitted && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ Orden registrada exitosamente.
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
          Limpiar
        </Button>
        <Button type="submit" disabled={saving || !isClientDataValid}>
          {saving ? (
            <Loader2 role="status" aria-label="Guardando…" className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          {saving ? (photos.length > 0 ? "Subiendo fotos..." : "Guardando...") : "Crear Ticket"}
        </Button>
      </div>
    </form>
    {repairVictoryDialog}
    {renderEmergencyModal()}
    <CameraModal
      open={cameraOpen}
      onOpenChange={setCameraOpen}
      onCaptureAll={(files) => { void handleGallerySelection(files) }}
    />
    {registerErrorDialog}

    </>
  )
}



