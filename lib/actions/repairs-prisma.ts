"use server"

import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { getCurrentActorDisplayName } from "@/lib/auth/actor-display-name"
import { getPrismaClient } from "@/lib/prisma"
import { logRepairHistory, type RepairHistoryTipo } from "@/lib/actions/repair-history-prisma"
import {
  ensureChecklistIngreso,
  parseChecklistIngreso,
  checklistIngresoToJson,
  type ChecklistIngreso,
} from "@/lib/reparaciones/checklist-ingreso"
import type { ChecklistProData } from "@/lib/reparaciones/checklist-pro"
import type { SecurityTab } from "@/lib/reparaciones/security"
import { getGastosTicket, type ReparacionGasto } from "@/lib/actions/gastos-prisma"
import { getServiciosReparacion, setServiciosReparacion, type ReparacionServicio } from "@/lib/actions/servicios-prisma"
import {
  deleteFromS3,
  getPublicTrackPhotoKey,
  getStorageBucketName,
  sanitizeFileName,
  uploadFileToS3,
} from "@/lib/r2"
import { getArchivoDisplayUrl } from "@/lib/archivo-url"
import { REPAIR_URGENCY_MS } from "@/lib/constants/repair-urgency"
import { onlyDigits } from "@/lib/phone"
import { resolveClienteByTelefono } from "@/lib/actions/client-resolver-prisma"
import { getCodigoTelefono } from "@/lib/constants/paises"
import { buildWhatsAppUrl, normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { ensureTeamPhoneColumns } from "@/lib/team-phone-schema"

type TxClient = Parameters<Parameters<ReturnType<typeof getPrismaClient>["$transaction"]>[0]>[0]
type ArchivoRow = { publicUrl: string | null; storageKey: string | null; key: string | null }
type RepairPhotoArchivoRow = ArchivoRow & { id: string; sortOrder: number | null }
type TechnicianRow = { id: string; nombre: string | null }

// ─── Historial de Reparación: Tipos ───────────────────────────────────────────

export type HistorialTipo = RepairHistoryTipo

export interface HistorialEntry {
  id: string
  tipo: HistorialTipo
  descripcion: string
  valorAnterior: string | null
  valorNuevo: string | null
  actorNombre: string | null
  nota: string | null
  createdAt: string
}

/**
 * Compatibilidad con el UI legacy. Representa un cambio de estado auditado.
 * Se deriva del modelo unificado HistorialReparacion filtrando tipo = "estado".
 */
export interface HistorialReparacionAuditRow {
  id: string
  estado_anterior: string | null
  estado_nuevo: string
  nota_tecnica: string | null
  fecha: string
  usuario_nombre: string
}

/**
 * Compatibilidad con el UI legacy. Representa un cambio genérico (presupuesto, abono, etc).
 * Se deriva del modelo unificado HistorialReparacion excluyendo tipo = "estado".
 */
export interface RepairChangeHistoryRow {
  id: string
  tipo_cambio: string
  descripcion: string
  created_at: string
  valor_anterior: string | null
  valor_nuevo: string | null
  usuario: string | null
  nota: string | null
}

// ─── Helpers de Historial (defensivos: nunca tumban el flujo principal) ───────

/**
 * Registra una entrada en el historial de una reparación.
 * Regla MVP: si falla, solo loggea — nunca rechaza la operación principal.
 */
async function logHistorial(input: {
  reparacionId: string
  tenantId: string
  tipo: HistorialTipo
  descripcion: string
  valorAnterior?: string | null
  valorNuevo?: string | null
  nota?: string | null
}, txClient?: TxClient) {
  try {
    if (txClient) {
      const actorNombre = await getCurrentActorDisplayName()
      await txClient.historialReparacion.create({
        data: {
          tenantId: input.tenantId,
          reparacionId: input.reparacionId,
          tipo: input.tipo,
          descripcion: input.descripcion,
          valorAnterior: input.valorAnterior ?? null,
          valorNuevo: input.valorNuevo ?? null,
          actorNombre,
          nota: input.nota ?? null,
        },
      })
      return
    }

    await logRepairHistory(input)
  } catch (err) {
    // Regla MVP: el historial es best-effort. No tumbar el flujo principal.
    console.error("[repairs-prisma] logHistorial failed (non-fatal):", err)
  }
}

// ─── Server Actions públicas de Historial ────────────────────────────────────

/**
 * Obtiene el historial de actividad de una reparación.
 * Orden cronológico descendente (más reciente primero).
 */
export async function getHistorialReparacion(reparacionId: string): Promise<HistorialEntry[]> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const rows = await prisma.historialReparacion.findMany({
      where: { reparacionId, tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
    return rows.map((r) => ({
      id: r.id,
      tipo: r.tipo as HistorialTipo,
      descripcion: r.descripcion,
      valorAnterior: r.valorAnterior,
      valorNuevo: r.valorNuevo,
      actorNombre: r.actorNombre,
      nota: r.nota,
      createdAt: r.createdAt.toISOString(),
    }))
  } catch (err) {
    console.error("[repairs-prisma] getHistorialReparacion:", err)
    return []
  }
}

/**
 * Obtiene el historial junto con el detalle de la reparación (para la vista de folio).
 * Devuelve la forma que el UI espera: `changes` + `historialAudit` derivados del
 * modelo unificado HistorialReparacion.
 */
export async function getRepairDetailPageData(repairId: string): Promise<{
  detail: RepairDetail | null
  historial: HistorialEntry[]
  changes: RepairChangeHistoryRow[]
  historialAudit: HistorialReparacionAuditRow[]
  gastos: ReparacionGasto[]
  servicios: ReparacionServicio[]
  error: string | null
}> {
  const [detailResult, historial, gastosResult, serviciosResult] = await Promise.all([
    getRepairDetail(repairId),
    getHistorialReparacion(repairId),
    getGastosTicket(repairId),
    getServiciosReparacion(repairId),
  ])

  const { data: detail, error } = detailResult
  if (!detail || error) {
    return { detail: null, historial: [], changes: [], historialAudit: [], gastos: [], servicios: [], error }
  }

  const historialAudit: HistorialReparacionAuditRow[] = historial
    .filter((h) => h.tipo === "estado")
    .map((h) => ({
      id: h.id,
      estado_anterior: h.valorAnterior,
      estado_nuevo: h.valorNuevo ?? "",
      nota_tecnica: h.nota,
      fecha: h.createdAt,
      usuario_nombre: h.actorNombre ?? "Sistema",
    }))

  const changes: RepairChangeHistoryRow[] = historial
    .filter((h) => h.tipo !== "estado")
    .map((h) => ({
      id: h.id,
      tipo_cambio: h.tipo,
      descripcion: h.descripcion,
      created_at: h.createdAt,
      valor_anterior: h.valorAnterior,
      valor_nuevo: h.valorNuevo,
      usuario: h.actorNombre,
      nota: h.nota,
    }))

  return {
    detail,
    historial,
    changes,
    historialAudit,
    gastos: gastosResult.error ? [] : gastosResult.data,
    servicios: serviciosResult.error ? [] : serviciosResult.data,
    error: null,
  }
}

/**
 * No-op: las tablas legacy ya no se usan. El historial se escribe en
 * HistorialReparacion vía Prisma. Se mantiene como stub para no romper
 * llamadas existentes durante la transición.
 */
async function ensureAuditTablesExist(): Promise<void> {
  // Las tablas legacy (historial_reparacion, cambios_reparaciones) ya no se necesitan.
  // Todo el historial se escribe en el modelo Prisma HistorialReparacion.
}

function getPrismaErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null
  const maybeCode = (error as { code?: unknown }).code
  return typeof maybeCode === "string" ? maybeCode : null
}

export interface CreateRepairInput {
  folio?: string | null
  customerName: string
  customerPhone: string
  customerEmail?: string
  tipo_equipo?: string
  deviceBrand: string
  deviceModel: string
  deviceSerial?: string
  deviceColor?: string
  reportedFault: string
  estimatedPrice?: string
  fechaPromesaEntrega?: string | null
  deposit?: string
  clienteId?: string
  technician?: string
  pinContrasena?: string
  patronDesbloqueo?: string
  securityType?: string
  securityValue?: string
  notasInternas?: string
  checklistIngreso?: ChecklistIngreso | null
  checklistPro?: ChecklistProData | null
  checklist_pro?: unknown | null
  photos?: string[]
  metodoPagoAnticipo?: string | null
  servicios?: { servicio_id: string; cantidad?: number }[]
}

export interface BitacoraRepair {
  id: string
  folio: string
  clienteName: string
  clientePhone: string
  deviceBrand: string
  deviceModel: string
  tipo_equipo?: string | null
  estimatedPrice: number | null
  anticipo: number
  status: "Recibido" | "Diagnostico" | "En Reparacion" | "Esperando Refaccion" | "Listo" | "Entregado" | "Cancelado" | "Sin Reparacion" | "Reingreso"
  createdAt: string
  createdAtRaw?: string | null
  updatedAtRaw?: string | null
  tecnico?: string
  falla?: string | null
  securityType?: string | null
  securityValue?: string | null
  pinContrasena?: string | null
  patronDesbloqueo?: string | null
  checklistIngreso?: ChecklistIngreso | null
}

export type RepairStatusStats = Record<BitacoraRepair["status"], number>

const REPAIR_STATUS_VALUES: BitacoraRepair["status"][] = [
  "Recibido",
  "Diagnostico",
  "En Reparacion",
  "Esperando Refaccion",
  "Listo",
  "Entregado",
  "Cancelado",
  "Sin Reparacion",
  "Reingreso",
]

const TERMINAL_REPAIR_STATUSES = ["Entregado", "Cancelado", "Sin Reparacion"] as const
const EMPTY_REPAIR_STATUS_STATS = REPAIR_STATUS_VALUES.reduce((acc, status) => {
  acc[status] = 0
  return acc
}, {} as RepairStatusStats)

function emptyRepairStatusStats(): RepairStatusStats {
  return { ...EMPTY_REPAIR_STATUS_STATS }
}

export interface RepairDetail extends Omit<BitacoraRepair, "status" | "securityType"> {
  status?: BitacoraRepair["status"]
  pinContrasena?: string | null
  patronDesbloqueo?: string | null
  securityType?: SecurityTab | null
  securityValue?: string | null
  fotos?: string[] | null
  fotosSignedUrls?: string[] | null
  falla?: string | null
  createdAtRaw?: string | null
  tipo_equipo?: string | null
  imei?: string | null
  color?: string | null
  clienteEmail?: string | null
  clientePhoneSecondary?: string | null
  costoTotal?: number | null
  restante?: number | null
  creadoPorNombre?: string | null
  notasInternas?: string | null
  checklistIngreso?: ChecklistIngreso | null
  checklistPro?: ChecklistProData | null
  esperaRefaccionConcepto?: string | null
  esperaRefaccionEta?: string | null
  esperaRefaccionNota?: string | null
  fechaPromesaEntrega?: string | null
}

function normalizePhone(phone: string) {
  return onlyDigits(phone)
}

export async function updateRepairClientSecondaryPhone(
  repairId: string,
  telefonoSecundario: string | null,
): Promise<{ success: boolean; telefonoSecundario?: string | null; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const normalized = normalizePhone(telefonoSecundario ?? "")

    if (normalized && (normalized.length < 6 || normalized.length > 15)) {
      return { success: false, error: "El telefono alterno debe tener entre 6 y 15 digitos." }
    }

    const rep = await prisma.reparacion.findFirst({
      where: { id: repairId, tenantId },
      select: {
        clienteId: true,
        cliente: { select: { telefono: true } },
      },
    })

    if (!rep) return { success: false, error: "Folio no encontrado." }

    const primaryPhone = normalizePhone(rep.cliente?.telefono ?? "")
    if (normalized && primaryPhone && normalized === primaryPhone) {
      return { success: false, error: "El telefono alterno debe ser diferente al telefono principal." }
    }

    const updated = await prisma.cliente.update({
      where: { id: rep.clienteId },
      data: { telefonoSecundario: normalized || null },
      select: { telefonoSecundario: true },
    })

    return { success: true, telefonoSecundario: updated.telefonoSecundario }
  } catch (error) {
    console.error("updateRepairClientSecondaryPhone prisma:", error)
    return { success: false, error: "No se pudo guardar el telefono alterno." }
  }
}

