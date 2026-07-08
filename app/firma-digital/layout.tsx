import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Firma de conformidad | ReparaHub",
  robots: { index: false, follow: false },
}

export default function FirmaDigitalLayout({ children }: { children: React.ReactNode }) {
  return children
}
