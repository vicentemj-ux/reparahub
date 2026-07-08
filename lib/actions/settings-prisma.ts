"use server"

import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getPrismaClient } from "@/lib/prisma"
import { getPublicUrl, sanitizeFileName, uploadFileToS3 } from "@/lib/r2"
import { decodeIfEncoded } from "@/lib/utils"
import { getCurrentUser } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { checkRateLimit } from "@/lib/auth/rate-limit"
import { ensureInventoryBaseCategoriesForTenant } from "@/lib/actions/inventory-categories-prisma"
import { toCategorySlug } from "@/lib/inventory-categories"

export interface TallerSettings {
  id: string
  taller_id: string
  nombre_taller: string
  direccion: string
  telefono: string
  email_contacto: string
  ciudad: string
  estado: string
  pais: string | null
  zona_horaria?: string
  fondo_caja_inicial?: number
  logo_url: string | null
  logo_storage_key?: string | null
  pie_pagina: string
  terminos_garantia: string
  descripcion_publica: string
  tamano_papel: "80mm" | "58mm"
  label_size?: string | null
  alertas_stock_bajo?: boolean
  reportes_cierre_caja?: boolean
  alerta_urgentes?: boolean
  prefijo_folio?: string
  siguiente_folio?: number
  dias_garantia?: number
  mensaje_despedida?: string
  impresion_config?: Record<string, unknown> | null
  mostrar_precio_etiqueta?: boolean
  impresora_ticket?: string | null
  impresora_etiqueta?: string | null
  impresora_documento?: string | null
  facebook?: string | null
  instagram?: string | null
  tiktok?: string | null
  whatsapp?: string | null
  /// Datos PRIVADOS del responsable del local (dueno, gerente, encargado).
  /// Se usan como destinatario del corte de caja (WhatsApp + correo) y
  /// de las alertas diarias. NO se imprimen en tickets.
  responsable_nombre?: string | null
  responsable_cargo?: string | null
  responsable_telefono?: string | null
  responsable_email?: string | null
}

export type TallerPlanTipo = "prueba" | "activo" | "suspendido"

/**
 * Defaults del modulo "Reportes y Alertas". Fuente unica de verdad para
 * los 3 toggles (`alertasStockBajo`, `reportesCierreCaja`, `alertaUrgentes`).
 *
 * El motor (`lib/actions/alertas-prisma.ts`) solo envia emails si el toggle
 * correspondiente esta `true`. Por eso los defaults son `true`: Pro y Trial
 * deben arrancar con todas las alertas activas. El usuario puede apagarlas
 * manualmente desde Configuracion > Reportes y Alertas.
 *
 * Importante: estos defaults DEBEN coincidir con los `@default()` de
 * `prisma/schema.prisma:316-318` para que el backfill en la migracion
 * `20260604000000_alert_engine` funcione correctamente.
 *
 * NO se exporta: un archivo `"use server"` solo puede exportar async
 * functions (los exports se tratan como Server Actions). Este objeto
 * solo se usa dentro de este archivo.
 */
const REPORTES_ALERTAS_DEFAULTS = {
  alertasStockBajo: true,
  reportesCierreCaja: true,
  alertaUrgentes: true,
} as const

export type KioscoWhatsappStep = "inicio" | "final"
export type PosQuickMode = "dynamic_best_sellers" | "latest_added" | "manual"

export interface CashPresetConfig {
  moneda: string
  valores: number[]
}

export interface PosKioscoConfig {
  kiosco_enabled: boolean
  cash_presets: CashPresetConfig
  kiosco_whatsapp_step: KioscoWhatsappStep
  quick_mode: PosQuickMode
  quick_limit: number
  quick_categories: string[]
  manual_quick_ids: string[]
  has_pin: boolean
}

function defaultCashPresets(moneda: string): CashPresetConfig {
  const m = (moneda || "MXN").toUpperCase()
  if (m === "UYU") return { moneda: "UYU", valores: [20, 50, 100, 200, 500, 1000, 2000] }
  return { moneda: "MXN", valores: [20, 50, 100, 200, 500, 1000] }
}

function normalizePresetValues(values: number[]): number[] {
  return Array.from(
    new Set(
      values
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v) && v > 0)
        .map((v) => Math.round(v * 100) / 100)
    )
  ).sort((a, b) => a - b)
}

