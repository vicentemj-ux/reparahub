"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Camera, Flashlight, RefreshCw, ScanLine } from "lucide-react"
import { BarcodeFormat, type IScannerControls } from "@zxing/browser"
import { DecodeHintType } from "@zxing/library"

declare class BarcodeDetector {
  constructor(options?: { formats?: string[] })
  detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string }>>
}

const FRIENDLY_FAIL = "No se pudo detectar una camara activa."
const SECURE_FAIL = "Para usar la camara, abre ReparaHub en HTTPS o localhost."
const API_FAIL = "Tu navegador no permite acceso directo a la camara."
const DIALOG_Z = "z-[220]"

type CameraPermissionState = PermissionState | "unsupported"

const SCANNER_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
  BarcodeFormat.AZTEC,
]

const BARCODE_DETECTOR_FORMATS = [
  "aztec", "code_128", "code_39", "code_93", "codabar",
  "data_matrix", "ean_13", "ean_8", "itf", "pdf417",
  "qr_code", "upc_a", "upc_e",
] as const

function isBarcodeDetectorSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window
}

export interface BarcodeScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (code: string) => void
  title?: string
  hint?: string
}

export function BarcodeScannerModal({
  open,
  onOpenChange,
  onScan,
  title = "Escanear codigo de barras o QR",
  hint = "Centra el codigo o QR en el recuadro",
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const rafRef = useRef<number | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [permissionState, setPermissionState] = useState<CameraPermissionState>("unsupported")
  const [retryToken, setRetryToken] = useState(0)
  const [scanned, setScanned] = useState(false)
  const [flashOn, setFlashOn] = useState(false)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const lastDetectedRef = useRef<{ code: string; at: number } | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualValue, setManualValue] = useState("")

  const stopReader = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    try {
      controlsRef.current?.stop()
    } catch {
      // ignore
    }
    controlsRef.current = null
    const el = videoRef.current
    if (el) {
      try {
        const s = el.srcObject as MediaStream | null
        s?.getTracks().forEach((t) => t.stop())
      } catch {
        // ignore
      }
      el.srcObject = null
    }
  }, [])

  const getCameraErrorMessage = useCallback((error: unknown): string => {
    if (error && typeof error === "object" && "name" in error) {
      const name = String((error as { name?: unknown }).name || "")
      if (name === "NotAllowedError" || name === "SecurityError") {
        setPermissionDenied(true)
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

  const getCameraPermissionState = useCallback(async (): Promise<CameraPermissionState> => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unsupported"
    try {
      const result = await navigator.permissions.query({ name: "camera" as PermissionName })
      return result.state
    } catch {
      return "unsupported"
    }
  }, [])

  const pickBestBackCamera = useCallback(async (): Promise<string | null> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return null
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const backCams = devices
        .filter((d) => d.kind === "videoinput")
        .filter((d) => /back|rear|environment|trasera/i.test(d.label))
      if (backCams.length > 0) {
        return backCams[0].deviceId || null
      }
      return null
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!open) {
      stopReader()
      setCameraError(null)
      setPermissionDenied(false)
      setScanned(false)
      setManualOpen(false)
      setManualValue("")
      return
    }

    let mounted = true

    const start = async () => {
      try {
        setCameraError(null)
        setPermissionDenied(false)
        setScanned(false)

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

        const currentPermissionState = await getCameraPermissionState()
        setPermissionState(currentPermissionState)
        if (currentPermissionState === "denied") {
          setPermissionDenied(true)
          setCameraError(
            "Permiso de camara bloqueado. Chrome bloqueo la camara para ReparaHub y no mostrara el popup automaticamente.",
          )
          return
        }

        let stream: MediaStream | null = null

        let preferredDeviceId: string | null = null
        if (facingMode === "environment") {
          preferredDeviceId = await pickBestBackCamera()
        }

        const constraintCandidates: MediaStreamConstraints[] = preferredDeviceId
          ? [
              { video: { deviceId: { exact: preferredDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
              { video: { facingMode: { exact: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
              { video: { facingMode: { exact: facingMode } }, audio: false },
            ]
          : [
              { video: { facingMode: { exact: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
              { video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
              { video: { facingMode: { exact: facingMode } }, audio: false },
              { video: { facingMode: { ideal: facingMode } }, audio: false },
              { video: true, audio: false },
            ]

        for (const constraints of constraintCandidates) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints)
            break
          } catch {
            // intentar siguiente
          }
        }

        if (!stream) {
          if (!mounted) return
          setCameraError(FRIENDLY_FAIL)
          return
        }

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        // Forzar focusMode: "continuous" si la camara lo soporta
        const track = stream.getVideoTracks()[0]
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
          focusMode?: string[]
          pointsOfInterest?: unknown
        }
        const advanced: MediaTrackConstraintSet[] = []
        if (caps.focusMode?.includes("continuous")) {
          advanced.push({ focusMode: "continuous" } as unknown as MediaTrackConstraintSet)
        }
        if (caps.pointsOfInterest) {
          advanced.push({ pointsOfInterest: { ideal: [{ x: 0.5, y: 0.5 }] } } as unknown as MediaTrackConstraintSet)
        }
        if (advanced.length) {
          try {
            await track.applyConstraints({ advanced })
          } catch {
            // ignore
          }
        }

        // Intentar aplicar torch si flashOn=true
        if (flashOn) {
          try {
            const tCaps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean }
            if (tCaps?.torch) {
              await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet & { torch?: boolean }] })
            }
          } catch {
            // ignore
          }
        }

        const el = videoRef.current
        if (!el) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        el.srcObject = stream
        try {
          await el.play()
        } catch (playError) {
          setCameraError(getCameraErrorMessage(playError))
          stream.getTracks().forEach((t) => t.stop())
          el.srcObject = null
          return
        }

        // Usar BarcodeDetector API nativa si esta disponible (Chrome Android)
        if (isBarcodeDetectorSupported()) {
          let detector: BarcodeDetector
          try {
            detector = new BarcodeDetector({ formats: [...BARCODE_DETECTOR_FORMATS] })
          } catch {
            detector = new BarcodeDetector()
          }

          const detect = async () => {
            if (!mounted) return
            if (!el || !el.videoWidth) {
              rafRef.current = requestAnimationFrame(detect)
              return
            }
            try {
              const barcodes = await detector.detect(el)
              for (const bc of barcodes) {
                const code = bc.rawValue.trim()
                if (!code) continue
                const now = Date.now()
                const last = lastDetectedRef.current
                if (last && last.code === code && now - last.at < 1500) continue
                lastDetectedRef.current = { code, at: now }
                try { navigator.vibrate?.(80) } catch { /* ignore */ }
                setScanned(true)
                onScan(code)
                stopReader()
                onOpenChange(false)
                return
              }
            } catch {
              // ignore
            }
            rafRef.current = requestAnimationFrame(detect)
          }
          rafRef.current = requestAnimationFrame(detect)
        } else {
          // Fallback: zxing
          const { BrowserMultiFormatReader } = await import("@zxing/browser")
          const hints = new Map<DecodeHintType, unknown>()
          hints.set(DecodeHintType.POSSIBLE_FORMATS, SCANNER_FORMATS)
          const reader = new BrowserMultiFormatReader(hints)

          if (!mounted) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }

          const controls = await reader.decodeFromVideoElement(el, (result) => {
            if (!mounted) return
            if (!result) return
            const code = result.getText().trim()
            if (!code) return
            const now = Date.now()
            const last = lastDetectedRef.current
            if (last && last.code === code && now - last.at < 1500) return
            lastDetectedRef.current = { code, at: now }
            try { navigator.vibrate?.(80) } catch { /* ignore */ }
            setScanned(true)
            onScan(code)
            stopReader()
            onOpenChange(false)
          })
          controlsRef.current = controls
        }
      } catch (error) {
        if (mounted) setCameraError(getCameraErrorMessage(error))
      }
    }

    void start()

    return () => {
      mounted = false
      stopReader()
    }
  }, [
    open,
    retryToken,
    facingMode,
    flashOn,
    onScan,
    onOpenChange,
    stopReader,
    getCameraErrorMessage,
    getCameraPermissionState,
    pickBestBackCamera,
  ])

  const handleRetry = () => {
    stopReader()
    setCameraError(null)
    setPermissionDenied(false)
    setRetryToken((t) => t + 1)
  }

  const handleSwitchCamera = () => {
    setFacingMode((f) => (f === "environment" ? "user" : "environment"))
  }

  const handleManualSubmit = () => {
    const v = manualValue.trim()
    if (!v) return
    onScan(v)
    onOpenChange(false)
  }

  const handleCancel = () => {
    stopReader()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName={DIALOG_Z}
        className={`${DIALOG_Z} max-w-md border-slate-200 bg-white p-4 sm:p-6`}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <ScanLine className="h-4 w-4 text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {cameraError ? (
            <div className="flex min-h-[200px] w-full flex-col items-center justify-center gap-4 px-4 py-8 text-center">
              <p className="max-w-md text-sm leading-relaxed text-slate-900">{cameraError}</p>
              {permissionDenied ? (
                <div className="max-w-md rounded-xl border border-slate-200 bg-slate-100 p-3 text-left">
                  <p className="text-xs font-semibold text-slate-900">Como habilitar camara en Chrome Android:</p>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-slate-600">
                    <li>Toca el icono de controles o candado junto a la URL.</li>
                    <li>Entra a Permisos del sitio.</li>
                    <li>Cambia Camara a Permitir.</li>
                    <li>Recarga ReparaHub.</li>
                    <li>Vuelve a tocar Escanear codigo.</li>
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
              {permissionState === "prompt" ? (
                <p className="max-w-md text-xs text-slate-600">Si aparece el popup del navegador, permite el acceso a camara.</p>
              ) : null}
            </div>
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-[50vh] w-full bg-white object-cover"
              />
              {/* Reticle */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-32 w-72 max-w-[80%]">
                  <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-blue-400" />
                  <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-blue-400" />
                  <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-blue-400" />
                  <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-blue-400" />
                  <span
                    className={`absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-blue-400/70 ${
                      scanned ? "opacity-0" : "animate-pulse"
                    }`}
                  />
                </div>
              </div>
              {/* Flash verde */}
              {scanned ? (
                <div className="pointer-events-none absolute inset-0 bg-emerald-500/30 transition-opacity" />
              ) : null}
              {/* Hint */}
              <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-xs font-medium text-white drop-shadow">
                {hint}
              </p>
              {/* Toolbar */}
              <div className="absolute right-2 top-2 flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFlashOn((f) => !f)
                  }}
                  className="h-9 w-9 rounded-full bg-white/95 text-slate-700 hover:bg-white/95 hover:text-blue-700"
                  aria-label="Linterna"
                  title="Linterna"
                >
                  <Flashlight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSwitchCamera()
                  }}
                  className="h-9 w-9 rounded-full bg-white/95 text-slate-700 hover:bg-white/95 hover:text-blue-700"
                  aria-label="Cambiar camara"
                  title="Cambiar camara"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {manualOpen ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Ingresar codigo manualmente
            </label>
            <Input
              autoFocus
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleManualSubmit()
              }}
              placeholder="EAN-13, QR, Code 128, etc."
              className="border-slate-200 bg-white"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setManualOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleManualSubmit}
                disabled={!manualValue.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Usar codigo
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Ingresar codigo manualmente
          </button>
        )}

        <DialogFooter className="gap-2 sm:justify-between sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="border-slate-200 text-slate-700"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setManualOpen((m) => !m)}
            className="border-slate-200 text-slate-700 gap-1.5"
          >
            <Camera className="h-4 w-4" />
            {manualOpen ? "Ocultar ingreso manual" : "Ingresar manualmente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
