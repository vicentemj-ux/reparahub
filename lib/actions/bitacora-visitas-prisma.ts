"use server"

import { revalidatePath } from "next/cache"
import { getCurrentTenant } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { getTenantIdOrThrow } from "@/lib/auth/tenant-utils"
import { localDayIso, startOfLocalDayUtc, endOfLocalDayUtc } from "@/lib/utils/date-day"
import { normalizeClienteTelefono, resolveClienteByTelefono } from "@/lib/actions/client-resolver-prisma"
import { randomUUID } from "crypto"

export interface BitacoraVisita {
  id: string
  taller_id: string
  fecha_hora_entrada: string
  fecha_dia_local?: string
  fecha_hora_salida: string | null
  foto_entrada_url: string | null
  foto_salida_url: string | null
  camara_ip: string | null
  evento_tipo: string | null
  motivo_visita: string | null
  motivo_otro: string | null
  estado_atencion: "pendiente" | "atendido" | "no_atendido" | "se_fue"
  reparacion_folio: string | null
  venta_folio: string | null
  atendido_por: string | null
  notas: string | null
  cliente_id: string | null
  cliente_nombre: string | null
  cliente_telefono: string | null
  created_at: string
  updated_at: string
}

export type MotivoVisita =
  | "llamada"
  | "reparacion"
  | "cotizacion"
  | "compra"
  | "venta"
  | "recoger"
  | "personal"
  | "otro"

function mapVisita(v: {
  id: string
  tenantId: string
  fechaLlegada: Date
  fechaSalida: Date | null
  fotoEntradaUrl: string | null
  fotoSalidaUrl: string | null
  camaraIp: string | null
  eventoTipo: string | null
  motivo: string | null
  motivoOtro: string | null
  estado: string
  reparacionFolio: string | null
  ventaFolio: string | null
  atendidoPor: string | null
  notas: string | null
  clienteId: string | null
  clienteNombre: string | null
  clienteTelefono: string | null
  createdAt: Date
  updatedAt: Date
}, tz?: string): BitacoraVisita {
  const entradaIso = v.fechaLlegada.toISOString()
  return {
    id: v.id,
    taller_id: v.tenantId,
    fecha_hora_entrada: entradaIso,
    fecha_dia_local: tz ? localDayIso(v.fechaLlegada, tz) : entradaIso.slice(0, 10),
    fecha_hora_salida: v.fechaSalida?.toISOString() ?? null,
    foto_entrada_url: v.fotoEntradaUrl,
    foto_salida_url: v.fotoSalidaUrl,
    camara_ip: v.camaraIp,
    evento_tipo: v.eventoTipo,
    motivo_visita: v.motivo,
    motivo_otro: v.motivoOtro,
    estado_atencion: (v.estado as BitacoraVisita["estado_atencion"]),
    reparacion_folio: v.reparacionFolio,
    venta_folio: v.ventaFolio,
    atendido_por: v.atendidoPor,
    notas: v.notas,
    cliente_id: v.clienteId,
    cliente_nombre: v.clienteNombre,
    cliente_telefono: v.clienteTelefono,
    created_at: v.createdAt.toISOString(),
    updated_at: v.updatedAt.toISOString(),
  }
}

async function resolveVisitClientSnapshot(params: {
  tenantId: string
  clienteNombre?: string
  clienteTelefono?: string
  notasOrigen: string
}): Promise<{ clienteId: string | null; clienteNombre: string | null; clienteTelefono: string | null }> {
  const telefono = normalizeClienteTelefono(params.clienteTelefono)
  const nombre = params.clienteNombre?.trim() || null

  if (!telefono) {
    return { clienteId: null, clienteNombre: nombre, clienteTelefono: null }
  }

  const resolved = await resolveClienteByTelefono({
    tenantId: params.tenantId,
    telefono,
    nombre,
    notasOrigen: params.notasOrigen,
  })

  if (!resolved.client) {
    return { clienteId: null, clienteNombre: nombre, clienteTelefono: telefono }
  }

  return {
    clienteId: resolved.client.id,
    clienteNombre: nombre || resolved.client.nombre,
    clienteTelefono: resolved.client.telefono,
  }
}

function isMissingClienteIdColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes("cliente_id") && message.includes("does not exist")
}

function mapVisitaCompat(v: Omit<Parameters<typeof mapVisita>[0], "clienteId"> & { clienteId?: string | null }, tz?: string) {
  return mapVisita({ ...v, clienteId: v.clienteId ?? null }, tz)
}

export async function getVisitas(params: {
  tallerId: string
  estado?: "pendiente" | "atendido" | "no_atendido" | "se_fue"
  /**
   * Fecha inicio del rango, en formato "YYYY-MM-DD" interpretado en la
   * zona horaria del tenant (leida de `ConfiguracionTaller.timezone`,
   * default "America/Mexico_City"). El servidor convierte a UTC para
   * la query Prisma. NO concatenar `T00:00:00` aca: la zona del
   * servidor (UTC en Vercel) y la del browser pueden diferir, lo que
   * excluia silenciosamente visitas registradas al final del dia local.
   */
  desde?: string
  /** Fecha fin del rango (inclusivo), mismo formato que `desde`. */
  hasta?: string
  limite?: number
}): Promise<{ data: BitacoraVisita[]; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const where: Record<string, unknown> = { tenantId: params.tallerId }
    const tz = await getTenantTimezone(params.tallerId)

    if (params.estado) where.estado = params.estado

    if (params.desde || params.hasta) {
      const range: Record<string, Date> = {}
      if (params.desde) {
        const gte = startOfLocalDayUtc(params.desde, tz)
        if (gte) range.gte = gte
      }
      if (params.hasta) {
        const lte = endOfLocalDayUtc(params.hasta, tz)
        if (lte) range.lte = lte
      }
      if (Object.keys(range).length > 0) {
        where.fechaLlegada = range
      }
    }

    try {
      const rows = await prisma.visita.findMany({
        where: where as any,
        orderBy: { fechaLlegada: "desc" },
        take: params.limite,
      })

      return { data: rows.map((row) => mapVisita(row, tz)), error: null }
    } catch (error) {
      if (!isMissingClienteIdColumn(error)) throw error
      const rows = await prisma.visita.findMany({
        where: where as any,
        orderBy: { fechaLlegada: "desc" },
        take: params.limite,
        select: {
          id: true,
          tenantId: true,
          fechaLlegada: true,
          fechaSalida: true,
          fotoEntradaUrl: true,
          fotoSalidaUrl: true,
          camaraIp: true,
          eventoTipo: true,
          motivo: true,
          motivoOtro: true,
          estado: true,
          reparacionFolio: true,
          ventaFolio: true,
          atendidoPor: true,
          notas: true,
          clienteNombre: true,
          clienteTelefono: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      return { data: rows.map((row) => mapVisitaCompat(row, tz)), error: null }
    }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : "Error al cargar visitas" }
  }
}

/**
 * Lee la zona horaria del tenant desde `ConfiguracionTaller.timezone`.
 * Default: "America/Mexico_City" (LATAM principal, alineado con el
 * default del schema). Falla suave si el tenant no tiene fila de
 * configuracion: la query Prisma sigue funcionando, solo que en UTC.
 */
async function getTenantTimezone(tallerId: string): Promise<string> {
  try {
    const prisma = getPrismaClient()
    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId: tallerId },
      select: { timezone: true },
    })
    return row?.timezone || "America/Mexico_City"
  } catch {
    return "America/Mexico_City"
  }
}

export async function getVisitasPendientesCount(
  tallerId: string
): Promise<{ count: number; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const count = await prisma.visita.count({
      where: { tenantId: tallerId, estado: "pendiente" },
    })
    return { count, error: null }
  } catch (e) {
    return { count: 0, error: e instanceof Error ? e.message : "Error al contar visitas" }
  }
}

