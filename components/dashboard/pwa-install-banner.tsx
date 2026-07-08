"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, Smartphone, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

const DISMISS_KEY = "tc-pwa-install-dismissed-v1"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1")
    setIsStandalone(isStandaloneDisplayMode())

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setDismissed(false)
    }

    const onAppInstalled = () => {
      setDeferredPrompt(null)
      setDismissed(true)
      setIsStandalone(true)
      window.localStorage.setItem(DISMISS_KEY, "1")
      toast.success("ReparaHub instalada")
    }

    const mediaQuery = window.matchMedia("(display-mode: standalone)")
    const onDisplayModeChange = () => setIsStandalone(isStandaloneDisplayMode())

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onAppInstalled)
    mediaQuery.addEventListener("change", onDisplayModeChange)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onAppInstalled)
      mediaQuery.removeEventListener("change", onDisplayModeChange)
    }
  }, [])

  const hidden = useMemo(() => dismissed || isStandalone || deferredPrompt === null, [deferredPrompt, dismissed, isStandalone])

  if (hidden) return null

  const handleInstall = async () => {
    if (!deferredPrompt) return

    setIsInstalling(true)
    try {
      await deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === "accepted") {
        toast.success("Instalacion iniciada")
        setDeferredPrompt(null)
        return
      }

      toast({
        title: "Instalacion pospuesta",
        description: "Puedes volver a instalar ReparaHub despues desde el navegador.",
        variant: "info",
      })
    } catch {
      toast({
        title: "No se pudo abrir la instalacion",
        description: "Intenta de nuevo desde este navegador cuando la opcion de instalar este disponible.",
        variant: "warning",
      })
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    window.localStorage.setItem(DISMISS_KEY, "1")
  }

  return (
    <section className="mb-3 rounded-[22px] border border-blue-200 bg-[linear-gradient(135deg,#EFF8FF,#FFFFFF)] px-4 py-3 shadow-[0_14px_34px_rgba(21,94,239,0.08)] sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              Instala la app
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              Abre ReparaHub como app y conserva acceso a la vista offline de emergencia.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Ideal para mostrador: arranque mas rapido, icono propio y continuidad cuando falle la red.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => void handleInstall()}
            disabled={isInstalling}
            className="h-10 rounded-2xl bg-blue-600 px-4 font-black text-white hover:bg-blue-700 btn-glow"
          >
            <Download className="h-4 w-4" />
            {isInstalling ? "Abriendo..." : "Instalar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDismiss}
            className="h-10 rounded-2xl border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50"
            aria-label="Cerrar recomendacion de instalacion"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
