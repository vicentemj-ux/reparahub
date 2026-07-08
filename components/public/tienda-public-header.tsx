"use client"

import Link from "next/link"
import { ExternalLink, Store } from "lucide-react"

interface TiendaPublicHeaderProps {
  tenant: {
    nombreComercial: string
  }
}

export function TiendaPublicHeader({ tenant }: TiendaPublicHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-blue-800/30 shadow-md">
      <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
          <Link
            href="https://reparahub.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 transition hover:opacity-90"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-base font-black text-blue-700 shadow-sm sm:h-9 sm:w-9 sm:text-lg">
              T
            </div>
            <div className="leading-tight">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-200 sm:text-[10px]">
                Plataforma de tiendas
              </p>
              <p className="text-sm font-black tracking-tight text-white sm:text-base">
                ReparaHub
              </p>
            </div>
          </Link>

          <span
            aria-hidden
            className="mx-1 hidden h-7 w-px shrink-0 bg-blue-100 sm:block"
          />

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white ring-1 ring-inset ring-blue-200 backdrop-blur-sm sm:text-[11px]">
            <Store className="h-3 w-3" aria-hidden /> Tienda
          </span>

          <p className="min-w-0 flex-1 truncate text-sm font-bold text-white sm:text-base">
            {tenant.nombreComercial}
          </p>

          <a
            href="https://reparahub.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-blue-700 shadow-sm transition hover:scale-105 hover:bg-blue-50 sm:text-xs"
          >
            Crea tu tienda gratis
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>
      </div>
    </header>
  )
}
