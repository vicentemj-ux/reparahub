/**
 * Configuracion centralizada para `useReactToPrint` y `window.print()`.
 *
 * SINGLE SOURCE OF TRUTH para papel termico (tickets 80mm y etiquetas
 * 50.8x25.4mm) y reportes carta. Antes cada call site repetia su propio
 * `pageStyle` y `bodyClass`, con inconsistencias (ej. garantia usaba
 * `margin: 4mm` que come area util en rollos de 80mm).
 *
 * Mejoras de calidad termica (jun 2026, v2.7.0+):
 *  - `font-synthesis: none !important` evita que el navegador sintetice
 *    bold/italic cuando la fuente no provee el peso pedido, lo que en
 *    impresion termica produce caracteres "fantasma" grises.
 *  - `text-rendering: optimizeSpeed` (en lugar de geometricPrecision)
 *    desactiva anti-aliasing fino: las fuentes se rasterizan a la DPI
 *    del driver (96 en navegador -> 203 en termica) sin suavizado
 *    intermedio, dando trazos mas nitidos.
 *  - `image-rendering: pixelated` para SVGs (barcodes/QR) evita que
 *    el navegador reescale con bilinear al imprimir.
 *  - `print-color-adjust: exact` fuerza imprimir colores de fondo
 *    (necesario en Chrome para que el negro salga puro, no gris).
 *  - `@page { size: 80mm auto; margin: 0 }` y body con margin/padding 0
 *    eliminan el "letter padding" que Chrome mete por default cuando
 *    el usuario eligio Letter en el dialog de impresion.
 *
 * El navegador sigue siendo el eslabon debil: el usuario DEBE
 * seleccionar tamano de papel "80mm x Auto" y escala "Tamano real" en
 * el dialog. Ver `PrintSettingsReminder` en Imprenta.
 */
import * as React from "react"
import { useReactToPrint, type UseReactToPrintOptions } from "react-to-print"

/** `@page` + reset de body para tickets 80mm. */
export const THERMAL_TICKET_PAGE_STYLE = `
  @page { size: 80mm auto !important; margin: 0 !important; padding: 0 !important; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }
  body, body * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    font-synthesis: none !important;
  }
  svg { image-rendering: pixelated !important; shape-rendering: crispEdges !important; }
`

/** `@page` + reset de body para reportes en hoja carta (US Letter). */
export const LETTER_REPORT_PAGE_STYLE = `
  @page { size: letter portrait !important; margin: 12mm !important; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }
  body, body * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
`

/** Opciones listas para tickets termicos 80mm. */
export function useThermalTicketPrint(
  opts: Omit<UseReactToPrintOptions, "pageStyle" | "bodyClass"> & {
    /** @default "print-ticket-mode" */
    bodyClass?: string
  }
) {
  const { bodyClass = "print-ticket-mode", ...rest } = opts
  return useReactToPrint({
    ...rest,
    bodyClass,
    pageStyle: THERMAL_TICKET_PAGE_STYLE,
  })
}

/** Opciones listas para reportes en hoja carta. */
export function useLetterReportPrint(
  opts: Omit<UseReactToPrintOptions, "pageStyle" | "bodyClass"> & {
    /** @default "print-letter-report-mode" */
    bodyClass?: string
  }
) {
  const { bodyClass = "print-letter-report-mode", ...rest } = opts
  return useReactToPrint({
    ...rest,
    bodyClass,
    pageStyle: LETTER_REPORT_PAGE_STYLE,
  })
}

/** Inyecta el pageStyle de ticket termico y abre el dialog. Para uso en paginas /print-*. */
export function injectThermalTicketStyleAndPrint(doc: Document = window.document) {
  const existing = doc.getElementById("print-ticket-page-style")
  if (existing) existing.remove()
  const style = doc.createElement("style")
  style.id = "print-ticket-page-style"
  style.textContent = THERMAL_TICKET_PAGE_STYLE
  doc.head.appendChild(style)
  doc.body.classList.add("print-ticket-mode")
}
