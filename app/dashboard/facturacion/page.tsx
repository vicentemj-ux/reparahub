"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getDashboardSubscriptionBannerContext, getTallerSettings } from "@/lib/actions/settings-prisma"
import { buildWhatsAppSendUrl, REPARAHUB_WHATSAPP_SUPPORT_DIGITS } from "@/lib/whatsapp-send-url"
import { PLAN_CORE, PLAN_PRO } from "@/lib/plan-catalog"
import { CalendarCheck2, Check, RefreshCw, Sparkles } from "lucide-react"

const PLAN_BASE = {
  id: PLAN_CORE.id,
  name: PLAN_CORE.name,
  tagline: PLAN_CORE.tagline,
  price: PLAN_CORE.monthlyPriceMx,
  bullets: PLAN_CORE.bullets,
} as const

const PLAN_ORO = {
  id: PLAN_PRO.id,
  name: PLAN_PRO.name,
  tagline: PLAN_PRO.tagline,
  price: PLAN_PRO.monthlyPriceMx,
  bullets: PLAN_PRO.bullets,
} as const

function commercialPlanBadgeLabel(precioMensual: number | null, isPro: boolean): string {
  if (precioMensual === 189) return "PLAN CORE"
  if (precioMensual === 299) return "PLAN PRO"
  if (isPro) return "PLAN PRO"
  return "PLAN ACTIVO"
}

/** Ancho de referencia para la barra bajo el header (dias restantes / ciclo). */
const SUBSCRIPTION_CYCLE_DAYS = 30

const FEATURE_PARAM_LABELS: Record<string, string> = {
  apartados: "Apartados",
  apartado: "Apartados",
  cotizaciones: "Cotizaciones",
  cotizacion: "Cotizaciones",
  firma: "Firma digital",
  "firma-digital": "Firma digital",
  fotos: "Evidencia fotografica",
  evidencia: "Evidencia fotografica",
  health: "Health Check PRO",
  "health-check": "Health Check PRO",
  checklist: "Health Check PRO",
}

function buildWhatsAppContratarUrl(tallerNombre: string, planNombre: string) {
  return buildWhatsAppSendUrl(
    REPARAHUB_WHATSAPP_SUPPORT_DIGITS,
    `Hola, escribo desde ReparaHub. Soy del taller *${tallerNombre}*. Me interesa contratar: *${planNombre}*. ¿Me pueden orientar con el siguiente paso?`,
  )
}