function parseRepairPhotoDataUrl(dataUrl: string, index: number) {
  if (!dataUrl?.startsWith("data:image")) {
    throw new Error(`Foto ${index + 1}: formato invalido`)
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) {
    throw new Error(`Foto ${index + 1}: data URL invalida`)
  }

  const mimeType = match[1]
  const bytes = Buffer.from(match[2], "base64")
  const ext = mimeType.includes("png")
    ? "png"
    : mimeType.includes("jpeg") || mimeType.includes("jpg")
      ? "jpg"
      : "webp"

  return { mimeType, bytes, ext }
}

async function uploadRepairIntakePhotos(params: {
  tenantId: string
  repairId: string
  photos: string[]
  sortOrderOffset?: number
}) {
  const failures: string[] = []
  if (params.photos.length === 0) return failures

  const prisma = getPrismaClient()
  const bucketName = getStorageBucketName()
  const timestamp = Date.now()

  const uploads = params.photos.map(async (dataUrl, index) => {
    const { mimeType, bytes, ext } = parseRepairPhotoDataUrl(dataUrl, index)
    const sortOrder = (params.sortOrderOffset ?? 0) + index
    const archivoId = `${params.repairId}-${timestamp}-${sortOrder + 1}`
    const fileName = sanitizeFileName(`foto-${sortOrder + 1}.${ext}`)
    const storageKey = getPublicTrackPhotoKey({
      tenantId: params.tenantId,
      reparacionId: params.repairId,
      archivoId,
      fileName,
    })

    await uploadFileToS3({
      key: storageKey,
      body: bytes,
      contentType: mimeType,
    })

    await prisma.archivo.create({
      data: {
        tenantId: params.tenantId,
        reparacionId: params.repairId,
        tipo: "REPAIR_INTAKE_PHOTO",
        visibility: "TRACKING_VERIFIED",
        bucket: bucketName,
        key: storageKey,
        storageKey,
        publicUrl: null,
        fileName,
        mimeType,
        sizeBytes: bytes.length,
        size: bytes.length,
        sortOrder,
      },
    })
  })

  const settled = await Promise.allSettled(uploads)
  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
      failures.push(`Foto ${index + 1}: ${reason}`)
    }
  })

  return failures
}

function repairPhotoMatchesReference(row: RepairPhotoArchivoRow, references: Set<string>) {
  const candidates = [
    getArchivoDisplayUrl(row),
    row.publicUrl,
    row.storageKey,
    row.key,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)

  return candidates.some((candidate) => references.has(candidate))
}

function asStatus(value?: string | null): BitacoraRepair["status"] {
  const v = (value ?? "").trim()
  if (
    v === "Recibido" ||
    v === "Diagnostico" ||
    v === "En Reparacion" ||
    v === "Esperando Refaccion" ||
    v === "Listo" ||
    v === "Entregado" ||
    v === "Cancelado" ||
    v === "Sin Reparacion" ||
    v === "Reingreso"
  ) {
    return v
  }
  return "Recibido"
}

function toMxDate(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
}

function formatRepairSummaryDate(d: Date | null | undefined, timeZone: string | null | undefined) {
  if (!d) return "Sin fecha"
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timeZone || "America/Mexico_City",
    }).format(d)
  } catch {
    return d.toLocaleString("es-MX")
  }
}

function formatRepairSummaryMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined) return "Sin registrar"
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency || "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `$${value.toFixed(2)}`
  }
}

function parseRepairBudgetInput(value?: string | null): number | null {
  const raw = value?.trim()
  if (!raw) return null

  const amount = Number(raw)
  if (!Number.isFinite(amount)) {
    throw new Error("El presupuesto debe ser un numero valido.")
  }
  if (amount <= 0) {
    throw new Error("El presupuesto debe ser mayor a 0. Si aun no hay monto, marca Presupuesto pendiente.")
  }

  return amount
}

function compactRepairSummaryText(value: string | null | undefined, fallback = "Sin registrar") {
  const clean = (value ?? "").replace(/\s+/g, " ").trim()
  if (!clean) return fallback
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean
}

export type RepairSummaryRecipient = {
  id: string
  nombre: string
  rol: string
  telefono: string | null
  telefonoPais: string | null
}

export async function getRepairSummaryRecipients(): Promise<{ recipients: RepairSummaryRecipient[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    await ensureTeamPhoneColumns(prisma)
    const [users, colaboradores] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId, activo: true },
        select: { id: true, nombre: true, role: true, teamRole: true, telefono: true, telefonoPais: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.colaboradorOperativo.findMany({
        where: { tenantId, activo: true },
        select: { id: true, nombre: true, tipo: true, telefono: true, telefonoPais: true },
        orderBy: { nombre: "asc" },
      }),
    ])

    return {
      recipients: [
        ...users.map((u) => ({
          id: `user:${u.id}`,
          nombre: u.nombre || "Sin nombre",
          rol: u.role === "OWNER" ? "Dueno" : u.teamRole === "RECEPCIONISTA" ? "Recepcion" : u.teamRole === "ADMINISTRADOR" ? "Administrador" : "Tecnico",
          telefono: u.telefono ?? null,
          telefonoPais: u.telefonoPais ?? null,
        })),
        ...colaboradores.map((c) => ({
          id: `colaborador:${c.id}`,
          nombre: c.nombre,
          rol: c.tipo === "maquila" ? "Tec. Externo" : "Colaborador",
          telefono: c.telefono ?? null,
          telefonoPais: c.telefonoPais ?? null,
        })),
      ],
      error: null,
    }
  } catch (error) {
    console.error("[getRepairSummaryRecipients]", error)
    return { recipients: [], error: "No se pudieron cargar los miembros del equipo." }
  }
}

function buildInternalRepairSummaryMessage(input: {
  folio: string
  estado: string
  clienteNombre?: string | null
  clienteTelefono?: string | null
  equipo?: string | null
  serie?: string | null
  falla?: string | null
  notas?: string | null
  tecnico?: string | null
  presupuesto?: number | null
  saldo?: number | null
  currency?: string | null
  trackingUrl: string
}) {
  return [
    `*Resumen folio ${input.folio}*`,
    `Estado: ${asStatus(input.estado)}`,
    "",
    `Cliente: ${compactRepairSummaryText(input.clienteNombre)}`,
    input.clienteTelefono ? `Tel: ${compactRepairSummaryText(input.clienteTelefono)}` : null,
    `Equipo: ${compactRepairSummaryText(input.equipo)}`,
    input.serie ? `Serie/IMEI: ${compactRepairSummaryText(input.serie)}` : null,
    "",
    `Falla: ${compactRepairSummaryText(input.falla)}`,
    input.notas ? `Notas: ${compactRepairSummaryText(input.notas)}` : null,
    `Tecnico: ${compactRepairSummaryText(input.tecnico, "No asignado")}`,
    "",
    `Presupuesto: ${formatRepairSummaryMoney(input.presupuesto, input.currency)}`,
    `Saldo: ${formatRepairSummaryMoney(input.saldo, input.currency)}`,
    "",
    `Tracking: ${input.trackingUrl}`,
  ].filter(Boolean).join("\n")
}

async function getRepairSummaryBase(repairId: string) {
  const prisma = getPrismaClient()
  const tenantId = await getTenantIdOrThrow()
  const rep = await prisma.reparacion.findFirst({
    where: { id: repairId, tenantId },
    select: {
      id: true,
      folio: true,
      estado: true,
      tipoEquipo: true,
      equipoMarca: true,
      equipoModelo: true,
      numeroSerie: true,
      falla: true,
      tecnico: true,
      costoEstimado: true,
      anticipo: true,
      costoTotal: true,
      notasInternas: true,
      cliente: { select: { nombre: true, telefono: true } },
      tenant: {
        select: {
          currency: true,
          configuracion: {
            select: {
              pais: true,
              responsableTelefono: true,
            },
          },
        },
      },
    },
  })
  return rep
}

export async function getRepairResponsibleWhatsAppUrl(repairId: string): Promise<{ url: string | null; error: string | null }> {
  try {
    const rep = await getRepairSummaryBase(repairId)
    if (!rep) return { url: null, error: "No se encontro el folio." }

    const config = rep.tenant.configuracion
    const responsiblePhone = config?.responsableTelefono?.trim()
    const countryCode = getCodigoTelefono(config?.pais)
    const digits = normalizePhoneForWhatsApp(responsiblePhone, countryCode)

    if (!digits) {
      return {
        url: null,
        error: "Configura el telefono del responsable en Configuracion > Taller para enviarle resumenes por WhatsApp.",
      }
    }

    const currency = rep.tenant.currency || "MXN"
    const presupuesto = rep.costoTotal != null ? Number(rep.costoTotal) : rep.costoEstimado != null ? Number(rep.costoEstimado) : null
    const anticipo = rep.anticipo != null ? Number(rep.anticipo) : 0
    const saldo = presupuesto == null ? null : Math.max(0, presupuesto - anticipo)
    const equipo = [rep.tipoEquipo, rep.equipoMarca, rep.equipoModelo].map((v) => v?.trim()).filter(Boolean).join(" ")
    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://reparahub.com").replace(/\/$/, "")
    const trackingUrl = `${appBaseUrl}/track/${rep.id}`
    const message = buildInternalRepairSummaryMessage({
      folio: rep.folio,
      estado: rep.estado,
      clienteNombre: rep.cliente?.nombre,
      clienteTelefono: rep.cliente?.telefono,
      equipo,
      serie: rep.numeroSerie,
      falla: rep.falla,
      notas: rep.notasInternas,
      tecnico: rep.tecnico,
      presupuesto,
      saldo,
      currency,
      trackingUrl,
    })

    return { url: buildWhatsAppUrl(digits, message), error: null }
  } catch (error) {
    console.error("[getRepairResponsibleWhatsAppUrl]", error)
    return { url: null, error: "No se pudo preparar el resumen para WhatsApp." }
  }
}