export async function responderEncuestaVisita(params: {
  visitaId: string
  motivoVisita: MotivoVisita
  motivoOtro?: string
  notas?: string
  atendidoPor: string
  reparacionFolio?: string
  ventaFolio?: string
  clienteNombre?: string
  clienteTelefono?: string
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const cliente = await resolveVisitClientSnapshot({
      tenantId,
      clienteNombre: params.clienteNombre,
      clienteTelefono: params.clienteTelefono,
      notasOrigen: "Creado desde bitacora de visitas",
    })
    const data = {
        motivo: params.motivoVisita,
        motivoOtro: params.motivoOtro || null,
        estado: "atendido",
        atendidoPor: params.atendidoPor,
        notas: params.notas || null,
        reparacionFolio: params.reparacionFolio || null,
        ventaFolio: params.ventaFolio || null,
        clienteId: cliente.clienteId,
        clienteNombre: cliente.clienteNombre,
        clienteTelefono: cliente.clienteTelefono,
      }
    try {
      await prisma.visita.update({ where: { id: params.visitaId }, data })
    } catch (error) {
      if (!isMissingClienteIdColumn(error)) throw error
      const { clienteId: _clienteId, ...fallbackData } = data
      await prisma.visita.update({ where: { id: params.visitaId }, data: fallbackData })
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/bitacora-visitas")
    return { success: true, error: null }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al responder encuesta" }
  }
}

export async function marcarVisitaSalida(params: {
  visitaId: string
  fotoSalidaUrl?: string
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    await prisma.visita.update({
      where: { id: params.visitaId },
      data: {
        estado: "se_fue",
        fechaSalida: new Date(),
        fotoSalidaUrl: params.fotoSalidaUrl || null,
      },
    })

    return { success: true, error: null }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al marcar salida" }
  }
}

export async function verificarVisitasPendientesCierre(
  tallerId: string,
  fechaAperturaCaja: string
): Promise<{
  puedeCerrar: boolean
  visitasPendientes: number
  error: string | null
}> {
  try {
    const prisma = getPrismaClient()
    const count = await prisma.visita.count({
      where: {
        tenantId: tallerId,
        estado: "pendiente",
        fechaLlegada: { gte: new Date(fechaAperturaCaja) },
      },
    })

    return {
      puedeCerrar: count === 0,
      visitasPendientes: count,
      error: null,
    }
  } catch (e) {
    return { puedeCerrar: false, visitasPendientes: 0, error: e instanceof Error ? e.message : "Error al verificar visitas pendientes" }
  }
}

export async function getCurrentTallerIdPublic(): Promise<string | null> {
  try {
    const tenant = await getCurrentTenant()
    return tenant?.id ?? null
  } catch {
    return null
  }
}

export async function registrarVisitaManual(params: {
  motivoVisita?: string
  motivoOtro?: string
  notas?: string
  clienteNombre?: string
  clienteTelefono?: string
  eventoTipo?: "manual" | "telefono"
}): Promise<{ success: boolean; error: string | null; visita: BitacoraVisita | null }> {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant?.id) return { success: false, error: "Sesion invalida", visita: null }

    const { getCurrentActorDisplayName } = await import("@/lib/auth/actor-display-name")
    const actor = await getCurrentActorDisplayName()

    const prisma = getPrismaClient()
    const cliente = await resolveVisitClientSnapshot({
      tenantId: tenant.id,
      clienteNombre: params.clienteNombre,
      clienteTelefono: params.clienteTelefono,
      notasOrigen: "Creado desde bitacora de visitas",
    })
    const data = {
        tenantId: tenant.id,
        eventoTipo: params.eventoTipo || "manual",
        estado: "pendiente",
        motivo: params.motivoVisita || null,
        motivoOtro: params.motivoOtro || null,
        notas: params.notas || null,
        clienteId: cliente.clienteId,
        clienteNombre: cliente.clienteNombre,
        clienteTelefono: cliente.clienteTelefono,
        atendidoPor: actor,
      }
    let created: Parameters<typeof mapVisita>[0]
    try {
      created = await prisma.visita.create({ data })
    } catch (error) {
      if (!isMissingClienteIdColumn(error)) throw error
      const { clienteId: _clienteId, ...fallbackData } = data
      created = await prisma.visita.create({ data: fallbackData })
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/bitacora-visitas")
    return { success: true, error: null, visita: mapVisita(created) }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al registrar visita", visita: null }
  }
}

