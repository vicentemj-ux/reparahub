"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  ClipboardList,
  CreditCard,
  MessageCircle,
  Package,
  PenLine,
  Printer,
  Search,
  Stethoscope,
  WifiOff,
  HelpCircle,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const TOPICS = [
  {
    id: "recepcion",
    title: "Reparaciones",
    description: "Nuevo ticket, estados, abonos, tracking y garantia.",
    icon: ClipboardList,
    keywords: "recepcion nuevo ticket cliente equipo falla revision patron seguridad pin tracking garantia",
  },
  {
    id: "ventas-caja",
    title: "Ventas y caja",
    description: "POS, apartados, arqueo, corte, gastos y anulaciones.",
    icon: CreditCard,
    keywords: "ventas pos caja corte arqueo apartado abono gasto anulacion efectivo tarjeta transferencia",
  },
  {
    id: "inventario",
    title: "Inventario",
    description: "Productos, categorias, fotos, stock y Mi Tienda.",
    icon: Package,
    keywords: "inventario productos categorias stock fotos tienda sku codigo barras",
  },
  {
    id: "whatsapp-tracking",
    title: "WhatsApp y tracking",
    description: "Mensajes al cliente, links publicos y contacto directo.",
    icon: MessageCircle,
    keywords: "whatsapp tracking cliente firma organizado reparahub link folio",
  },
  {
    id: "impresion",
    title: "Impresion",
    description: "Tickets, etiquetas, QR e impresion directa local.",
    icon: Printer,
    keywords: "impresion ticket etiqueta qr thermal daemon 2x1 impresora",
  },
  {
    id: "offline",
    title: "Modo offline",
    description: "Emergencia, cola local y sincronizacion.",
    icon: WifiOff,
    keywords: "indexeddb cola sincronizar nube indicador verde rojo emergencia red",
  },
  {
    id: "diagnostico-pro",
    title: "Diagnostico PRO",
    description: "Health check y pruebas por tipo de equipo.",
    icon: Stethoscope,
    keywords: "funciona falla sin probar smartphone laptop health checklist pro",
  },
  {
    id: "firma",
    title: "Firma digital",
    description: "QR de ingreso y firma en el dispositivo del cliente.",
    icon: PenLine,
    keywords: "qr firma preventa celular enlace token",
  },
  {
    id: "faq",
    title: "FAQ",
    description: "Respuestas rapidas a dudas habituales.",
    icon: HelpCircle,
    keywords: "boton deshabilitado crear ticket express diagnostico tutorial",
  },
] as const

function matchesQuery(text: string, q: string) {
  if (!q.trim()) return true
  const n = q.trim().toLowerCase()
  return text.toLowerCase().includes(n)
}