function normalizeFondoCajaInicial(value: unknown, fallback = 500): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.round(n * 100) / 100
}

function readPosKioscoFromPrintSettings(printSettings: Record<string, unknown> | null | undefined, moneda: string): PosKioscoConfig {
  const source = (printSettings?.posKiosco as Record<string, unknown> | undefined) ?? {}
  const preset = source.cash_presets as Record<string, unknown> | undefined
  const presetMoneda = typeof preset?.moneda === "string" ? preset.moneda : moneda
  const presetValoresRaw = Array.isArray(preset?.valores) ? preset?.valores : []
  const presetValores = normalizePresetValues((presetValoresRaw as unknown[]).map((v) => Number(v)))
  const fallback = defaultCashPresets(presetMoneda || moneda)
  return {
    kiosco_enabled: Boolean(source.kiosco_enabled),
    cash_presets: {
      moneda: fallback.moneda,
      valores: presetValores.length > 0 ? presetValores : fallback.valores,
    },
    kiosco_whatsapp_step: source.kiosco_whatsapp_step === "inicio" ? "inicio" : "final",
    quick_mode:
      source.quick_mode === "latest_added" || source.quick_mode === "manual"
        ? source.quick_mode
        : "dynamic_best_sellers",
    quick_limit: Math.max(10, Math.min(16, Number(source.quick_limit ?? 12))),
    quick_categories: Array.isArray(source.quick_categories)
      ? (source.quick_categories as unknown[])
          .map((v) => toCategorySlug(String(v)))
          .filter((v) => v.length > 0)
          .slice(0, 10)
      : [],
    manual_quick_ids: Array.isArray(source.manual_quick_ids)
      ? (source.manual_quick_ids as unknown[])
          .map((v) => String(v).trim())
          .filter((v) => v.length > 0)
          .slice(0, 40)
      : [],
    has_pin: typeof source.kiosco_pin_hash === "string" && source.kiosco_pin_hash.length > 10,
  }
}

function mergePosKioscoIntoPrintSettings(
  printSettings: Record<string, unknown> | null | undefined,
  input: Partial<Pick<PosKioscoConfig, "kiosco_enabled" | "cash_presets" | "kiosco_whatsapp_step" | "quick_mode" | "quick_limit" | "quick_categories" | "manual_quick_ids">> & { kiosco_pin_hash?: string | null }
) {
  const base = { ...(printSettings ?? {}) }
  const prev = ((base.posKiosco as Record<string, unknown> | undefined) ?? {})
  const next: Record<string, unknown> = { ...prev }

  if (typeof input.kiosco_enabled === "boolean") next.kiosco_enabled = input.kiosco_enabled
  if (input.kiosco_whatsapp_step) next.kiosco_whatsapp_step = input.kiosco_whatsapp_step
  if (input.quick_mode) next.quick_mode = input.quick_mode
  if (typeof input.quick_limit === "number") next.quick_limit = Math.max(10, Math.min(16, Math.floor(input.quick_limit)))
  if (input.quick_categories) {
    next.quick_categories = input.quick_categories
      .map((v) => toCategorySlug(String(v)))
      .filter(Boolean)
      .slice(0, 10)
  }
  if (input.manual_quick_ids) {
    next.manual_quick_ids = input.manual_quick_ids.map((v) => String(v).trim()).filter(Boolean).slice(0, 40)
  }
  if (input.cash_presets) {
    next.cash_presets = {
      moneda: input.cash_presets.moneda.toUpperCase(),
      valores: normalizePresetValues(input.cash_presets.valores),
    }
  }
  if (input.kiosco_pin_hash === null) delete next.kiosco_pin_hash
  else if (typeof input.kiosco_pin_hash === "string") next.kiosco_pin_hash = input.kiosco_pin_hash

  base.posKiosco = next
  return base
}

