/**
 * lib/utils/visitas.ts
 *
 * Utilidades puras para visitas (no dependen de servidor).
 */

export type MotivoVisita =
  | "llamada"
  | "reparacion"
  | "cotizacion"
  | "compra"
  | "venta"
  | "recoger"
  | "personal"
  | "otro"

const MOTIVO_LABELS: Record<MotivoVisita, string> = {
  llamada: "Llamada telefonica",
  reparacion: "Seguimiento de reparacion",
  cotizacion: "Cotizacion",
  compra: "Comprar producto",
  venta: "Buscar equipo / accesorio",
  recoger: "Recoger equipo",
  personal: "Personal del negocio",
  otro: "Otro",
}

export function getMotivoLabel(motivo: string | null): string {
  if (!motivo) return "Sin especificar"
  return MOTIVO_LABELS[motivo as MotivoVisita] || motivo
}
