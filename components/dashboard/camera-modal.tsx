"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  clearCameraTrace,
  ensureCameraTrace,
  markCameraTrace,
  measureCameraTrace,
} from "@/lib/camera-performance"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const FRIENDLY_FAIL = "No se pudo detectar una camara activa."
const SECURE_FAIL = "Para usar la camara, abre ReparaHub en HTTPS o localhost."
const API_FAIL = "Tu navegador no permite acceso directo a la camara."
const DIALOG_Z = "z-[220]"
const MAX_CAPTURES = 3
const PREVIEW_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 960 },
    height: { ideal: 540 },
    frameRate: { ideal: 24, max: 30 },
  },
  audio: false,
}

type CameraPermissionState = PermissionState | "unsupported"

let cachedPermissionState: CameraPermissionState = "unsupported"
let lastPermissionCheck = 0
const PERMISSION_CACHE_MS = 30_000

export interface CameraModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCaptureAll: (files: File[]) => void | Promise<void>
}

function encodeCameraFrame(
  video: HTMLVideoElement,
  quality: number,
): Promise<{ blob: Blob; mime: string }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext("2d")
    if (!ctx) return reject(new Error("canvas"))
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("blob"))
        resolve({ blob, mime: "image/webp" })
      },
      "image/webp",
      quality,
    )
  })
}

async function optimizeDirectWebP(video: HTMLVideoElement): Promise<File> {
  const MAX_BYTES = 300 * 1024
  let quality = 0.8

  let { blob, mime } = await encodeCameraFrame(video, quality)

  while (blob.size > MAX_BYTES && quality > 0.45) {
    quality -= 0.06
    const next = await encodeCameraFrame(video, Math.max(quality, 0.45))
    blob = next.blob
    mime = next.mime
  }

  if (blob.size > MAX_BYTES) {
    quality = 0.8
    let smallBlob: Blob | null = null
    const canvas = document.createElement("canvas")
    let w = video.videoWidth || 1280
    let h = video.videoHeight || 720
    while (blob.size > MAX_BYTES && quality > 0.45 && w > 640) {
      quality -= 0.05
      const factor = Math.sqrt(MAX_BYTES / blob.size) * 0.9
      w = Math.max(640, Math.round(w * factor))
      h = Math.round((h / (video.videoWidth || 1280)) * w)
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) break
      ctx.drawImage(video, 0, 0, w, h)
      smallBlob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/jpeg", Math.max(quality, 0.5)),
      )
      if (smallBlob) blob = smallBlob
    }
    mime = "image/jpeg"
  }

  return new File([blob], `camara-${Date.now()}.${mime === "image/webp" ? "webp" : "jpg"}`, {
    type: mime,
    lastModified: Date.now(),
  })
}

