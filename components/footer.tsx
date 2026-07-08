import Image from "next/image"
import Link from "next/link"
import { TrackedLink } from "@/components/marketing/tracked-link"
import { buildWhatsAppSendUrl, REPARAHUB_WHATSAPP_SUPPORT_DIGITS } from "@/lib/whatsapp-send-url"

const productLinks = [
  ["Producto", "/#producto"],
  ["Beneficios", "/#beneficios"],
  ["Precios", "/#precios"],
  ["Preguntas frecuentes", "/#preguntas"],
] as const

const seoLinks = [
  ["Software para talleres de celulares", "/software-taller-celulares"],
  ["Sistema de reparaciones", "/sistema-reparaciones"],
  ["Punto de venta para talleres", "/punto-de-venta-taller"],
  ["Inventario y apartados", "/inventario-apartados-taller"],
] as const

export function Footer() {
  return (
    <footer id="contacto" className="border-t border-[#1D2939] bg-[#0B1220] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.1fr_0.7fr_1fr_0.7fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              <span className="rounded-2xl bg-white px-3 py-2">
                <Image src="/logo.webp" alt="ReparaHub" width={180} height={55} className="h-9 w-auto object-contain" />
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
              Software para talleres que necesitan controlar reparaciones, ventas, inventario y clientes desde un solo lugar.
            </p>
            <p className="mt-4 text-sm text-slate-400">Hecho en Los Mochis, Sinaloa, México.</p>
          </div>

          <div>
            <h2 className="font-bold">Producto</h2>
            <nav className="mt-4 flex flex-col gap-3" aria-label="Enlaces del producto">
              {productLinks.map(([label, href]) => (
                <Link key={href} href={href} className="text-sm text-slate-300 hover:text-blue-700">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="font-bold">Soluciones</h2>
            <nav className="mt-4 flex flex-col gap-3" aria-label="Soluciones para talleres">
              {seoLinks.map(([label, href]) => (
                <Link key={href} href={href} className="text-sm text-slate-300 hover:text-blue-700">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="font-bold">Contacto y legal</h2>
            <nav className="mt-4 flex flex-col gap-3" aria-label="Contacto y enlaces legales">
              <TrackedLink
                href={buildWhatsAppSendUrl(REPARAHUB_WHATSAPP_SUPPORT_DIGITS, "Hola, me interesa ReparaHub y tengo algunas preguntas")}
                target="_blank"
                rel="noopener noreferrer"
                eventName="landing_whatsapp_click"
                eventProperties={{ location: "footer" }}
                className="text-sm text-slate-300 hover:text-blue-700"
              >
                WhatsApp
              </TrackedLink>
              <Link href="/terminos" className="text-sm text-slate-300 hover:text-blue-700">Términos de servicio</Link>
              <Link href="/privacidad" className="text-sm text-slate-300 hover:text-blue-700">Política de privacidad</Link>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-slate-800 pt-7 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ReparaHub. Todos los derechos reservados.</p>
          <p>Software de gestión para talleres en México y Latinoamérica.</p>
        </div>
      </div>
    </footer>
  )
}