export async function getRepairTeamMemberWhatsAppUrl(
  repairId: string,
  recipientId: string,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    await ensureTeamPhoneColumns(prisma)
    const rep = await getRepairSummaryBase(repairId)
    if (!rep) return { url: null, error: "No se encontro el folio." }

    const normalizedRecipientId = recipientId.trim()
    let recipient: { nombre: string; telefono: string | null; telefonoPais: string | null } | null = null
    if (normalizedRecipientId.startsWith("user:")) {
      const userId = normalizedRecipientId.replace("user:", "")
      recipient = await prisma.user.findFirst({
        where: { id: userId, tenantId, activo: true },
        select: { nombre: true, telefono: true, telefonoPais: true },
      })
    } else if (normalizedRecipientId.startsWith("colaborador:")) {
      const colaboradorId = normalizedRecipientId.replace("colaborador:", "")
      recipient = await prisma.colaboradorOperativo.findFirst({
        where: { id: colaboradorId, tenantId, activo: true },
        select: { nombre: true, telefono: true, telefonoPais: true },
      })
    }

    if (!recipient) return { url: null, error: "No se encontro el miembro seleccionado." }

    const countryCode = getCodigoTelefono(recipient.telefonoPais) ?? getCodigoTelefono(rep.tenant.configuracion?.pais)
    const digits = normalizePhoneForWhatsApp(recipient.telefono, countryCode)
    if (!digits) {
      return {
        url: null,
        error: `${recipient.nombre} no tiene telefono registrado en Mi Equipo.`,
      }
    }

    const currency = rep.tenant.currency || "MXN"
    const presupuesto = rep.costoTotal != null ? Number(rep.costoTotal) : rep.costoEstimado != null ? Number(rep.costoEstimado) : null
    const anticipo = rep.anticipo != null ? Number(rep.anticipo) : 0
    const saldo = presupuesto == null ? null : Math.max(0, presupuesto - anticipo)
    const equipo = [rep.tipoEquipo, rep.equipoMarca, rep.equipoModelo].map((v) => v?.trim()).filter(Boolean).join(" ")
    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://reparahub.com").replace(/\/$/, "")
    const trackingUrl = `${appBaseUrl}/track/${rep.id}`
    const message = buildInternalRepairSummaryMessage({
      folio: rep.folio,
      estado: rep.estado,
      clienteNombre: rep.cliente?.nombre,
      clienteTelefono: rep.cliente?.telefono,
      equipo,
      serie: rep.numeroSerie,
      falla: rep.falla,
      notas: rep.notasInternas,
      tecnico: rep.tecnico,
      presupuesto,
      saldo,
      currency,
      trackingUrl,
    })

    return { url: buildWhatsAppUrl(digits, message), error: null }
  } catch (error) {
    console.error("[getRepairTeamMemberWhatsAppUrl]", error)
    return { url: null, error: "No se pudo preparar el resumen para WhatsApp." }
  }
}

function toBitacoraRepair(r: {
  id: string
  folio: string
  estado: string
  tipoEquipo: string | null
  equipoMarca: string | null
  equipoModelo: string | null
  falla: string | null
  tecnico: string | null
  securityType: string | null
  securityValue: string | null
  pinContrasena: string | null
  patronDesbloqueo: string | null
  costoEstimado: any
  anticipo: any
  createdAt: Date
  updatedAt: Date
  checklistIngreso?: unknown | null
  cliente: { nombre: string; telefono: string | null }
}): BitacoraRepair {
  return {
    id: r.id,
    folio: r.folio,
    clienteName: r.cliente?.nombre ?? "Sin nombre",
    clientePhone: onlyDigits(r.cliente?.telefono),
    deviceBrand: r.equipoMarca ?? "N/A",
    deviceModel: r.equipoModelo ?? "N/A",
    tipo_equipo: r.tipoEquipo,
    estimatedPrice: r.costoEstimado == null ? null : Number(r.costoEstimado),
    anticipo: r.anticipo == null ? 0 : Number(r.anticipo),
    status: asStatus(r.estado),
    createdAt: toMxDate(r.createdAt),
    createdAtRaw: r.createdAt.toISOString(),
    updatedAtRaw: r.updatedAt.toISOString(),
    tecnico: r.tecnico ?? "No asignado",
    falla: r.falla ?? null,
    securityType: r.securityType ?? null,
    securityValue: r.securityValue ?? null,
    pinContrasena: r.pinContrasena ?? null,
    patronDesbloqueo: r.patronDesbloqueo ?? null,
    checklistIngreso: ensureChecklistIngreso(
      r.tipoEquipo ?? "Otro",
      parseChecklistIngreso(r.checklistIngreso),
    ),
  }
}

export async function getNextFolio() {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const rows = await prisma.$queryRaw<Array<{ max_folio_num: number }>>`
      SELECT COALESCE(
        MAX(CAST(NULLIF(regexp_replace("folio", '[^0-9]', '', 'g'), '') AS INTEGER)),
        0
      ) AS max_folio_num
      FROM "Reparacion"
      WHERE "tenantId" = ${tenantId}
    `
    const maxNum = Number(rows?.[0]?.max_folio_num ?? 0)
    return { folio: String(maxNum + 1).padStart(3, "0"), error: null as string | null }
  } catch (e) {
    console.error("getNextFolio prisma:", e)
    return { folio: null, error: "No se pudo generar folio" }
  }
}

export async function searchClientByPhone(phone: string) {
  try {
    const tenantId = await getTenantIdOrThrow()
    const cleaned = normalizePhone(phone)
    if (!cleaned || cleaned.length < 6) return { client: null, error: null }
    const prisma = getPrismaClient()
    const client = await prisma.cliente.findFirst({
      where: { tenantId, telefono: cleaned },
      orderBy: { createdAt: "asc" },
      select: { id: true, nombre: true, telefono: true, email: true },
    })
    if (!client) return { client: null, error: null }
    return {
      client: {
        id: client.id,
        nombre: client.nombre,
        telefono: client.telefono ?? "",
        correo: client.email ?? "",
      },
      error: null,
    }
  } catch (e) {
    console.error("searchClientByPhone prisma:", e)
    return { client: null, error: "Error al buscar cliente" }
  }
}

export async function createRepair(input: CreateRepairInput) {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const phone = normalizePhone(input.customerPhone)
    if (!input.customerName?.trim() || !phone || !input.deviceBrand?.trim() || !input.deviceModel?.trim() || !input.reportedFault?.trim()) {
      return { success: false, error: "Faltan campos requeridos." }
    }
    const presupuesto = parseRepairBudgetInput(input.estimatedPrice)
    const fechaPromesaEntrega = parseDateOnlyInput(input.fechaPromesaEntrega)

    const result = await prisma.$transaction(async (tx: TxClient) => {
      const nextFolioForTenant = async () => {
        const rows = await tx.$queryRaw<Array<{ max_folio_num: number }>>`
          SELECT COALESCE(
            MAX(CAST(NULLIF(regexp_replace("folio", '[^0-9]', '', 'g'), '') AS INTEGER)),
            0
          ) AS max_folio_num
          FROM "Reparacion"
          WHERE "tenantId" = ${tenantId}
        `
        const maxNum = Number(rows?.[0]?.max_folio_num ?? 0)
        return String(maxNum + 1).padStart(3, "0")
      }

      const resolvedClient = await resolveClienteByTelefono({
        tenantId,
        clienteId: input.clienteId,
        telefono: phone,
        nombre: input.customerName,
        correo: input.customerEmail,
        notasOrigen: "Creado desde reparacion",
      }, tx)
      if (!resolvedClient.client) throw new Error(resolvedClient.error ?? "No se pudo resolver el cliente")
      const clientId = resolvedClient.client.id

      let folio = input.folio?.trim() || ""
      let rep: { id: string; folio: string } | null = null
      for (let attempt = 0; attempt < 3; attempt++) {
        const folioCandidate = folio || (await nextFolioForTenant())
        try {
          rep = await tx.reparacion.create({
            data: {
              tenantId,
              clienteId: clientId,
              folio: folioCandidate,
              estado: "Recibido",
              tipoEquipo: input.tipo_equipo?.trim() || "Celular",
              equipoMarca: input.deviceBrand.trim(),
              equipoModelo: input.deviceModel.trim(),
              numeroSerie: input.deviceSerial?.trim() || null,
              color: input.deviceColor?.trim() || null,
              falla: input.reportedFault.trim(),
              ...(fechaPromesaEntrega ? { fechaPromesaEntrega } : {}),
              tecnico: input.technician?.trim() || "Sin asignar",
              costoEstimado: presupuesto,
              anticipo: input.deposit?.trim() ? Number(input.deposit) : null,
              securityType: input.securityType ?? null,
              securityValue: input.securityValue ?? null,
              pinContrasena: input.pinContrasena ?? null,
              patronDesbloqueo: input.patronDesbloqueo ?? null,
              notasInternas: input.notasInternas?.trim() || null,
              checklistIngreso: input.checklistIngreso != null
                ? checklistIngresoToJson(input.checklistIngreso) as any
                : null,
            },
            select: { id: true, folio: true },
          })
          break
        } catch (err) {
          if (
            !folio &&
            getPrismaErrorCode(err) === "P2002" &&
            attempt < 2
          ) {
            continue
          }
          throw err
        }
      }
      if (!rep) throw new Error("No se pudo reservar un folio unico para el tenant.")

      if (input.servicios) {
        await setServiciosReparacion(rep.id, input.servicios, tx)
      }

      await logHistorial({
        reparacionId: rep.id,
        tenantId,
        tipo: "creacion",
        descripcion: `EQUIPO RECIBIDO — ${input.tipo_equipo?.trim() || "Equipo"} ${input.deviceBrand.trim()} ${input.deviceModel.trim()} — Folio ${rep.folio}`,
        valorNuevo: "Recibido",
        nota: `Recibido por ${await getCurrentActorDisplayName()}`,
      }, tx)

      return rep
    })

    const photoFailures: string[] = []
    if (input.photos?.length) {
      photoFailures.push(...await uploadRepairIntakePhotos({
        tenantId,
        repairId: result.id,
        photos: input.photos,
      }))
      if (photoFailures.length > 0) {
        console.error("createRepair prisma photos failures:", photoFailures)
      }
    }

    return {
      success: true,
      repairId: result.id,
      folio: result.folio,
      photoSummary: {
        total: input.photos?.length ?? 0,
        failed: photoFailures.length,
        failures: photoFailures,
      },
    }
  } catch (e) {
    console.error("createRepair prisma:", e)
    const prismaCode = getPrismaErrorCode(e)
    if (prismaCode) {
      if (prismaCode === "P2002") {
        return { success: false, error: "Folio duplicado detectado. Intenta de nuevo." }
      }
      return {
        success: false,
        error: `Prisma ${prismaCode}: ${e instanceof Error ? e.message : "Error desconocido"}`,
      }
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo crear la reparacion.",
    }
  }
}

