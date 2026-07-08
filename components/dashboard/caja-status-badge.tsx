"use client"

import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useCajaContext } from "@/lib/context/caja-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function CajaStatusBadgeInner() {
  const router = useRouter()
  const { status, open } = useCajaContext()

  if (status === "loading") {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
        <span className="text-xs font-medium text-slate-500">Verificando...</span>
      </div>
    )
  }

  if (status === "closed") {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={open}
        className={cn(
          "h-auto gap-1.5 rounded-full border-red-200 bg-red-50 px-3 py-1",
          "text-xs font-semibold text-red-600",
          "hover:bg-red-100 hover:text-red-700"
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        CAJA CERRADA
      </Button>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => router.push("/dashboard/ventas")}
      className={cn(
        "h-auto gap-1.5 rounded-full border-emerald-200 bg-emerald-50 px-3 py-1",
        "text-xs font-semibold text-emerald-600",
        "hover:bg-emerald-100 hover:text-emerald-700"
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      CAJA ABIERTA
    </Button>
  )
}

export function CajaStatusBadge() {
  return <CajaStatusBadgeInner />
}

export function CajaStatusBadgeFallback() {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
      <span className="text-xs font-medium text-slate-500">Cargando...</span>
    </div>
  )
}