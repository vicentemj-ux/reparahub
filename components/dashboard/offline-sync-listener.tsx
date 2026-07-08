"use client"

import { useEffect, useRef } from "react"
import { createRepair } from "@/lib/actions/repairs-prisma"
import {
  getRepairQueueOrdered,
  mergeFallbackQueueIntoIdb,
  removeRepairQueueItem,
} from "@/lib/offline/repair-sync-queue"
import { toast } from "@/hooks/use-toast"

/**
 * Al volver `online`, sube tickets encolados en modo emergencia y notifica por folio.
 */
export function OfflineSyncListener() {
  const processing = useRef(false)

  useEffect(() => {
    async function drain() {
      if (processing.current) return
      if (typeof navigator !== "undefined" && !navigator.onLine) return
      processing.current = true
      try {
        await mergeFallbackQueueIntoIdb()
        const items = await getRepairQueueOrdered()
        for (const it of items) {
          const res = await createRepair(it.input)
          if (res.success && res.folio) {
            await removeRepairQueueItem(it.id)
            toast({
              title: `Sincronizacion completa: ${res.folio} guardado en la nube`,
            })
          } else {
            toast({
              variant: "destructive",
              title: "No se pudo sincronizar un ticket en cola",
              description: res.error?.trim() || "Revisa conexion e intenta de nuevo.",
            })
            break
          }
        }
      } catch (e) {
        console.error("[OfflineSyncListener]", e)
        toast({
          variant: "destructive",
          title: "Error al sincronizar",
          description: e instanceof Error ? e.message : "Intenta mas tarde.",
        })
      } finally {
        processing.current = false
      }
    }

    void drain()
    const onOnline = () => {
      void drain()
    }
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [])

  return null
}
