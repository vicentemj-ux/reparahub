import { NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"
import { last4, onlyDigits } from "@/lib/phone"
import { getArchivoDisplayUrl } from "@/lib/archivo-url"
import { Prisma } from "@prisma/client"

type VerifyBody = {
  ticketId?: string
  last4?: string
}

const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 30
const PHONE_LAST4_LENGTH = 4

function isMissingTrackingAttemptsTable(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021" &&
    String(error.meta?.modelName ?? "") === "TrackingVerificationAttempt"
  )
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0]?.trim() ?? null
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return null
}

export async function POST(req: Request) {
  let body: VerifyBody
  try {
    body = (await req.json()) as VerifyBody
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cuerpo de solicitud invalido." },
      { status: 400 },
    )
  }

  const ticketId = String(body.ticketId ?? "").trim()
  const phoneLast4 = onlyDigits(body.last4).slice(-PHONE_LAST4_LENGTH)

  if (!ticketId || phoneLast4.length !== PHONE_LAST4_LENGTH) {
    return NextResponse.json(
      { ok: false, error: "Ingresa los ultimos 4 digitos validos." },
      { status: 400 },
    )
  }

  const prisma = getPrismaClient()
  const ip = getClientIp(req)

  try {
    const reparacion = await prisma.reparacion.findUnique({
      where: { id: ticketId },
      include: {
        tenant: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            tiendaPublicaActiva: true,
            configuracion: {
              select: { nombreComercial: true, logoUrl: true, telefono: true, whatsapp: true, pais: true },
            },
          },
        },
        cliente: { select: { telefono: true } },
        archivos: {
          where: {
            visibility: "TRACKING_VERIFIED",
            tipo: "REPAIR_INTAKE_PHOTO",
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true, publicUrl: true, storageKey: true, key: true },
        },
      },
    })

    const tallerInfo = reparacion
      ? {
          name:
            reparacion.tenant?.configuracion?.nombreComercial?.trim() ||
            reparacion.tenant?.nombre ||
            null,
          logoUrl: reparacion.tenant?.configuracion?.logoUrl ?? null,
          telefono: reparacion.tenant?.configuracion?.telefono ?? null,
          whatsapp: reparacion.tenant?.configuracion?.whatsapp ?? null,
          pais: reparacion.tenant?.configuracion?.pais ?? null,
          slug: reparacion.tenant?.slug ?? null,
          tiendaActiva: reparacion.tenant?.tiendaPublicaActiva ?? false,
        }
      : null

    if (!reparacion) {
      return NextResponse.json(
        { ok: false, error: "Ticket no encontrado." },
        { status: 404 },
      )
    }

    // Rate limiting: solo bloquear intentos incorrectos. Si el cliente
    // agota el limite, se detiene la validacion y debe contactar al taller.
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000)
    let failedCount = 0
    let trackingAttemptsEnabled = true
    try {
      failedCount = await prisma.trackingVerificationAttempt.count({
        where: {
          ticketId,
          success: false,
          attemptedAt: { gte: windowStart },
        },
      })
    } catch (error) {
      if (isMissingTrackingAttemptsTable(error)) {
        trackingAttemptsEnabled = false
        failedCount = 0
      } else {
        throw error
      }
    }
    if (trackingAttemptsEnabled && failedCount >= MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          ok: false,
          error: `Has agotado los ${MAX_ATTEMPTS} intentos. Contacta directamente al taller por WhatsApp para que te ayude a acceder.`,
          blocked: true,
          attemptsMax: MAX_ATTEMPTS,
          attemptsRemaining: 0,
          taller: tallerInfo,
        },
        { status: 429 },
      )
    }

    // Regla de negocio: el tracking publico se valida exclusivamente con
    // los ultimos 4 digitos del telefono del cliente, nunca con el folio.
    const isMatch = last4(reparacion.cliente?.telefono) === phoneLast4

    if (!isMatch) {
      // Registrar intento fallido para el rate limit.
      if (trackingAttemptsEnabled) {
        await prisma.trackingVerificationAttempt
          .create({
            data: {
              tallerId: reparacion.tenantId,
              ticketId,
              ip,
              success: false,
            },
          })
          .catch((e) => console.error("[api/tracking/verify] log attempt:", e))
      }

      const nextFailedCount = trackingAttemptsEnabled ? failedCount + 1 : failedCount
      if (trackingAttemptsEnabled && nextFailedCount >= MAX_ATTEMPTS) {
        return NextResponse.json(
          {
            ok: false,
            error: `Has agotado los ${MAX_ATTEMPTS} intentos. Contacta directamente al taller por WhatsApp para que te ayude a acceder.`,
            blocked: true,
            attemptsMax: MAX_ATTEMPTS,
            attemptsRemaining: 0,
            taller: tallerInfo,
          },
          { status: 429 },
        )
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Los ultimos 4 digitos no coinciden.",
          attemptsMax: MAX_ATTEMPTS,
          attemptsRemaining: trackingAttemptsEnabled
            ? Math.max(0, MAX_ATTEMPTS - nextFailedCount)
            : MAX_ATTEMPTS - 1,
          taller: tallerInfo,
        },
        { status: 403 },
      )
    }

    // Exito: registrar intento exitoso (para auditoria) y limpiar intentos
    // fallidos antiguos del mismo ticket.
    if (trackingAttemptsEnabled) {
      await prisma.$transaction([
        prisma.trackingVerificationAttempt.create({
          data: {
            tallerId: reparacion.tenantId,
            ticketId,
            ip,
            success: true,
          },
        }),
        prisma.trackingVerificationAttempt.deleteMany({
          where: {
            ticketId,
            success: false,
          },
        }),
      ]).catch((e) => console.error("[api/tracking/verify] log success:", e))
    }

    const fotos = reparacion.archivos
      .map((a: { id: string; publicUrl: string | null; storageKey: string | null; key: string }) => ({
        id: a.id,
        url: getArchivoDisplayUrl(a),
      }))
      .filter((a: { id: string; url: string | null }): a is { id: string; url: string } => Boolean(a.url))

    return NextResponse.json({
      ok: true,
      reparacion: {
        id: reparacion.id,
        folio: reparacion.folio,
        marca: reparacion.equipoMarca,
        modelo: reparacion.equipoModelo,
        tipo_equipo: reparacion.tipoEquipo,
        numero_serie: reparacion.numeroSerie,
        falla: reparacion.falla,
        precio_estimado: reparacion.costoEstimado == null ? null : Number(reparacion.costoEstimado),
        estatus: reparacion.estado,
        created_at: reparacion.createdAt.toISOString(),
        updated_at: reparacion.updatedAt.toISOString(),
      },
      taller: tallerInfo,
      fotos,
    })
  } catch (error) {
    console.error("[api/tracking/verify] error:", error)
    return NextResponse.json(
      { ok: false, error: "No se pudo validar el tracking en este momento." },
      { status: 500 },
    )
  }
}
