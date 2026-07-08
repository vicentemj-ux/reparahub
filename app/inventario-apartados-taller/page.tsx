import type { Metadata } from "next"
import { SeoIntentPage, type SeoIntentPageContent } from "@/components/marketing/seo-intent-page"

export const metadata: Metadata = {
  title: "Inventario y apartados para talleres",
  description: "Controla productos, IMEI, compras, existencias, apartados, anticipos y abonos desde ReparaHub.",
  alternates: { canonical: "/inventario-apartados-taller" },
}

const content: SeoIntentPageContent = {
  slug: "inventario-apartados-taller",
  eyebrow: "Inventario y apartados",
  title: "Conoce qué tienes, qué está apartado y cuánto falta por cobrar",
  description: "Administra accesorios, refacciones y equipos con existencias, costos, IMEI y apartados que conservan cada anticipo y abono.",
  benefits: [
    { title: "Stock operativo", description: "Consulta existencias y movimientos sin mantener hojas paralelas." },
    { title: "Equipos trazables", description: "Registra número de serie o IMEI para identificar equipos de venta." },
    { title: "Apartados con saldo", description: "Reserva inventario, registra abonos y conoce el monto pendiente antes de entregar." },
  ],
  workflowTitle: "Inventario conectado con cada movimiento",
  workflow: ["Registra productos, costos, precios y existencias.", "Identifica equipos por IMEI o número de serie.", "Aparta el artículo y recibe el anticipo.", "Registra abonos hasta liquidar y entregar el producto."],
  closingTitle: "Controla inventario y cobros desde el mismo lugar",
  closingDescription: "Activa PLAN PRO durante 30 días para probar apartados, compras e inventario avanzado.",
}

export default function InventarioApartadosTallerPage() {
  return <SeoIntentPage content={content} />
}
