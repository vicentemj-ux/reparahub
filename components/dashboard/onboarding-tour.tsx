"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BarChart3,
  CheckCircle2,
  CreditCard,
  HelpCircle,
  Package,
  Settings,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { updateOnboardingTourState } from "@/lib/actions/onboarding-tour-prisma"

const TOUR_STEPS = [
  {
    id: "vista-general",
    title: "Vista General",
    description: "Tu resumen diario: tickets activos, listos, urgentes e ingresos del mes.",
    href: "/dashboard",
    cta: "Ver Vista General",
    icon: BarChart3,
  },
  {
    id: "reparaciones",
    title: "Reparaciones",
    description: "Crea folios, registra fotos, seguimiento, abonos, tecnico y mensajes por WhatsApp.",
    href: "/dashboard/reparaciones",
    cta: "Ir a Reparaciones",
    icon: Wrench,
  },
  {
    id: "ventas-pos",
    title: "Ventas POS",
    description: "Cobra productos, servicios y apartados. Todo queda ligado a caja y tickets digitales.",
    href: "/dashboard/ventas",
    cta: "Abrir POS",
    icon: CreditCard,
  },
  {
    id: "inventario",
    title: "Inventario",
    description: "Controla stock, categorias, fotos, precios, equipos y productos visibles en Mi Tienda.",
    href: "/dashboard/inventario",
    cta: "Ver Inventario",
    icon: Package,
  },
  {
    id: "clientes",
    title: "Clientes",
    description: "El telefono es la llave: historial de reparaciones, ventas, visitas y cotizaciones.",
    href: "/dashboard/clientes",
    cta: "Abrir Clientes",
    icon: Users,
  },
  {
    id: "caja",
    title: "Caja e Historial",
    description: "Abre turno, revisa tu resumen, registra gastos, cortes, anulaciones y cobros.",
    href: "/dashboard/historial-ventas",
    cta: "Ver Historial",
    icon: WalletCards,
  },
  {
    id: "configuracion",
    title: "Configuracion",
    description: "Ajusta datos del taller, zona horaria, fondo de caja, WhatsApp, impresoras y funciones Pro.",
    href: "/dashboard/configuracion",
    cta: "Configurar Taller",
    icon: Settings,
  },
  {
    id: "ayuda",
    title: "Ayuda rapida",
    description: "Consulta guias cortas para reparaciones, ventas, caja, impresoras, WhatsApp y tracking.",
    href: "/dashboard/ayuda",
    cta: "Abrir Ayuda",
    icon: HelpCircle,
  },
] as const

export function OnboardingTour({
  autoStart = false,
  openSignal = 0,
}: {
  autoStart?: boolean
  openSignal?: number
}) {
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (autoStart) setOpen(true)
  }, [autoStart])

  useEffect(() => {
    if (openSignal > 0) {
      setStepIndex(0)
      setOpen(true)
    }
  }, [openSignal])

  const step = TOUR_STEPS[stepIndex]
  const Icon = step.icon
  const isLast = stepIndex === TOUR_STEPS.length - 1

  const progressLabel = useMemo(() => `${stepIndex + 1} / ${TOUR_STEPS.length}`, [stepIndex])

  async function closeAndSave(completed: boolean) {
    setSaving(true)
    await updateOnboardingTourState({ completed, lastStep: step.id })
    setSaving(false)
    setOpen(false)
  }

  async function nextStep() {
    await updateOnboardingTourState({ lastStep: step.id })
    if (isLast) {
      await closeAndSave(true)
      return
    }
    setStepIndex((current) => Math.min(current + 1, TOUR_STEPS.length - 1))
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!saving) setOpen(value) }}>
      <DialogContent className="max-w-[calc(100%-2rem)] overflow-hidden rounded-3xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-xl" overlayClassName="bg-slate-200/75 backdrop-blur-[2px]">
        <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
          <div className="relative overflow-hidden bg-blue-50 p-5 text-slate-900 sm:p-6">
            <div className="absolute -left-12 -top-16 h-36 w-36 rounded-full bg-blue-500/30 blur-2xl" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-8">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-blue-200">Tutorial</p>
                <p className="mt-2 text-2xl font-black leading-tight tracking-tight">ReparaHub en 8 pasos</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Un recorrido corto para ubicar lo esencial sin interrumpir tu operacion diaria.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-black tracking-tight text-slate-950">{step.title}</DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </DialogDescription>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                {progressLabel}
              </span>
            </div>

            <div className="mt-6 flex items-center gap-1.5" aria-label={`Paso ${stepIndex + 1} de ${TOUR_STEPS.length}`}>
              {TOUR_STEPS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    index === stepIndex ? "w-8 bg-blue-600" : "w-2 bg-slate-200 hover:bg-slate-300",
                  )}
                  aria-label={`Ir al paso ${index + 1}`}
                />
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-sm leading-relaxed text-slate-700">
                  Tip: puedes volver a abrir este recorrido desde <span className="font-bold text-slate-950">Ayuda rapida</span> cuando estes capacitando a alguien nuevo.
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                className="rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                onClick={() => closeAndSave(true)}
              >
                Saltar tutorial
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving || stepIndex === 0}
                  className="rounded-2xl"
                  onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
                >
                  Atras
                </Button>
                <Button asChild variant="outline" className="rounded-2xl border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Link href={step.href} onClick={() => setOpen(false)}>{step.cta}</Link>
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={nextStep}
                  className="btn-glow rounded-2xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700"
                >
                  {isLast ? "Empezar" : "Siguiente"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