export default function AyudaPage() {
  const [query, setQuery] = useState("")

  const visibleTopics = useMemo(() => {
    return TOPICS.filter(
      (t) =>
        matchesQuery(t.title + " " + t.description + " " + t.keywords, query) ||
        matchesQuery(t.id, query),
    )
  }, [query])

  return (
    <div className="min-h-full bg-white font-sans">
      <div className="border-b border-slate-200 bg-gradient-to-b from-blue-50/60 to-white shadow-sm">
        <div className="w-full px-4 py-12 sm:px-6 lg:px-8 lg:py-16 xl:px-10 2xl:px-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
            Manual de operaciones
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            Ayuda rapida para operar mejor
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            Guias cortas para mostrador: reparaciones, ventas, caja, inventario, WhatsApp, tracking e impresion.
          </p>
          <div className="relative mt-8 max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Buscar tema..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 border-slate-200 bg-white pl-10 shadow-sm placeholder:text-slate-400 focus-visible:ring-blue-500/30"
              aria-label="Buscar en la ayuda"
            />
          </div>
        </div>
      </div>

      <div className="w-full px-4 py-10 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTopics.map((topic) => {
            const Icon = topic.icon
            return (
              <Link key={topic.id} href={`#${topic.id}`} scroll className="group block">
                <Card className="h-full border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
                  <CardHeader className="space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 transition group-hover:bg-blue-100/80">
                      <Icon className="h-6 w-6 opacity-90" strokeWidth={1.8} aria-hidden />
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-950">{topic.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-slate-600">
                      {topic.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>

        {visibleTopics.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-500">No hay temas que coincidan con tu busqueda.</p>
        ) : null}

        <div className="mt-16 space-y-12 scroll-mt-24">
          <ManualSection id="recepcion" title="Reparaciones" visible={matchesQuery("recepcion reparaciones " + TOPICS[0].keywords, query)}>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
              <li>Usa <strong className="font-semibold text-slate-900">Nueva Reparacion</strong> para crear folio, ticket, tracking y mensaje inicial al cliente.</li>
              <li>El estado del folio debe reflejar el trabajo real: Recibido, Diagnostico, Pendiente, En Reparacion, Listo y Entregado.</li>
              <li>Cuando el cliente abona o liquida, registra el cobro desde el folio para que caja y WhatsApp queden alineados.</li>
            </ul>
          </ManualSection>

          <ManualSection id="ventas-caja" title="Ventas, apartados y caja" visible={matchesQuery("ventas caja " + TOPICS[1].keywords, query)}>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
              <li>Abre caja antes de cobrar ventas, abonos o apartados. El resumen de turno muestra efectivo, tarjeta y transferencia.</li>
              <li>Usa Apartados para reservar stock con anticipo y abonos posteriores. No uses Producto rapido para separar equipos.</li>
              <li>Antes del corte, revisa el resumen de turno y registra gastos o devoluciones para que el efectivo cuadre.</li>
            </ul>
          </ManualSection>

          <ManualSection id="inventario" title="Inventario y categorias" visible={matchesQuery("inventario categorias " + TOPICS[2].keywords, query)}>
            <p className="text-sm leading-relaxed text-slate-700">
              Mantén categorias limpias por tenant. Equipos conserva captura especial para IMEI o serie. Las categorias activas alimentan POS, Kiosko y Mi Tienda, asi que evita duplicados como Cable, cables y CABLE.
            </p>
          </ManualSection>

          <ManualSection id="whatsapp-tracking" title="WhatsApp y tracking" visible={matchesQuery("whatsapp tracking " + TOPICS[3].keywords, query)}>
            <p className="text-sm leading-relaxed text-slate-700">
              Todo mensaje dirigido al cliente debe terminar con <strong className="font-semibold text-slate-900">_Organizado por ReparaHub.net_</strong>. El link de tracking permite consultar el avance con verificacion por telefono.
            </p>
          </ManualSection>

          <ManualSection id="impresion" title="Impresion, etiquetas y QR" visible={matchesQuery("impresion qr etiqueta " + TOPICS[4].keywords, query)}>
            <p className="text-sm leading-relaxed text-slate-700">
              ReparaHub puede imprimir tickets web, etiquetas 2x1 y, cuando el daemon local este activo, impresion directa sin dialogo del navegador. Si el QR no abre tracking, revisa Configuracion e imprime una prueba.
            </p>
          </ManualSection>

          <ManualSection id="offline" title="Modo de emergencia offline" visible={matchesQuery("offline modo emergencia cola " + TOPICS[5].keywords, query)}>
            <p className="text-sm leading-relaxed text-slate-700">
              Si no hay red al crear un ticket, el sistema puede guardar borradores localmente y sincronizarlos cuando vuelva la conexion. El navegador conserva esta cola en IndexedDB cuando esta disponible.
            </p>
          </ManualSection>

          <ManualSection id="diagnostico-pro" title="Health Check PRO" visible={matchesQuery("diagnostico health pro " + TOPICS[6].keywords, query)}>
            <p className="text-sm leading-relaxed text-slate-700">
              El diagnostico PRO documenta pruebas por tipo de equipo con estados claros: funciona, falla o sin probar. Es evidencia util para explicar avances y proteger al taller ante reclamos.
            </p>
          </ManualSection>

          <ManualSection id="firma" title="Firma digital de ingreso" visible={matchesQuery("firma digital qr " + TOPICS[7].keywords, query)}>
            <p className="text-sm leading-relaxed text-slate-700">
              La firma digital permite que el cliente acepte terminos desde su propio celular por QR, sin compartir la sesion del mostrador.
            </p>
          </ManualSection>

          <section id="faq" className={cn("scroll-mt-24", !matchesQuery("faq preguntas " + TOPICS[8].keywords, query) && query.trim() ? "hidden" : "")}> 
            <h2 className="text-xl font-bold tracking-tight text-slate-950">Preguntas frecuentes</h2>
            <Card className="mt-6 border-slate-200 bg-white shadow-sm">
              <CardContent className="pt-6">
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="faq-1" className="border-slate-200">
                    <AccordionTrigger className="text-left text-sm font-medium text-slate-900 hover:no-underline">Por que no puedo crear el ticket?</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-slate-700">Revisa cliente, telefono, tipo de equipo, marca, falla y presupuesto. Si el presupuesto aun no esta listo, marca Presupuesto pendiente.</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="faq-2" className="border-slate-200">
                    <AccordionTrigger className="text-left text-sm font-medium text-slate-900 hover:no-underline">Que reviso antes de cerrar caja?</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-slate-700">Confirma ventas, abonos de reparacion, apartados, gastos y devoluciones. El efectivo fisico debe coincidir con el sistema espera.</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="faq-3" className="border-slate-200">
                    <AccordionTrigger className="text-left text-sm font-medium text-slate-900 hover:no-underline">Puedo volver a ver el tutorial?</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-slate-700">Si. Abre Ayuda rapida desde el menu lateral y usa Volver a ver tutorial.</AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}

function ManualSection({
  id,
  title,
  children,
  visible,
}: {
  id: string
  title: string
  children: ReactNode
  visible: boolean
}) {
  if (!visible) return null
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}
