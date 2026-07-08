import {
  ClipboardList,
  MessageCircle,
  ShoppingCart,
  Barcode,
  Users,
  Printer,
  Monitor,
  UsersRound,
} from "lucide-react"

const features = [
  {
    icon: ClipboardList,
    title: "Folios digitales ilimitados",
    description:
      "Crea ordenes de reparacion con folio unico, sin limite de tickets al mes.",
  },
  {
    icon: MessageCircle,
    title: "Tracking por WhatsApp",
    description:
      "Tu cliente recibe un link para ver el estado de su equipo en tiempo real, sin llamadas.",
  },
  {
    icon: ShoppingCart,
    title: "Punto de venta con caja integrada",
    description:
      "Vende accesorios y servicios, acepta efectivo, tarjeta o transferencia. Corte de caja diario incluido.",
  },
  {
    icon: Barcode,
    title: "Control de inventario con IMEI",
    description:
      "Registra equipos de venta con numero de serie o IMEI para trazabilidad total.",
  },
  {
    icon: Users,
    title: "Historial de clientes",
    description:
      "Consulta todas las reparaciones anteriores de cualquier cliente en segundos.",
  },
  {
    icon: ShoppingCart,
    title: "Apartados y cotizaciones",
    description:
      "Reserva productos con anticipo y convierte cotizaciones en oportunidades reales de venta.",
  },
  {
    icon: Printer,
    title: "Ticket e impresion termica",
    description:
      "Compatible con impresoras termicas de 58mm y 80mm. Tambien imprime etiquetas 2x1 pulgadas.",
  },
  {
    icon: Monitor,
    title: "Acceso desde cualquier dispositivo",
    description:
      "Funciona en tu PC del taller, en tu celular o desde casa. Solo necesitas internet.",
  },
  {
    icon: UsersRound,
    title: "Multi-usuario",
    description:
      "Agrega a tu equipo tecnico con acceso controlado segun su rol.",
  },
]

export function FeaturesSection() {
  return (
    <section id="caracteristicas" className="py-20 sm:py-28 bg-slate-50/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 flex flex-col items-center gap-3 text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">
            Caracteristicas
          </span>
          <h2 className="max-w-2xl text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="max-w-lg text-pretty leading-relaxed text-muted-foreground">
            Herramientas disenadas para la operacion diaria de un taller de reparacion.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group flex flex-col gap-4 rounded-2xl border border-border bg-white p-6 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-base font-semibold text-card-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
