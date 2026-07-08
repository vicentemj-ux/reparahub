/** Etiquetas cortas para UI (modales, confirmacion, historial). */
export function getRepairStatusDisplayLabel(value: string): string {
  const normalized = value.trim()
  const map: Record<string, string> = {
    Recibido: "RECIBIDO",
    Diagnostico: "DIAGNÓSTICO",
    "En Reparacion": "EN REPARACIÓN",
    "Esperando Refaccion": "PENDIENTE",
    Listo: "LISTO",
    Entregado: "ENTREGADO",
    Cancelado: "CANCELADO",
    "Sin Reparacion": "SIN REPARACION",
    Reingreso: "REINGRESO",
  }
  return map[normalized] ?? normalized
}
