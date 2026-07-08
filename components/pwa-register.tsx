"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export function PwaRegister() {
  const pathname = usePathname()
  const updateToastShownRef = useRef(false)
  const hasShownReadyToastRef = useRef(false)
  const isReloadingRef = useRef(false)

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return

    const showUpdateToast = (registration: ServiceWorkerRegistration) => {
      if (updateToastShownRef.current) return
      if (!registration.waiting) return

      updateToastShownRef.current = true
      toast({
        title: "Actualizacion lista",
        description: "Hay una version nueva de ReparaHub. Actualiza para usar la build mas reciente.",
        variant: "info",
        duration: 12000,
        action: {
          label: "Actualizar",
          onClick: () => {
            registration.waiting?.postMessage({ type: "SKIP_WAITING" })
          },
        },
      })
    }

    const announceOfflineReady = () => {
      if (hasShownReadyToastRef.current) return
      if (!pathname.startsWith("/dashboard")) return

      hasShownReadyToastRef.current = true
      toast({
        title: "PWA activa",
        description: "ReparaHub ya puede abrir una vista offline de emergencia y conservar tus flujos locales.",
        variant: "info",
        duration: 6000,
      })
    }

    const onControllerChange = () => {
      if (isReloadingRef.current) return
      isReloadingRef.current = true
      window.location.reload()
    }

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
        if (registration.waiting) {
          showUpdateToast(registration)
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing
          if (!installing) return

          installing.addEventListener("statechange", () => {
            if (installing.state !== "installed") return
            if (navigator.serviceWorker.controller) {
              showUpdateToast(registration)
              return
            }
            announceOfflineReady()
          })
        })

        void registration.update().catch(() => {})
      }).catch((error) => {
        console.warn("[pwa] service worker registration failed", error)
      })
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register, { once: true })
    }

    const onOnline = () => {
      void navigator.serviceWorker.getRegistration("/").then((registration) => registration?.update()).catch(() => {})
    }

    window.addEventListener("online", onOnline)

    return () => {
      window.removeEventListener("load", register)
      window.removeEventListener("online", onOnline)
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
    }
  }, [pathname])

  return null
}