export const crearReparacion = createRepair

export async function getRepairsByTallerId(
  page = 0,
  pageSize = 50,
  search?: string,
  estatusFilter?: string,
  criticalOnly = false,
  technicianFilter?: string,
): Promise<{
  data: BitacoraRepair[]
  error: string | null
  total: number
  stats: RepairStatusStats
  criticalCount: number
}> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const baseWhere: any = { tenantId }
    const technician = technicianFilter?.trim()
    if (technician) {
      baseWhere.tecnico = technician === "__unassigned__"
        ? { in: [null, "", "Sin asignar", "No asignado"] }
        : technician
    }

    const where: any = { ...baseWhere }
    const andClauses: any[] = []
    if (estatusFilter) where.estado = estatusFilter
    if (criticalOnly) {
      const now = new Date()
      andClauses.push({
        OR: [
        {
          estado: { notIn: [...TERMINAL_REPAIR_STATUSES, "Esperando Refaccion"] },
          updatedAt: { lt: new Date(Date.now() - REPAIR_URGENCY_MS) },
        },
        {
          estado: "Esperando Refaccion",
          esperaRefaccionEta: { lt: now },
        },
        ],
      })
    }
    if (search?.trim()) {
      const term = search.trim()
      const phoneDigits = normalizePhone(term)
      andClauses.push({
        OR: [
        { folio: { contains: term, mode: "insensitive" } },
        { equipoMarca: { contains: term, mode: "insensitive" } },
        { equipoModelo: { contains: term, mode: "insensitive" } },
        { numeroSerie: { contains: term, mode: "insensitive" } },
        { falla: { contains: term, mode: "insensitive" } },
        { cliente: { nombre: { contains: term, mode: "insensitive" } } },
        // Phone: only add if the term actually contains digits
        ...(phoneDigits.length > 0
          ? [{ cliente: { telefono: { contains: phoneDigits } } }]
          : []),
        ],
      })
    }
    if (andClauses.length > 0) where.AND = andClauses
    const [rows, total, groupedStats, criticalCount] = await Promise.all([
      prisma.reparacion.findMany({
        where,
        include: { cliente: { select: { nombre: true, telefono: true } } },
        orderBy: { createdAt: "desc" },
        skip: page * pageSize,
        take: pageSize,
      }),
      prisma.reparacion.count({ where }),
      prisma.reparacion.groupBy({
        by: ["estado"],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.reparacion.count({
        where: {
          ...baseWhere,
          OR: [
            {
              estado: { notIn: [...TERMINAL_REPAIR_STATUSES, "Esperando Refaccion"] },
              updatedAt: { lt: new Date(Date.now() - REPAIR_URGENCY_MS) },
            },
            {
              estado: "Esperando Refaccion",
              esperaRefaccionEta: { lt: new Date() },
            },
          ],
        },
      }),
    ])
    const stats = emptyRepairStatusStats()
    for (const row of groupedStats) {
      stats[asStatus(row.estado)] = row._count._all
    }
    return { data: rows.map(toBitacoraRepair), error: null, total, stats, criticalCount }
  } catch (e) {
    console.error("getRepairsByTallerId prisma:", e)
    return {
      data: [],
      error: "No se pudieron cargar las reparaciones.",
      total: 0,
      stats: emptyRepairStatusStats(),
      criticalCount: 0,
    }
  }
}

export async function getRepairDetail(repairId: string): Promise<{ data: RepairDetail | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const [rep, archivos] = await Promise.all([
      prisma.reparacion.findFirst({
        where: { id: repairId, tenantId },
        select: {
          id: true, tenantId: true, clienteId: true, folio: true, estado: true,
          tipoEquipo: true, equipoMarca: true, equipoModelo: true, numeroSerie: true,
          color: true, falla: true, tecnico: true, costoEstimado: true, anticipo: true,
          securityType: true, securityValue: true, pinContrasena: true, patronDesbloqueo: true,
          notasInternas: true, checklistIngreso: true, checklistPro: true, creadoPorNombre: true,
          esperaRefaccionConcepto: true, esperaRefaccionEta: true, esperaRefaccionNota: true,
          fechaPromesaEntrega: true,
          costoTotal: true, firmaIngresoPath: true, createdAt: true, updatedAt: true,
          cliente: { select: { nombre: true, telefono: true, telefonoSecundario: true, email: true } },
        },
      }),
      prisma.archivo.findMany({
        where: {
          tenantId,
          reparacionId: repairId,
          visibility: "TRACKING_VERIFIED",
          tipo: "REPAIR_INTAKE_PHOTO",
        },
        orderBy: { createdAt: "asc" },
        select: { publicUrl: true, storageKey: true, key: true },
      }),
    ])
    if (!rep) return { data: null, error: null }
    const estimated = rep.costoEstimado == null ? null : Number(rep.costoEstimado)
    const anticipo = rep.anticipo == null ? 0 : Number(rep.anticipo)
    const fotos = archivos
      .map((a: ArchivoRow) => getArchivoDisplayUrl(a))
      .filter((u: string | null | undefined): u is string => Boolean(u))

    const detail: RepairDetail = {
      ...toBitacoraRepair({ ...rep, cliente: { nombre: rep.cliente.nombre, telefono: rep.cliente.telefono } }),
      status: asStatus(rep.estado),
      securityType:
        rep.securityType === "none" || rep.securityType === "pin" || rep.securityType === "password" || rep.securityType === "pattern"
          ? rep.securityType
          : null,
      securityValue: rep.securityValue ?? null,
      createdAtRaw: rep.createdAt.toISOString(),
      clienteEmail: rep.cliente.email ?? null,
      clientePhoneSecondary: rep.cliente.telefonoSecundario ?? null,
      imei: rep.numeroSerie ?? null,
      color: rep.color ?? null,
      tipo_equipo: rep.tipoEquipo ?? null,
      pinContrasena: rep.pinContrasena ?? null,
      patronDesbloqueo: rep.patronDesbloqueo ?? null,
      fotos,
      fotosSignedUrls: fotos,
      falla: rep.falla ?? null,
      costoTotal: estimated,
      restante: estimated == null ? null : Math.max(0, estimated - anticipo),
      notasInternas: rep.notasInternas ?? null,
      checklistIngreso: ensureChecklistIngreso(rep.tipoEquipo ?? "Otro", parseChecklistIngreso(rep.checklistIngreso)),
      checklistPro: rep.checklistPro as ChecklistProData | null,
      creadoPorNombre: rep.creadoPorNombre ?? null,
      esperaRefaccionConcepto: rep.esperaRefaccionConcepto ?? null,
      esperaRefaccionEta: rep.esperaRefaccionEta?.toISOString() ?? null,
      esperaRefaccionNota: rep.esperaRefaccionNota ?? null,
      fechaPromesaEntrega: formatDateOnlyForInput(rep.fechaPromesaEntrega),
    }
    return { data: detail, error: null }
  } catch (e) {
    console.error("getRepairDetail prisma:", e)
    return { data: null, error: "No se pudo cargar el detalle." }
  }
}

