"use client"

import { useEffect, useRef, useCallback, useState } from "react"

export interface WebcamPollingConfig {
  tallerId: string
  intervalMs?: number
}

/**
 * Hook que captura snapshots desde la webcam local de la PC.
 *
 * Usado en Modo Basico cuando la camara IP no soporta ISAPI
 * (como el modelo DS-2DE2C400IG-W-W).
 *
 * Captura una foto cada 8 segundos via getUserMedia + canvas.
 */
export function useWebcamPolling(config: WebcamPollingConfig | null) {
  const [active, setActive] = useState(false)
  const [lastEvent, setLastEvent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const captureAndSend = useCallback(async () => {
    if (!config || !videoRef.current) return

    const video = videoRef.current
    if (video.readyState < 2) return // HAVE_CURRENT_DATA

    try {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1]
      const dateTime = new Date().toISOString()

      await fetch("/api/visitas/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tallerId: config.tallerId,
          cameraIp: "webcam-local",
          eventType: "webcam_snapshot",
          dateTime,
          snapshotBase64: base64,
        }),
      })

      setLastEvent(`webcam_snapshot - ${new Date(dateTime).toLocaleTimeString("es-MX")}`)
    } catch (e) {
      console.error("[useWebcamPolling] send failed", e)
    }
  }, [config])

  useEffect(() => {
    if (!config) {
      setActive(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      return
    }

    const intervalMs = config.intervalMs || 8000

    // Iniciar webcam
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        streamRef.current = stream
        const video = document.createElement("video")
        video.srcObject = stream
        video.play()
        videoRef.current = video
        setActive(true)
        setError(null)

        // Primer capture despues de 2s (para que el video cargue)
        setTimeout(captureAndSend, 2000)
        intervalRef.current = setInterval(captureAndSend, intervalMs)
      })
      .catch((err) => {
        setActive(false)
        setError(err instanceof Error ? err.message : String(err))
      })

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      setActive(false)
    }
  }, [config, captureAndSend])

  return { active, lastEvent, error }
}
