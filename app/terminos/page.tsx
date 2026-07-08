import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArrowLeft } from "lucide-react"
import { buildWhatsAppOpenChatUrl, REPARAHUB_WHATSAPP_SUPPORT_DIGITS } from "@/lib/whatsapp-send-url"

export const metadata = {
  title: "Terminos de Servicio - ReparaHub",
  description: "Condiciones de uso de la plataforma ReparaHub para talleres de reparacion.",
}

export default function TerminosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">

          {/* Back link */}
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>

          {/* Header */}
          <div className="mb-10 border-b border-border pb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              Legal
            </p>
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Terminos de Servicio
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Ultima actualizacion: marzo de 2026
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-slate max-w-none space-y-10 text-foreground">

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">1. Descripcion del servicio</h2>
              <p className="leading-relaxed text-muted-foreground">
                ReparaHub es una plataforma SaaS (Software as a Service) de gestion para talleres
                de reparacion de dispositivos electronicos, operada por Vicente Munguia, con sede
                en Los Mochis, Sinaloa, Mexico. El servicio permite administrar reparaciones,
                ventas, inventario, clientes y equipo de trabajo desde cualquier dispositivo
                conectado a internet.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">2. Uso del servicio</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  El usuario se compromete a usar el sistema unicamente para fines licitos y
                  conforme a la legislacion mexicana aplicable.
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  El usuario es responsable de la veracidad y legalidad de los datos que ingresa
                  al sistema, incluyendo informacion de clientes, reparaciones y productos.
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Esta prohibido compartir credenciales de acceso con terceros no autorizados.
                  Cada cuenta es de uso personal e intransferible.
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Queda prohibido intentar acceder a cuentas ajenas, realizar ingenieria inversa
                  o interferir con la infraestructura del servicio.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">3. Suscripcion y pagos</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  ReparaHub ofrece las siguientes modalidades de acceso:
                </p>
                <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">Periodo de prueba</span>
                    <span>30 dias gratuitos · Sin tarjeta de credito</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t border-border pt-2">
                    <span className="font-semibold text-foreground">PLAN CORE (mensual)</span>
                    <span>$189 MXN / mes</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t border-border pt-2">
                    <span className="font-semibold text-foreground">PLAN PRO (mensual)</span>
                    <span>$299 MXN / mes</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t border-border pt-2">
                    <span className="font-semibold text-foreground">PLAN CORE (anual)</span>
                    <span>$1,699 MXN / ano</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t border-border pt-2">
                    <span className="font-semibold text-foreground">PLAN PRO (anual)</span>
                    <span>$2,499 MXN / ano</span>
                  </div>
                </div>
                <ul className="space-y-2">
                  <li className="flex gap-2 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    El acceso se suspende automaticamente al vencer el periodo sin renovacion.
                  </li>
                  <li className="flex gap-2 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    No se ofrecen reembolsos por periodos parciales de uso.
                  </li>
                  <li className="flex gap-2 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    Los precios pueden ajustarse con previo aviso de 30 dias por email.
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">4. Datos y privacidad</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Los datos del taller (clientes, reparaciones, ventas, inventario) son propiedad
                  exclusiva del usuario.
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  ReparaHub no vende, alquila ni comparte datos de los usuarios con terceros
                  por ningun motivo.
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Los datos se alojan en servidores seguros mediante Supabase (infraestructura
                  AWS) con cifrado en transito y en reposo.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">5. Disponibilidad del servicio</h2>
              <p className="leading-relaxed text-muted-foreground">
                ReparaHub busca mantener disponibilidad continua (24/7), sin embargo no garantiza
                un nivel de servicio especifico. El proveedor no sera responsable por perdidas
                economicas, de datos o de negocio causadas por interrupciones del servicio,
                ya sean planificadas o no planificadas.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">6. Cancelacion</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  El usuario puede cancelar su suscripcion en cualquier momento sin penalizacion.
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Al cancelar, el acceso se mantiene activo hasta el fin del periodo ya pagado.
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Tras la cancelacion, los datos se conservan por 30 dias adicionales para
                  permitir exportacion, luego se eliminan permanentemente.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">7. Contacto</h2>
              <p className="mb-3 leading-relaxed text-muted-foreground">
                Para preguntas sobre estos terminos o para ejercer cualquier derecho relacionado
                con tu cuenta:
              </p>
              <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">WhatsApp:</span>{" "}
                  <a
                    href={buildWhatsAppOpenChatUrl(REPARAHUB_WHATSAPP_SUPPORT_DIGITS)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    668 122 7393
                  </a>
                </p>
                <p>
                  <span className="font-semibold text-foreground">Ubicacion:</span>{" "}
                  Los Mochis, Sinaloa, Mexico
                </p>
              </div>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