export async function updateRepairFull(input: {
  repairId: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  clienteId?: string
  tipo_equipo?: string
  deviceBrand: string
  deviceModel: string
  deviceSerial?: string
  deviceColor?: string
  reportedFault: string
  estimatedPrice?: string
  fechaPromesaEntrega?: string | null
  technician?: string
  pinContrasena?: string
  patronDesbloqueo?: string
  securityType?: string
  securityValue?: string
  newPhotos?: string[]
  removedPhotos?: string[]
  keptPhotos?: string[]
  notasInternas?: string
  checklistIngreso?: ChecklistIngreso | null
  servicios?: { servicio_id: string; cantidad?: number }[]
}) {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const phone = normalizePhone(input.customerPhone)
    const presupuesto = parseRepairBudgetInput(input.estimatedPrice)
    const fechaPromesaEntrega = parseDateOnlyInput(input.fechaPromesaEntrega)
    const existing = await prisma.reparacion.findFirst({
      where: { id: input.repairId, tenantId },
      select: { id: true, clienteId: true },
    })
    if (!existing) return { success: false, error: "No se encontro la reparacion." }

    const currentPhotoRows = await prisma.archivo.findMany({
      where: {
        tenantId,
        reparacionId: input.repairId,
        tipo: "REPAIR_INTAKE_PHOTO",
        visibility: "TRACKING_VERIFIED",
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, publicUrl: true, storageKey: true, key: true, sortOrder: true },
    })
    const removedReferences = new Set((input.removedPhotos ?? []).map((p) => p.trim()).filter(Boolean))
    const keptReferences = new Set((input.keptPhotos ?? []).map((p) => p.trim()).filter(Boolean))
    const shouldInferRemovedFromKept = input.keptPhotos !== undefined
    const photosToRemove = currentPhotoRows.filter((row) => {
      if (repairPhotoMatchesReference(row, removedReferences)) return true
      return shouldInferRemovedFromKept && !repairPhotoMatchesReference(row, keptReferences)
    })
    const removeIds = new Set(photosToRemove.map((row) => row.id))
    const remainingPhotoRows = currentPhotoRows.filter((row) => !removeIds.has(row.id))
    const newPhotos = input.newPhotos ?? []

    if (remainingPhotoRows.length + newPhotos.length > 3) {
      return { success: false, error: "Solo se permiten hasta 3 fotos por ticket." }
    }

    await prisma.$transaction(async (tx: TxClient) => {
      const resolvedClient = await resolveClienteByTelefono({
        tenantId,
        clienteId: input.clienteId || existing.clienteId,
        telefono: phone,
        nombre: input.customerName,
        correo: input.customerEmail,
        notasOrigen: "Actualizado desde reparacion",
      }, tx)
      const clientId = resolvedClient.client?.id ?? existing.clienteId
      await tx.cliente.update({
        where: { id: clientId },
        data: { nombre: input.customerName.trim(), telefono: phone, email: input.customerEmail?.trim() || null },
      })
      await tx.reparacion.update({
        where: { id: input.repairId },
        data: {
          clienteId: clientId,
          tipoEquipo: input.tipo_equipo?.trim() || null,
          equipoMarca: input.deviceBrand.trim(),
          equipoModelo: input.deviceModel.trim(),
          numeroSerie: input.deviceSerial?.trim() || null,
          color: input.deviceColor?.trim() || null,
          falla: input.reportedFault.trim(),
          ...(fechaPromesaEntrega ? { fechaPromesaEntrega } : {}),
          tecnico: input.technician?.trim() || null,
          costoEstimado: presupuesto,
          securityType: input.securityType ?? null,
          securityValue: input.securityValue ?? null,
          pinContrasena: input.pinContrasena ?? null,
          patronDesbloqueo: input.patronDesbloqueo ?? null,
          notasInternas: input.notasInternas?.trim() || null,
          checklistIngreso: input.checklistIngreso !== undefined
            ? (input.checklistIngreso != null ? checklistIngresoToJson(input.checklistIngreso) as any : null)
            : undefined,
        },
      })

      if (input.servicios) {
        await setServiciosReparacion(input.repairId, input.servicios, tx)
      }

      if (photosToRemove.length > 0) {
        await tx.archivo.deleteMany({
          where: { id: { in: photosToRemove.map((row) => row.id) }, tenantId, reparacionId: input.repairId },
        })
      }

      await Promise.all(
        remainingPhotoRows.map((row, index) =>
          tx.archivo.update({
            where: { id: row.id },
            data: { sortOrder: index },
          }),
        ),
      )
    }, { timeout: 15000 })

    const removedKeys = photosToRemove
      .map((row) => row.storageKey || row.key)
      .map((key) => key?.trim())
      .filter((key): key is string => Boolean(key))
    const deleteResults = await Promise.allSettled(removedKeys.map((key) => deleteFromS3(key)))
    const deleteFailures = deleteResults.filter((result) => result.status === "rejected")
    if (deleteFailures.length > 0) {
      console.error("updateRepairFull photo delete failures:", deleteFailures)
    }

    const photoFailures = await uploadRepairIntakePhotos({
      tenantId,
      repairId: input.repairId,
      photos: newPhotos,
      sortOrderOffset: remainingPhotoRows.length,
    })
    if (photoFailures.length > 0) {
      console.error("updateRepairFull photo upload failures:", photoFailures)
      return {
        success: false,
        error: `Los datos se guardaron, pero no se pudieron subir todas las fotos. ${photoFailures[0]}`,
      }
    }

    return { success: true }
  } catch (e) {
    console.error("updateRepairFull prisma:", e)
    return { success: false, error: "No se pudo actualizar la reparacion." }
  }
}

export async function applyRepairStatusChange(input: {
  repairId: string
  estadoAnterior: string
  estadoNuevo: string
  notaTecnica?: string | null
  esperaRefaccionConcepto?: string | null
  esperaRefaccionEta?: string | null
  esperaRefaccionNota?: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const existing = await prisma.reparacion.findFirst({
      where: { id: input.repairId, tenantId },
      select: { id: true, estado: true, costoEstimado: true, notasInternas: true },
    })
    if (!existing) return { success: false, error: "No se encontro la reparacion." }

    if (existing.estado === "Cancelado") {
      return { success: false, error: "No se puede modificar una reparacion cancelada. Crea un nuevo folio para este equipo." }
    }
    if (input.estadoNuevo === "En Reparacion") {
      const presupuesto = existing.costoEstimado == null ? null : Number(existing.costoEstimado)
      if (!presupuesto || presupuesto <= 0) {
        return {
          success: false,
          error: "Asigna un presupuesto mayor a 0 antes de pasar el folio a En Reparacion.",
        }
      }
    }
    if (
      input.estadoNuevo === "Esperando Refaccion" &&
      !["Diagnostico", "En Reparacion", "Esperando Refaccion"].includes(existing.estado)
    ) {
      return { success: false, error: "Solo puedes marcar espera de refaccion desde Diagnostico o En Reparacion." }
    }

    await prisma.$transaction(async (tx) => {
      const nota = input.notaTecnica?.trim() || null
      const updateData: {
        estado: string
        notasInternas?: string | null
        esperaRefaccionConcepto?: string | null
        esperaRefaccionEta?: Date | null
        esperaRefaccionNota?: string | null
      } = { estado: input.estadoNuevo }

      if (input.estadoNuevo === "Esperando Refaccion") {
        const concepto = input.esperaRefaccionConcepto?.trim()
        const etaRaw = input.esperaRefaccionEta?.trim()
        if (!concepto) throw new Error("Captura la refaccion o proveedor pendiente.")
        if (!etaRaw) throw new Error("Captura una fecha estimada de llegada.")
        const eta = new Date(`${etaRaw}T23:59:59.999`)
        if (Number.isNaN(eta.getTime())) throw new Error("La fecha estimada no es valida.")
        updateData.esperaRefaccionConcepto = concepto
        updateData.esperaRefaccionEta = eta
        updateData.esperaRefaccionNota = input.esperaRefaccionNota?.trim() || nota
      } else if (input.estadoAnterior === "Esperando Refaccion") {
        updateData.esperaRefaccionConcepto = null
        updateData.esperaRefaccionEta = null
        updateData.esperaRefaccionNota = null
      }

      if (input.estadoNuevo === "Sin Reparacion" && nota) {
        const motivoLine = `Motivo sin reparacion: ${nota}`
        const currentNotes = existing.notasInternas?.trim() ?? ""
        updateData.notasInternas = currentNotes.includes(motivoLine)
          ? currentNotes || null
          : [currentNotes, motivoLine].filter(Boolean).join("\n")
      }

      await tx.reparacion.update({ where: { id: input.repairId }, data: updateData })

      await logHistorial({
        reparacionId: input.repairId,
        tenantId,
        tipo: "estado",
        descripcion: `Estado: ${input.estadoAnterior || '?'} -> ${input.estadoNuevo}`,
        valorAnterior: input.estadoAnterior || null,
        valorNuevo: input.estadoNuevo,
        nota: input.estadoNuevo === "Esperando Refaccion"
          ? [
              input.esperaRefaccionConcepto?.trim() ? `Refaccion/proveedor: ${input.esperaRefaccionConcepto.trim()}` : null,
              input.esperaRefaccionEta?.trim() ? `ETA: ${input.esperaRefaccionEta.trim()}` : null,
              input.esperaRefaccionNota?.trim() || nota,
            ].filter(Boolean).join(" | ")
          : nota,
      }, tx)
    }, { timeout: 15000 })

    return { success: true }
  } catch (e) {
    console.error("applyRepairStatusChange prisma:", e)
    return { success: false, error: e instanceof Error ? e.message : "No se pudo actualizar el estado." }
  }
}