function toSettings(row: Awaited<ReturnType<typeof getPrismaClient>>["configuracionTaller"] extends never ? never : any, tenantId: string): TallerSettings {
  return {
    id: row?.id ?? "",
    taller_id: tenantId,
    nombre_taller: decodeIfEncoded(row?.nombreComercial ?? "Mi Taller"),
    direccion: row?.direccion ?? "",
    telefono: row?.telefono ?? "",
    email_contacto: row?.emailContacto ?? "",
    ciudad: row?.ciudad ?? "",
    estado: row?.estado ?? "",
    pais: row?.pais ?? "",
    zona_horaria: row?.timezone ?? "UTC",
    fondo_caja_inicial: normalizeFondoCajaInicial(row?.fondoCajaInicial),
    logo_url: row?.logoUrl ?? null,
    logo_storage_key: row?.logoStorageKey ?? null,
    pie_pagina: "Gracias por su confianza",
    terminos_garantia: row?.terminosGarantia ?? "Garantia de 30 dias en reparaciones",
    descripcion_publica: "",
    tamano_papel: (row?.paperSize as "80mm" | "58mm") ?? "80mm",
    label_size: row?.labelSize ?? "2x1",
    alertas_stock_bajo: row?.alertasStockBajo ?? REPORTES_ALERTAS_DEFAULTS.alertasStockBajo,
    reportes_cierre_caja: row?.reportesCierreCaja ?? REPORTES_ALERTAS_DEFAULTS.reportesCierreCaja,
    alerta_urgentes: row?.alertaUrgentes ?? REPORTES_ALERTAS_DEFAULTS.alertaUrgentes,
    prefijo_folio: row?.prefijoFolio ?? "REP",
    siguiente_folio: row?.siguienteFolio ?? 1,
    dias_garantia: row?.diasGarantia ?? 30,
    mensaje_despedida: row?.mensajeDespedida ?? "¡Gracias por confiar en nosotros!",
    impresion_config: (row?.printSettings as Record<string, unknown> | null) ?? {},
    mostrar_precio_etiqueta: true,
    impresora_ticket: null,
    impresora_etiqueta: null,
    impresora_documento: null,
    facebook: row?.facebook ?? null,
    instagram: row?.instagram ?? null,
    tiktok: row?.tiktok ?? null,
    whatsapp: row?.whatsapp ?? null,
    responsable_nombre: row?.responsableNombre ?? null,
    responsable_cargo: row?.responsableCargo ?? null,
    responsable_telefono: row?.responsableTelefono ?? null,
    responsable_email: row?.responsableEmail ?? null,
  }
}

function buildUpdatePayload(updates: Partial<TallerSettings>, logoUrl?: string | null, logoStorageKey?: string | null): Record<string, unknown> {
  const u: Record<string, unknown> = {}
  if (updates.nombre_taller !== undefined) u.nombreComercial = updates.nombre_taller
  if (updates.direccion !== undefined) u.direccion = updates.direccion
  if (updates.telefono !== undefined) u.telefono = updates.telefono
  if (updates.email_contacto !== undefined) u.emailContacto = updates.email_contacto
  if (updates.ciudad !== undefined) u.ciudad = updates.ciudad
  if (updates.estado !== undefined) u.estado = updates.estado
  if (updates.pais !== undefined) u.pais = updates.pais
  if (updates.zona_horaria !== undefined) u.timezone = updates.zona_horaria
  if (updates.fondo_caja_inicial !== undefined) u.fondoCajaInicial = normalizeFondoCajaInicial(updates.fondo_caja_inicial)
  if (logoUrl !== undefined) u.logoUrl = logoUrl ?? null
  if (logoStorageKey !== undefined) u.logoStorageKey = logoStorageKey ?? null
  if (updates.whatsapp !== undefined) u.whatsapp = updates.whatsapp
  if (updates.tamano_papel !== undefined) u.paperSize = updates.tamano_papel
  if (updates.label_size !== undefined) u.labelSize = updates.label_size
  if (updates.impresion_config !== undefined) u.printSettings = (updates.impresion_config as object | null) ?? {}
  if (updates.terminos_garantia !== undefined) u.terminosGarantia = updates.terminos_garantia
  if (updates.dias_garantia !== undefined) u.diasGarantia = updates.dias_garantia
  if (updates.mensaje_despedida !== undefined) u.mensajeDespedida = updates.mensaje_despedida
  if (updates.alertas_stock_bajo !== undefined) u.alertasStockBajo = updates.alertas_stock_bajo
  if (updates.reportes_cierre_caja !== undefined) u.reportesCierreCaja = updates.reportes_cierre_caja
  if (updates.alerta_urgentes !== undefined) u.alertaUrgentes = updates.alerta_urgentes
  if (updates.prefijo_folio !== undefined) u.prefijoFolio = updates.prefijo_folio
  if (updates.facebook !== undefined) u.facebook = updates.facebook
  if (updates.instagram !== undefined) u.instagram = updates.instagram
  if (updates.tiktok !== undefined) u.tiktok = updates.tiktok
  if (updates.responsable_nombre !== undefined) u.responsableNombre = updates.responsable_nombre
  if (updates.responsable_cargo !== undefined) u.responsableCargo = updates.responsable_cargo
  if (updates.responsable_telefono !== undefined) u.responsableTelefono = updates.responsable_telefono
  if (updates.responsable_email !== undefined) u.responsableEmail = updates.responsable_email
  return u
}

