"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

type BannerMode = "hidden" | "offline" | "syncing"

/**
 * Barra superior cuando no hay red; al volver online muestra "Sincronizando..." unos segundos.
 */
export function OfflineBanner() {
  const [mode, setMode] = useState<BannerMode>(() =>
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "hidden",
  )
  const wasOfflineRef = useRef(mode === "offline")

  useEffect(() => {
    const onOffline = () => {
      wasOfflineRef.current = true
      setMode("offline")
    }
    const onOnline = () => {
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false
        setMode("syncing")
        window.setTimeout(() => setMode("hidden"), 3000)
      } else {
        setMode("hidden")
      }
    }

    window.addEventListener("offline", onOffline)
    window.addEventListener("online", onOnline)
    return () => {
      window.removeEventListener("offline", onOffline)
      window.removeEventListener("online", onOnline)
    }
  }, [])

  if (mode === "hidden") return null

  const isOffline = mode === "offline"

  return (
    <div
      role="status"
      className={cn(
        "flex shrink-0 items-center justify-center gap-2 border-b px-4 py-2 text-center text-xs font-medium leading-snug shadow-sm sm:text-sm",
        isOffline
          ? "border-slate-300/60 bg-gradient-to-r from-blue-700 via-slate-600 to-slate-500 text-white"
          : "border-emerald-200 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white",
      )}
    >
      {isOffline ? (
        <>
          <ShieldAlert className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
          <span>
            ReparaHub esta operando localmente por falta de red. Tu progreso esta seguro.
          </span>
        </>
      ) : (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <span>Sincronizando... reconectando con la nube.</span>
        </>
      )}
    </div>
  )
}