function parseDateOnlyInput(value?: string | null): Date | undefined {
  const raw = value?.trim()
  if (!raw) return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error("La fecha de entrega debe tener formato valido.")
  }
  const date = new Date(`${raw}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    throw new Error("La fecha de entrega debe ser valida.")
  }
  return date
}

function formatDateOnlyForInput(value?: Date | null): string | null {
  if (!value) return null
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, "0")
  const day = String(value.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export async function updateRepairDeliveryDate(
  repairId: string,
  fechaEntrega: string,
): Promise<{ success: boolean; fechaPromesaEntrega?: string; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const nextDate = parseDateOnlyInput(fechaEntrega)
    if (!nextDate) return { success: false, error: "Selecciona una fecha de entrega." }

    const current = await prisma.reparacion.findFirst({
      where: { id: repairId, tenantId },
      select: { id: true, fechaPromesaEntrega: true },
    })
    if (!current) return { success: false, error: "No se encontro la reparacion." }

    await prisma.$transaction(async (tx) => {
      await tx.reparacion.update({
        where: { id: repairId },
        data: { fechaPromesaEntrega: nextDate },
      })
      await logHistorial({
        reparacionId: repairId,
        tenantId,
        tipo: "otro",
        descripcion: `Fecha de entrega actualizada: ${fechaEntrega}`,
        valorAnterior: formatDateOnlyForInput(current.fechaPromesaEntrega),
        valorNuevo: fechaEntrega,
      }, tx)
    })

    return { success: true, fechaPromesaEntrega: formatDateOnlyForInput(nextDate) ?? fechaEntrega }
  } catch (e) {
    console.error("updateRepairDeliveryDate prisma:", e)
    return { success: false, error: e instanceof Error ? e.message : "No se pudo actualizar la fecha de entrega." }
  }
}

export const updateRepairStatus = applyRepairStatusChange

export async function updateRepairTechnician(
  repairId: string,
  technician: string,
): Promise<{ success: boolean; tecnico?: string; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const nextTechnician = technician.trim() || "Sin asignar"

    const existing = await prisma.reparacion.findFirst({
      where: { id: repairId, tenantId },
      select: { id: true, tecnico: true, estado: true },
    })
    if (!existing) return { success: false, error: "No se encontro la reparacion." }
    if (existing.estado === "Cancelado") {
      return { success: false, error: "No se puede modificar una reparacion cancelada." }
    }

    const prev = existing.tecnico?.trim() || "Sin asignar"
    if (prev === nextTechnician) return { success: true, tecnico: nextTechnician }

    await prisma.$transaction(async (tx) => {
      await tx.reparacion.update({
        where: { id: repairId },
        data: { tecnico: nextTechnician },
      })

      await logHistorial({
        reparacionId: repairId,
        tenantId,
        tipo: "tecnico",
        descripcion: `Tecnico asignado: ${prev} -> ${nextTechnician}`,
        valorAnterior: prev,
        valorNuevo: nextTechnician,
      }, tx)
    }, { timeout: 10000 })

    return { success: true, tecnico: nextTechnician }
  } catch (e) {
    console.error("updateRepairTechnician prisma:", e)
    return { success: false, error: e instanceof Error ? e.message : "No se pudo actualizar el tecnico." }
  }
}

export async function getAllActiveTechnicians() {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const [users, colaboradores] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId, activo: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
        take: 100,
      }),
      prisma.colaboradorOperativo.findMany({
        where: { tenantId, activo: true },
        select: { id: true, nombre: true, tipo: true },
        orderBy: { nombre: "asc" },
        take: 100,
      }),
    ])
    const technicians = [
      ...users.map((u: TechnicianRow) => ({ id: u.id, nombre: u.nombre || "Sin nombre" })),
      ...colaboradores.map((c) => ({
        id: `colaborador:${c.id}`,
        nombre: c.nombre || (c.tipo === "maquila" ? "Maquila" : "Tecnico externo"),
      })),
    ]
    return { technicians, error: null as string | null }
  } catch (e) {
    console.error("getAllActiveTechnicians prisma:", e)
    return { technicians: [], error: "No se pudieron cargar tecnicos." }
  }
}

export interface RepairOrder {
  id: string
  folio: string
  customer: string
  phone: string
  device: string
  tipo_equipo: string
  status: "Recibido" | "Diagnostico" | "En Reparacion" | "Esperando Refaccion" | "Listo" | "Entregado"
  date: string
  problem: string
  price: string
  technician: string
}

export async function getReparacionesListas(): Promise<{ data: RepairOrder[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const rows = await prisma.reparacion.findMany({
      where: { tenantId, estado: "Listo" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        folio: true,
        cliente: { select: { nombre: true, telefono: true } },
        tipoEquipo: true,
        equipoMarca: true,
        equipoModelo: true,
        estado: true,
        createdAt: true,
        falla: true,
        costoEstimado: true,
        tecnico: true,
      },
      take: 500,
    })

    const data: RepairOrder[] = rows.map((r) => ({
      id: r.id,
      folio: r.folio,
      customer: r.cliente?.nombre ?? "Sin nombre",
      phone: r.cliente?.telefono ?? "",
      device: `${r.equipoMarca ?? ""} ${r.equipoModelo ?? ""}`.trim(),
      tipo_equipo: r.tipoEquipo ?? "",
      status: (r.estado as RepairOrder["status"]) || "Recibido",
      date: r.createdAt.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
      problem: r.falla ?? "",
      price: r.costoEstimado == null ? "Pendiente" : `$${Number(r.costoEstimado).toLocaleString("es-MX")}`,
      technician: r.tecnico ?? "Pendiente",
    }))

    return { data, error: null }
  } catch (e) {
    console.error("getReparacionesListas prisma:", e)
    return { data: [], error: "No se pudieron cargar las reparaciones listas." }
  }
}

export async function deleteRepair(repairId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const gastosConProducto = await prisma.gastoReparacion.findMany({
      where: { reparacionId: repairId, tenantId, productoId: { not: null } },
      select: { id: true, productoId: true },
    })
    await prisma.$transaction(async (tx) => {
      const row = await tx.reparacion.findFirst({ where: { id: repairId, tenantId }, select: { id: true } })
      if (!row) throw new Error("Reparacion no encontrada.")
      for (const gasto of gastosConProducto) {
        if (gasto.productoId) {
          await tx.producto.update({
            where: { id: gasto.productoId, tenantId },
            data: { stockActual: { increment: 1 } },
          })
        }
      }
      if (gastosConProducto.length > 0) {
        await tx.movimientoCaja.deleteMany({
          where: { tenantId, referenciaId: { in: gastosConProducto.map((g) => g.id) }, tipo: { in: ["gasto_reparacion", "gasto"] } },
        })
      }
      await tx.reparacion.delete({ where: { id: repairId } })
    }, { timeout: 10000 })
    return { success: true }
  } catch (e) {
    console.error("deleteRepair prisma:", e)
    return { success: false, error: e instanceof Error ? e.message : "No se pudo eliminar." }
  }
}

export async function getRepairByFolio(folio: string): Promise<{ data: RepairDetail | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const rep = await prisma.reparacion.findFirst({
      where: { folio, tenantId },
      select: {
        id: true, tenantId: true, clienteId: true, folio: true, estado: true,
        tipoEquipo: true, equipoMarca: true, equipoModelo: true, numeroSerie: true,
        color: true, falla: true, tecnico: true, costoEstimado: true, anticipo: true,
        securityType: true, securityValue: true, pinContrasena: true, patronDesbloqueo: true,
        notasInternas: true, checklistIngreso: true, checklistPro: true, creadoPorNombre: true,
        esperaRefaccionConcepto: true, esperaRefaccionEta: true, esperaRefaccionNota: true,
        fechaPromesaEntrega: true,
        costoTotal: true, firmaIngresoPath: true, createdAt: true, updatedAt: true,
        cliente: { select: { nombre: true, telefono: true, telefonoSecundario: true, email: true } },
      },
    })
    if (!rep) return { data: null, error: "Reparacion no encontrada." }

    const archivos = await prisma.archivo.findMany({
      where: {
        tenantId,
        reparacionId: rep.id,
        visibility: "TRACKING_VERIFIED",
        tipo: "REPAIR_INTAKE_PHOTO",
      },
      orderBy: { createdAt: "asc" },
      select: { publicUrl: true, storageKey: true, key: true },
    })
    const fotos = archivos
      .map((a: ArchivoRow) => getArchivoDisplayUrl(a))
      .filter((u: string | null | undefined): u is string => Boolean(u))

    const estimated = rep.costoEstimado == null ? null : Number(rep.costoEstimado)
    const anticipo = rep.anticipo == null ? 0 : Number(rep.anticipo)

    const detail: RepairDetail = {
      ...toBitacoraRepair({ ...rep, cliente: { nombre: rep.cliente.nombre, telefono: rep.cliente.telefono } }),
      status: asStatus(rep.estado),
      securityType:
        rep.securityType === "none" || rep.securityType === "pin" || rep.securityType === "password" || rep.securityType === "pattern"
          ? rep.securityType
          : null,
      securityValue: rep.securityValue ?? null,
      createdAtRaw: rep.createdAt.toISOString(),
      clienteEmail: rep.cliente.email ?? null,
      clientePhoneSecondary: rep.cliente.telefonoSecundario ?? null,
      imei: rep.numeroSerie ?? null,
      color: rep.color ?? null,
      tipo_equipo: rep.tipoEquipo ?? null,
      pinContrasena: rep.pinContrasena ?? null,
      patronDesbloqueo: rep.patronDesbloqueo ?? null,
      fotos,
      fotosSignedUrls: fotos,
      falla: rep.falla ?? null,
      costoTotal: estimated,
      restante: estimated == null ? null : Math.max(0, estimated - anticipo),
      notasInternas: rep.notasInternas ?? null,
      checklistIngreso: ensureChecklistIngreso(rep.tipoEquipo ?? "Otro", parseChecklistIngreso(rep.checklistIngreso)),
      checklistPro: rep.checklistPro as ChecklistProData | null,
      creadoPorNombre: rep.creadoPorNombre ?? null,
      esperaRefaccionConcepto: rep.esperaRefaccionConcepto ?? null,
      esperaRefaccionEta: rep.esperaRefaccionEta?.toISOString() ?? null,
      esperaRefaccionNota: rep.esperaRefaccionNota ?? null,
      fechaPromesaEntrega: formatDateOnlyForInput(rep.fechaPromesaEntrega),
    }
    return { data: detail, error: null }
  } catch (e) {
    console.error("getRepairByFolio prisma:", e)
    return { data: null, error: "No se pudo cargar la reparacion." }
  }
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export async function actualizarPresupuestoReparacion(
  repairId: string,
  nuevoPresupuesto: number,
  descripcion?: string
): Promise<{ success: boolean; nuevoPresupuesto?: number; error?: string }> {
  try {
    if (!Number.isFinite(nuevoPresupuesto) || nuevoPresupuesto <= 0) {
      return {
        success: false,
        error: "El presupuesto debe ser mayor a 0. Si aun no hay monto, mantenlo como pendiente.",
      }
    }
    const prisma = getPrismaClient()
    const tallerId = await getTenantIdOrThrow()
    await prisma.$transaction(async (tx) => {
      const rep = await tx.reparacion.findFirst({
        where: { id: repairId, tenantId: tallerId },
        select: { costoEstimado: true },
      })
      if (!rep) throw new Error("No se encontro la reparacion.")

      const prev = Number(rep.costoEstimado ?? 0)
      await tx.reparacion.update({
        where: { id: repairId },
        data: { costoEstimado: nuevoPresupuesto },
      })

      await logHistorial({
        reparacionId: repairId,
        tenantId: tallerId,
        tipo: "presupuesto",
        descripcion: `${descripcion?.trim() || "Presupuesto actualizado"} - $${prev.toLocaleString("es-MX")} -> $${nuevoPresupuesto.toLocaleString("es-MX")}`,
        valorAnterior: String(prev),
        valorNuevo: String(nuevoPresupuesto),
      }, tx)
    }, { timeout: 15000 })

    return { success: true, nuevoPresupuesto }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "No se pudo actualizar el presupuesto." }
  }
}

export async function registrarAbono(input: {
  repairId: string
  monto: number
  metodoPago: "efectivo" | "tarjeta" | "transferencia" | "mixto"
  referenciaPago?: string | null
}): Promise<{
  success: boolean
  error?: string
  nuevoAnticipo?: number
  saldoPendiente?: number
  liquidado?: boolean
  movimientoCajaId?: string | null
}> {
  try {
    if (!input.repairId) return { success: false, error: "ID de reparacion requerido." }
    if (!Number.isFinite(input.monto) || input.monto <= 0) return { success: false, error: "El monto debe ser mayor a cero." }

    const prisma = getPrismaClient()
    const tallerId = await getTenantIdOrThrow()
    const actor = await getCurrentActorDisplayName()

    const rep = await prisma.reparacion.findFirst({
      where: { id: input.repairId, tenantId: tallerId },
      select: { anticipo: true, costoEstimado: true, folio: true, estado: true },
    })
    if (!rep) return { success: false, error: "No se encontro la reparacion." }

    const cajaOpen = await prisma.caja.findFirst({
      where: { tenantId: tallerId, estado: "abierta" },
      orderBy: { fechaApertura: "desc" },
      select: { id: true },
    })
    const cajaId = cajaOpen?.id
    if (!cajaId) return { success: false, error: "No hay caja abierta. Abre caja en Punto de venta para registrar el cobro." }

    const current = Number(rep.anticipo ?? 0)
    const presupuesto = Number(rep.costoEstimado ?? 0)
    const nuevo = roundMoney(current + input.monto)
    const saldo = roundMoney(Math.max(0, presupuesto - nuevo))
    const liquidado = saldo <= 0.01 && presupuesto > 0
    const referenciaPago = input.referenciaPago?.trim() || null

    const result = await prisma.$transaction(async (tx) => {
      await tx.reparacion.update({
        where: { id: input.repairId },
        data: { anticipo: nuevo },
      })

      const movimiento = await tx.movimientoCaja.create({
        data: {
          tenantId: tallerId,
          cajaId,
          tipo: liquidado ? "liquidacion_reparacion" : "anticipo_reparacion",
          referenciaId: input.repairId,
          folio: rep.folio ?? null,
          descripcion: liquidado
            ? `Liquidacion reparacion #${rep.folio ?? ""}${referenciaPago ? ` - Ref. ${referenciaPago}` : ""}`
            : `Abono reparacion #${rep.folio ?? ""}${referenciaPago ? ` - Ref. ${referenciaPago}` : ""}`,
          monto: input.monto,
          metodoPago: input.metodoPago,
          vendedorNombre: actor,
        },
      })

      await logHistorial({
        reparacionId: input.repairId,
        tenantId: tallerId,
        tipo: "abono",
        descripcion: `Abono registrado: +$${input.monto.toLocaleString("es-MX")} (${input.metodoPago}${referenciaPago ? `, ref. ${referenciaPago}` : ""})`,
        valorAnterior: String(current),
        valorNuevo: String(nuevo),
      }, tx)

      return movimiento
    }, { timeout: 15000 })

    return { success: true, nuevoAnticipo: nuevo, saldoPendiente: saldo, liquidado, movimientoCajaId: result.id }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al registrar abono" }
  }
}