function parseDataUrlImage(dataUrl: string): { bytes: Buffer; mimeType: string; ext: string } | null {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!m) return null
  const mimeType = m[1]
  const base64 = m[2]
  const bytes = Buffer.from(base64, "base64")
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "webp"
  return { bytes, mimeType, ext }
}

export async function getTallerSettings() {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const row = await prisma.configuracionTaller.findUnique({ where: { tenantId } })
    return { settings: toSettings(row, tenantId), error: null as string | null }
  } catch (e) {
    console.error("[settings-prisma] getTallerSettings:", e)
    const message = e instanceof Error ? e.message : String(e)
    return { settings: null, error: message.slice(0, 200) || "Error al cargar configuracion" }
  }
}

export async function getPosKioscoCapability(): Promise<{
  canUsePosKiosco: boolean
  planTipo: TallerPlanTipo
  isPro: boolean
}> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, trialEndsAt: true },
    })
    if (!tenant) return { canUsePosKiosco: false, planTipo: "suspendido", isPro: false }

    const inTrial = Boolean(tenant.trialEndsAt && tenant.trialEndsAt.getTime() >= Date.now())
    const isPro = tenant.plan === "PRO"
    const canUsePosKiosco = isPro || inTrial
    const planTipo: TallerPlanTipo = inTrial ? "prueba" : isPro ? "activo" : "suspendido"

    return { canUsePosKiosco, planTipo, isPro }
  } catch (e) {
    console.error("[settings-prisma] getPosKioscoCapability:", e)
    return { canUsePosKiosco: false, planTipo: "suspendido", isPro: false }
  }
}

/**
 * Capability de "Reportes y Alertas" (Configuracion > Reportes y Alertas).
 * Mismo patron que `getPosKioscoCapability`: Pro o Trial activo.
 *
 * El motor `lib/actions/alertas-prisma.ts` usa esta misma logica
 * internamente, pero exponerla aqui permite que la UI esconda el candado
 * para Trial (contrato del AGENTS.md: "the 30-day trial should provide
 * full Pro access") sin re-implementar la deteccion en cada componente.
 */
export async function getReportesAlertasCapability(): Promise<{
  canUseReportes: boolean
  planTipo: TallerPlanTipo
  isPro: boolean
  inTrial: boolean
}> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, trialEndsAt: true },
    })
    if (!tenant) return { canUseReportes: false, planTipo: "suspendido", isPro: false, inTrial: false }

    const inTrial = Boolean(tenant.trialEndsAt && tenant.trialEndsAt.getTime() >= Date.now())
    const isPro = tenant.plan === "PRO"
    const canUseReportes = isPro || inTrial
    const planTipo: TallerPlanTipo = inTrial ? "prueba" : isPro ? "activo" : "suspendido"

    return { canUseReportes, planTipo, isPro, inTrial }
  } catch (e) {
    console.error("[settings-prisma] getReportesAlertasCapability:", e)
    return { canUseReportes: false, planTipo: "suspendido", isPro: false, inTrial: false }
  }
}

export async function getPosKioscoSettings(): Promise<{ config: PosKioscoConfig | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId },
      select: { moneda: true, printSettings: true },
    })
    const moneda = (row?.moneda ?? "MXN").toUpperCase()
    const printSettings = (row?.printSettings as Record<string, unknown> | null | undefined) ?? {}
    const config = readPosKioscoFromPrintSettings(printSettings, moneda)
    return { config, error: null }
  } catch (e) {
    console.error("[settings-prisma] getPosKioscoSettings:", e)
    return { config: null, error: "No se pudo cargar configuracion de POS kiosco." }
  }
}

