"use client"

import { useCallback, useEffect, useState, useTransition, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Loader2,
  User,
  Store,
  BellRing,
  Sparkles,
  Printer,
  Cpu,
  Settings2,
  Banknote,
} from "lucide-react"
import {
  getConfiguracionPageData,
  updateTallerSettings,
  updatePosKioscoSettings,
  type CashPresetConfig,
  type PosQuickMode,
  type TallerSettings,
  type TallerPlanTipo,
} from "@/lib/actions/settings-prisma"
import { changeOwnerPassword } from "@/lib/actions/auth-prisma"
import { getAjustesTallerFlujoPro, updateAjustesTallerFlujoPro, type AjustesTallerFlujoPro } from "@/lib/actions/flujo-pro"
import { toast } from "@/hooks/use-toast"
import { Empresa } from "@/components/configuracion/Empresa"
import { Responsable } from "@/components/configuracion/Responsable"
import { Perfil } from "@/components/configuracion/Perfil"
import { Notificaciones } from "@/components/configuracion/Notificaciones"
import { FlujoPro } from "@/components/configuracion/FlujoPro"
import { Imprenta } from "@/components/configuracion/Imprenta"
import { Hardware } from "@/components/configuracion/Hardware"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { ESTADOS_MEXICO, getPaisesNombres } from "@/lib/constants/paises"
import { PRO_FEATURES_TEMP_DISABLED } from "@/lib/runtime-flags"

type TimezoneOption = { value: string; city: string; country: string }
type TimezoneGroup = { label: string; options: TimezoneOption[] }

const TIMEZONE_GROUPS: TimezoneGroup[] = [
  {
    label: "Norteamerica",
    options: [
      { value: "America/Tijuana", city: "Tijuana", country: "Mexico" },
      { value: "America/Hermosillo", city: "Hermosillo", country: "Mexico" },
      { value: "America/Mazatlan", city: "Mazatlan", country: "Mexico" },
      { value: "America/Mexico_City", city: "Ciudad de Mexico", country: "Mexico" },
      { value: "America/Monterrey", city: "Monterrey", country: "Mexico" },
      { value: "America/New_York", city: "Nueva York", country: "Estados Unidos" },
    ],
  },
  {
    label: "Centroamerica",
    options: [
      { value: "America/Guatemala", city: "Ciudad de Guatemala", country: "Guatemala" },
      { value: "America/Costa_Rica", city: "San Jose", country: "Costa Rica" },
      { value: "America/Panama", city: "Ciudad de Panama", country: "Panama" },
    ],
  },
  {
    label: "Sudamerica",
    options: [
      { value: "America/Bogota", city: "Bogota", country: "Colombia" },
      { value: "America/Lima", city: "Lima", country: "Peru" },
      { value: "America/Santiago", city: "Santiago", country: "Chile" },
      { value: "America/Argentina/Buenos_Aires", city: "Buenos Aires", country: "Argentina" },
    ],
  },
  {
    label: "Otros",
    options: [
      { value: "UTC", city: "UTC", country: "Universal" },
      { value: "Europe/Madrid", city: "Madrid", country: "Espana" },
    ],
  },
]

function formatTimezoneClock(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now).toLowerCase()
}

// ─── Tipos ─────────────────────────────────────────────────────────────────

type Tab = "taller" | "cuenta" | "alertas" | "flujo-pro" | "imprenta" | "hardware"
type FieldErrors = Partial<Record<keyof TallerSettings, string>>
const TEMP_DISABLED_TABS: Tab[] = ["alertas", "flujo-pro"]

// ─── Validacion cliente ────────────────────────────────────────────────────

