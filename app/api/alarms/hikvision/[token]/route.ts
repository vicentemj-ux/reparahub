import { NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"
import { uploadFileToS3 } from "@/lib/r2"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LOG = "[api/alarms/hikvision/token]"

type HikvisionEvent = {
  ipAddress: string
  portNo: number
  macAddress: string
  dateTime: string
  eventType: string
  eventState: string
  channelID: string
}

type HikvisionConfig = {
  enabled?: boolean
  mode?: "snapshot" | "event"
  ip?: string
  port?: number
  username?: string
  password?: string
  snapshot_channel?: string
  webhook_token?: string
  event_filter?: string[]
}

function parseHikvisionXml(xmlText: string): HikvisionEvent | null {
  try {
    const ipMatch = xmlText.match(/<ipAddress>([^<]+)<\/ipAddress>/i)
    const portMatch = xmlText.match(/<portNo>(\d+)<\/portNo>/i)
    const macMatch = xmlText.match(/<macAddress>([^<]+)<\/macAddress>/i)
    const dateMatch = xmlText.match(/<dateTime>([^<]+)<\/dateTime>/i)
    const typeMatch = xmlText.match(/<eventType>([^<]+)<\/eventType>/i)
    const stateMatch = xmlText.match(/<eventState>([^<]+)<\/eventState>/i)
    const channelMatch = xmlText.match(/<channelID>([^<]+)<\/channelID>/i)

    if (!ipMatch || !dateMatch || !typeMatch) return null

    return {
      ipAddress: ipMatch[1].trim(),
      portNo: portMatch ? parseInt(portMatch[1], 10) : 80,
      macAddress: macMatch ? macMatch[1].trim() : "",
      dateTime: dateMatch[1].trim(),
      eventType: typeMatch[1].trim(),
      eventState: stateMatch ? stateMatch[1].trim() : "active",
      channelID: channelMatch ? channelMatch[1].trim() : "1",
    }
  } catch {
    return null
  }
}

async function extractXmlFromRequest(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? ""
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData()
    for (const value of form.values()) {
      if (typeof value === "string" && value.includes("<EventNotificationAlert")) {
        return value
      }
      if (value instanceof File && value.type.includes("xml")) {
        return value.text()
      }
    }
    return null
  }

  const raw = await request.text()
  return raw?.trim() || null
}

async function resolveTenantByWebhookToken(token: string): Promise<{
  tenantId: string
  config: HikvisionConfig
} | null> {
  const prisma = getPrismaClient()
  const rows = await prisma.configuracionTaller.findMany({
    select: { tenantId: true, camaraConfig: true },
  })

  for (const row of rows) {
    const cfg = (row.camaraConfig as Record<string, unknown> | null)?.hikvision as
      | HikvisionConfig
      | undefined
    if (!cfg || !cfg.enabled) continue
    if ((cfg.webhook_token || "").trim() === token) {
      return { tenantId: row.tenantId, config: cfg }
    }
  }
  return null
}

function eventAllowed(eventType: string, filters: string[] | undefined) {
  if (!filters || filters.length === 0) return true
  const normalized = eventType.toLowerCase()
  return filters.some((f) => normalized.includes(String(f).toLowerCase()))
}

async function captureSnapshot(
  cameraIp: string,
  port: number,
  username: string,
  password: string,
  channel: string,
): Promise<Buffer | null> {
  try {
    const url = `http://${cameraIp}:${port}/ISAPI/Streaming/channels/${channel}/picture`
    const auth = Buffer.from(`${username}:${password}`).toString("base64")
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.arrayBuffer()
    return Buffer.from(data)
  } catch {
    return null
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const safeToken = token?.trim()
    if (!safeToken) {
      return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 })
    }

    const resolved = await resolveTenantByWebhookToken(safeToken)
    if (!resolved) {
      console.warn(LOG, "Invalid webhook token", { tokenPreview: safeToken.slice(0, 8) })
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const xmlText = await extractXmlFromRequest(request)
    if (!xmlText) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 })
    }

    const event = parseHikvisionXml(xmlText)
    if (!event) {
      return NextResponse.json({ success: false, error: "Invalid event xml" }, { status: 400 })
    }

    if ((event.eventState || "").toLowerCase() !== "active") {
      return NextResponse.json({ success: true, ignored: true, reason: "inactive_event" })
    }

    if (!eventAllowed(event.eventType, resolved.config.event_filter)) {
      return NextResponse.json({ success: true, ignored: true, reason: "filtered_event" })
    }

    const username = String(resolved.config.username || "admin")
    const password = String(resolved.config.password || "")
    const cameraIp = String(resolved.config.ip || event.ipAddress)
    const port = Number(resolved.config.port) || 80
    const channel = String(resolved.config.snapshot_channel || "101")

    let fotoUrl: string | null = null
    if (password) {
      const snapshot = await captureSnapshot(cameraIp, port, username, password, channel)
      if (snapshot) {
        const key = `visitas/${resolved.tenantId}/hikvision/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
        const uploaded = await uploadFileToS3({ key, body: snapshot, contentType: "image/jpeg" })
        fotoUrl = uploaded.url
      }
    }

    const prisma = getPrismaClient()
    const created = await prisma.visita.create({
      data: {
        tenantId: resolved.tenantId,
        fechaLlegada: new Date(event.dateTime),
        fotoEntradaUrl: fotoUrl,
        camaraIp: event.ipAddress,
        eventoTipo: event.eventType,
        estado: "pendiente",
      },
      select: { id: true, fotoEntradaUrl: true },
    })

    if (!fotoUrl) {
      return NextResponse.json(
        { success: true, accepted: true, id: created.id, photoCaptured: false },
        { status: 202 },
      )
    }

    return NextResponse.json({ success: true, id: created.id, photoCaptured: true })
  } catch (error) {
    console.error(LOG, "Fatal", error)
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }
}
