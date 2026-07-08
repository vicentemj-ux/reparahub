import type { Metadata } from "next"
import { SeoIntentPage, type SeoIntentPageContent } from "@/components/marketing/seo-intent-page"

export const metadata: Metadata = {
  title: "Punto de venta para talleres",
  description: "POS para talleres con caja, inventario, tickets térmicos, apartados, métodos de pago y cortes diarios.",
  alternates: { canonical: "/punto-de-venta-taller" },
}

const content: SeoIntentPageContent = {
  slug: "punto-de-venta-taller",
  eyebrow: "Punto de venta para talleres",
  title: "Cobra accesorios y servicios sin separar la venta de la caja",
  description: "ReparaHub combina POS, inventario y cortes para que cada cobro deje stock, método de pago e historial correctamente registrados.",
  benefits: [
    { title: "Cobro flexible", description: "Acepta efectivo, tarjeta, transferencia o pagos mixtos y calcula el cambio." },
    { title: "Tickets térmicos", description: "Imprime comprobantes en 58 mm y 80 mm con la información de tu taller." },
    { title: "Caja revisable", description: "Consulta ventas, movimientos, gastos y cortes sin sacar el historial del POS." },
  ],
  workflowTitle: "Un cobro completo en cuatro pasos",
  workflow: ["Busca el producto, servicio o equipo por nombre y código.", "Agrega al carrito y confirma existencias.", "Selecciona cliente y método de pago.", "Registra la venta, imprime y conserva el movimiento en caja."],
  closingTitle: "Haz más rápido el cobro de mostrador",
  closingDescription: "Prueba el POS y la caja de ReparaHub durante 30 días sin registrar una tarjeta de crédito.",
}

export default function PuntoDeVentaTallerPage() {
  return <SeoIntentPage content={content} />
}