function validateSettings(s: TallerSettings): FieldErrors {
  const errors: FieldErrors = {}
  if (!s.nombre_taller || s.nombre_taller.trim().length < 3)
    errors.nombre_taller = "El nombre del taller es requerido (minimo 3 caracteres)."
  const digits = s.telefono.replace(/\D/g, "")
  if (!digits) errors.telefono = "El telefono del taller es requerido."
  else if (digits.length < 6 || digits.length > 15) errors.telefono = `El telefono debe tener entre 6 y 15 digitos (tiene ${digits.length}).`
  if (s.email_contacto?.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email_contacto.trim()))
      errors.email_contacto = "El formato del email no es valido."
  }
  if (s.responsable_email?.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.responsable_email.trim()))
      errors.responsable_email = "El formato del email del responsable no es valido."
  }
  if (s.responsable_telefono?.trim()) {
    const rDigits = s.responsable_telefono.replace(/\D/g, "")
    if (rDigits.length < 6 || rDigits.length > 15)
      errors.responsable_telefono = `El telefono del responsable debe tener entre 6 y 15 digitos (tiene ${rDigits.length}).`
  }
  if (!s.pais?.trim()) errors.pais = "Debes seleccionar un pais."
  if (!s.ciudad?.trim()) errors.ciudad = "La ciudad es requerida."
  if (!s.estado?.trim()) errors.estado = "El estado es requerido."
  if (!s.zona_horaria?.trim()) errors.zona_horaria = "Selecciona la zona horaria del taller."
  return errors
}

// ─── Componente principal ──────────────────────────────────────────────────

function ConfiguracionContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get("tab") as Tab | null
  
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const validTabs: Tab[] = ["taller", "cuenta", "alertas", "flujo-pro", "imprenta", "hardware"]
    const initial = tabParam && validTabs.includes(tabParam) ? tabParam : "taller"
    return PRO_FEATURES_TEMP_DISABLED && TEMP_DISABLED_TABS.includes(initial) ? "taller" : initial
  })
  // Taller state
  const [settings, setSettings] = useState<TallerSettings | null>(null)
  const [planTipo, setPlanTipo] = useState<TallerPlanTipo>("prueba")
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [saving, startSaving] = useTransition()

  // Cuenta state
  const [loginEmail, setLoginEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Flujo PRO state
  const [ajustesFluJoPro, setAjustesFluJoPro] = useState<AjustesTallerFlujoPro | null>(null)
  const [loadingFluJoPro, setLoadingFluJoPro] = useState(false)
  const [pendingFluJoPro, startTransitionFluJoPro] = useTransition()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [clockNow, setClockNow] = useState<Date>(new Date())
  const [canUsePosKiosco, setCanUsePosKiosco] = useState(false)
  const [canUseReportes, setCanUseReportes] = useState(false)
  const [inTrial, setInTrial] = useState(false)
  const [kioscoEnabled, setKioscoEnabled] = useState(false)
  const [kioscoCashPresets, setKioscoCashPresets] = useState("")
  const [kioscoCurrency, setKioscoCurrency] = useState("MXN")
  const [savingKiosco, setSavingKiosco] = useState(false)
  const [kioscoQuickMode, setKioscoQuickMode] = useState<PosQuickMode>("dynamic_best_sellers")
  const [kioscoQuickLimit, setKioscoQuickLimit] = useState("12")
  const [kioscoQuickCategories, setKioscoQuickCategories] = useState<string[]>([])
  const [inventoryCategories, setInventoryCategories] = useState<Array<{ slug: string; nombre: string }>>([])
  const [kioscoManualQuickIds, setKioscoManualQuickIds] = useState("")

  useEffect(() => {
    const interval = setInterval(() => setClockNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getConfiguracionPageData()
      if (data.error) {
        setLoadError(data.error)
        setSettings(null)
        return
      }
      const merged: TallerSettings = {
        ...data.settings,
      }
      setSettings(merged)
      setLoginEmail(data.loginEmail)
      setPlanTipo(data.planTipo)
      setCanUsePosKiosco(data.canUsePosKiosco)
      setCanUseReportes(data.canUseReportes)
      setInTrial(data.inTrial)
      setKioscoEnabled(data.kioscoConfig.kiosco_enabled)
      setKioscoCurrency(data.kioscoConfig.cash_presets.moneda)
      setKioscoCashPresets(data.kioscoConfig.cash_presets.valores.join(", "))
      setKioscoQuickMode(data.kioscoConfig.quick_mode)
      setKioscoQuickLimit(String(data.kioscoConfig.quick_limit))
      setKioscoQuickCategories(
        data.kioscoConfig.quick_categories.filter((slug) =>
          data.inventoryCategories.some((category) => category.slug === slug),
        ),
      )
      setKioscoManualQuickIds(data.kioscoConfig.manual_quick_ids.join(", "))
      setInventoryCategories(data.inventoryCategories)
      if (data.settings.logo_url) setLogoPreview(data.settings.logo_url)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error("[configuracion] load failed:", e)
      setLoadError(message.slice(0, 200) || "Error desconocido al cargar la configuracion")
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Cargar ajustes de Flujo PRO cuando la pestana este activa
  useEffect(() => {
    if (PRO_FEATURES_TEMP_DISABLED && TEMP_DISABLED_TABS.includes(activeTab)) {
      setActiveTab("taller")
      return
    }
    if (activeTab !== "flujo-pro" || loadingFluJoPro) return
    const load = async () => {
      setLoadingFluJoPro(true)
      const { ajustes } = await getAjustesTallerFlujoPro()
      if (ajustes) {
        setAjustesFluJoPro(ajustes)
      }
      setLoadingFluJoPro(false)
    }
    load()
  }, [activeTab])

  // Funcion para actualizar ajustes de Flujo PRO
  const handlePatchFluJoPro = <K extends keyof AjustesTallerFlujoPro>(
    key: K,
    value: AjustesTallerFlujoPro[K]
  ) => {
    if (!ajustesFluJoPro) return
    const prevSnapshot = { ...ajustesFluJoPro }
    const next = { ...ajustesFluJoPro, [key]: value }
    setAjustesFluJoPro(next)
    startTransitionFluJoPro(async () => {
      const r = await updateAjustesTallerFlujoPro({ [key]: value })
      if (!r.success) {
        toast({ variant: "destructive", title: "No se guardo", description: r.error })
        setAjustesFluJoPro(prevSnapshot)
        return
      }
      toast({ title: "Guardado", description: "Reglas PRO actualizadas." })
    })
  }

  // ── Logo ────────────────────────────────────────────────────────────────
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !settings) return
    setLogoError(null)
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setLogoError("Solo se aceptan archivos JPG o PNG.")
      e.target.value = ""
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("El archivo supera el limite de 2MB.")
      e.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setLogoPreview(result)
      setSettings({ ...settings, logo_url: result })
    }
    reader.readAsDataURL(file)
  }

  // ── Guardar taller ──────────────────────────────────────────────────────
  const handleSaveTaller = () => {
    if (!settings) {
      toast({ title: "Error", description: "Configuracion no cargada.", variant: "destructive" })
      return
    }
    if (!settings) return
    const errors = validateSettings(settings)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      toast({ title: "Error", description: "Corrige los campos marcados antes de guardar.", variant: "destructive" })
      return
    }
    setFieldErrors({})

    startSaving(async () => {
      const { error } = await updateTallerSettings({
        nombre_taller: settings.nombre_taller,
        direccion: settings.direccion,
        telefono: settings.telefono,
        email_contacto: settings.email_contacto,
        ciudad: settings.ciudad,
        estado: settings.estado,
        pais: settings.pais,
        zona_horaria: settings.zona_horaria ?? "UTC",
        fondo_caja_inicial: Math.max(0, Math.round(Number(settings.fondo_caja_inicial ?? 500) * 100) / 100),
        terminos_garantia: settings.terminos_garantia,
        dias_garantia: Math.max(1, Math.min(365, Math.floor(Number(settings.dias_garantia) || 30))),
        mensaje_despedida: settings.mensaje_despedida?.trim() || undefined,
        logo_url: settings.logo_url ?? null,
        tamano_papel: settings.tamano_papel,
        label_size: settings.label_size ?? "2x1",
        alertas_stock_bajo: Boolean(settings.alertas_stock_bajo),
        reportes_cierre_caja: Boolean(settings.reportes_cierre_caja),
        alerta_urgentes: Boolean(settings.alerta_urgentes),
        responsable_nombre: settings.responsable_nombre?.trim() || null,
        responsable_cargo: settings.responsable_cargo?.trim() || null,
        responsable_telefono: settings.responsable_telefono?.trim() || null,
        responsable_email: settings.responsable_email?.trim() || null,
      })
      if (error) {
        toast({ title: "Error al guardar", description: error, variant: "destructive" })
      } else {
        toast.success("Configuracion guardada correctamente.")
      }
    })
  }

  // ── Cambiar contrasena ──────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Error", description: "Completa ambos campos.", variant: "destructive" })
      return
    }
    setPasswordLoading(true)
    const result = await changeOwnerPassword(currentPassword, newPassword)
    if (result.success) {
      toast.success("Contrasena actualizada correctamente.")
      setCurrentPassword("")
      setNewPassword("")
    } else {
      toast({ title: "Error", description: result.error || "No se pudo actualizar la contrasena.", variant: "destructive" })
    }
    setPasswordLoading(false)
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-dashboard-surface">
        <div className="flex w-full flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:rounded-3xl sm:p-8">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Cargando configuracion de tu taller...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleSaveTallerCompleto = () => {
    if (!settings) {
      toast({ title: "Error", description: "Configuracion no cargada.", variant: "destructive" })
      return
    }
    const errors = validateSettings(settings)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      toast({ title: "Error", description: "Corrige los campos marcados antes de guardar.", variant: "destructive" })
      return
    }
    setFieldErrors({})
    setSavingKiosco(true)

    startSaving(async () => {
      try {
        const tallerResult = await updateTallerSettings({
          nombre_taller: settings.nombre_taller,
          direccion: settings.direccion,
          telefono: settings.telefono,
          email_contacto: settings.email_contacto,
          ciudad: settings.ciudad,
          estado: settings.estado,
          pais: settings.pais,
          zona_horaria: settings.zona_horaria ?? "UTC",
          fondo_caja_inicial: Math.max(0, Math.round(Number(settings.fondo_caja_inicial ?? 500) * 100) / 100),
          terminos_garantia: settings.terminos_garantia,
          dias_garantia: Math.max(1, Math.min(365, Math.floor(Number(settings.dias_garantia) || 30))),
          mensaje_despedida: settings.mensaje_despedida?.trim() || undefined,
          logo_url: settings.logo_url ?? null,
          tamano_papel: settings.tamano_papel,
          label_size: settings.label_size ?? "2x1",
          alertas_stock_bajo: Boolean(settings.alertas_stock_bajo),
          reportes_cierre_caja: Boolean(settings.reportes_cierre_caja),
          alerta_urgentes: Boolean(settings.alerta_urgentes),
          responsable_nombre: settings.responsable_nombre?.trim() || null,
          responsable_cargo: settings.responsable_cargo?.trim() || null,
          responsable_telefono: settings.responsable_telefono?.trim() || null,
          responsable_email: settings.responsable_email?.trim() || null,
        })

        if (tallerResult.error) {
          toast({ title: "Error al guardar", description: tallerResult.error, variant: "destructive" })
          return
        }

        if (canUsePosKiosco) {
          const values = kioscoCashPresets
            .split(",")
            .map((x) => Number(x.trim()))
            .filter((n) => Number.isFinite(n) && n > 0)
          const quickLimit = Math.max(10, Math.min(16, Number(kioscoQuickLimit) || 12))
          const manualQuickIds = kioscoManualQuickIds
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
            .slice(0, 40)
          const payload: {
            kiosco_enabled: boolean
            cash_presets: CashPresetConfig
            kiosco_whatsapp_step: "inicio" | "final"
            quick_mode: PosQuickMode
            quick_limit: number
            quick_categories: string[]
            manual_quick_ids: string[]
          } = {
            kiosco_enabled: kioscoEnabled,
            cash_presets: { moneda: kioscoCurrency.toUpperCase(), valores: values },
            kiosco_whatsapp_step: "final",
            quick_mode: kioscoQuickMode,
            quick_limit: quickLimit,
            quick_categories: kioscoQuickCategories.slice(0, 10),
            manual_quick_ids: manualQuickIds,
          }

          const kioscoResult = await updatePosKioscoSettings(payload)
          if (kioscoResult.error) {
            toast({ title: "Error al guardar kiosko", description: kioscoResult.error, variant: "destructive" })
            return
          }
        }

        toast.success("Configuracion guardada correctamente.")
      } finally {
        setSavingKiosco(false)
      }
    })
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-dashboard-surface">
        <div className="flex w-full flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:rounded-3xl sm:p-8">
            <p className="text-sm text-red-500">No se pudo cargar la configuracion del taller.</p>
            {loadError && (
              <p className="mt-3 max-w-md break-words rounded-md bg-slate-50 px-3 py-2 text-left font-mono text-[11px] text-slate-600">
                {loadError}
              </p>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Tabs config ─────────────────────────────────────────────────────────
  const PRO_TABS: Tab[] = ["flujo-pro", "hardware", "alertas"]
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "taller", label: "Taller", icon: <Store className="h-3.5 w-3.5" /> },
    { id: "cuenta", label: "Mi Cuenta", icon: <User className="h-3.5 w-3.5" /> },
    { id: "imprenta", label: "Imprenta", icon: <Printer className="h-3.5 w-3.5" /> },
    { id: "flujo-pro", label: "Flujo PRO", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: "hardware", label: "Hardware", icon: <Cpu className="h-3.5 w-3.5" /> },
    { id: "alertas", label: "Reportes y Alertas", icon: <BellRing className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden bg-dashboard-surface">
      <div className="flex w-full min-w-0 flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
        {/* Header */}
        <ModuleHeader
          icon={Settings2}
          title="CONFIGURACION"
          eyebrow="AJUSTES DEL NEGOCIO Y OPERACION"
          description="Administra tu taller, cuenta, alertas, impresion, hardware y flujo Pro."
          badge={tabs.find((tab) => tab.id === activeTab)?.label}
        />

        {/* Tabs */}
        <div className="w-full overflow-x-auto border-b border-slate-200 pb-1">
          <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (PRO_FEATURES_TEMP_DISABLED && TEMP_DISABLED_TABS.includes(tab.id)) return
                setActiveTab(tab.id)
              }}
              disabled={PRO_FEATURES_TEMP_DISABLED && TEMP_DISABLED_TABS.includes(tab.id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                PRO_FEATURES_TEMP_DISABLED && TEMP_DISABLED_TABS.includes(tab.id)
                  ? "border-transparent text-slate-400 cursor-not-allowed"
                  : activeTab === tab.id
                    ? PRO_TABS.includes(tab.id)
                      ? "border-amber-500 text-amber-700"
                      : "border-blue-600 text-blue-600"
                    : PRO_TABS.includes(tab.id)
                      ? "border-transparent text-slate-500 hover:text-amber-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.icon}
              {tab.label}
              {PRO_TABS.includes(tab.id) ? (
                <span className="rounded-full bg-gradient-to-r from-amber-200 to-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-950 shadow-sm">
                  Pro
                </span>
              ) : null}
            </button>
          ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* ════ PESTANA TALLER ══════════════════════════════════════════════ */}
          {activeTab === "taller" && (
            <div className="space-y-5">
              <Empresa
                settings={settings}
                setSettings={setSettings}
                fieldErrors={fieldErrors}
                logoPreview={logoPreview}
                logoError={logoError}
                handleLogoChange={handleLogoChange}
                handleSaveTaller={handleSaveTaller}
                saving={saving}
                clockNow={clockNow}
                formatTimezoneClock={formatTimezoneClock}
                TIMEZONE_GROUPS={TIMEZONE_GROUPS}
                PAISES={getPaisesNombres()}
                ESTADOS_MEXICO={ESTADOS_MEXICO}
                showSaveButton={false}
              />

              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-5">
                  <Responsable
                    settings={settings}
                    setSettings={setSettings}
                    fieldErrors={fieldErrors}
                  />

                  <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <CardContent className="space-y-4 p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                          <Banknote className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">Operacion de caja</h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            Monto sugerido al abrir turno. El usuario puede ajustarlo solo para una caja especifica.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold tracking-wide text-slate-600">
                          Fondo inicial por defecto
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={settings?.fondo_caja_inicial ?? 500}
                            onChange={(e) =>
                              setSettings(settings ? { ...settings, fondo_caja_inicial: Number(e.target.value) } : settings)
                            }
                            className="h-11 rounded-xl border-slate-200 pl-8 text-base font-black"
                          />
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-500">
                          Este valor se precarga en Abrir Caja para evitar errores al iniciar turno.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">POS kiosko</p>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
                            Pro
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Cobro rapido para tablet con categorias y billetes tactiles.</p>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                        kioscoEnabled ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                      }`}>
                        {kioscoEnabled ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    {!canUsePosKiosco ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                        Disponible para PRO o Trial activo.
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={kioscoEnabled}
                          onClick={() => setKioscoEnabled((current) => !current)}
                          className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors ${
                            kioscoEnabled
                              ? "border-blue-200 bg-blue-50 text-blue-950"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span>
                            <span className="block text-sm font-black text-slate-900">
                              {kioscoEnabled ? "Kiosko activado" : "Kiosko desactivado"}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              Vista tablet-first para cobro rapido en Ventas.
                            </span>
                          </span>
                          <span
                            className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${
                              kioscoEnabled ? "bg-blue-600" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                                kioscoEnabled ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </span>
                        </button>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_110px]">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-semibold tracking-wide text-slate-600">Home rapido</Label>
                            <select
                              value={kioscoQuickMode}
                              onChange={(e) => setKioscoQuickMode(e.target.value as PosQuickMode)}
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                            >
                              <option value="dynamic_best_sellers">Mas vendidos dinamicos</option>
                              <option value="latest_added">Ultimos agregados</option>
                              <option value="manual">Manual por IDs</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-semibold tracking-wide text-slate-600">Items</Label>
                            <Input
                              type="number"
                              min={10}
                              max={16}
                              step={1}
                              value={kioscoQuickLimit}
                              onChange={(e) => setKioscoQuickLimit(e.target.value)}
                              className="h-10"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <Label className="text-[11px] font-semibold tracking-wide text-slate-600">Categorias de inicio</Label>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              {kioscoQuickCategories.length}/10
                            </span>
                          </div>
                          <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-2">
                            {inventoryCategories.map((category) => {
                              const selected = kioscoQuickCategories.includes(category.slug)
                              return (
                                <button
                                  key={category.slug}
                                  type="button"
                                  onClick={() => {
                                    setKioscoQuickCategories((current) =>
                                      selected
                                        ? current.filter((slug) => slug !== category.slug)
                                        : [...current, category.slug].slice(0, 10),
                                    )
                                  }}
                                  className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                                    selected
                                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                                  }`}
                                >
                                  {category.nombre}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold tracking-wide text-slate-600">Billetes predefinidos</Label>
                          <Input
                            value={kioscoCashPresets}
                            onChange={(e) => setKioscoCashPresets(e.target.value)}
                            placeholder="20, 50, 100, 200, 500, 1000"
                            className="h-10"
                          />
                        </div>

                        {kioscoQuickMode === "manual" && (
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-semibold tracking-wide text-slate-600">IDs manuales</Label>
                            <Input
                              value={kioscoManualQuickIds}
                              onChange={(e) => setKioscoManualQuickIds(e.target.value)}
                              placeholder="id1, id2, id3"
                              className="h-10"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="sticky bottom-3 z-20 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur">
                <Button
                  onClick={handleSaveTallerCompleto}
                  disabled={saving || savingKiosco}
                  className="h-11 w-full rounded-xl bg-blue-600 px-6 py-2 text-white shadow-sm hover:bg-blue-700 sm:w-auto btn-glow"
                >
                  {(saving || savingKiosco) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
              </div>
            </div>
          )}

          {/* ════ PESTANA MI CUENTA ═══════════════════════════════════════════ */}
          {activeTab === "cuenta" && (
            <Perfil
              loginEmail={loginEmail}
              currentPassword={currentPassword}
              setCurrentPassword={setCurrentPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              handleChangePassword={handleChangePassword}
              passwordLoading={passwordLoading}
              settings={settings}
            />
          )}

          {/* ════ PESTANA REPORTES Y ALERTAS ═══════════════════════════════════ */}
          {activeTab === "alertas" && (
            <Notificaciones
              settings={settings}
              setSettings={setSettings}
              loginEmail={loginEmail}
              canUseReportes={canUseReportes}
              inTrial={inTrial}
            />
          )}

          {/* ════ PESTANA FLUJO PRO ═══════════════════════════════════════════ */}
          {activeTab === "flujo-pro" && (
            <FlujoPro
              loadingFluJoPro={loadingFluJoPro}
              ajustesFluJoPro={ajustesFluJoPro}
              planTipo={planTipo}
              inTrial={inTrial}
              pendingFluJoPro={pendingFluJoPro}
              handlePatchFluJoPro={handlePatchFluJoPro}
            />
          )}

          {/* ════ PESTANA IMPRENTA ════════════════════════════════════════════ */}
          {activeTab === "imprenta" && (
            <Imprenta settings={settings} />
          )}

          {/* ════ PESTANA HARDWARE ════════════════════════════════════════════ */}
          {activeTab === "hardware" && <Hardware planTipo={planTipo} inTrial={inTrial} />}
        </div>
      </div>
    </div>
  )
}

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen overflow-x-hidden bg-dashboard-surface">
        <div className="flex w-full flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:rounded-3xl sm:p-8">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Cargando configuracion...</p>
          </div>
        </div>
      </div>
    }>
      <ConfiguracionContent />
    </Suspense>
  )
}
