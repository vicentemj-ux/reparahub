"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import {
  REPAIR_QUEUE_CHANGED_EVENT,
  getRepairQueueOrdered,
} from "@/lib/offline/repair-sync-queue"
import {
  DATA_PERF_EVENT,
  getSessionAvg,
  type DataPerfDetail,
} from "@/lib/perf/data-fetch-perf"

export function CloudConnectionStatus({ className }: { className?: string }) {
  const [online, setOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const prevOnlineRef = useRef<boolean | null>(null)

  // ── Perf state ──────────────────────────────────────────────────────────────
  const [perf, setPerf] = useState<DataPerfDetail | null>(null)
  const [avgMs, setAvgMs] = useState<number | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DataPerfDetail>).detail
      setPerf(detail)
      setAvgMs(getSessionAvg())
    }
    window.addEventListener(DATA_PERF_EVENT, handler)
    return () => window.removeEventListener(DATA_PERF_EVENT, handler)
  }, [])

  // ── Online / offline ────────────────────────────────────────────────────────
  useEffect(() => {
    const refreshCount = () => {
      void getRepairQueueOrdered().then((q) => setPendingCount(q.length))
    }

    const handleOnlineOffline = () => {
      const now = navigator.onLine
      if (prevOnlineRef.current === true && now === false) {
        toast({
          title: "Modo offline",
          description:
            "Sin conexion a internet. Puedes seguir capturando; al volver la senal se sincronizan los tickets en cola.",
        })
      }
      prevOnlineRef.current = now
      setOnline(now)
      refreshCount()
    }

    prevOnlineRef.current = navigator.onLine
    setOnline(navigator.onLine)
    refreshCount()

    window.addEventListener("online", handleOnlineOffline)
    window.addEventListener("offline", handleOnlineOffline)
    window.addEventListener(REPAIR_QUEUE_CHANGED_EVENT, refreshCount)
    return () => {
      window.removeEventListener("online", handleOnlineOffline)
      window.removeEventListener("offline", handleOnlineOffline)
      window.removeEventListener(REPAIR_QUEUE_CHANGED_EVENT, refreshCount)
    }
  }, [])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const title =
    pendingCount > 0
      ? `${online ? "Conexion a internet" : "Sin conexion"} · ${pendingCount} ticket${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"} de sincronizar`
      : online
        ? "Conexion a internet"
        : "Sin conexion - los tickets nuevos se pueden guardar en cola"

  const perfColor =
    perf === null
      ? ""
      : perf.ms < 300
        ? "text-emerald-600"
        : perf.ms < 800
          ? "text-amber-7000"
          : "text-red-500"

  const perfTooltip =
    avgMs !== null
      ? `Ultimo: ${perf?.ms}ms · Promedio sesion: ${avgMs}ms`
      : perf
        ? `Ultimo: ${perf.ms}ms`
        : undefined

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs",
        online ? "text-slate-600" : "text-red-600",
        className,
      )}
      title={title}
      aria-live="polite"
    >
      <span
        className={cn("h-2 w-2 shrink-0 rounded-full", online ? "bg-emerald-500" : "bg-red-500")}
        aria-hidden
      />
      <span className={cn("font-semibold", !online && "text-red-600")}>
        {online ? "Cloud Online" : "Offline"}
        {pendingCount > 0 ? (
          <span
            className="ml-1.5 inline-flex items-center rounded-md bg-slate-200/90 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-800"
            aria-live="polite"
          >
            {pendingCount} en cola
          </span>
        ) : null}
      </span>

      {perf !== null && (
        <span
          title={perfTooltip}
          className={cn(
            "cursor-default font-mono tabular-nums font-semibold",
            perfColor,
          )}
        >
          {perf.source === "cache" ? "🧊" : "⚡"}{perf.ms}ms
        </span>
      )}
    </div>
  )
}
