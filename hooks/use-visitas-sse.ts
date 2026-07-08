"use client"

import { useEffect, useRef, useState, useCallback } from "react"

export interface VisitaEvent {
  count: number
  visitas: Array<{
    id: string
    fecha_hora_entrada: string
    foto_entrada_url: string | null
    estado_atencion: string
  }>
  timestamp: number
}

interface UseVisitasSSEOptions {
  tallerId: string | null
  enabled?: boolean
  onVisita?: (event: VisitaEvent) => void
}

/**
 * Hook para recibir notificaciones en tiempo real de visitas detectadas
 * mediante Server-Sent Events (SSE).
 *
 * Uso:
 *   const { connected, error, reconnect } = useVisitasSSE({
 *     tallerId: "uuid-del-taller",
 *     onVisita: (e) => toast({ title: `Cliente detectado (${e.count} visitas pendientes)` }),
 *   })
 */
export function useVisitasSSE(options: UseVisitasSSEOptions) {
  const { tallerId, enabled = true, onVisita } = options
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (!tallerId || !enabled) return

    // Cerrar conexion previa si existe
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    setError(null)
    setConnected(false)

    const url = `/api/sse/visitas?tallerId=${encodeURIComponent(tallerId)}`
    const es = new EventSource(url)
    esRef.current = es

    es.addEventListener("connected", () => {
      setConnected(true)
      setError(null)
    })

    es.addEventListener("visita", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as VisitaEvent
        onVisita?.(data)
      } catch (err) {
        console.error("[useVisitasSSE] parse error", err)
      }
    })

    es.addEventListener("error", () => {
      setConnected(false)
      setError("Conexion perdida")
      // Reconectar automaticamente en 5 segundos
      setTimeout(() => {
        if (esRef.current === es) {
          connect()
        }
      }, 5000)
    })

    es.onopen = () => {
      setConnected(true)
      setError(null)
    }
  }, [tallerId, enabled, onVisita])

  useEffect(() => {
    connect()
    return () => {
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [connect])

  return {
    connected,
    error,
    reconnect: connect,
  }
}
