"use client"

import { ArrowRight } from "lucide-react"

export function TiendaPublicFooter() {
  return (
    <footer className="mt-16 bg-slate-100 text-slate-700">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-6 text-center text-[11px] text-slate-500 sm:flex-row sm:justify-between sm:px-6 sm:text-left sm:text-xs">
        <p className="leading-relaxed">
          Esta tienda es administrada por el taller.{" "}
          <span className="font-bold text-white">ReparaHub</span> solo provee la plataforma.
          <br className="hidden sm:inline" />
          <span className="text-slate-500">
            Hecho con ReparaHub &middot; La plataforma SaaS para talleres en LATAM.
          </span>
        </p>
        <a
          href="https://reparahub.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 font-black uppercase tracking-wider text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
        >
          reparahub.com
          <ArrowRight className="h-3 w-3" aria-hidden />
        </a>
      </div>
    </footer>
  )
}
