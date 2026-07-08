/**
 * Utilidades compartidas de impresion (tamano de papel, px de vista previa).
 * No usar `"use server"` aqui: no son Server Actions.
 *
 * Lectura de configuracion del taller (`getPaperSize`) → `lib/actions/print-actions.ts`.
 */

export type PaperSize = "80mm"

/** Ancho en px para previews de ticket (UI). Siempre 80mm (302px). */
export function paperSizeToPx(_size?: string): number {
  return 302
}