export async function completarAtencionVisita(params: {
  visitaId: string
  motivoVisita: string
  motivoOtro?: string
  notas?: string
  clienteNombre?: string
  clienteTelefono?: string
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const tenantId = await getTenantIdOrThrow()
    const cliente = await resolveVisitClientSnapshot({
      tenantId,
      clienteNombre: params.clienteNombre,
      clienteTelefono: params.clienteTelefono,
      notasOrigen: "Creado desde bitacora de visitas",
    })
    const data = {
        motivo: params.motivoVisita,
        motivoOtro: params.motivoOtro || null,
        notas: params.notas || null,
        clienteId: cliente.clienteId,
        clienteNombre: cliente.clienteNombre,
        clienteTelefono: cliente.clienteTelefono,
        estado: "atendido",
      }
    try {
      await prisma.visita.update({ where: { id: params.visitaId }, data })
    } catch (error) {
      if (!isMissingClienteIdColumn(error)) throw error
      const { clienteId: _clienteId, ...fallbackData } = data
      await prisma.visita.update({ where: { id: params.visitaId }, data: fallbackData })
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/bitacora-visitas")
    return { success: true, error: null }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al completar atencion" }
  }
}

export async function getCamaraConfig(tallerId: string): Promise<{
  config: Record<string, unknown> | null
  error: string | null
}> {
  try {
    const prisma = getPrismaClient()
    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId: tallerId },
      select: { camaraConfig: true },
    })

    return { config: (row?.camaraConfig as Record<string, unknown>) || null, error: null }
  } catch (e) {
    return { config: null, error: e instanceof Error ? e.message : "Error al obtener configuracion de camara" }
  }
}

type HikvisionConfigInput = {
  enabled?: boolean
  mode?: "snapshot" | "event"
  ip?: string
  port?: number
  username?: string
  password?: string
  snapshot_channel?: string
  webhook_token?: string
  event_filter?: string[]
  portalUrl?: string
  snapshotUrl?: string
  snapshotAuthMode?: "none" | "basic"
  snapshotRefreshSeconds?: number
  rtspUrl?: string
  streamName?: string
  agentUrl?: string
  notes?: string
}

function asConfigRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {}
}

function getHikvisionConfig(value: unknown): HikvisionConfigInput {
  return asConfigRecord(asConfigRecord(value).hikvision) as HikvisionConfigInput
}

function buildSnapshotUrl(config: HikvisionConfigInput) {
  const custom = config.snapshotUrl?.trim()
  if (custom) return custom
  const ip = config.ip?.trim()
  if (!ip) return ""
  const port = Number(config.port || 80) || 80
  const channel = String(config.snapshot_channel || "101").trim() || "101"
  return `http://${ip}:${port}/ISAPI/Streaming/channels/${channel}/picture`
}

function normalizeGo2RtcStreamName(value: string | undefined) {
  const base = (value || "entrada")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return base || "entrada"
}

export async function rotateHikvisionWebhookToken(
  tallerId: string,
): Promise<{ success: boolean; token: string | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId: tallerId },
      select: { camaraConfig: true },
    })
    const current = asConfigRecord(row?.camaraConfig)
    const hikvision = getHikvisionConfig(current)
    const token = randomUUID()
    current.hikvision = { ...hikvision, webhook_token: token }

    await prisma.configuracionTaller.update({
      where: { tenantId: tallerId },
      data: { camaraConfig: current as any },
    })

    return { success: true, token, error: null }
  } catch (e) {
    return { success: false, token: null, error: e instanceof Error ? e.message : "Error al regenerar token" }
  }
}