export async function updatePosKioscoSettings(input: {
  kiosco_enabled?: boolean
  cash_presets?: CashPresetConfig
  kiosco_whatsapp_step?: KioscoWhatsappStep
  quick_mode?: PosQuickMode
  quick_limit?: number
  quick_categories?: string[]
  manual_quick_ids?: string[]
  kiosco_pin?: string
}): Promise<{ config: PosKioscoConfig | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const capability = await getPosKioscoCapability()
    if (!capability.canUsePosKiosco) {
      return { config: null, error: "POS Kiosco disponible solo en plan PRO o Trial." }
    }

    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId },
      select: { moneda: true, printSettings: true },
    })
    await ensureInventoryBaseCategoriesForTenant(tenantId)
    const validCategorySlugs = new Set(
      (
        await prisma.inventarioCategoria.findMany({
          where: { tenantId, activo: true },
          select: { slug: true },
        })
      ).map((c) => c.slug)
    )
    const moneda = (row?.moneda ?? "MXN").toUpperCase()
    const prevSettings = (row?.printSettings as Record<string, unknown> | null | undefined) ?? {}

    let pinHash: string | undefined
    if (typeof input.kiosco_pin === "string" && input.kiosco_pin.trim().length > 0) {
      if (!/^\d{4,8}$/.test(input.kiosco_pin.trim())) {
        return { config: null, error: "El PIN de kiosco debe tener entre 4 y 8 digitos." }
      }
      pinHash = await bcrypt.hash(input.kiosco_pin.trim(), 10)
    }

    const nextPrintSettings = mergePosKioscoIntoPrintSettings(prevSettings, {
      kiosco_enabled: input.kiosco_enabled,
      cash_presets: input.cash_presets
        ? {
            moneda: (input.cash_presets.moneda || moneda).toUpperCase(),
            valores: normalizePresetValues(input.cash_presets.valores),
          }
        : undefined,
      kiosco_whatsapp_step: input.kiosco_whatsapp_step,
      quick_mode: input.quick_mode,
      quick_limit: input.quick_limit,
      quick_categories: input.quick_categories?.map((c) => toCategorySlug(c)).filter((slug) => validCategorySlugs.has(slug)),
      manual_quick_ids: input.manual_quick_ids,
      kiosco_pin_hash: pinHash,
    })
    const nextPrintSettingsJson = nextPrintSettings as any

    await prisma.configuracionTaller.upsert({
      where: { tenantId },
      create: {
        tenantId,
        moneda,
        printSettings: nextPrintSettingsJson,
      },
      update: {
        printSettings: nextPrintSettingsJson,
      },
    })

    const config = readPosKioscoFromPrintSettings(nextPrintSettings, moneda)
    return { config, error: null }
  } catch (e) {
    console.error("[settings-prisma] updatePosKioscoSettings:", e)
    return { config: null, error: "No se pudo guardar configuracion de POS kiosco." }
  }
}

export async function verifyKioskPin(pin: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const rawPin = String(pin ?? "").trim()
    if (!/^\d{4,8}$/.test(rawPin)) return { ok: false, error: "PIN invalido." }

    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const rl = await checkRateLimit(`kiosk-pin:${tenantId}`, "kiosk_pin")
    if (!rl.allowed) return { ok: false, error: `Demasiados intentos. Reintenta en ${rl.retryAfterMinutes ?? 15} min.` }

    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId },
      select: { printSettings: true },
    })
    const printSettings = (row?.printSettings as Record<string, unknown> | null | undefined) ?? {}
    const source = (printSettings.posKiosco as Record<string, unknown> | undefined) ?? {}
    const hash = typeof source.kiosco_pin_hash === "string" ? source.kiosco_pin_hash : ""

    if (!hash) return { ok: false, error: "PIN de kiosco no configurado." }
    const ok = await bcrypt.compare(rawPin, hash)
    return ok ? { ok: true } : { ok: false, error: "PIN incorrecto." }
  } catch (e) {
    console.error("[settings-prisma] verifyKioskPin:", e)
    return { ok: false, error: "No se pudo verificar PIN." }
  }
}

