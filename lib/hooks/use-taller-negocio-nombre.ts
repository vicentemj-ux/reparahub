"use client"

import { useEffect, useState } from "react"
import { getTallerSettings } from "@/lib/actions/settings-prisma"

function getTallerNameFromCookie(): string {
  try {
    const raw = document.cookie.split("tallerName=")[1]?.split(";")[0]
    if (raw) return decodeURIComponent(raw)
  } catch { /* ignore */ }
  return ""
}

/** Nombre del negocio desde `configuracion_taller`, con fallback a cookie. */
export function useTallerNegocioNombre() {
  const [name, setName] = useState(getTallerNameFromCookie() || "Mi Taller")
  useEffect(() => {
    let cancelled = false
    getTallerSettings()
      .then(({ settings }) => {
        if (cancelled || !settings?.nombre_taller) return
        setName(settings.nombre_taller.trim() || "Mi Taller")
      })
      .catch(() => {
        const fromCookie = getTallerNameFromCookie()
        if (fromCookie) setName(fromCookie)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return name
}
