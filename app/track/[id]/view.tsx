"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { TrackingValidation } from "@/components/public/tracking-validation"
import { RepairPhotoGallery } from "@/components/dashboard/repair-photo-gallery"
import { formatCurrency } from "@/lib/utils/currency"
import { normalizePhoneForWhatsApp } from "@/lib/whatsapp-utils"
import { getCodigoTelefono } from "@/lib/constants/paises"
import {
  CheckCircle,
  Gamepad2,
  Laptop,
  MessageCircle,
  Package,
  Search,
  Smartphone,
  Store,
  Truck,
  Wrench,
  Printer,
  Watch,
  Monitor,
  Projector,
} from "lucide-react"


interface TrackingTicket {
  id: string
  folio: string | null
  marca: string | null
  modelo: string | null
  tipo_equipo: string | null
  numero_serie: string | null
  falla: string | null
  precio_estimado: number | null
  estatus: string | null
  created_at: string
  updated_at: string
}


const TIMELINE_STEPS = [
  { key: "RECEIVED",   label: "RECIBIDO",      description: "Equipo registrado exitosamente." },
  { key: "DIAGNOSING", label: "DIAGNOSTICO",   description: "Revisando el equipo en detalle." },
  { key: "IN_REPAIR",  label: "EN REPARACION", description: "Trabajando en la reparacion." },
  { key: "READY",      label: "LISTO",          description: "Tu equipo esta listo para recogerse." },
  { key: "DELIVERED",  label: "ENTREGADO",      description: "Equipo entregado al cliente." },
]

const STEP_ICONS = [Package, Search, Wrench, CheckCircle, Truck]


function normalizeStatus(raw: string | null | undefined): string {
  if (!raw) return "RECEIVED"
  const v = raw.toUpperCase()
  if (v.includes("RECIB") || v === "INGRESADO") return "RECEIVED"
  if (v.includes("DIAG"))                        return "DIAGNOSING"
  if (v.includes("REPAR"))                       return "IN_REPAIR"
  if (v.includes("LISTO"))                       return "READY"
  if (v.includes("ENTREG"))                      return "DELIVERED"
  if (["RECEIVED","DIAGNOSING","IN_REPAIR","READY","DELIVERED"].includes(v)) return v
  return "RECEIVED"
}

function getDeviceIcon(tipo: string | null | undefined) {
  const t = (tipo || "").toLowerCase()
  if (t.includes("laptop") || t.includes("notebook") || t.includes("mac")) return Laptop
  if (t.includes("videojuego") || t.includes("consola") || t.includes("playstation") || t.includes("xbox") || t.includes("nintendo")) return Gamepad2
  if (t.includes("celular") || t.includes("smartphone") || t.includes("iphone") || t.includes("android") || t.includes("movil") || t.includes("movil")) return Smartphone
  if (t.includes("tablet") || t.includes("ipad")) return Smartphone
  if (t.includes("impresora") || t.includes("printer")) return Printer
  if (t.includes("reloj") || t.includes("watch") || t.includes("smartwatch")) return Watch
  if (t.includes("computadora") || t.includes("desktop") || t.includes("pc") || t.includes("all-in-one")) return Monitor
  if (t.includes("proyector") || t.includes("projector")) return Projector
  return Package
}


