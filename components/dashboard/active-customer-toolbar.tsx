"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, type ElementType } from "react"
import { Camera, FileText, Loader2, MessageCircle, Phone, Search, UserRound, Users, Wrench, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { Client } from "@/lib/actions/clients-prisma"
import { searchToolbarCustomers, resolveToolbarCustomerByPhone } from "@/lib/actions/active-customer-toolbar-prisma"
import { getTallerSettings, type TallerSettings } from "@/lib/actions/settings-prisma"
import { useActiveCustomer } from "@/lib/context/active-customer-context"
import { getCodigoTelefono } from "@/lib/constants/paises"
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface"
import { cn } from "@/lib/utils"
import { buildCustomerGreetingWhatsAppMessage } from "@/lib/whatsapp-customer-greeting"
import { buildCustomerWhatsAppUrl, normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"

type SearchStatus = "idle" | "typing" | "searching" | "ready"
function normalizeDigits(value: string) {
  return value.replace(/\D/g, "")
}

function formatPhone(phone: string) {
  const digits = normalizeDigits(phone)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  if (digits.length <= 10) return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`
}

function mapClientToActive(client: Client) {
  return {
    id: client.id,
    nombre: client.nombre?.trim() || "Cliente",
    telefono: normalizeDigits(client.telefono ?? ""),
    correo: client.correo?.trim() || "",
  }
}

const QUICK_ACTIONS = [
  {
    href: "/dashboard/bitacora-visitas?quick=1",
    label: "Registrar visita",
    icon: Camera,
  },
  {
    href: "/dashboard/reparaciones/nueva",
    label: "Nueva recepcion",
    icon: Wrench,
  },
  {
    href: "/dashboard/cotizaciones/nueva",
    label: "Nueva cotizacion",
    icon: FileText,
  },
] as const

/** Evento que disparan los CTAs en paginas internas (reparaciones, cotizaciones, ...)
 *  para pedirle al toolbar que enfoque el buscador del cliente activo. */
const FOCUS_CUSTOMER_SEARCH_EVENT = "tc:focus-customer-search"

function QuickActionLink({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: ElementType
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#E4E7EC] bg-white text-[#667085] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#B2DDFF] hover:bg-[#EFF8FF] hover:text-[#155EEF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B2DDFF]"
    >
      <Icon className="h-[18px] w-[18px]" />
    </Link>
  )
}

export function ActiveCustomerToolbar() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const { activeCustomer, setActiveCustomer, clearActiveCustomer } = useActiveCustomer()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Client[]>([])
  const [status, setStatus] = useState<SearchStatus>("idle")
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [shopSettings, setShopSettings] = useState<Pick<TallerSettings, "nombre_taller" | "pais"> | null>(null)
  /** Pulso visual breve para que el usuario vea donde quedo el foco cuando una
   *  pagina interna (reparaciones, cotizaciones) le pide enfocar el buscador. */
  const [pulse, setPulse] = useState(false)

  const queryDigits = useMemo(() => normalizeDigits(query), [query])
  const isPhoneIntent = queryDigits.length > 0
  const canSearch = isPhoneIntent ? queryDigits.length >= 6 : query.trim().length >= 2
  const canCreateClient = isPhoneIntent && queryDigits.length >= 6
  const hasExactPhoneMatch = useMemo(
    () => results.some((client) => normalizeDigits(client.telefono ?? "") === queryDigits),
    [queryDigits, results],
  )

  useEffect(() => {
    setNewClientName("")
  }, [queryDigits])

  useEffect(() => {
    let cancelled = false
    getTallerSettings()
      .then(({ settings }) => {
        if (cancelled || !settings) return
        setShopSettings({
          nombre_taller: settings.nombre_taller,
          pais: settings.pais,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  /** Escucha el pedido de foco desde paginas internas (badge "Publico general"
   *  en reparaciones/cotizaciones, etc). Enfoca el input, abre el dropdown y
   *  dispara un pulso visual para que el usuario vea donde quedo el cursor. */
  useEffect(() => {
    const handler = () => {
      searchInputRef.current?.focus()
      if (query.trim()) setOpen(true)
      setPulse(true)
      window.setTimeout(() => setPulse(false), 1600)
    }
    window.addEventListener(FOCUS_CUSTOMER_SEARCH_EVENT, handler)
    return () => window.removeEventListener(FOCUS_CUSTOMER_SEARCH_EVENT, handler)
  }, [query])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setStatus("idle")
      setOpen(false)
      return
    }

    if (!canSearch) {
      setResults([])
      setStatus("typing")
      setOpen(true)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setStatus("searching")
      setOpen(true)
      const { clients } = await searchToolbarCustomers(query.trim())
      if (cancelled) return
      setResults(clients.slice(0, 8))
      setStatus("ready")
    }, 220)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [canSearch, query])

  const resetSearch = () => {
    setQuery("")
    setResults([])
    setStatus("idle")
    setOpen(false)
    setNewClientName("")
  }

  const handleSelectClient = (client: Client) => {
    setActiveCustomer(mapClientToActive(client))
    resetSearch()
  }

  const handleCreateFromPhone = async () => {
    if (queryDigits.length < 6 || creating) return
    const trimmedName = newClientName.trim()
    if (trimmedName.length < 2) return
    setCreating(true)
    try {
      const result = await resolveToolbarCustomerByPhone(queryDigits, trimmedName)
      if (result.client) {
        setActiveCustomer(result.client)
        resetSearch()
      }
    } finally {
      setCreating(false)
    }
  }

  const focusSearch = () => {
    searchInputRef.current?.focus()
    if (query.trim()) setOpen(true)
    setPulse(true)
    window.setTimeout(() => setPulse(false), 1600)
  }

  const clearActiveSession = () => {
    clearActiveCustomer()
    resetSearch()
  }

  const sendGreetingWhatsApp = () => {
    if (activeCustomer.mode !== "selected") return

    const digits = normalizePhoneForWhatsApp(activeCustomer.telefono, getCodigoTelefono(shopSettings?.pais ?? null))
    if (!digits) {
      return
    }

    const message = buildCustomerGreetingWhatsAppMessage({
      customerName: activeCustomer.nombre,
      shopName: shopSettings?.nombre_taller,
    })

    window.open(buildCustomerWhatsAppUrl(digits, message), "_blank", "noopener,noreferrer")
  }

  const customerTitle = activeCustomer.mode === "selected" ? activeCustomer.nombre : "PUBLICO GENERAL"
  const customerSubtitle =
    activeCustomer.mode === "selected"
      ? formatPhone(activeCustomer.telefono)
      : "Sin cliente fijo en la sesion"
  const customerHelper =
    activeCustomer.mode === "selected"
      ? "Toca para cambiar o activar otro cliente."
      : "Toca para buscar, activar o crear un cliente."

  return (
    <div className="sticky top-0 z-40 overflow-visible" style={{ backgroundColor: DASHBOARD_SURFACE }}>
      <div className="w-full px-3 py-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div ref={containerRef} className="flex flex-col gap-2">
          <div
            className={cn(
              "grid min-w-0 items-stretch gap-2 sm:hidden",
              activeCustomer.mode === "selected"
                ? "grid-cols-[repeat(3,minmax(0,2.75rem))_minmax(0,1fr)_auto_auto]"
                : "grid-cols-[repeat(3,minmax(0,2.75rem))_minmax(0,1fr)_auto]",
            )}
          >
            {QUICK_ACTIONS.map((action) => (
              <QuickActionLink key={action.href} {...action} />
            ))}

            <button
              type="button"
              onClick={focusSearch}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-2xl border bg-white px-3 text-left shadow-sm transition-all hover:border-[#B2DDFF] hover:bg-[#EFF8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B2DDFF]",
                activeCustomer.mode === "selected"
                  ? "border-[#ABEFC6] bg-[#ECFDF3]"
                  : "border-[#E4E7EC] bg-[#F8FAFC]",
              )}
              aria-label={activeCustomer.mode === "selected" ? "Cambiar cliente activo" : "Buscar o activar cliente"}
              title={customerHelper}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white",
                  activeCustomer.mode === "selected" ? "text-[#12B76A]" : "text-[#667085]",
                )}
              >
                {activeCustomer.mode === "selected" ? <UserRound className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-black uppercase tracking-[0.14em] text-[#0B1220]">{customerTitle}</p>
                <p className="truncate text-[10px] font-semibold text-[#667085]">{customerSubtitle}</p>
              </div>
              <Search className="h-4 w-4 shrink-0 text-[#98A2B3]" />
            </button>

            {activeCustomer.mode === "selected" ? (
              <Button
                type="button"
                variant="outline"
                onClick={sendGreetingWhatsApp}
                title="Enviar saludo por WhatsApp"
                aria-label="Enviar saludo por WhatsApp"
                className="h-11 w-11 shrink-0 rounded-2xl border-[#ABEFC6] bg-[#ECFDF3] p-0 text-[#027A48] hover:bg-[#D1FADF]"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={clearActiveSession}
              title="Liberar cliente activo"
              aria-label="Liberar cliente activo"
              className="h-11 w-11 shrink-0 rounded-2xl border-[#E4E7EC] bg-white p-0 text-[#344054] hover:bg-[#F8FAFC]"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <div className="relative z-50 min-w-0 flex-1 overflow-visible">
              <div
                className={cn(
                  "flex h-11 items-center rounded-2xl border border-[#E4E7EC] bg-white px-3 shadow-sm transition-all focus-within:border-[#84CAFF] focus-within:ring-4 focus-within:ring-[#EFF8FF]",
                  pulse &&
                    "animate-[tc-pulse-ring_1.6s_ease-out_1] border-[#2E90FA] ring-4 ring-[#B2DDFF]/80",
                )}
              >
                <Search className="h-4 w-4 shrink-0 text-[#98A2B3]" />
                <Input
                  ref={searchInputRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setOpen(true)
                  }}
                  onFocus={() => {
                    if (query.trim()) setOpen(true)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canCreateClient && !hasExactPhoneMatch && newClientName.trim().length >= 2) {
                      event.preventDefault()
                      void handleCreateFromPhone()
                    }
                  }}
                  placeholder="Buscar cliente por telefono o nombre..."
                  className="h-full border-0 bg-transparent px-3 text-sm font-medium text-[#0B1220] shadow-none focus-visible:ring-0"
                />
                {status === "searching" || creating ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#155EEF]" />
                ) : query ? (
                  <button
                    type="button"
                    onClick={resetSearch}
                    className="rounded-full p-1 text-[#98A2B3] transition-colors hover:bg-[#F8FAFC] hover:text-[#0B1220]"
                    aria-label="Limpiar busqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {open && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-[70] overflow-hidden rounded-[22px] border border-[#E4E7EC] bg-white shadow-[0_24px_60px_rgba(11,18,32,0.14)]">
                  <div className="max-h-[360px] overflow-y-auto p-2">
                    {status === "typing" && (
                      <div className="rounded-2xl border border-dashed border-[#E4E7EC] px-4 py-4 text-sm text-[#667085]">
                        {isPhoneIntent
                          ? "Sigue capturando el telefono para consultar al cliente."
                          : "Escribe al menos 2 letras para buscar por nombre."}
                      </div>
                    )}

                    {status === "ready" && results.length > 0 && (
                      <div className="space-y-1">
                        {results.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectClient(client)}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-[#F8FAFC]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-[#0B1220]">{client.nombre}</p>
                              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-[#667085]">
                                <Phone className="h-3.5 w-3.5 text-[#12B76A]" />
                                {formatPhone(client.telefono ?? "")}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {status === "ready" && canCreateClient && !hasExactPhoneMatch && (
                      <div className="mt-2 space-y-3 rounded-2xl border border-dashed border-[#B2DDFF] bg-[#EFF8FF] p-3">
                        <div>
                          <p className="text-sm font-black text-[#0B1220]">Numero nuevo</p>
                          <p className="mt-1 text-xs leading-relaxed text-[#667085]">
                            {formatPhone(queryDigits)} no existe aun. Captura el nombre para dejarlo activo desde ahora.
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <Input
                            value={newClientName}
                            onChange={(event) => setNewClientName(event.target.value)}
                            placeholder="Nombre del cliente"
                            className="h-11 rounded-2xl border-[#E4E7EC] bg-white text-sm font-semibold"
                          />
                          <Button
                            type="button"
                            onClick={() => void handleCreateFromPhone()}
                            disabled={creating || newClientName.trim().length < 2}
                            className="btn-glow h-11 rounded-2xl bg-[#155EEF] px-4 text-white hover:bg-[#004EEB]"
                          >
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activar cliente"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {status === "ready" && results.length === 0 && canSearch && !isPhoneIntent && (
                      <div className="rounded-2xl border border-dashed border-[#E4E7EC] px-4 py-4 text-sm text-[#667085]">
                        Sin coincidencias por nombre. Prueba con telefono para registrarlo al momento.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {QUICK_ACTIONS.map((action) => (
                <QuickActionLink key={action.href} {...action} />
              ))}
            </div>

            <button
              type="button"
              onClick={focusSearch}
              className={cn(
                "flex h-11 min-w-[170px] max-w-[260px] shrink-0 items-center gap-3 rounded-2xl border px-3 text-left shadow-sm sm:min-w-[280px] sm:max-w-[360px]",
                activeCustomer.mode === "selected"
                  ? "border-[#ABEFC6] bg-[#ECFDF3]"
                  : "border-[#E4E7EC] bg-[#F8FAFC]",
              )}
              aria-label={activeCustomer.mode === "selected" ? "Cambiar cliente activo" : "Buscar o activar cliente"}
              title={customerHelper}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white",
                  activeCustomer.mode === "selected" ? "text-[#12B76A]" : "text-[#667085]",
                )}
              >
                {activeCustomer.mode === "selected" ? <UserRound className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#0B1220]">{customerTitle}</p>
                <p className="truncate text-[11px] font-semibold text-[#667085]">{customerSubtitle}</p>
              </div>
            </button>

            {activeCustomer.mode === "selected" ? (
              <Button
                type="button"
                variant="outline"
                onClick={sendGreetingWhatsApp}
                title="Enviar saludo de bienvenida por WhatsApp"
                aria-label="Enviar saludo de bienvenida por WhatsApp"
                className="h-11 shrink-0 rounded-2xl border-[#ABEFC6] bg-[#ECFDF3] px-3 text-sm font-black text-[#027A48] hover:border-[#75E0A7] hover:bg-[#D1FADF] sm:px-4"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden lg:inline">Saludo</span>
              </Button>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={clearActiveSession}
              title="Liberar cliente activo"
              aria-label="Liberar cliente activo"
              className="h-11 shrink-0 rounded-2xl border-[#E4E7EC] bg-white px-3 text-sm font-black text-[#344054] hover:bg-[#F8FAFC] sm:px-4"
            >
              <X className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Liberar</span>
            </Button>
          </div>

          <div className="sm:hidden">
            <div className="relative z-50 min-w-0 overflow-visible">
              <div
                className={cn(
                  "flex h-11 items-center rounded-2xl border border-[#E4E7EC] bg-white px-3 shadow-sm transition-all focus-within:border-[#84CAFF] focus-within:ring-4 focus-within:ring-[#EFF8FF]",
                  pulse &&
                    "animate-[tc-pulse-ring_1.6s_ease-out_1] border-[#2E90FA] ring-4 ring-[#B2DDFF]/80",
                )}
              >
                <Search className="h-4 w-4 shrink-0 text-[#98A2B3]" />
                <Input
                  ref={searchInputRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setOpen(true)
                  }}
                  onFocus={() => {
                    if (query.trim()) setOpen(true)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canCreateClient && !hasExactPhoneMatch && newClientName.trim().length >= 2) {
                      event.preventDefault()
                      void handleCreateFromPhone()
                    }
                  }}
                  placeholder="Buscar cliente por telefono o nombre..."
                  className="h-full border-0 bg-transparent px-3 text-sm font-medium text-[#0B1220] shadow-none focus-visible:ring-0"
                />
                {status === "searching" || creating ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#155EEF]" />
                ) : query ? (
                  <button
                    type="button"
                    onClick={resetSearch}
                    className="rounded-full p-1 text-[#98A2B3] transition-colors hover:bg-[#F8FAFC] hover:text-[#0B1220]"
                    aria-label="Limpiar busqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {open && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-[70] overflow-hidden rounded-[22px] border border-[#E4E7EC] bg-white shadow-[0_24px_60px_rgba(11,18,32,0.14)]">
                  <div className="max-h-[360px] overflow-y-auto p-2">
                    {status === "typing" && (
                      <div className="rounded-2xl border border-dashed border-[#E4E7EC] px-4 py-4 text-sm text-[#667085]">
                        {isPhoneIntent
                          ? "Sigue capturando el telefono para consultar al cliente."
                          : "Escribe al menos 2 letras para buscar por nombre."}
                      </div>
                    )}

                    {status === "ready" && results.length > 0 && (
                      <div className="space-y-1">
                        {results.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectClient(client)}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-[#F8FAFC]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-[#0B1220]">{client.nombre}</p>
                              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-[#667085]">
                                <Phone className="h-3.5 w-3.5 text-[#12B76A]" />
                                {formatPhone(client.telefono ?? "")}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {status === "ready" && canCreateClient && !hasExactPhoneMatch && (
                      <div className="mt-2 space-y-3 rounded-2xl border border-dashed border-[#B2DDFF] bg-[#EFF8FF] p-3">
                        <div>
                          <p className="text-sm font-black text-[#0B1220]">Numero nuevo</p>
                          <p className="mt-1 text-xs leading-relaxed text-[#667085]">
                            {formatPhone(queryDigits)} no existe aun. Captura el nombre para dejarlo activo desde ahora.
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <Input
                            value={newClientName}
                            onChange={(event) => setNewClientName(event.target.value)}
                            placeholder="Nombre del cliente"
                            className="h-11 rounded-2xl border-[#E4E7EC] bg-white text-sm font-semibold"
                          />
                          <Button
                            type="button"
                            onClick={() => void handleCreateFromPhone()}
                            disabled={creating || newClientName.trim().length < 2}
                            className="btn-glow h-11 rounded-2xl bg-[#155EEF] px-4 text-white hover:bg-[#004EEB]"
                          >
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activar cliente"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {status === "ready" && results.length === 0 && canSearch && !isPhoneIntent && (
                      <div className="rounded-2xl border border-dashed border-[#E4E7EC] px-4 py-4 text-sm text-[#667085]">
                        Sin coincidencias por nombre. Prueba con telefono para registrarlo al momento.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
