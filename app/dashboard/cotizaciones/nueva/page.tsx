import { Suspense } from "react"

import { NuevaCotizacionPage } from "@/components/dashboard/cotizaciones/nueva-cotizacion-page"

export default function NuevaCotizacionRoute() {
  return (
    <Suspense fallback={null}>
      <NuevaCotizacionPage />
    </Suspense>
  )
}
