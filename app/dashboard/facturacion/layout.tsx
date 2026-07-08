import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Mi Suscripcion",
  description: "Planes, estatus y renovacion de tu cuenta ReparaHub.",
}

export default function FacturacionLayout({ children }: { children: ReactNode }) {
  return children
}
