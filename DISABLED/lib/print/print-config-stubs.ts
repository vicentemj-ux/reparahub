/**
 * ─── RETIRADO — ver /DISABLED/README.md ────────────────────────────────────────
 * Fragmentos extraidos de lib/print/print-config.ts (lineas 48-62 y 93-106).
 *
 * THERMAL_LABEL_PAGE_STYLE y useThermalLabelPrint no tienen callers en el SaaS:
 * la ruta app/print-label/page.tsx define su propio CSS inline (lineas 105-114
 * de ese archivo) en lugar de reutilizar estos helpers. Se conservan en
 * /DISABLED/ por si una futura refactorizacion de la pagina de etiquetas
 * decide adoptarlos. Para reintroducir: restaurar las dos constantes
 * en print-config.ts y reemplazar el CSS inline de app/print-label/page.tsx.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useReactToPrint, type UseReactToPrintOptions } from "react-to-print"

/** `@page` + reset de body para etiquetas termicas 50.8x25.4mm (2x1"). */
export const THERMAL_LABEL_PAGE_STYLE = `
  @page { size: 50.8mm 25.4mm !important; margin: 0 !important; padding: 0 !important; }
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

/** Opciones listas para etiquetas termicas 50.8x25.4mm. */
export function useThermalLabelPrint(
  opts: Omit<UseReactToPrintOptions, "pageStyle" | "bodyClass"> & {
    /** @default "print-label-mode" */
    bodyClass?: string
  }
) {
  const { bodyClass = "print-label-mode", ...rest } = opts
  return useReactToPrint({
    ...rest,
    bodyClass,
    pageStyle: THERMAL_LABEL_PAGE_STYLE,
  })
}