export async function updateTallerLogo(input: { dataUrl: string }) {
  try {
    const tenantId = await getTenantIdOrThrow()
    const parsed = parseDataUrlImage(input.dataUrl)
    if (!parsed) return { logoUrl: null, logoStorageKey: null, error: "Formato de logo invalido." }

    const ts = Date.now()
    const fileName = sanitizeFileName(`logo-${ts}.${parsed.ext}`)
    const key = `tenants/${tenantId}/branding/${fileName}`

    await uploadFileToS3({
      key,
      body: parsed.bytes,
      contentType: parsed.mimeType,
    })

    const logoUrl = getPublicUrl(key)
    return { logoUrl, logoStorageKey: key, error: null as string | null }
  } catch (e) {
    console.error("[settings-prisma] updateTallerLogo:", e)
    return { logoUrl: null, logoStorageKey: null, error: "No se pudo subir el logo." }
  }
}

export async function updateTallerSettings(updates: Partial<TallerSettings>) {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    let logoUrl = updates.logo_url
    let logoStorageKey = updates.logo_storage_key
    if (typeof updates.logo_url === "string" && updates.logo_url.startsWith("data:image")) {
      const up = await updateTallerLogo({ dataUrl: updates.logo_url })
      if (up.error) return { settings: null, error: up.error }
      logoUrl = up.logoUrl
      logoStorageKey = up.logoStorageKey
    }

    const row = await prisma.configuracionTaller.upsert({
      where: { tenantId },
      create: {
        tenantId,
        nombreComercial: updates.nombre_taller ?? "Mi Taller",
        direccion: updates.direccion ?? "",
        telefono: updates.telefono ?? "",
        emailContacto: updates.email_contacto ?? "",
        ciudad: updates.ciudad ?? "",
        estado: updates.estado ?? "",
        pais: updates.pais ?? null,
        timezone: updates.zona_horaria ?? "UTC",
        fondoCajaInicial: normalizeFondoCajaInicial(updates.fondo_caja_inicial),
        logoUrl: logoUrl ?? null,
        logoStorageKey: logoStorageKey ?? null,
        whatsapp: updates.whatsapp ?? null,
        paperSize: updates.tamano_papel ?? "80mm",
        labelSize: updates.label_size ?? "2x1",
        printSettings: (updates.impresion_config as object | null | undefined) ?? {},
        terminosGarantia: updates.terminos_garantia ?? "Garantia de 30 dias en reparaciones",
        diasGarantia: updates.dias_garantia ?? 30,
        mensajeDespedida: updates.mensaje_despedida ?? "¡Gracias por confiar en nosotros!",
        alertasStockBajo: updates.alertas_stock_bajo ?? REPORTES_ALERTAS_DEFAULTS.alertasStockBajo,
        reportesCierreCaja: updates.reportes_cierre_caja ?? REPORTES_ALERTAS_DEFAULTS.reportesCierreCaja,
        alertaUrgentes: updates.alerta_urgentes ?? REPORTES_ALERTAS_DEFAULTS.alertaUrgentes,
        prefijoFolio: updates.prefijo_folio ?? "REP",
        siguienteFolio: updates.siguiente_folio ?? 1,
        facebook: updates.facebook ?? null,
        instagram: updates.instagram ?? null,
        tiktok: updates.tiktok ?? null,
      },
      update: buildUpdatePayload(updates, logoUrl, logoStorageKey),
    })

    return { settings: toSettings(row, tenantId), error: null as string | null }
  } catch (e) {
    console.error("[settings-prisma] updateTallerSettings:", e)
    return { settings: null, error: "No se pudo guardar configuracion." }
  }
}

export async function getTallerPlanType(): Promise<TallerPlanTipo> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, trialEndsAt: true },
    })
    if (!tenant) return "prueba"
    if (tenant.plan === "PRO") return "activo"
    if (tenant.trialEndsAt && tenant.trialEndsAt.getTime() < Date.now()) return "suspendido"
    return "prueba"
  } catch (e) {
    console.error("[settings-prisma] getTallerPlanType:", e)
    return "prueba"
  }
}

