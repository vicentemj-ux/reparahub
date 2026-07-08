"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { TrackedLink } from "@/components/marketing/tracked-link"

const navigation = [
  { href: "/#producto", label: "Producto" },
  { href: "/#beneficios", label: "Beneficios" },
  { href: "/#precios", label: "Precios" },
  { href: "/#preguntas", label: "Preguntas" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E4E7EC] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <a
        href="#contenido"
        className="absolute left-4 top-0 z-[60] -translate-y-full rounded-b-md bg-[#155EEF] px-4 py-3 font-semibold text-white transition-transform focus:translate-y-0"
      >
        Saltar al contenido
      </a>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#155EEF] focus-visible:ring-offset-2">
          <Image src="/logo.webp" alt="ReparaHub" width={180} height={55} priority className="h-9 w-auto object-contain" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Navegación principal">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md text-sm font-semibold text-slate-600 outline-none transition-colors hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm font-semibold text-[#344054] outline-none hover:text-[#155EEF] focus-visible:ring-2 focus-visible:ring-[#155EEF]">
            Iniciar sesión
          </Link>
          <TrackedLink
            href="/auth/register"
            eventName="landing_cta_trial_click"
            eventProperties={{ location: "header" }}
            className="btn-glow inline-flex min-h-11 items-center justify-center rounded-xl bg-[#155EEF] px-5 text-sm font-bold text-white outline-none hover:bg-[#004EEB] focus-visible:ring-2 focus-visible:ring-[#155EEF] focus-visible:ring-offset-2"
          >
            Probar gratis
          </TrackedLink>
        </div>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-[#344054] outline-none hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#155EEF] md:hidden"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-controls="menu-movil"
          aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div id="menu-movil" className="border-t border-[#E4E7EC] bg-white px-4 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col" aria-label="Menú móvil">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-12 items-center border-b border-slate-100 font-semibold text-slate-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid gap-2">
            <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D0D5DD] font-semibold text-[#0B1220]">
              Iniciar sesión
            </Link>
            <TrackedLink
              href="/auth/register"
              eventName="landing_cta_trial_click"
              eventProperties={{ location: "mobile_menu" }}
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#155EEF] font-bold text-white"
            >
              Comenzar 30 días gratis
            </TrackedLink>
          </div>
        </div>
      ) : null}
    </header>
  )
}