export async function confirmarEntregaConLiquidacion(input: {
  repairId: string
  metodoPago: "efectivo" | "tarjeta" | "transferencia" | "mixto"
  monto_efectivo: number
  monto_tarjeta: number
  monto_transferencia: number
  notaTecnica?: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    const total = roundMoney(Number(input.monto_efectivo || 0) + Number(input.monto_tarjeta || 0) + Number(input.monto_transferencia || 0))
    if (total > 0) {
      const metodo =
        input.metodoPago === "mixto"
          ? input.monto_efectivo >= input.monto_tarjeta && input.monto_efectivo >= input.monto_transferencia
            ? "efectivo"
            : input.monto_tarjeta >= input.monto_transferencia
              ? "tarjeta"
              : "transferencia"
          : input.metodoPago
      const ab = await registrarAbono({ repairId: input.repairId, monto: total, metodoPago: metodo as "efectivo" | "tarjeta" | "transferencia" })
      if (!ab.success) return { success: false, error: ab.error }
    }

    const prisma = getPrismaClient()
    const tallerId = await getTenantIdOrThrow()

    const existing = await prisma.reparacion.findFirst({
      where: { id: input.repairId, tenantId: tallerId },
      select: { estado: true },
    })
    const estadoAnterior = existing?.estado || "Listo"

    await prisma.$transaction(async (tx) => {
      await tx.reparacion.update({
        where: { id: input.repairId },
        data: { estado: "Entregado" },
      })

      await logHistorial({
        reparacionId: input.repairId,
        tenantId: tallerId,
        tipo: "estado",
        descripcion: `Estado: ${estadoAnterior} -> Entregado (liquidacion)`,
        valorAnterior: estadoAnterior,
        valorNuevo: "Entregado",
        nota: input.notaTecnica?.trim() || "Liquidacion y entrega",
      }, tx)
    }, { timeout: 15000 })

    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "No se pudo registrar la entrega." }
  }
}

export async function entregarSinReparacionConAjuste(input: {
  repairId: string
  costoRevision: number
  metodoPago: "efectivo" | "tarjeta" | "transferencia" | "mixto"
  monto_efectivo: number
  monto_tarjeta: number
  monto_transferencia: number
  metodoDevolucion?: "efectivo" | "transferencia"
  montoDevolucionEfectivo?: number
  montoDevolucionTransferencia?: number
  notaTecnica?: string | null
}): Promise<{ success: boolean; error?: string; warning?: string }> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getTenantIdOrThrow()
    const actor = await getCurrentActorDisplayName()

    const existing = await prisma.reparacion.findFirst({
      where: { id: input.repairId, tenantId: tallerId },
      select: { estado: true, costoEstimado: true, anticipo: true, folio: true },
    })
    const estadoAnterior = existing?.estado || "Recibido"
    const precioAnterior = existing?.costoEstimado != null ? Number(existing.costoEstimado) : 0
    const anticipoActual = existing?.anticipo != null ? Number(existing.anticipo) : 0

    const totalDevolucion = roundMoney(
      Number(input.montoDevolucionEfectivo || 0) + Number(input.montoDevolucionTransferencia || 0)
    )
    const totalCargoExtra = roundMoney(
      Number(input.monto_efectivo || 0) + Number(input.monto_tarjeta || 0) + Number(input.monto_transferencia || 0)
    )

    let cajaOpenId: string | null = null

    if (totalDevolucion > 0.005 || totalCargoExtra > 0.005) {
      const cajaOpen = await prisma.caja.findFirst({
        where: { tenantId: tallerId, estado: "abierta" },
        orderBy: { fechaApertura: "desc" },
        select: { id: true, montoInicial: true, totalEfectivo: true },
      })
      if (!cajaOpen) {
        return { success: false, error: "No hay caja abierta. Abre caja en Punto de venta para registrar el movimiento." }
      }
      cajaOpenId = cajaOpen.id

      if (totalDevolucion > 0.005) {
        const devMetodo = input.metodoDevolucion === "transferencia" ? "transferencia" : "efectivo"

        if (devMetodo === "efectivo") {
          const montoInicial = Number(cajaOpen.montoInicial)
          const totalEfectivo = Number(cajaOpen.totalEfectivo)
          const abonosEfectivoMovs = await prisma.movimientoCaja.findMany({
            where: {
              tenantId: tallerId,
              cajaId: cajaOpen.id,
              tipo: { in: ["anticipo_reparacion", "liquidacion_reparacion", "liquidacion", "apartado_abono"] },
              metodoPago: "efectivo",
            },
            select: { monto: true },
          })
          const totalAbonosEfectivo = abonosEfectivoMovs.reduce(
            (s, m) => s + Math.abs(Number(m.monto)),
            0
          )
          const gastosEfectivoMovs = await prisma.movimientoCaja.findMany({
            where: {
              tenantId: tallerId,
              cajaId: cajaOpen.id,
              tipo: { in: ["gasto", "gasto_reparacion"] },
              metodoPago: "efectivo",
            },
            select: { monto: true },
          })
          const totalGastosEfectivo = gastosEfectivoMovs.reduce(
            (s, m) => s + Math.abs(Number(m.monto)),
            0
          )
          const disponible = roundMoney(montoInicial + totalEfectivo + totalAbonosEfectivo - totalGastosEfectivo)
          if (disponible + 0.005 < totalDevolucion) {
            return {
              success: false,
              error: `Efectivo insuficiente en caja. Disponible: $${disponible.toFixed(2)} — Devolución requerida: $${totalDevolucion.toFixed(2)}.`,
            }
          }
        }
      }
    }

    const descDevolucion = `Devolucion por entrega sin reparacion #${existing?.folio ?? ""}`
    const notasDetalle = `Anticipo previo: $${anticipoActual.toFixed(2)} | Cargo revision: $${input.costoRevision.toFixed(2)} | Devolucion a cliente: $${totalDevolucion.toFixed(2)}`

    await prisma.$transaction(async (tx) => {
      if (totalDevolucion > 0.005 && cajaOpenId) {
        const devMetodo = input.metodoDevolucion === "transferencia" ? "transferencia" : "efectivo"

        if (devMetodo === "efectivo") {
          await tx.movimientoCaja.create({
            data: {
              tenantId: tallerId,
              cajaId: cajaOpenId,
              tipo: "gasto",
              referenciaId: input.repairId,
              descripcion: descDevolucion,
              monto: -totalDevolucion,
              metodoPago: "efectivo",
              vendedorNombre: actor,
            },
          })
        }

        await tx.gastoOperativo.create({
          data: {
            tenantId: tallerId,
            cajaId: devMetodo === "efectivo" ? cajaOpenId : null,
            concepto: `Devolucion por cancelacion - Folio #${existing?.folio ?? input.repairId}`,
            categoria: "devolucion_reparacion",
            monto: totalDevolucion,
            metodoPago: devMetodo,
            fecha: new Date(),
            notas: notasDetalle,
          },
        })
      }

      if (totalCargoExtra > 0.005 && cajaOpenId) {
        await tx.movimientoCaja.create({
          data: {
            tenantId: tallerId,
            cajaId: cajaOpenId,
            tipo: "anticipo_reparacion",
            referenciaId: input.repairId,
            descripcion: `Cargo extra por revision #${existing?.folio ?? ""}`,
            monto: totalCargoExtra,
            metodoPago: input.metodoPago === "mixto" ? "efectivo" : input.metodoPago,
            vendedorNombre: actor,
          },
        })
      }

      const nuevoAnticipo = roundMoney(anticipoActual + totalCargoExtra - totalDevolucion)
      const updateData: Record<string, unknown> = { costoEstimado: input.costoRevision, estado: "Entregado" }
      if (totalDevolucion > 0.005 || totalCargoExtra > 0.005) {
        updateData.anticipo = nuevoAnticipo
      }
      await tx.reparacion.update({
        where: { id: input.repairId },
        data: updateData,
      })

      await logHistorial({
        reparacionId: input.repairId,
        tenantId: tallerId,
        tipo: "estado",
        descripcion: `Estado: ${estadoAnterior} -> Entregado (sin reparacion)`,
        valorAnterior: estadoAnterior,
        valorNuevo: "Entregado",
        nota: input.notaTecnica?.trim() || "Entrega sin reparacion",
      }, tx)

      if (precioAnterior !== input.costoRevision) {
        await logHistorial({
          reparacionId: input.repairId,
          tenantId: tallerId,
          tipo: "presupuesto",
          descripcion: `Ajuste de presupuesto (sin reparacion): $${precioAnterior.toFixed(2)} -> $${input.costoRevision.toFixed(2)}`,
          valorAnterior: precioAnterior.toFixed(2),
          valorNuevo: input.costoRevision.toFixed(2),
        }, tx)
      }
    }, { timeout: 15000 })

    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "No se pudo ajustar y entregar." }
  }
}

export async function updateRepairChecklistPro(
  repairId: string,
  data: ChecklistProData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    await prisma.$transaction(async (tx) => {
      await tx.reparacion.update({
        where: { id: repairId, tenantId },
        data: { checklistPro: data as any },
      })
      await logHistorial({
        reparacionId: repairId,
        tenantId,
        tipo: "otro",
        descripcion: "Diagnostico PRO (health check) actualizado",
      }, tx)
    }, { timeout: 15000 })
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al actualizar checklist Pro" }
  }
}

