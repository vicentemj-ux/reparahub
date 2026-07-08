"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

const OPEN_NEW_TICKET_HREF = "/dashboard/reparaciones/nueva"

/**
 * Boton "+ Nueva Reparacion" que abre la nueva ruta page-first de recepcion.
 * El modal legacy permanece disponible en Reparaciones como fallback operativo.
 */
export function NewRepairButton({
  className,
  variant = "default",
}: {
  className?: string
  variant?: "default" | "sidebar"
}) {
  if (variant === "sidebar") {
    return (
      <Button className={className} asChild>
        <Link href={OPEN_NEW_TICKET_HREF}>
          <Plus className="h-4 w-4" />
          Nueva Reparacion
        </Link>
      </Button>
    )
  }

  return (
    <Button className={className} asChild>
      <Link href={OPEN_NEW_TICKET_HREF}>
        <Plus className="h-5 w-5" />
        <span>Nueva Reparacion</span>
      </Link>
    </Button>
  )
}
