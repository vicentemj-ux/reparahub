"use client"

import { useEffect, useState, useCallback } from "react"
import { getCamaraConfig } from "@/lib/actions/bitacora-visitas-prisma"
import { useWebcamPolling } from "@/hooks/use-webcam-polling"
import { useVisitasSSE } from "@/hooks/use-visitas-sse"
import { VisitaToast } from "./visita-toast"
import { EncuestaVisitaModal } from "./encuesta-visita-modal"
import type { BitacoraVisita } from "@/lib/actions/bitacora-visitas-prisma"

function getTallerIdFromCookie(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/tallerId=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function VisitaDetector() {
  const [tallerId, setTallerId] = useState<string | null>(null)
  const [cameraMode, setCameraMode] = useState<"snapshot" | "event" | null>(null)
  const [pendingVisitas, setPendingVisitas] = useState<BitacoraVisita[]>([])
  const [activeVisitaId, setActiveVisitaId] = useState<string | null>(null)

  // Leer tallerId de cookie
  useEffect(() => {
    setTallerId(getTallerIdFromCookie())
  }, [])

  // Cargar configuracion de camara
  useEffect(() => {
    if (!tallerId) return
    getCamaraConfig(tallerId).then(({ config }) => {
      const hv = config?.hikvision as Record<string, unknown> | undefined
      if (hv && hv.enabled === true) {
        setCameraMode((hv.mode as "snapshot" | "event") || "snapshot")
      }
    })
  }, [tallerId])

  // Polling: modo Basico usa webcam local, modo PRO usa webhook (sin polling)
  const webcamConfig = cameraMode === "snapshot" && tallerId ? { tallerId } : null
  const { active: pollingActive, error: pollingError } = useWebcamPolling(webcamConfig)

  // SSE para recibir notificaciones de visitas (web + desktop)
  const handleVisita = useCallback((event: { visitas: Array<{ id: string; fecha_hora_entrada: string; foto_entrada_url: string | null; estado_atencion: string }> }) => {
    // Convertir a BitacoraVisita parcial para el toast
    const nuevas = event.visitas
      .filter((v) => v.estado_atencion === "pendiente")
      .map((v) => ({
        id: v.id,
        taller_id: tallerId || "",
        fecha_hora_entrada: v.fecha_hora_entrada,
        fecha_hora_salida: null,
        foto_entrada_url: v.foto_entrada_url,
        foto_salida_url: null,
        camara_ip: null,
        evento_tipo: null,
        motivo_visita: null,
        motivo_otro: null,
        estado_atencion: "pendiente" as const,
        cliente_id: null,
        cliente_nombre: null,
        cliente_telefono: null,
        reparacion_folio: null,
        venta_folio: null,
        atendido_por: null,
        notas: null,
        created_at: v.fecha_hora_entrada,
        updated_at: v.fecha_hora_entrada,
      }))

    setPendingVisitas((prev) => {
      const merged = [...nuevas, ...prev]
      // Evitar duplicados por id
      const map = new Map(merged.map((v) => [v.id, v]))
      return Array.from(map.values())
    })

    // Auto-abrir encuesta para la primera nueva
    if (nuevas.length > 0 && !activeVisitaId) {
      setActiveVisitaId(nuevas[0].id)
    }
  }, [tallerId, activeVisitaId])

  const { connected: sseConnected } = useVisitasSSE({
    tallerId,
    enabled: !!tallerId,
    onVisita: handleVisita,
  })

  const dismissVisita = useCallback((id: string) => {
    setPendingVisitas((prev) => prev.filter((v) => v.id !== id))
    if (activeVisitaId === id) {
      setActiveVisitaId(null)
      // Abrir siguiente si hay
      setPendingVisitas((prev) => {
        const next = prev.find((v) => v.id !== id)
        if (next) setTimeout(() => setActiveVisitaId(next.id), 300)
        return prev
      })
    }
  }, [activeVisitaId])

  const handleEncuestaComplete = useCallback(() => {
    setActiveVisitaId(null)
    // Abrir siguiente pendiente
    setPendingVisitas((prev) => {
      const next = prev.find((v) => v.estado_atencion === "pendiente")
      if (next) setTimeout(() => setActiveVisitaId(next.id), 300)
      return prev
    })
  }, [])

  // No renderizar nada visible si no hay tallerId
  if (!tallerId) return null

  const activeVisita = pendingVisitas.find((v) => v.id === activeVisitaId) || null

  return (
    <>
      {/* Toasts flotantes */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        {pendingVisitas
          .filter((v) => v.id !== activeVisitaId)
          .slice(0, 3)
          .map((visita) => (
            <VisitaToast
              key={visita.id}
              visita={visita}
              onAttend={() => setActiveVisitaId(visita.id)}
              onDismiss={() => dismissVisita(visita.id)}
            />
          ))}
      </div>

      {/* Modal de encuesta */}
      {activeVisita && (
        <EncuestaVisitaModal
          visitaId={activeVisita.id}
          fotoUrl={activeVisita.foto_entrada_url}
          open={true}
          onClose={() => {
            dismissVisita(activeVisita.id)
          }}
          onComplete={handleEncuestaComplete}
        />
      )}

      {/* Debug indicador (solo visible en desarrollo) */}
      {process.env.NODE_ENV === "development" && pollingActive && (
        <div className="fixed bottom-1 left-1 z-[100] text-[9px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
          CAM: {pollingActive ? "ON" : "OFF"} SSE:{sseConnected ? "ON" : "OFF"}
          {pollingError ? ` ERR:${pollingError.slice(0, 20)}` : ""}
        </div>
      )}
    </>
  )
}

function validateFields(hv: Record<string, unknown>): { valid: boolean } {
  const ip = String(hv.ip || "").trim()
  const user = String(hv.username || "").trim()
  const pass = String(hv.password || "").trim()
  return { valid: !!(ip && user && pass) }
}
