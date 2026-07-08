import Image from "next/image"
import { ShieldCheck, Store } from "lucide-react"

const clients = [
  {
    name: "Electronica Morelos",
    role: "Taller cliente",
    note: "Flujo de reparaciones y caja en operación diaria.",
    logo: "/images/clients/electronica-morelos.svg",
  },
  {
    name: "Reparatech",
    role: "Taller cliente",
    note: "Seguimiento operativo para ventas y servicios.",
  },
  {
    name: "CDSE",
    role: "Taller cliente",
    note: "Uso activo para control de trabajo y mostrador.",
  },
] as const

export function TestimonialsSection() {
  return (
    <section className="border-t border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="font-semibold text-blue-700">Prueba social real</p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-5xl">
            Talleres que ya trabajan con ReparaHub
          </h2>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-slate-600">
            Estas referencias reflejan clientes reales del ecosistema actual. Se muestran como marcas de operación, sin inventar citas ni métricas no aprobadas.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {clients.map((client) => (
            <article key={client.name} className="border border-slate-200 bg-white p-6 shadow-[0_8px_0_#e2e8f0]">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  {"logo" in client ? (
                    <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-slate-100 p-1.5">
                      <Image
                        src={client.logo}
                        alt={`${client.name} logo`}
                        width={96}
                        height={30}
                        unoptimized
                        className="h-full w-full object-contain"
                      />
                    </span>
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <Store className="h-6 w-6" aria-hidden />
                    </span>
                  )}
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{client.name}</h3>
                    <p className="text-sm font-semibold text-slate-500">{client.role}</p>
                  </div>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden />
              </div>

              <p className="mt-5 text-sm leading-7 text-slate-600">{client.note}</p>
              <div className="mt-5 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Referencia operativa
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
