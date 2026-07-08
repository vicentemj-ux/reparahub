import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArrowLeft } from "lucide-react"
import { buildWhatsAppOpenChatUrl, REPARAHUB_WHATSAPP_SUPPORT_DIGITS } from "@/lib/whatsapp-send-url"

export const metadata = {
  title: "Politica de Privacidad - ReparaHub",
  description: "Como ReparaHub recopila, usa y protege los datos de sus usuarios.",
}

export default function PrivacidadPage() {
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
              Politica de Privacidad
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Ultima actualizacion: marzo de 2026
            </p>
          </div>

          {/* Intro */}
          <p className="mb-10 leading-relaxed text-muted-foreground">
            En ReparaHub nos tomamos en serio la privacidad de tus datos. Esta politica explica
            que informacion recopilamos, como la usamos y como la protegemos.
          </p>

          {/* Content */}
          <div className="space-y-10 text-foreground">

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">1. Datos que recopilamos</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                    Datos de la cuenta
                  </h3>
                  <ul className="space-y-1.5">
                    <li className="flex gap-2 leading-relaxed text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      Nombre del propietario del taller y nombre del negocio
                    </li>
                    <li className="flex gap-2 leading-relaxed text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      Correo electronico y numero de telefono de contacto
                    </li>
                    <li className="flex gap-2 leading-relaxed text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      Contrasena almacenada con cifrado (nunca en texto plano)
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                    Datos operativos del taller
                  </h3>
                  <ul className="space-y-1.5">
                    <li className="flex gap-2 leading-relaxed text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      Informacion de clientes: nombre, telefono, correo
                    </li>
                    <li className="flex gap-2 leading-relaxed text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      Registros de reparaciones, ventas e inventario
                    </li>
                    <li className="flex gap-2 leading-relaxed text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      Imagenes de dispositivos subidas al sistema
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                    Datos tecnicos de uso
                  </h3>
                  <ul className="space-y-1.5">
                    <li className="flex gap-2 leading-relaxed text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      Registros de acceso (fecha, hora, direccion IP) para seguridad
                    </li>
                    <li className="flex gap-2 leading-relaxed text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      Tipo de dispositivo y navegador utilizado
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">2. Como usamos los datos</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Para proveer y mejorar el servicio contratado.
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Para enviar notificaciones relacionadas con tu cuenta (renovacion, cambios
                  importantes, soporte).
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Para detectar y prevenir usos fraudulentos o no autorizados.
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <strong className="font-semibold text-foreground">Nunca</strong> para
                  publicidad, marketing de terceros ni venta de datos.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">3. Almacenamiento y seguridad</h2>
              <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">🗄️</span>
                  <div>
                    <p className="font-semibold text-foreground">Base de datos</p>
                    <p>Supabase (PostgreSQL) alojado en infraestructura AWS con cifrado en reposo.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">🖼️</span>
                  <div>
                    <p className="font-semibold text-foreground">Almacenamiento de imagenes</p>
                    <p>Supabase Storage con acceso controlado por politicas de seguridad.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">🔒</span>
                  <div>
                    <p className="font-semibold text-foreground">Transmision</p>
                    <p>Todas las conexiones estan cifradas con SSL/TLS. Nunca se transmiten
                      datos sensibles en texto plano.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">4. Tus derechos</h2>
              <p className="mb-3 leading-relaxed text-muted-foreground">
                Como usuario de ReparaHub tienes derecho a:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    <strong className="font-semibold text-foreground">Acceder</strong> a todos
                    los datos almacenados en tu cuenta en cualquier momento.
                  </span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    <strong className="font-semibold text-foreground">Exportar</strong> tus datos
                    operativos en formato CSV desde el modulo de configuracion.
                  </span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    <strong className="font-semibold text-foreground">Eliminar</strong> tu
                    cuenta y todos los datos asociados solicitandolo por WhatsApp.
                  </span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    <strong className="font-semibold text-foreground">Corregir</strong> cualquier
                    dato incorrecto directamente desde la configuracion de tu taller.
                  </span>
                </li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                Para ejercer cualquiera de estos derechos contacta por WhatsApp al{" "}
                <a
                  href={buildWhatsAppOpenChatUrl(REPARAHUB_WHATSAPP_SUPPORT_DIGITS)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  668 122 7393
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">5. Cookies</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  ReparaHub utiliza unicamente cookies esenciales para mantener tu sesion
                  activa y recordar tu autenticacion.
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  No se utilizan cookies de rastreo, publicidad ni analitica de terceros.
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Las cookies de sesion se eliminan al cerrar sesion o al expirar tu plan.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">6. Cambios a esta politica</h2>
              <p className="leading-relaxed text-muted-foreground">
                Si realizamos cambios relevantes a esta politica de privacidad, te notificaremos
                por correo electronico con al menos 15 dias de anticipacion. El uso continuado
                del servicio despues de ese periodo constituye aceptacion de los cambios.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-foreground">7. Contacto</h2>
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
                  <span className="font-semibold text-foreground">Operado por:</span>{" "}
                  Vicente Munguia · Los Mochis, Sinaloa, Mexico
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