export async function getDashboardSubscriptionBannerContext(): Promise<{
  showBanner: boolean
  isPro: boolean
  diasRestantes: number
  tieneVencimiento: boolean
  planTipo: TallerPlanTipo
  precioPlanMensual: number | null
  zonaHoraria: string | null
}> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const [tenant, cfg] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, trialEndsAt: true, createdAt: true },
      }),
      prisma.configuracionTaller.findUnique({
        where: { tenantId },
        select: { timezone: true },
      }),
    ])
    const zonaHoraria = cfg?.timezone ?? null
    if (!tenant) {
      return {
        showBanner: true,
        isPro: false,
        diasRestantes: 0,
        tieneVencimiento: false,
        planTipo: "prueba",
        precioPlanMensual: null,
        zonaHoraria,
      }
    }

    const trialEndsAt = tenant.trialEndsAt
    const tieneVencimiento = Boolean(trialEndsAt)
    const diasRestantes = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0
    const planTipo: TallerPlanTipo = diasRestantes > 0 ? "prueba" : "activo"

    if (planTipo === "prueba") {
      return {
        showBanner: true,
        isPro: true,
        diasRestantes,
        tieneVencimiento,
        planTipo,
        precioPlanMensual: null,
        zonaHoraria,
      }
    }

    return {
      showBanner: false,
      isPro: true,
      diasRestantes: 0,
      tieneVencimiento,
      planTipo: "activo",
      precioPlanMensual: null,
      zonaHoraria,
    }
  } catch (e) {
    console.error("[settings-prisma] getDashboardSubscriptionBannerContext:", e)
    return {
      showBanner: true,
      isPro: false,
      diasRestantes: 0,
      tieneVencimiento: false,
      planTipo: "prueba",
      precioPlanMensual: null,
      zonaHoraria: null,
    }
  }
}

export interface ConfiguracionPageData {
  settings: TallerSettings
  loginEmail: string
  planTipo: TallerPlanTipo
  canUsePosKiosco: boolean
  canUseReportes: boolean
  inTrial: boolean
  kioscoConfig: PosKioscoConfig
  inventoryCategories: Array<{ slug: string; nombre: string }>
  error: string | null
}

export async function getConfiguracionPageData(): Promise<ConfiguracionPageData> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const [configRow, tenantRow, user] = await Promise.all([
      prisma.configuracionTaller.findUnique({ where: { tenantId } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true, trialEndsAt: true } }),
      getCurrentUser(),
    ])

    const userId = (user as Record<string, unknown> | null)?.id as string | undefined
    let loginEmail = ""
    if (userId) {
      const userRow = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
      loginEmail = userRow?.email ?? ""
    }

    await ensureInventoryBaseCategoriesForTenant(tenantId)
    const categories = await prisma.inventarioCategoria.findMany({
      where: { tenantId, activo: true },
      orderBy: [{ sortOrder: "asc" }, { nombre: "asc" }],
    })

    const settings = toSettings(configRow as Record<string, unknown> | null, tenantId)

    const inTrial = Boolean(tenantRow?.trialEndsAt && tenantRow.trialEndsAt.getTime() >= Date.now())
    const isPro = tenantRow?.plan === "PRO"
    const planTipo: TallerPlanTipo = inTrial ? "prueba" : isPro ? "activo" : "suspendido"

    const moneda = configRow?.moneda ?? "MXN"
    const printSettings = (configRow?.printSettings as Record<string, unknown> | null | undefined) ?? {}
    const kioscoConfig = readPosKioscoFromPrintSettings(printSettings, moneda)

    return {
      settings,
      loginEmail,
      planTipo,
      canUsePosKiosco: isPro || inTrial,
      canUseReportes: isPro || inTrial,
      inTrial,
      kioscoConfig,
      inventoryCategories: categories.map((c) => ({ slug: c.slug, nombre: c.nombre })),
      error: null,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error("[settings-prisma] getConfiguracionPageData:", e)
    return {
      settings: null as unknown as TallerSettings,
      loginEmail: "",
      planTipo: "prueba",
      canUsePosKiosco: false,
      canUseReportes: false,
      inTrial: false,
      kioscoConfig: { kiosco_enabled: false, cash_presets: defaultCashPresets("MXN"), kiosco_whatsapp_step: "final", quick_mode: "dynamic_best_sellers", quick_limit: 12, quick_categories: [], manual_quick_ids: [], has_pin: false },
      inventoryCategories: [],
      error: message.slice(0, 500),
    }
  }
}
