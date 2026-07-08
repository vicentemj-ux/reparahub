"use client"

import { useState } from "react"
import {
  Banknote,
  CheckCircle2,
  ClipboardList,
  FileText,
  PackageCheck,
  Smartphone,
  Wrench,
} from "lucide-react"
import { trackMarketingEvent } from "@/lib/marketing-analytics"

const modules = [
  {
    id: "reparaciones",
    label: "Reparaciones",
    title: "Cada equipo conserva su historia",
    description:
      "Registra recepción, diagnóstico, técnico, abonos y estatus en un mismo folio. El cliente consulta el avance sin llamar al taller.",
    points: ["Folio y datos del equipo", "Seguimiento por enlace", "Historial de movimientos"],
    icon: Wrench,
  },
  {
    id: "pos",
    label: "POS y caja",
    title: "Cobra sin perder el control de caja",
    description:
      "Vende productos y servicios, combina métodos de pago, descuenta inventario y conserva el corte diario.",
    points: ["Efectivo, tarjeta y transferencia", "Ticket térmico", "Cortes e historial de ventas"],
    icon: Banknote,
  },
  {
    id: "apartados",
    label: "Apartados",
    title: "Reserva inventario con anticipos claros",
    description:
      "Aparta equipos o accesorios, registra abonos y consulta cuánto falta por cobrar antes de entregar.",
    points: ["Anticipo inicial", "Historial de abonos", "Saldo pendiente visible"],
    icon: PackageCheck,
  },
  {
    id: "cotizaciones",
    label: "Cotizaciones",
    title: "Convierte consultas en oportunidades",
    description:
      "Prepara cotizaciones profesionales, identifica su origen y da seguimiento a las propuestas autorizadas.",
    points: ["Productos y servicios", "Estatus de autorización", "Métricas de conversión"],
    icon: FileText,
  },
] as const

type ModuleId = (typeof modules)[number]["id"]

function RepairPreview() {
  return (
    <div className="space-y-3">
      {[
        ["TC-0184", "iPhone 14 Pro", "En diagnóstico", "bg-amber-100 text-amber-800"],
        ["TC-0183", "Laptop Lenovo", "Listo para entrega", "bg-emerald-100 text-emerald-800"],
        ["TC-0182", "Nintendo Switch", "En reparación", "bg-blue-100 text-blue-800"],
      ].map(([folio, equipo, estado, color]) => (
        <div key={folio} className="grid grid-cols-[0.7fr_1.2fr] items-center gap-3 border-b border-slate-200 pb-3 last:border-0 last:pb-0 sm:grid-cols-[0.6fr_1.2fr_1fr]">
          <span className="font-bold text-blue-700">{folio}</span>
          <span className="text-sm font-medium text-slate-700">{equipo}</span>
          <span className={`col-span-2 w-fit rounded-full px-2.5 py-1 text-xs font-semibold sm:col-span-1 ${color}`}>
            {estado}
          </span>
        </div>
      ))}
    </div>
  )
}

function PosPreview() {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_0.8fr]">
      <div className="space-y-3">
        {["Mica protectora", "Servicio de instalación"].map((item, index) => (
          <div key={item} className="flex items-center justify-between border-b border-slate-200 pb-3 text-sm">
            <span className="font-medium text-slate-700">{item}</span>
            <span className="font-bold text-slate-950">{index === 0 ? "$180" : "$70"}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col justify-between bg-blue-700 p-5 text-white">
        <span className="text-sm text-blue-100">Total a cobrar</span>
        <strong className="mt-5 text-4xl tracking-tight">$250</strong>
        <span className="mt-5 rounded-md bg-blue-50 px-3 py-2 text-center text-sm font-semibold">Cobro exacto</span>
      </div>
    </div>
  )
}

function ApartadosPreview() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[
        ["Precio", "$8,500"],
        ["Abonado", "$3,000"],
        ["Pendiente", "$5,500"],
      ].map(([label, value], index) => (
        <div key={label} className={index === 2 ? "bg-amber-50 p-4" : "bg-slate-50 p-4"}>
          <span className="text-xs font-semibold text-slate-500">{label}</span>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>
      ))}
      <div className="sm:col-span-3 flex items-center gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
        Último abono registrado y saldo actualizado
      </div>
    </div>
  )
}

function QuotesPreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500">COT-0068</span>
          <p className="font-bold text-slate-950">Cambio de pantalla y protector</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Autorizada</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-2/3 rounded-full bg-blue-600" />
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Conversión de cotizaciones</span>
        <strong className="text-slate-950">Seguimiento visible</strong>
      </div>
    </div>
  )
}

const previews: Record<ModuleId, React.ReactNode> = {
  reparaciones: <RepairPreview />,
  pos: <PosPreview />,
  apartados: <ApartadosPreview />,
  cotizaciones: <QuotesPreview />,
}

export function ProductShowcase() {
  const [activeId, setActiveId] = useState<ModuleId>("reparaciones")
  const activeModule = modules.find((module) => module.id === activeId) ?? modules[0]

  const activateModule = (moduleId: ModuleId) => {
    setActiveId(moduleId)
    trackMarketingEvent("landing_demo_click", { module: moduleId })
  }

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentId: ModuleId) => {
    const currentIndex = modules.findIndex((module) => module.id === currentId)
    let nextIndex = currentIndex

    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % modules.length
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + modules.length) % modules.length
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = modules.length - 1
    if (nextIndex === currentIndex) return

    event.preventDefault()
    const nextId = modules[nextIndex].id
    activateModule(nextId)
    document.getElementById(`tab-${nextId}`)?.focus()
  }

  return (
    <section id="producto" className="scroll-mt-20 bg-slate-50 py-20 text-slate-900 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-end gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="font-semibold text-blue-300">Una operación conectada</p>
            <h2 className="mt-3 max-w-xl text-balance text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              Del equipo recibido al cobro final
            </h2>
          </div>
          <p className="max-w-2xl text-pretty text-lg leading-8 text-slate-600 lg:justify-self-end">
            ReparaHub conserva el contexto entre clientes, reparaciones, inventario y caja para que el mostrador avance sin duplicar información.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[0.42fr_1fr]">
          <div role="tablist" aria-label="Módulos de ReparaHub" className="grid grid-cols-2 gap-2 lg:flex lg:flex-col">
            {modules.map((module) => {
              const Icon = module.icon
              const selected = module.id === activeId
              return (
                <button
                  key={module.id}
                  id={`tab-${module.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${module.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => activateModule(module.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, module.id)}
                  className={`flex min-h-14 items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                    selected ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  {module.label}
                </button>
              )
            })}
          </div>

          <div
            id={`panel-${activeModule.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeModule.id}`}
            className="overflow-hidden rounded-xl bg-white text-slate-950"
          >
            <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
              <div className="bg-blue-50 p-6 sm:p-8">
                <activeModule.icon className="h-8 w-8 text-blue-700" aria-hidden />
                <h3 className="mt-8 text-balance text-2xl font-black tracking-tight">{activeModule.title}</h3>
                <p className="mt-4 leading-7 text-slate-600">{activeModule.description}</p>
                <ul className="mt-6 space-y-3">
                  {activeModule.points.map((point) => (
                    <li key={point} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex min-h-80 items-center p-5 sm:p-8">
                <div className="w-full border border-slate-200 bg-white p-5 shadow-[0_6px_0_#dbeafe] sm:p-6">
                  <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                        <Smartphone className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">REPARAHUB</p>
                        <p className="font-bold text-slate-950">{activeModule.label}</p>
                      </div>
                    </div>
                    <ClipboardList className="h-5 w-5 text-slate-500" aria-hidden />
                  </div>
                  {previews[activeModule.id]}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
