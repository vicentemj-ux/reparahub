import type { Metadata } from "next"
import { SeoIntentPage, type SeoIntentPageContent } from "@/components/marketing/seo-intent-page"

export const metadata: Metadata = {
  title: "Software para talleres de celulares",
  description: "Controla reparaciones de celulares, clientes, IMEI, inventario y ventas desde ReparaHub. Prueba PLAN PRO durante 30 días.",
  alternates: { canonical: "/software-taller-celulares" },
}

const content: SeoIntentPageContent = {
  slug: "software-taller-celulares",
  eyebrow: "Software para talleres de celulares",
  title: "Recibe, repara y entrega celulares con cada dato en su lugar",
  description: "ReparaHub conecta folios, clientes, equipos, inventario y cobros para que tu taller deje de depender de notas, chats y hojas separadas.",
  benefits: [
    { title: "Equipos identificados", description: "Registra marca, modelo, color, IMEI, condición y accesorios recibidos dentro del folio." },
    { title: "Seguimiento para clientes", description: "Comparte un enlace para que el cliente consulte el estado sin interrumpir al técnico." },
    { title: "Venta ligada al inventario", description: "Vende accesorios, refacciones y servicios desde el POS con movimientos de caja visibles." },
  ],
  workflowTitle: "Un flujo pensado para mostrador y taller",
  workflow: ["Registra al cliente y las condiciones del equipo.", "Asigna diagnóstico, técnico y estatus de reparación.", "Registra anticipos, piezas utilizadas y notas del servicio.", "Cobra, imprime el ticket y conserva el historial del cliente."],
  closingTitle: "Prueba ReparaHub en tu siguiente recepción",
  closingDescription: "Activa PLAN PRO durante 30 días y comprueba si el flujo se adapta a tu taller antes de elegir una suscripción.",
}

export default function SoftwareTallerCelularesPage() {
  return <SeoIntentPage content={content} />
}
