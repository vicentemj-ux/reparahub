import type { Metadata } from "next"
import Image from "next/image"
import type { ElementType } from "react"
import {
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  CalendarCheck2,
  CheckCircle2,
  FileText,
  Layers3,
  MessageCircle,
  MonitorSmartphone,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Wrench,
} from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { PricingSection } from "@/components/pricing-section"
import { FaqSection } from "@/components/marketing/faq-section"
import { TrackedLink } from "@/components/marketing/tracked-link"
import { buildHomeStructuredData, serializeStructuredData } from "@/lib/marketing-schema"
import { buildWhatsAppSendUrl, REPARAHUB_WHATSAPP_SUPPORT_DIGITS } from "@/lib/whatsapp-send-url"

const WHATSAPP_URL = buildWhatsAppSendUrl(
  REPARAHUB_WHATSAPP_SUPPORT_DIGITS,
  "Hola, me interesa ReparaHub y tengo algunas preguntas",
)

export const metadata: Metadata = {
  title: "ReparaHub | Software para talleres de reparación",
  description:
    "Controla reparaciones, punto de venta, inventario, cotizaciones y caja en una sola plataforma para talleres.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "ReparaHub | Software para talleres de reparación",
    description:
      "Reparaciones, POS, inventario, cotizaciones y caja conectados para que tu taller trabaje con orden.",
    url: "/",
    siteName: "ReparaHub",
    locale: "es_MX",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ReparaHub, software para talleres de reparación" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ReparaHub | Software para talleres de reparación",
    description: "Controla reparaciones, punto de venta, inventario, cotizaciones y caja en una sola plataforma.",
    images: ["/opengraph-image"],
  },
  keywords: [
    "software para talleres de reparación",
    "sistema para reparación de celulares",
    "punto de venta para talleres",
    "control de reparaciones",
    "inventario para taller",
    "cotizaciones para talleres",
    "corte de caja taller",
  ],
}

const benefits = [
  {
    icon: Layers3,
    title: "Todo tu taller conectado",
    text: "Reparaciones, ventas, inventario, caja y cotizaciones en un solo sistema.",
  },
  {
    icon: ShieldCheck,
    title: "Sin tarjeta de crédito",
    text: "Empieza tu prueba gratis y activa tu plan cuando estés listo.",
  },
  {
    icon: MonitorSmartphone,
    title: "Control desde cualquier dispositivo",
    text: "Trabaja desde computadora, tablet o celular en tiempo real.",
  },
  {
    icon: CalendarCheck2,
    title: "Más entregas a tiempo",
    text: "Organiza tu operación, reduce tiempos muertos y mejora la experiencia del cliente.",
  },
]

const workflow = [
  ["Recepción", "Crear ticket", "Cliente", "Equipo"],
  ["Reparación", "Diagnóstico", "Cotización", "Trabajo activo"],
  ["Inventario", "Refacciones utilizadas", "Stock actualizado", "Costos claros"],
  ["Cobro", "Total a cobrar", "Estado liquidado", "Caja al día"],
  ["Entrega", "Equipo entregado", "Cliente satisfecho", "Historial completo"],
]

const modules = [
  {
    icon: Wrench,
    title: "Reparaciones",
    text: "Crea tickets, asigna técnicos, da seguimiento y entrega sin perder el contexto.",
  },
  {
    icon: ShoppingCart,
    title: "Punto de venta",
    text: "Cobra rápido, acepta pagos y controla tu caja desde el mostrador.",
  },
  {
    icon: Boxes,
    title: "Inventario",
    text: "Controla accesorios, refacciones y equipos con stock en tiempo real.",
  },
  {
    icon: FileText,
    title: "Apartados y cotizaciones",
    text: "Aparta equipos, envía cotizaciones y convierte más oportunidades en ventas.",
  },
  {
    icon: ReceiptText,
    title: "Caja",
    text: "Cierra tu día, controla cortes, métodos de pago y flujo de efectivo.",
  },
  {
    icon: BadgeDollarSign,
    title: "Reportes",
    text: "Mide ingresos, tickets, técnicos y productos para tomar mejores decisiones.",
  },
]