export default function PublicTrackingPage() {
  const params  = useParams()
  const ticketId = (params?.id as string) || ""

  const [ticket,     setTicket]     = useState<TrackingTicket | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [photoUrls,  setPhotoUrls]  = useState<string[]>([])
  const [tallerName, setTallerName] = useState<string | null>(null)
  const [tallerLogo, setTallerLogo] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | undefined>(undefined)
  const [attemptsMax, setAttemptsMax] = useState<number | undefined>(undefined)
  const [blocked, setBlocked] = useState(false)
  const [tallerContact, setTallerContact] = useState<{
    name: string | null
    telefono: string | null
    whatsapp: string | null
    pais: string | null
    slug?: string | null
    tiendaActiva?: boolean
  } | null>(null)

  const handleValidate = async (last4: string) => {
    if (!ticketId) return
    setIsValidating(true)
    setError(null)

    try {
      const res = await fetch("/api/tracking/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, last4: last4.trim() }),
      })
      const payload = (await res.json()) as {
        ok: boolean
        error?: string
        reparacion?: TrackingTicket
        taller?: {
          name?: string | null
          logoUrl?: string | null
          telefono?: string | null
          whatsapp?: string | null
          pais?: string | null
          slug?: string | null
          tiendaActiva?: boolean
        }
        fotos?: Array<{ id: string; url: string }>
        attemptsRemaining?: number
        attemptsMax?: number
        blocked?: boolean
      }

      const tallerFromPayload = payload.taller
        ? {
            name: payload.taller.name ?? null,
            telefono: payload.taller.telefono ?? null,
            whatsapp: payload.taller.whatsapp ?? null,
            pais: payload.taller.pais ?? null,
            slug: payload.taller.slug ?? null,
            tiendaActiva: payload.taller.tiendaActiva ?? false,
          }
        : null

      if (typeof payload.attemptsRemaining === "number") {
        setAttemptsRemaining(payload.attemptsRemaining)
      }
      if (typeof payload.attemptsMax === "number") {
        setAttemptsMax(payload.attemptsMax)
      }
      if (tallerFromPayload) {
        setTallerContact(tallerFromPayload)
      }
      setBlocked(payload.blocked === true)

      if (!res.ok || !payload.ok || !payload.reparacion) {
        setError(payload.error ?? "Los ultimos 4 digitos no coinciden.")
        setTicket(null)
        setPhotoUrls([])
        setTallerName(null)
        setTallerLogo(null)
        return
      }

      setTicket(payload.reparacion)
      setPhotoUrls((payload.fotos ?? []).map((f) => f.url))
      setTallerName(payload.taller?.name ?? null)
      setTallerLogo(payload.taller?.logoUrl ?? null)
    } catch (e) {
      console.error("Error validando reparacion publica:", e)
      setError("Ocurrio un problema al validar tu informacion. Intenta de nuevo mas tarde.")
      setTicket(null)
      setPhotoUrls([])
      setTallerName(null)
      setTallerLogo(null)
    } finally {
      setIsValidating(false)
    }
  }

  if (!ticket) {
    return (
      <TrackingValidation
        onValidate={handleValidate}
        isLoading={isValidating}
        error={error}
        attemptsRemaining={attemptsRemaining}
        attemptsMax={attemptsMax}
        blocked={blocked}
        tallerContact={tallerContact}
      />
    )
  }

  // Datos normalizados
  const folio        = ticket.folio || ticket.id
  const brand        = ticket.marca || "Equipo"
  const model        = ticket.modelo || ""
  const serie        = ticket.numero_serie || ""
  const status       = normalizeStatus(ticket.estatus)
  const falla        = ticket.falla || "Sin descripcion"
  const presupuesto  = ticket.precio_estimado ?? null
  const DeviceIcon   = getDeviceIcon(ticket.tipo_equipo)
  const whatsappDigits = normalizePhoneForWhatsApp(
    tallerContact?.whatsapp || tallerContact?.telefono,
    getCodigoTelefono(tallerContact?.pais ?? null),
  )
  const folioForMessage = folio || ticket.id
  const supportWhatsappHref = whatsappDigits
    ? `https://api.whatsapp.com/send?phone=${whatsappDigits}&text=${encodeURIComponent(
        `Hola, les contacto desde la pagina de tracking de ReparaHub en relacion al folio ${folioForMessage}. Tengo dudas sobre el avance de mi equipo y agradeceria su apoyo.`,
      )}`
    : undefined
  const tiendaHref =
    payloadTiendaDisponible(tallerContact) ? `/t/${tallerContact?.slug}` : null

  const currentStepIndex = Math.max(0, TIMELINE_STEPS.findIndex(s => s.key === status))

  return (
    <>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">

        <header className="px-4 pt-8 pb-4">
          <div className="max-w-4xl mx-auto flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                SEGUIMIENTO DE EQUIPO
              </h1>
              <p className="mt-1 text-xs text-slate-500 uppercase tracking-[0.25em]">
                REPARAHUB - SEGUIMIENTO EN TIEMPO REAL
              </p>
            </div>

            {/* Taller badge */}
            {tallerName && (
              <a
                href={tiendaHref || "#"}
                className={`flex-shrink-0 flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                  tiendaHref
                    ? "bg-white border-blue-200 hover:border-blue-500 hover:bg-white/95"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center overflow-hidden">
                  {tallerLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tallerLogo} alt={tallerName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Store className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 max-w-[170px] truncate">
                    {tallerName}
                  </span>
                  <span className="block text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    {tiendaHref ? "Visitar tienda" : "Taller verificado"}
                  </span>
                </div>
              </a>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 pb-12">
          <div className="max-w-4xl mx-auto space-y-6">

            <div className="bg-gradient-to-br from-white to-blue-50 border border-slate-200 rounded-3xl px-6 py-5 flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-600/30 flex items-center justify-center">
                <DeviceIcon className="w-7 h-7 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-blue-400 uppercase tracking-[0.25em] font-semibold">
                  {folio}
                </p>
                <h2 className="mt-0.5 text-2xl md:text-3xl font-bold tracking-tight truncate">
                  {brand} {model}
                </h2>
                {serie && (
                  <p className="mt-1 text-xs text-slate-500 font-mono">
                    IMEI / SERIE: {serie}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white/95 border border-slate-200 rounded-3xl px-6 py-6">
              <p className="text-xs text-blue-400 uppercase tracking-[0.25em] font-semibold mb-5">
                HISTORIAL DE PROGRESO
              </p>

              <div className="space-y-5">
                {TIMELINE_STEPS.map((step, index) => {
                  const isActive    = index === currentStepIndex
                  const isCompleted = index < currentStepIndex
                  const isPending   = index > currentStepIndex
                  const Icon = STEP_ICONS[index]

                  return (
                    <div key={step.key} className="flex items-start gap-4 relative">
                      {/* Conector vertical */}
                      {index < TIMELINE_STEPS.length - 1 && (
                        <div
                          className={`absolute left-5 top-10 w-px h-10 transition-colors ${
                            isCompleted ? "bg-blue-600" : "bg-slate-100"
                          }`}
                        />
                      )}

                      {/* Icono con ping en activo */}
                      <div className="relative flex-shrink-0 w-10 h-10">
                        {isActive && (
                          <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
                        )}
                        <div
                          className={`relative w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
                            isActive
                              ? "bg-blue-600/20 border-blue-500"
                              : isCompleted
                              ? "bg-blue-600/10 border-blue-700"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              isCompleted
                                ? "text-blue-500"
                                : isActive
                                ? "text-blue-400"
                                : "text-slate-700"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Texto */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={`text-sm font-semibold tracking-wide ${
                              isActive
                                ? "text-blue-400"
                                : isCompleted
                                ? "text-slate-600"
                                : "text-slate-700"
                            }`}
                          >
                            {step.label}
                          </p>
                          {isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-600 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                              Estado actual
                            </span>
                          )}
                          {isPending && (
                            <span className="text-[10px] text-slate-700 uppercase tracking-wider">
                              Proximamente
                            </span>
                          )}
                        </div>
                        <p className={`mt-0.5 text-xs ${isActive || isCompleted ? "text-slate-500" : "text-slate-700"}`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white/95 border border-slate-200 rounded-3xl px-6 py-5 space-y-3">
              <p className="text-xs text-blue-400 uppercase tracking-[0.25em] font-semibold">
                EVIDENCIA DE RECEPCION
              </p>
              {photoUrls.length > 0 ? (
                <>
                  <RepairPhotoGallery
                    title="Fotos del dispositivo al momento de recibirlo."
                    photos={photoUrls.map((url, index) => ({
                      id: `${ticket.id}-track-photo-${index}`,
                      url,
                      alt: `Foto ${index + 1}`,
                    }))}
                  />
                </>
              ) : (
                <p className="text-sm text-slate-600 italic">Sin evidencia fotografica.</p>
              )}
            </div>

            <div className="bg-white/95 border border-slate-200 rounded-3xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-[0.25em] font-semibold mb-1.5">
                  FALLA REPORTADA
                </p>
                <p className="inline-flex px-3 py-1.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-900 border border-slate-200">
                  {falla}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-slate-500 uppercase tracking-[0.25em] font-semibold mb-1">
                  PRESUPUESTO
                </p>
                <p className="text-2xl md:text-3xl font-extrabold text-blue-400 tabular-nums">
                  {formatCurrency(presupuesto)}
                </p>
              </div>
            </div>

            {supportWhatsappHref && (
              <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-blue-50 to-blue-50 px-6 py-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                      Contacto directo
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Si aun tienes dudas sobre este seguimiento, puedes contactar directamente al taller.
                    </p>
                  </div>
                  <a
                    href={supportWhatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-emerald-400"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Contactar al taller
                  </a>
                </div>
              </div>
            )}

            <footer className="rounded-3xl border border-blue-200 bg-blue-50 px-6 py-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">
                    Impulsado por ReparaHub
                  </p>
                  <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                    Un seguimiento claro tambien puede ser una gran primera impresion.
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    ReparaHub ayuda a talleres y tiendas a organizar reparaciones, ventas, tickets digitales y seguimiento profesional para sus clientes.
                  </p>
                </div>
                <a
                  href="https://reparahub.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-500 px-5 text-sm font-black uppercase tracking-wide text-white transition hover:bg-blue-400"
                >
                  Conocer ReparaHub
                </a>
              </div>
            </footer>

          </div>
        </main>
      </div>
    </>
  )
}

function payloadTiendaDisponible(
  tallerContact: {
    slug?: string | null
    tiendaActiva?: boolean
  } | null,
) {
  return Boolean(tallerContact?.tiendaActiva && tallerContact?.slug)
}