export async function testHikvisionSnapshot(
  tallerId: string,
  input?: HikvisionConfigInput,
): Promise<{ success: boolean; imageDataUrl: string | null; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId: tallerId },
      select: { camaraConfig: true },
    })
    const saved = getHikvisionConfig(row?.camaraConfig)
    const config = { ...saved, ...(input || {}) }
    const url = buildSnapshotUrl(config)
    if (!url) return { success: false, imageDataUrl: null, error: "Configura IP o URL de snapshot." }

    const headers: HeadersInit = {}
    const mode = config.snapshotAuthMode || "basic"
    const username = String(config.username || "").trim()
    const password = String(input?.password || saved.password || "").trim()
    if (mode === "basic" && username && password) {
      headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) {
      return { success: false, imageDataUrl: null, error: `La camara respondio ${res.status}. Revisa IP, canal o credenciales.` }
    }

    const contentType = res.headers.get("content-type") || "image/jpeg"
    if (!contentType.toLowerCase().includes("image")) {
      return { success: false, imageDataUrl: null, error: "El endpoint no devolvio una imagen." }
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    return {
      success: true,
      imageDataUrl: `data:${contentType};base64,${buffer.toString("base64")}`,
      error: null,
    }
  } catch (e) {
    return {
      success: false,
      imageDataUrl: null,
      error: e instanceof Error ? e.message : "No se pudo conectar con la camara.",
    }
  }
}

export async function generateGo2RtcConfig(
  tallerId: string,
  input?: HikvisionConfigInput,
): Promise<{ success: boolean; yaml: string | null; filename: string; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId: tallerId },
      select: { camaraConfig: true },
    })
    const saved = getHikvisionConfig(row?.camaraConfig)
    const config = { ...saved, ...(input || {}) }
    const rtspUrl = String(config.rtspUrl || "").trim()
    const streamName = normalizeGo2RtcStreamName(config.streamName)

    const lines = [
      "# Configuracion go2rtc generada por ReparaHub",
      `# Taller: ${tallerId}`,
      "# Ejecuta: go2rtc -config go2rtc.yaml",
      "# Descarga go2rtc en: https://github.com/AlexxIT/go2rtc",
      "",
      "api:",
      '  listen: ":1984"',
      "",
      "webrtc:",
      "  candidates:",
      "    - stun:8555",
      "",
      "streams:",
    ]

    if (rtspUrl) {
      lines.push(`  ${streamName}: ${rtspUrl}`)
    } else {
      lines.push("  # Ninguna camara tiene fuente RTSP configurada.")
    }

    return {
      success: true,
      yaml: `${lines.join("\n")}\n`,
      filename: "go2rtc.yaml",
      error: null,
    }
  } catch (e) {
    return {
      success: false,
      yaml: null,
      filename: "go2rtc.yaml",
      error: e instanceof Error ? e.message : "No se pudo generar go2rtc.yaml",
    }
  }
}

export async function updateCamaraConfig(
  tallerId: string,
  config: Record<string, unknown>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const prisma = getPrismaClient()
    const row = await prisma.configuracionTaller.findUnique({
      where: { tenantId: tallerId },
      select: { camaraConfig: true },
    })
    const nextConfig = asConfigRecord(config)
    const nextHikvision = getHikvisionConfig(nextConfig)
    const currentHikvision = getHikvisionConfig(row?.camaraConfig)

    if (!String(nextHikvision.password || "").trim() && currentHikvision.password) {
      nextHikvision.password = currentHikvision.password
      nextConfig.hikvision = nextHikvision
    }

    await prisma.configuracionTaller.update({
      where: { tenantId: tallerId },
      data: { camaraConfig: nextConfig as any },
    })

    return { success: true, error: null }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al actualizar configuracion de camara" }
  }
}