const proofPoints = ["Más control", "Menos desorden", "Mejor seguimiento", "Cobros más claros"]
const finalChecklist = ["30 días gratis", "Sin tarjeta de crédito", "Activación inmediata", "Cancela cuando quieras"]

export default function Home() {
  const structuredData = buildHomeStructuredData()

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0B1220]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(structuredData) }} />
      <Header />

      <main id="contenido">
        <section className="relative overflow-hidden border-b border-[#E4E7EC] bg-[radial-gradient(circle_at_18%_12%,#EFF8FF_0,transparent_32%),linear-gradient(135deg,#F5F7FA_0%,#FFFFFF_48%,#EFF8FF_100%)]">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(#98A2B3_1px,transparent_1px)] [background-size:22px_22px]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#B2DDFF] bg-[#EFF8FF] px-3 py-1.5 text-sm font-black text-[#155EEF]">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                30 días gratis · Sin tarjeta
              </div>

              <h1 className="mt-6 max-w-3xl text-balance text-4xl font-black leading-[1.02] tracking-[-0.055em] text-[#0B1220] sm:text-6xl">
                Controla tu taller,{" "}
                <span className="bg-gradient-to-r from-[#155EEF] to-[#06B6D4] bg-clip-text text-transparent">
                  cobra más rápido
                </span>{" "}
                y entrega cada equipo a tiempo
              </h1>

              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[#667085] sm:text-xl">
                ReparaHub conecta reparaciones, punto de venta, inventario, cotizaciones y caja para que tu equipo trabaje con la misma información desde computadora, tablet o celular.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <TrackedLink
                  href="/auth/register"
                  eventName="landing_cta_trial_click"
                  eventProperties={{ location: "hero" }}
                  className="btn-glow inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#155EEF] px-7 font-black text-white shadow-[0_16px_40px_rgba(21,94,239,0.24)] outline-none transition hover:bg-[#004EEB] focus-visible:ring-2 focus-visible:ring-[#155EEF] focus-visible:ring-offset-2"
                >
                  Probar ReparaHub gratis
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </TrackedLink>
                <TrackedLink
                  href="#producto"
                  eventName="landing_demo_click"
                  eventProperties={{ location: "hero" }}
                  className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-[#D0D5DD] bg-white px-7 font-black text-[#0B1220] shadow-sm outline-none transition hover:border-[#B2DDFF] hover:bg-[#EFF8FF] hover:text-[#155EEF] focus-visible:ring-2 focus-visible:ring-[#155EEF] focus-visible:ring-offset-2"
                >
                  Ver demo
                </TrackedLink>
              </div>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#667085]">
                {["Sin tarjeta de crédito", "Activación inmediata", "Cancela cuando quieras"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#12B76A]" aria-hidden />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <HeroProductMockup />
          </div>
        </section>

        <section id="beneficios" className="scroll-mt-20 bg-white py-8">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {benefits.map((benefit) => (
              <BenefitCard key={benefit.title} {...benefit} />
            ))}
          </div>
        </section>

        <WorkflowSection />
        <ModulesSection />

        <section className="bg-white py-18 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[32px] border border-[#E4E7EC] bg-[#F8FAFC] p-6 shadow-[0_24px_70px_rgba(11,18,32,0.08)] sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#155EEF]">Confianza operativa</p>
                  <h2 className="mt-3 text-balance text-3xl font-black tracking-[-0.04em] text-[#0B1220] sm:text-5xl">
                    Diseñado para talleres que necesitan orden, rapidez y control.
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {proofPoints.map((point) => (
                    <div key={point} className="rounded-3xl border border-[#E4E7EC] bg-white p-5">
                      <CheckCircle2 className="h-5 w-5 text-[#12B76A]" aria-hidden />
                      <p className="mt-4 text-xl font-black text-[#0B1220]">{point}</p>
                      <p className="mt-1 text-sm leading-6 text-[#667085]">Información clara para avanzar sin improvisar.</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <PricingSection />
        <FaqSection />

        <section className="bg-[#F5F7FA] py-18 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[36px] bg-[#0B1220] px-6 py-12 text-white shadow-[0_30px_90px_rgba(11,18,32,0.28)] sm:px-10 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:px-14 lg:py-14">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#155EEF]/40 blur-3xl" />
              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#06B6D4]">Listo para operar mejor</p>
                <h2 className="mt-3 max-w-2xl text-balance text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                  Empieza a operar con más orden desde hoy
                </h2>
                <div className="mt-6 flex flex-wrap gap-3">
                  {finalChecklist.map((item) => (
                    <span key={item} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-white">
                      <CheckCircle2 className="h-4 w-4 text-[#12B76A]" aria-hidden />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative mt-8 flex flex-col gap-3 lg:mt-0 lg:min-w-[280px]">
                <TrackedLink
                  href="/auth/register"
                  eventName="landing_cta_trial_click"
                  eventProperties={{ location: "final_cta" }}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-white px-7 font-black text-[#155EEF] outline-none transition hover:bg-[#EFF8FF] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]"
                >
                  Comenzar prueba gratis
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </TrackedLink>
                <p className="text-center text-sm font-semibold text-slate-300">Empieza en menos de 2 minutos.</p>
                <TrackedLink
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  eventName="landing_whatsapp_click"
                  eventProperties={{ location: "final_cta" }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-slate-300 outline-none hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Resolver una duda por WhatsApp
                </TrackedLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function HeroProductMockup() {
  return (
    <div id="producto" className="relative scroll-mt-24">
      <div className="absolute -inset-6 rounded-[42px] bg-[radial-gradient(circle_at_35%_20%,rgba(6,182,212,0.24),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(21,94,239,0.22),transparent_42%)] blur-2xl" />
      <div className="relative rounded-[34px] border border-[#D0D5DD] bg-white/90 p-3 shadow-[0_32px_90px_rgba(11,18,32,0.18)] backdrop-blur">
        <div className="overflow-hidden rounded-[26px] border border-[#E4E7EC] bg-[#F5F7FA]">
          <div className="flex items-center gap-2 border-b border-[#E4E7EC] bg-white px-4 py-3">
            <Image src="/icon.webp" alt="" width={28} height={26} className="h-7 w-7 rounded-xl object-contain" />
            <div>
              <p className="text-sm font-black uppercase italic tracking-[-0.04em] text-[#0B1220]">Vista general</p>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#667085]">Centro de mando operativo</p>
            </div>
            <span className="ml-auto rounded-full border border-[#ABEFC6] bg-[#ECFDF3] px-3 py-1 text-[10px] font-black text-[#027A48]">
              Caja abierta
            </span>
          </div>

          <div className="grid gap-3 p-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 rounded-3xl bg-[#155EEF] p-4 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D1E9FF]">Ingresos del mes</p>
                  <p className="mt-3 text-3xl font-black">$2,100</p>
                  <p className="mt-1 text-xs text-[#D1E9FF]">Ventas brutas registradas</p>
                </div>
                <div className="rounded-3xl border border-[#FECDCA] bg-[#FEF3F2] p-4">
                  <AlertChip value="2" label="Urgentes" color="#F04438" />
                </div>
              </div>
              <div className="rounded-3xl border border-[#E4E7EC] bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B1220]">Actividad reciente</p>
                  <span className="text-xs font-black text-[#155EEF]">Ver todas</span>
                </div>
                {[
                  ["005", "Samsung S21 Plus", "Recibido", "$250"],
                  ["004", "Samsung Galaxy Tab A11", "En reparación", "$400"],
                  ["003", "Apple iPhone 14 Pro Max", "Recibido", "Pendiente"],
                ].map(([folio, equipo, estado, total]) => (
                  <div key={folio} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border-t border-[#E4E7EC] py-2.5 text-xs">
                    <span className="font-black text-[#155EEF]">{folio}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-black text-[#0B1220]">{equipo}</span>
                      <span className="text-[#667085]">{estado}</span>
                    </span>
                    <span className="font-black text-[#0B1220]">{total}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-3xl border border-[#E4E7EC] bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B1220]">Tu carrito</p>
                <div className="mt-4 rounded-2xl border border-dashed border-[#D0D5DD] py-8 text-center text-xs font-black uppercase tracking-[0.22em] text-[#98A2B3]">
                  Carrito vacío
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#667085]">Total a cobrar</span>
                  <span className="text-2xl font-black italic">$0.00</span>
                </div>
                <button className="mt-4 w-full rounded-2xl bg-[#155EEF] px-4 py-3 text-sm font-black text-white">Finalizar venta</button>
              </div>

              <div className="rounded-3xl border border-[#E4E7EC] bg-white p-4 shadow-[0_16px_40px_rgba(11,18,32,0.08)]">
                <p className="text-sm font-black text-[#0B1220]">Patrón de desbloqueo</p>
                <div className="mt-3 grid grid-cols-[1fr_0.9fr] gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                      <span
                        key={number}
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${[1, 3, 4, 5, 6, 7, 9].includes(number) ? "bg-[#155EEF] text-white shadow-lg shadow-[#155EEF]/20" : "border border-[#D0D5DD] text-[#667085]"}`}
                      >
                        {number}
                      </span>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-[#F8FAFC] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#155EEF]">Secuencia</p>
                    <p className="mt-2 text-sm font-black text-[#0B1220]">1 → 4 → 7 → 5 → 3 → 6 → 9</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AlertChip({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color }}>
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-[#0B1220]">{value}</p>
      <p className="mt-1 text-xs text-[#667085]">Requieren atención</p>
    </div>
  )
}

function BenefitCard({ icon: Icon, title, text }: { icon: ElementType; title: string; text: string }) {
  return (
    <article className="rounded-3xl border border-[#E4E7EC] bg-white p-5 shadow-[0_12px_36px_rgba(11,18,32,0.05)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF8FF] text-[#155EEF]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-black tracking-tight text-[#0B1220]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#667085]">{text}</p>
    </article>
  )
}

function WorkflowSection() {
  return (
    <section className="overflow-hidden bg-[#0B1220] py-18 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#06B6D4]">Una operación conectada</p>
            <h2 className="mt-4 max-w-xl text-balance text-3xl font-black tracking-[-0.045em] sm:text-5xl">
              Del equipo recibido al <span className="text-[#06B6D4]">cobro final</span>
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-8 text-slate-300">
              ReparaHub conserva el contexto entre clientes, reparaciones, inventario y caja para que el mostrador avance sin duplicar información.
            </p>
            <div className="mt-7 grid gap-3">
              {["Visión completa de tu operación", "Menos errores y más control", "Decisiones basadas en datos reales"].map((item) => (
                <span key={item} className="inline-flex items-center gap-3 text-sm font-bold text-white">
                  <CheckCircle2 className="h-5 w-5 text-[#12B76A]" aria-hidden />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            {workflow.map(([title, ...items], index) => (
              <article key={title} className="relative rounded-3xl border border-slate-200 bg-white p-4">
                {index < workflow.length - 1 ? <div className="absolute -right-3 top-1/2 hidden h-px w-6 border-t border-dashed border-[#06B6D4]/70 md:block" /> : null}
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#155EEF] text-sm font-black">{index + 1}</span>
                <h3 className="mt-5 text-lg font-black">{title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ModulesSection() {
  return (
    <section id="producto" className="scroll-mt-20 bg-[#F5F7FA] py-18 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#155EEF]">Módulos principales</p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-[-0.04em] text-[#0B1220] sm:text-5xl">
            Todo lo que usa tu taller, conectado en una sola plataforma.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <article key={module.title} className="group rounded-[28px] border border-[#E4E7EC] bg-white p-6 shadow-[0_16px_44px_rgba(11,18,32,0.06)] transition hover:-translate-y-0.5 hover:border-[#B2DDFF]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF8FF] text-[#155EEF]">
                <module.icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-5 text-xl font-black text-[#0B1220]">{module.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#667085]">{module.text}</p>
              <a href="#precios" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#155EEF]">
                Ver más <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
