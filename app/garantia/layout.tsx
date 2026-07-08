import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Garantia digital | ReparaHub",
  description: "Comprobante de salida y garantia de tu reparacion.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function GarantiaLayout({ children }: { children: React.ReactNode }) {
  return children
}