function resolveFeatureLabel(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null
  const key = raw.trim().toLowerCase()
  return FEATURE_PARAM_LABELS[key] ?? raw.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function FacturacionContent() {
  const searchParams = useSearchParams()
  const featureKey = searchParams.get("feature")
  const featureLabel = useMemo(() => resolveFeatureLabel(featureKey), [featureKey])

  const [tallerNombre, setTallerNombre] = useState("Mi taller")
  const [loading, setLoading] = useState(true)
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof getDashboardSubscriptionBannerContext>> | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [settingsRes, banner] = await Promise.all([
          getTallerSettings(),
          getDashboardSubscriptionBannerContext(),
        ])
        if (cancelled) return
        if (settingsRes.settings?.nombre_taller?.trim()) {
          setTallerNombre(settingsRes.settings.nombre_taller.trim())
        }
        setCtx(banner)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const statusLine = useMemo(() => {
    if (!ctx) return { big: "-" as string, caption: "", showNumber: false }
    if (ctx.planTipo === "suspendido") {
      return {
        big: "-",
        caption: "Contacta soporte por WhatsApp.",
        showNumber: false,
      }
    }
    if (ctx.planTipo === "prueba") {
      return {
        big: String(ctx.diasRestantes),
        caption: "dias restantes",
        showNumber: true,
      }
    }
    if (ctx.planTipo === "activo") {
      if (!ctx.tieneVencimiento) {
        return {
          big: "-",
          caption: "Sin vencimiento programado",
          showNumber: false,
        }
      }
      return {
        big: String(ctx.diasRestantes),
        caption: "dias restantes",
        showNumber: true,
      }
    }
    return { big: "-", caption: "", showNumber: false }
  }, [ctx])

  /** Dias para barra de progreso (ciclo 30 dias); null si no aplica. */
  const daysForProgress = useMemo(() => {
    if (!ctx) return null
    if (ctx.planTipo === "prueba") return ctx.diasRestantes
    if (ctx.planTipo === "activo" && ctx.tieneVencimiento) return ctx.diasRestantes
    return null
  }, [ctx])

  const progressPercent =
    daysForProgress == null ? null : Math.min(100, (daysForProgress / SUBSCRIPTION_CYCLE_DAYS) * 100)

  const progressUrgent = daysForProgress != null && daysForProgress <= 5

  const headerBadge = useMemo(() => {
    if (!ctx) return null
    if (ctx.planTipo === "suspendido") {
      return (
        <Badge className="shrink-0 border border-red-200 bg-red-50 text-[10px] font-bold uppercase tracking-widest text-red-800">
          CUENTA SUSPENDIDA
        </Badge>
      )
    }
    if (ctx.planTipo === "prueba") {
      return (
        <Badge className="shrink-0 border border-amber-200 bg-amber-50 text-[10px] font-bold uppercase tracking-widest text-amber-900">
          PERIODO DE PRUEBA (PRO)
        </Badge>
      )
    }
    if (ctx.planTipo === "activo") {
      return (
        <Badge className="shrink-0 border border-emerald-200 bg-emerald-50 text-[10px] font-bold uppercase tracking-widest text-emerald-800">
          {commercialPlanBadgeLabel(ctx.precioPlanMensual, ctx.isPro)}
        </Badge>
      )
    }
    return null
  }, [ctx])

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="w-full px-3 pb-3 pt-0 sm:px-4 sm:pb-4 sm:pt-1 lg:px-8 xl:px-10 2xl:px-12">
        <Card className="mb-2 rounded-3xl border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-4 p-4 sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 sm:h-12 sm:w-12">
                  <CalendarCheck2 className="h-5 w-5 text-blue-600 sm:h-6 sm:w-6" aria-hidden />
                </div>
                <h1 className="text-2xl font-black italic leading-none tracking-tight text-slate-900 sm:text-3xl lg:text-[2rem]">
                  MI SUSCRIPCION
                </h1>
              </div>

              <div className="flex min-w-0 flex-wrap items-center justify-end gap-3 sm:gap-4">
                {headerBadge}
                <button
                  type="button"
                  onClick={() => setRefreshKey((k) => k + 1)}
                  disabled={loading}
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-50"
                  aria-label="Actualizar estatus"
                  title="Actualizar estatus"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
                {loading ? (
                  <p className="text-sm text-slate-500">Cargando estatus...</p>
                ) : statusLine.showNumber ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tabular-nums leading-none tracking-tighter text-slate-900 sm:text-5xl">
                      {statusLine.big}
                    </span>
                    <span className="max-w-[7.5rem] text-left text-xs font-medium leading-tight text-slate-500 sm:max-w-none sm:text-sm">
                      {statusLine.caption}
                    </span>
                  </div>
                ) : statusLine.caption ? (
                  <p className="max-w-xs text-right text-xs font-medium leading-snug text-slate-500 sm:text-sm">
                    {statusLine.caption}
                  </p>
                ) : null}
              </div>
            </div>

            {progressPercent != null ? (
              <div className="space-y-1.5">
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPercent)}
                  aria-label={`Tiempo restante respecto a un ciclo de ${SUBSCRIPTION_CYCLE_DAYS} dias`}
                >
                  <div
                    className={
                      progressUrgent
                        ? "h-full rounded-full bg-amber-500 transition-[width] duration-300 ease-out"
                        : "h-full rounded-full bg-blue-600 transition-[width] duration-300 ease-out"
                    }
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {featureLabel ? (
          <div
            className="mb-2 rounded-md border border-blue-200/80 bg-white px-2.5 py-1.5 shadow-sm sm:px-3 sm:py-2"
            role="status"
          >
            <p className="text-[11px] font-medium text-slate-800 sm:text-sm">
              <span className="mr-1" aria-hidden>
                💡
              </span>
              Para usar <span className="font-semibold text-slate-900">{featureLabel}</span>, actualiza a{" "}
              <span className="font-semibold text-blue-700">PLAN PRO</span>.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-3">
          {/* Plan Base - fondo solido */}
          <Card className="gap-0 overflow-hidden border border-slate-300/90 bg-slate-200/90 py-0 shadow-md">
            <CardHeader className="space-y-1 px-3 pb-1.5 pt-2.5 sm:px-4 sm:pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="border-blue-600/40 bg-blue-600 text-[9px] font-bold uppercase tracking-wider text-white"
                >
                  Operacion diaria
                </Badge>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Gestion completa
                </span>
              </div>
              <CardTitle className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                {PLAN_BASE.name}
              </CardTitle>
               <p className="text-[11px] leading-snug text-slate-700 sm:text-xs">
                 Gestion completa del taller: reparaciones, ventas, inventario y equipo.
               </p>
              <p className="pt-0.5 text-4xl font-black tabular-nums tracking-tight text-slate-900 sm:text-5xl">
                ${PLAN_BASE.price}
                <span className="text-base font-bold text-slate-600 sm:text-lg"> MXN</span>
                <span className="block text-xs font-semibold text-slate-600 sm:inline sm:ml-1 sm:text-sm">
                  / mes
                </span>
              </p>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3 pt-0 sm:px-4 sm:pb-3.5">
              <ul className="space-y-1.5 border-t border-slate-300/80 pt-2">
                {PLAN_BASE.bullets.map((line) => (
                  <li key={line} className="flex gap-2 text-xs font-medium text-slate-800 sm:text-sm">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-700 sm:h-4 sm:w-4" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="h-9 w-full rounded-lg bg-blue-600 text-xs font-bold text-white shadow-md hover:bg-blue-700 sm:h-10 sm:text-sm"
              >
                <a
                  href={buildWhatsAppContratarUrl(tallerNombre, PLAN_BASE.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contratar con Asesor
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* PLAN PRO - bloque dominante */}
          <Card className="relative gap-0 overflow-hidden border-2 border-amber-400/70 bg-gradient-to-b from-amber-200 via-amber-100 to-amber-50 py-0 shadow-lg ring-2 ring-amber-300/40">
            <div className="absolute right-2 top-2 sm:right-3 sm:top-2.5">
              <span className="inline-flex items-center gap-1 rounded-md border-2 border-amber-800/30 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-700 shadow-md">
                <Sparkles className="h-3 w-3 text-amber-200" aria-hidden />
                 ESCALA TU NEGOCIO
               </span>
            </div>
            <CardHeader className="space-y-1 px-3 pb-1.5 pt-7 sm:px-4 sm:pt-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-950/90">
                Automatiza tu operacion
               </p>
              <CardTitle className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                {PLAN_ORO.name}
              </CardTitle>
               <p className="text-[11px] font-medium leading-snug text-slate-800 sm:text-xs">
                 Todo lo de PLAN CORE mas herramientas avanzadas, incluido POS Kiosko PRO para tablet fija
                 con cobro rapido y control operativo por PIN gerente.
               </p>
              <p className="pt-0.5 text-4xl font-black tabular-nums tracking-tight text-amber-950 sm:text-5xl">
                ${PLAN_ORO.price}
                <span className="text-base font-bold text-amber-900/90 sm:text-lg"> MXN</span>
                <span className="block text-xs font-bold text-amber-900/90 sm:inline sm:ml-1 sm:text-sm">
                  / mes
                </span>
              </p>
            </CardHeader>
            <CardContent className="space-y-1.5 px-3 pb-2.5 pt-0 sm:px-4 sm:pb-3">
              <ul className="space-y-1.5 border-t border-amber-400/50 pt-1.5">
                {PLAN_ORO.bullets.map((line) => (
                  <li key={line} className="flex gap-2 text-xs font-semibold text-slate-900 sm:text-sm">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-800 sm:h-4 sm:w-4" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="h-9 w-full rounded-lg border-2 border-amber-800/40 bg-amber-50 text-xs font-bold text-amber-700 shadow-md hover:bg-white sm:h-10 sm:text-sm"
              >
                <a
                  href={buildWhatsAppContratarUrl(tallerNombre, PLAN_ORO.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contratar con Asesor
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="mt-2 text-center text-[11px] text-slate-500">
          ¿Dudas sobre tu suscripcion?{" "}
          <Link
            href={buildWhatsAppSendUrl(
              REPARAHUB_WHATSAPP_SUPPORT_DIGITS,
              "Hola, tengo una consulta sobre mi plan en ReparaHub.",
            )}
            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Escribenos por WhatsApp
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

export default function FacturacionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-dashboard-surface px-3 pb-4 pt-0 text-center text-sm text-slate-500 sm:pt-1">
          Cargando...
        </div>
      }
    >
      <FacturacionContent />
    </Suspense>
  )
}
