import { NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LOG = "[api/sse/visitas]"

/**
 * Server-Sent Events para notificar visitas pendientes en tiempo real.
 *
 * Uso del frontend:
 *   const es = new EventSource('/api/sse/visitas?tallerId=XXX')
 *   es.addEventListener('visita', (e) => { const data = JSON.parse(e.data) })
 *
 * El endpoint hace polling a Supabase cada 3 segundos y envia eventos
 * cuando hay nuevas visitas pendientes.
 */

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tallerId = searchParams.get("tallerId")?.trim()

  if (!tallerId) {
    return NextResponse.json({ error: "Missing tallerId" }, { status: 400 })
  }

  // Verify the requested tallerId matches the authenticated user's tenant
  const userTenantId = (session.user as any).tenantId as string | undefined
  if (!userTenantId || userTenantId !== tallerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      // Enviar headers SSE
      controller.enqueue(encoder.encode(`event: connected\ndata: "${tallerId}"\n\n`))

      const pollInterval = setInterval(async () => {
        if (closed) {
          clearInterval(pollInterval)
          return
        }

        try {
          const prisma = getPrismaClient()
          const data = await prisma.visita.findMany({
            where: {
              tenantId: tallerId,
              estado: "pendiente",
            },
            orderBy: { fechaLlegada: "desc" },
            take: 10,
            select: {
              id: true,
              fechaLlegada: true,
              fotoEntradaUrl: true,
              estado: true,
            },
          })

          if (data.length > 0) {
            const payload = JSON.stringify({
              count: data.length,
              visitas: data.map((v) => ({
                id: v.id,
                fecha_hora_entrada: v.fechaLlegada.toISOString(),
                foto_entrada_url: v.fotoEntradaUrl,
                estado_atencion: v.estado,
              })),
              timestamp: Date.now(),
            })
            controller.enqueue(encoder.encode(`event: visita\ndata: ${payload}\n\n`))
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.warn(LOG, "poll exception", { tallerId, error: msg })
        }
      }, 3000)

      // Cleanup cuando el cliente cierra la conexion
      request.signal.addEventListener("abort", () => {
        closed = true
        clearInterval(pollInterval)
        try {
          controller.close()
        } catch {}
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
