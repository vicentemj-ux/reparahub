"use client"

import { useRouter } from "next/navigation"
import { NuevaReparacionForm } from "@/components/dashboard/nueva-reparacion-form"
import { useActiveCustomer } from "@/lib/context/active-customer-context"
import { submitRepairFormData } from "@/lib/reparaciones/repair-form-submit"

export function NuevaRecepcionPage() {
  const router = useRouter()
  const { activeCustomer } = useActiveCustomer()

  const initialClient =
    activeCustomer.mode === "selected"
      ? {
          id: activeCustomer.id,
          nombre: activeCustomer.nombre,
          telefono: activeCustomer.telefono,
          correo: activeCustomer.correo || "",
        }
      : null

  return (
    <div className="space-y-3">
      <NuevaReparacionForm
        isModal
        initialClient={initialClient}
        clientCaptureMode="session-priority"
        onSubmit={submitRepairFormData}
        onSuccess={(repairId) => router.push(`/dashboard/reparaciones/${repairId}`)}
      />
    </div>
  )
}
