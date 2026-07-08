export type PlanCatalogItem = {
  id: "core" | "pro"
  name: string
  tagline: string
  monthlyPriceMx: number
  annualPriceMx: number
  bullets: string[]
}

export const PLAN_CORE: PlanCatalogItem = {
  id: "core",
  name: "PLAN CORE",
  tagline: "Digitalizacion esencial",
  monthlyPriceMx: 189,
  annualPriceMx: 1699,
  bullets: [
    "POS / Ventas con ticket",
    "Modulo de reparaciones",
    "Inventario y productos",
    "Mi Tienda publica con hasta 5 productos visibles",
    "Historial de ventas",
    "Base de clientes",
    "Bitacora de gastos",
    "Revision rapida (checklist basico)",
    "Gestion de equipo (hasta 3 miembros)",
    "Dashboard y configuracion",
  ],
}

export const PLAN_PRO: PlanCatalogItem = {
  id: "pro",
  name: "PLAN PRO",
  tagline: "Operacion avanzada para escalar",
  monthlyPriceMx: 299,
  annualPriceMx: 2499,
  bullets: [
    "Todo lo de PLAN CORE (miembros ilimitados)",
    "POS Kiosko PRO para tablet fija y cobro ultra rapido",
    "Mi Tienda publica con catalogo de hasta 50 productos",
    "Bitacora de visitas",
    "Compras y ordenes de compra",
    "Alta por lote de equipos con series y etiquetas",
    "Apartados con anticipos y abonos",
    "Cotizaciones profesionales",
    "Control de utilidad",
    "Reportes avanzados",
    "Catalogo de servicios",
    "Health Check PRO (checklist de 10 puntos)",
  ],
}