export async function updateRepairQuickNotes(
  repairId: string,
  data: { observacionesEsteticas?: string; notasInternas?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const rep = await prisma.reparacion.findFirst({
      where: { id: repairId, tenantId },
      select: { checklistIngreso: true },
    })
    if (!rep) return { success: false, error: "No se encontro la reparacion." }

    const updateData: Record<string, unknown> = {}
    if (data.observacionesEsteticas !== undefined) {
      const current = parseChecklistIngreso(rep.checklistIngreso) ?? {
        encendido: null,
        funcional: {},
        observacionesEsteticas: "",
      }
      updateData.checklistIngreso = checklistIngresoToJson({
        ...current,
        observacionesEsteticas: data.observacionesEsteticas,
      }) as any
    }
    if (data.notasInternas !== undefined) {
      updateData.notasInternas = data.notasInternas.trim() || null
    }
    if (Object.keys(updateData).length === 0) return { success: true }

    await prisma.$transaction(async (tx) => {
      await tx.reparacion.update({
        where: { id: repairId },
        data: updateData as any,
      })

      const logMsg: string[] = []
      if (data.observacionesEsteticas !== undefined) logMsg.push("observaciones esteticas")
      if (data.notasInternas !== undefined) logMsg.push("notas internas")
      await logHistorial({
        reparacionId: repairId,
        tenantId,
        tipo: "otro",
        descripcion: `${logMsg.join(" + ")} actualizadas`,
      }, tx)
    }, { timeout: 15000 })
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al actualizar notas" }
  }
}

export async function getCancelacionSummary(repairId: string): Promise<{
  total: number
  movements: Array<{ id: string; tipo: string; monto: number; metodo_pago: string; caja_id: string | null }>
  error?: string
}> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const movements = await prisma.movimientoCaja.findMany({
      where: { referenciaId: repairId, tenantId, tipo: { in: ["anticipo_reparacion", "liquidacion_reparacion"] } },
      select: { id: true, tipo: true, monto: true, metodoPago: true, cajaId: true },
    })
    const total = movements.reduce((sum, m) => sum + Number(m.monto), 0)
    return {
      total,
      movements: movements.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        monto: Number(m.monto),
        metodo_pago: m.metodoPago ?? "efectivo",
        caja_id: m.cajaId,
      })),
    }
  } catch (e) {
    console.error("[getCancelacionSummary]", e)
    return { total: 0, movements: [], error: "Error inesperado" }
  }
}

export async function cancelarReparacion(
  repairId: string,
  nota?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    if (!tenantId) return { success: false, error: "Sin sesion activa." }

    const repair = await prisma.reparacion.findFirst({
      where: { id: repairId, tenantId },
      select: { id: true, estado: true, folio: true },
    })
    if (!repair) return { success: false, error: "Reparacion no encontrada." }

    const TERMINAL = ["Cancelado", "Sin Reparacion", "Entregado"]
    if (TERMINAL.includes(repair.estado)) {
      return { success: false, error: `No se puede cancelar una reparacion en estado "${repair.estado}".` }
    }

    const gastosData = await prisma.gastoReparacion.findMany({
      where: { reparacionId: repairId, tenantId, productoId: { not: null } },
      select: { productoId: true },
    })
    const refaccionesData = await prisma.reparacionRefaccion.findMany({
      where: {
        reparacionId: repairId,
        tenantId,
        estado: { notIn: ["cancelled", "returned"] },
      },
      select: {
        id: true,
        productoId: true,
        cantidad: true,
        costoUnitario: true,
      },
    })

    await prisma.$transaction(async (tx) => {
      for (const refaccion of refaccionesData) {
        const producto = await tx.producto.findFirst({
          where: { id: refaccion.productoId, tenantId },
          select: { id: true, stockActual: true },
        })
        if (!producto) continue

        const stockAntes = producto.stockActual
        const stockDespues = stockAntes + refaccion.cantidad

        await tx.reparacionRefaccion.update({
          where: { id: refaccion.id },
          data: {
            estado: "cancelled",
            motivoCancelacion: nota?.trim() || "Folio cancelado.",
            returnedAt: new Date(),
          },
        })

        await tx.producto.update({
          where: { id: producto.id, tenantId },
          data: { stockActual: { increment: refaccion.cantidad } },
        })

        await tx.inventarioMovimiento.create({
          data: {
            tenantId,
            productoId: producto.id,
            tipo: "reparacion_devolucion",
            referenciaTipo: "reparacion_refaccion",
            referenciaId: refaccion.id,
            cantidad: refaccion.cantidad,
            stockAntes,
            stockDespues,
            costoUnitario: refaccion.costoUnitario,
            nota: nota?.trim() || "Folio cancelado.",
          },
        })
      }

      // Restore stock for each linked product consumed during the repair.
      // Compatibility path for folios created before reparacion_refacciones existed.
      for (const g of gastosData) {
        if (g.productoId) {
          await tx.producto.update({
            where: { id: g.productoId, tenantId },
            data: { stockActual: { increment: 1 } },
          })
        }
      }

      await tx.reparacion.update({
        where: { id: repairId },
        data: { estado: "Cancelado" },
      })

      await logHistorial({
        reparacionId: repairId,
        tenantId,
        tipo: "estado",
        descripcion: `Estado: ${repair.estado} -> Cancelado`,
        valorAnterior: repair.estado,
        valorNuevo: "Cancelado",
        nota: nota?.trim() || "Reparacion cancelada.",
      }, tx)
    }, { timeout: 15000 })

    return { success: true }
  } catch (e) {
    console.error("[cancelarReparacion] fatal:", e)
    return { success: false, error: "Error inesperado al cancelar la reparacion." }
  }
}

export async function reactivarReingreso(input: {
  repairId: string
  motivo: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!input.repairId) return { success: false, error: "ID de reparacion requerido." }
    const motivo = input.motivo.trim()
    if (!motivo) return { success: false, error: "El motivo del reingreso es obligatorio." }
    if (motivo.length > 500) return { success: false, error: "El motivo no puede superar 500 caracteres." }

    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()

    const repair = await prisma.reparacion.findFirst({
      where: { id: input.repairId, tenantId },
      select: { id: true, estado: true, folio: true },
    })
    if (!repair) return { success: false, error: "No se encontro la reparacion o no tienes acceso." }
    if (repair.estado !== "Entregado") {
      return { success: false, error: `Solo se pueden reactivar reparaciones con estatus "Entregado". Estado actual: ${repair.estado}.` }
    }

    const historialCancelado = await prisma.historialReparacion.findFirst({
      where: { reparacionId: input.repairId, tenantId, valorNuevo: "Cancelado" },
      select: { id: true },
    })
    if (historialCancelado) {
      return { success: false, error: "Folio cancelado no puede ser reactivado. Crea un nuevo folio para este equipo." }
    }

    await prisma.$transaction(async (tx) => {
      await tx.reparacion.update({
        where: { id: input.repairId },
        data: { estado: "Reingreso" },
      })

      await logHistorial({
        reparacionId: input.repairId,
        tenantId,
        tipo: "estado",
        descripcion: `Estado: Entregado -> Reingreso`,
        valorAnterior: "Entregado",
        valorNuevo: "Reingreso",
        nota: `Motivo: ${motivo}`,
      }, tx)
    }, { timeout: 15000 })

    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg || "Error inesperado al reactivar el reingreso." }
  }
}

export async function cancelarReparacionConRazon(input: {
  repairId: string
  razon: string
  nota?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!input.razon?.trim()) {
      return { success: false, error: "Debes seleccionar una razon de cancelacion." }
    }

    const notaCompleta = [`Razon: ${input.razon.trim()}`, input.nota?.trim()].filter(Boolean).join(" — ")

    const result = await cancelarReparacion(input.repairId, notaCompleta)

    return result
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error inesperado al cancelar." }
  }
}

// ─── Tipo compartido para templates de impresión ─────────────────────────────

export interface RepairPrintData {
  id: string
  folio: string
  estado: string
  fecha_creacion: string
  fecha_entrega?: string | null
  cliente_nombre: string
  cliente_telefono: string
  tecnico?: string | null
  dispositivo_marca: string
  dispositivo_modelo: string
  tipo_equipo?: string | null
  imei_serie?: string | null
  color?: string | null
  falla_reportada: string
  precio_estimado?: number | null
  anticipo?: number | null
  costo_total?: number | null
  restante?: number | null
  notas_internas?: string | null
  pin_contrasena?: string | null
  fotos?: string[]
  checklist_ingreso?: ChecklistIngreso | null
  gastos: Array<{ descripcion: string; costo: number }>
}

export async function getCajaEfectivoDisponible(): Promise<{
  disponible: number
  cajaAbierta: boolean
  error?: string
}> {
  try {
    const prisma = getPrismaClient()
    const tallerId = await getTenantIdOrThrow()
    const caja = await prisma.caja.findFirst({
      where: { tenantId: tallerId, estado: "abierta" },
      orderBy: { fechaApertura: "desc" },
      select: { id: true, montoInicial: true, totalEfectivo: true },
    })
    if (!caja) {
      return { disponible: 0, cajaAbierta: false, error: "No hay caja abierta." }
    }
    const montoInicial = Number(caja.montoInicial)
    const totalEfectivo = Number(caja.totalEfectivo)

    // Include all cash inflows that affect the open drawer: repairs and apartados.
    const abonosEfectivoMovs = await prisma.movimientoCaja.findMany({
      where: {
        tenantId: tallerId,
        cajaId: caja.id,
        tipo: { in: ["anticipo_reparacion", "liquidacion_reparacion", "liquidacion", "apartado_abono"] },
        metodoPago: "efectivo",
      },
      select: { monto: true },
    })
    const totalAbonosEfectivo = abonosEfectivoMovs.reduce(
      (s, m) => s + Math.abs(Number(m.monto)),
      0
    )

    const gastosEfectivoMovs = await prisma.movimientoCaja.findMany({
      where: {
        tenantId: tallerId,
        cajaId: caja.id,
        tipo: { in: ["gasto", "gasto_reparacion"] },
        metodoPago: "efectivo",
      },
      select: { monto: true },
    })
    const totalGastosEfectivo = gastosEfectivoMovs.reduce(
      (s, m) => s + Math.abs(Number(m.monto)),
      0
    )
    const disponible = roundMoney(montoInicial + totalEfectivo + totalAbonosEfectivo - totalGastosEfectivo)
    return { disponible, cajaAbierta: true }
  } catch (e) {
    return {
      disponible: 0,
      cajaAbierta: false,
      error: e instanceof Error ? e.message : "No se pudo consultar la caja.",
    }
  }
}