export function CameraModal({ open, onOpenChange, onCaptureAll }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [captured, setCaptured] = useState<File[]>([])
  const [capturedPreviews, setCapturedPreviews] = useState<string[]>([])
  const [capturing, setCapturing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [previewReady, setPreviewReady] = useState(false)
  const [retryToken, setRetryToken] = useState(0)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const traceRef = useRef<string | null>(null)
  const capturedPreviewsRef = useRef<string[]>([])

  useEffect(() => {
    capturedPreviewsRef.current = capturedPreviews
  }, [capturedPreviews])

  const stopCamera = useCallback(() => {
    try {
      if (!streamRef.current) return
      streamRef.current.getTracks().forEach((track) => track.stop())
    } finally {
      streamRef.current = null
      const el = videoRef.current
      if (el) el.srcObject = null
    }
  }, [])

  const getCameraErrorMessage = useCallback((error: unknown): string => {
    if (error && typeof error === "object" && "name" in error) {
      const name = String((error as { name?: string }).name || "")
      if (name === "NotAllowedError" || name === "SecurityError") {
        return "Permiso de camara bloqueado. Habilitalo en tu navegador y vuelve a intentar."
      }
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        return "No se encontro una camara disponible en este dispositivo."
      }
      if (name === "NotReadableError" || name === "TrackStartError") {
        return "La camara esta en uso por otra aplicacion."
      }
    }
    return FRIENDLY_FAIL
  }, [])

  useEffect(() => {
    if (!open) {
      stopCamera()
      setCameraStarting(false)
      setPreviewReady(false)
      setCameraError(null)
      setCaptured([])
      capturedPreviewsRef.current.forEach((url) => URL.revokeObjectURL(url))
      setCapturedPreviews([])
      setPermissionDenied(false)
      return
    }

    let mounted = true
    const traceId = ensureCameraTrace("camera-modal")
    traceRef.current = traceId
    setCameraStarting(true)
    setPreviewReady(false)
    markCameraTrace("modal-mounted", traceId)
    measureCameraTrace("click_to_modal_loading", "click", "modal-mounted", traceId)

    window.requestAnimationFrame(() => {
      markCameraTrace("loading-painted", traceId)
      measureCameraTrace("click_to_loading_painted", "click", "loading-painted", traceId)
    })

    const startCamera = async () => {
      try {
        setCameraError(null)
        setPermissionDenied(false)
        markCameraTrace("start-function", traceId)
        measureCameraTrace("click_to_start_function", "click", "start-function", traceId)

        const isLocalhost =
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")

        if (typeof window !== "undefined" && !window.isSecureContext && !isLocalhost) {
          setCameraError(SECURE_FAIL)
          return
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError(API_FAIL)
          return
        }

        if (cachedPermissionState === "denied") {
          setPermissionDenied(true)
          setCameraError(
            "Permiso de camara bloqueado. Chrome bloqueo la camara para ReparaHub y no mostrara el popup automaticamente."
          )
          return
        }

        let stream: MediaStream | null = null
        const now = Date.now()
        if (now - lastPermissionCheck > PERMISSION_CACHE_MS && navigator.permissions?.query) {
          void navigator.permissions
            .query({ name: "camera" as PermissionName })
            .then((result) => {
              cachedPermissionState = result.state
              lastPermissionCheck = Date.now()
            })
            .catch(() => {
              cachedPermissionState = "unsupported"
              lastPermissionCheck = Date.now()
            })
        }

        try {
          markCameraTrace("gum-request", traceId)
          measureCameraTrace("click_to_get_user_media_request", "click", "gum-request", traceId)
          stream = await navigator.mediaDevices.getUserMedia(PREVIEW_CONSTRAINTS)
          markCameraTrace("stream-received", traceId)
          measureCameraTrace("get_user_media_wait", "gum-request", "stream-received", traceId)
          measureCameraTrace("click_to_stream_received", "click", "stream-received", traceId)
        } catch {
          try {
            markCameraTrace("gum-fallback-facing-request", traceId)
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: "environment" } },
              audio: false,
            })
            markCameraTrace("stream-received", traceId)
          } catch {
            try {
              markCameraTrace("gum-fallback-basic-request", traceId)
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
              })
              markCameraTrace("stream-received", traceId)
            } catch (fallbackError) {
              if (!mounted) return
              setCameraError(getCameraErrorMessage(fallbackError))
              setCameraStarting(false)
              return
            }
          }
        }

        if (!stream) return

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        const el = videoRef.current

        if (el) {
          el.srcObject = stream
          el.onloadedmetadata = () => {
            if (!mounted) return
            markCameraTrace("metadata-loaded", traceId)
          }
          el.onplaying = () => {
            if (!mounted) return
            setPreviewReady(true)
            setCameraStarting(false)
            markCameraTrace("preview-visible", traceId)
            measureCameraTrace("click_to_preview_visible", "click", "preview-visible", traceId)
            measureCameraTrace("stream_to_preview_visible", "stream-received", "preview-visible", traceId)
          }
          try {
            await el.play()
          } catch (playError) {
            setCameraError(getCameraErrorMessage(playError))
            setCameraStarting(false)
            stream.getTracks().forEach((t) => t.stop())
            streamRef.current = null
            el.srcObject = null
          }
        }
      } catch (error) {
        if (mounted) {
          setCameraError(getCameraErrorMessage(error))
          setCameraStarting(false)
        }
      }
    }

    void startCamera()

    return () => {
      mounted = false
      stopCamera()
    }
  }, [open, retryToken, stopCamera, getCameraErrorMessage])

  const handleRetry = () => {
    stopCamera()
    setCameraError(null)
    setPermissionDenied(false)
    setPreviewReady(false)
    setCameraStarting(true)
    lastPermissionCheck = 0
    cachedPermissionState = "unsupported"
    setRetryToken((t) => t + 1)
  }

  const handleCapture = async () => {
    if (!videoRef.current || captured.length >= MAX_CAPTURES) return
    setCapturing(true)
    try {
      markCameraTrace("capture-start", traceRef.current)
      const file = await optimizeDirectWebP(videoRef.current)
      markCameraTrace("capture-ready", traceRef.current)
      measureCameraTrace("capture_and_conversion", "capture-start", "capture-ready", traceRef.current)
      const previewUrl = URL.createObjectURL(file)
      setCapturedPreviews((prev) => [...prev, previewUrl])
      setCaptured((prev) => [...prev, file])
    } catch {
      setCameraError("No se pudo capturar la foto. Intenta de nuevo.")
    } finally {
      setCapturing(false)
    }
  }

  const handleDone = async () => {
    stopCamera()
    if (captured.length > 0) {
      setSaving(true)
      markCameraTrace("save-start", traceRef.current)
      await onCaptureAll(captured)
      markCameraTrace("save-end", traceRef.current)
      measureCameraTrace("save_files", "save-start", "save-end", traceRef.current)
      setSaving(false)
    }
    if (traceRef.current) clearCameraTrace(traceRef.current)
    onOpenChange(false)
  }

  const handleCancel = () => {
    stopCamera()
    capturedPreviewsRef.current.forEach((url) => URL.revokeObjectURL(url))
    setCapturedPreviews([])
    setCaptured([])
    if (traceRef.current) clearCameraTrace(traceRef.current)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName={DIALOG_Z}
        className={`${DIALOG_Z} max-w-lg border-slate-200 bg-white p-4 sm:p-6`}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-slate-900">
            {captured.length > 0
              ? `Tomar foto (${captured.length}/${MAX_CAPTURES})`
              : "Tomar foto"}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {cameraError ? (
            <div className="flex min-h-[200px] w-full flex-col items-center justify-center gap-4 px-4 py-8 text-center">
              <p className="max-w-md text-sm leading-relaxed text-slate-600">{cameraError}</p>
              {permissionDenied ? (
                <div className="max-w-md rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
                  <p className="text-xs font-semibold text-slate-800">Como habilitar camara en Chrome Android:</p>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-slate-600">
                    <li>Toca el icono de controles o candado junto a la URL.</li>
                    <li>Entra a Permisos del sitio.</li>
                    <li>Cambia Camara a Permitir.</li>
                    <li>Recarga ReparaHub.</li>
                    <li>Vuelve a tocar Abrir Camara.</li>
                  </ol>
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-200"
                onClick={handleRetry}
              >
                {permissionDenied ? "Ya habilite permisos, reintentar" : "Reintentar permiso"}
              </Button>
            </div>
          ) : (
            <>
              <div className="relative bg-slate-100">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="max-h-[40vh] min-h-[240px] w-full bg-slate-100 object-cover"
                />
                {(cameraStarting || !previewReady) ? (
                  <div className="absolute inset-0 flex min-h-[240px] flex-col items-center justify-center gap-3 bg-slate-100/95 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                    <p className="text-sm font-medium text-slate-700">Preparando camara...</p>
                  </div>
                ) : null}
              </div>

              {/* Captured thumbnails strip */}
              {capturedPreviews.length > 0 && (
                <div className="flex gap-2 border-t border-slate-200 bg-white p-2 overflow-x-auto">
                  {capturedPreviews.map((url, i) => (
                    <div key={i} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                      <img
                        src={url}
                        alt={`Captura ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(url)
                          setCapturedPreviews((prev) => prev.filter((_, j) => j !== i))
                          setCaptured((prev) => prev.filter((_, j) => j !== i))
                        }}
                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow"
                        aria-label={`Eliminar captura ${i + 1}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="border-slate-200 text-slate-700"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <div className="flex gap-2">
            {captured.length > 0 && (
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => void handleDone()}
                disabled={saving}
              >
                <Check className="mr-2 h-4 w-4" aria-hidden />
                {saving ? "Guardando..." : "Listo"}
              </Button>
            )}
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => void handleCapture()}
              disabled={Boolean(cameraError) || cameraStarting || !previewReady || capturing || saving || captured.length >= MAX_CAPTURES}
            >
              <Camera className="mr-2 h-4 w-4" aria-hidden />
              {capturing ? "Capturando..." : "Capturar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
