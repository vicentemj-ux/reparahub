import { ArrowDownToLine, CircleDollarSign, Clock3, MessageCircleMore } from "lucide-react"

const benefits = [
  {
    icon: Clock3,
    title: "Menos tiempo buscando información",
    description: "El historial del cliente, el equipo y sus movimientos permanece unido al folio.",
  },
  {
    icon: CircleDollarSign,
    title: "Caja y utilidad con contexto",
    description: "Ventas, gastos, apartados y cortes dejan una ruta clara para revisar el día.",
  },
  {
    icon: MessageCircleMore,
    title: "Clientes mejor informados",
    description: "Comparte seguimiento y reduce las llamadas que interrumpen el trabajo técnico.",
  },
  {
    icon: ArrowDownToLine,
    title: "Inventario que acompaña la venta",
    description: "Registra existencias, IMEI, compras y movimientos sin mantener listas separadas.",
  },
]

export function BenefitsSection() {
  return (
    <section id="beneficios" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="font-semibold text-blue-700">Hecho para el ritmo del mostrador</p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-5xl">
            Más control sin agregar pasos a tu equipo
          </h2>
        </div>

        <div className="mt-12 grid border-y border-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, index) => (
            <article
              key={benefit.title}
              className={`py-7 sm:p-7 ${index > 0 ? "border-t border-slate-200 sm:border-t-0 sm:border-l" : ""} ${index === 2 ? "sm:border-l-0 lg:border-l" : ""}`}
            >
              <benefit.icon className="h-7 w-7 text-blue-700" aria-hidden />
              <h3 className="mt-8 text-lg font-bold text-slate-950">{benefit.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{benefit.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
