"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, CreditCard, HelpCircle, LifeBuoy, MessageCircle, Package, PlayCircle, SearchCheck, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const HELP_TOPICS = [
  {
    title: "Reparaciones",
    description: "Crear folios, cambiar estado, cobrar abonos y enviar tracking.",
    icon: Wrench,
    href: "/dashboard/ayuda#recepcion",
  },
  {
    title: "Ventas y caja",
    description: "POS, apartados, resumen de turno, corte, anulaciones y gastos.",
    icon: CreditCard,
    href: "/dashboard/ayuda#ventas-caja",
  },
  {
    title: "Inventario",
    description: "Productos, categorias, fotos, stock minimo y Mi Tienda.",
    icon: Package,
    href: "/dashboard/ayuda#inventario",
  },
  {
    title: "WhatsApp y tracking",
    description: "Mensajes al cliente, firma de ReparaHub y seguimiento publico.",
    icon: MessageCircle,
    href: "/dashboard/ayuda#whatsapp-tracking",
  },
  {
    title: "Impresion",
    description: "Tickets, etiquetas 2x1, QR y daemon de impresion directa.",
    icon: SearchCheck,
    href: "/dashboard/ayuda#impresion",
  },
] as const

export function HelpQuickSheet({
  className,
  onStartTour,
  variant = "icon",
}: {
  className?: string
  onStartTour?: () => void
  variant?: "icon" | "row"
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size={variant === "icon" ? "icon" : "default"}
            className={cn(
              variant === "icon"
                ? "h-10 w-10 shrink-0 rounded-full border-0 bg-blue-50 text-blue-600 shadow-none hover:bg-blue-600 hover:text-blue-700"
                : "h-10 w-full justify-start gap-2 rounded-xl bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700",
              "transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              className,
            )}
            onClick={() => setOpen(true)}
            aria-label="Centro de Ayuda y Soporte"
          >
            <HelpCircle className="h-5 w-5" aria-hidden />
            {variant === "row" ? <span>Ayuda rapida</span> : null}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6} className="max-w-[16rem]">
          Centro de Ayuda y Soporte
        </TooltipContent>
      </Tooltip>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full border-slate-200 bg-white sm:max-w-md"
          overlayClassName="z-[80]"
        >
          <SheetHeader className="border-b border-slate-200 pb-4 text-left">
            <SheetTitle className="text-lg font-semibold text-slate-900">Ayuda rapida</SheetTitle>
            <SheetDescription className="text-sm text-slate-600">
              Guias cortas para operar mostrador, caja, tickets, WhatsApp e impresoras.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-3 py-4">
            {onStartTour ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onStartTour()
                }}
                className="flex w-full items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-100/70"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/25">
                  <PlayCircle className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="font-bold text-slate-950">Volver a ver tutorial</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    Recorrido de 8 pasos por los modulos esenciales.
                  </p>
                </div>
              </button>
            ) : null}

            <Link
              href="/dashboard/ayuda"
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300/80 hover:bg-amber-50/40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100/80 text-amber-800">
                <BookOpen className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Centro de Ayuda</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Manual de recepcion, modo offline, diagnostico PRO, firma digital y preguntas frecuentes.
                </p>
              </div>
            </Link>

            <div className="grid gap-2">
              {HELP_TOPICS.map((topic) => {
                const Icon = topic.icon
                return (
                  <Link
                    key={topic.title}
                    href={topic.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:bg-slate-50/80"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{topic.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{topic.description}</p>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
              <div className="flex gap-2 text-slate-600">
                <LifeBuoy className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                <p className="text-xs leading-relaxed">
                  Sin conexion? Los tickets nuevos pueden guardarse en cola y sincronizarse al volver la red. Mira el
                  indicador en la barra superior.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto border-t border-slate-200 pt-4">
            <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
              <Link href="/dashboard/ayuda" onClick={() => setOpen(false)}>
                Abrir Centro de Ayuda completo
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
