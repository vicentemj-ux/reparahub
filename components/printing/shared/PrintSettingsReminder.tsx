"use client"

import { ChevronDown, Info, Printer } from "lucide-react"
import { useState } from "react"

/**
 * Recordatorio de los settings criticos del dialog de impresion del
 * navegador para papel termico. El navegador NO es un driver termico:
 *  - `@page { size: 80mm auto }` se IGNORA si el usuario eligio Letter/A4.
 *  - "Fit to page" reescala el ticket y destruye la legibilidad.
 *  - "Sin margenes" no es el default de Chrome/Edge.
 *
 * Sin estos 3 ajustes correctos, el mejor CSS del mundo imprime basura.
 * Por eso este recordatorio vive en /dashboard/configuracion/imprenta
 * (donde el usuario configura la impresion por primera vez) y en cualquier
 * preview de ticket.
 */
export function PrintSettingsReminder({
  variant = "panel",
  className = "",
}: {
  /** "panel" = card blanco con borde (default, para Imprenta). "inline" = banner sutil. */
  variant?: "panel" | "inline"
  className?: string
}) {
  const [open, setOpen] = useState(false)

  if (variant === "inline") {
    return (
      <details className={`rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 ${className}`}>
        <summary className="flex cursor-pointer items-center gap-1.5 font-semibold">
          <Info className="h-3.5 w-3.5" />
          Antes de imprimir, revisa los ajustes del navegador
        </summary>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-amber-800">
          <li>Tamano de papel: <strong>80mm x Auto</strong> (no Letter ni A4).</li>
          <li>Escala: <strong>Tamano real / 100%</strong> (no Ajustar a pagina).</li>
          <li>Margenes: <strong>Sin margenes</strong> o Predeterminado.</li>
          <li>Impresora: la termica del taller (no "Microsoft Print to PDF" si vas a imprimir en papel).</li>
        </ul>
      </details>
    )
  }

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50/60 p-4 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <Printer className="h-4 w-4 text-amber-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">
              Calidad de impresion termica
            </p>
            <p className="text-[11px] text-amber-700">
              El navegador no es un driver termico. Estos 3 ajustes del dialog
              son obligatorios para que el ticket salga nitido.
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-amber-700 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-t border-amber-200 pt-3 text-xs text-amber-900">
          <p>
            Cuando abras el dialog de impresion (<kbd className="rounded border border-amber-300 bg-white px-1 font-mono">Ctrl</kbd>
            +<kbd className="rounded border border-amber-300 bg-white px-1 font-mono">P</kbd> en Chrome/Edge):
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <strong>Tamano de papel:</strong> selecciona <strong>80mm x Auto</strong>{" "}
              (o el ancho de tu rollo). <em>No</em> Letter ni A4.
            </li>
            <li>
              <strong>Escala:</strong> <strong>Tamano real / 100% / Actual size</strong>.{" "}
              Nunca &quot;Ajustar a pagina&quot; ni &quot;Shrink to fit&quot;.
            </li>
            <li>
              <strong>Margenes:</strong> <strong>Sin margenes</strong> o Predeterminado.
            </li>
            <li>
              <strong>Impresora:</strong> la termica del taller (no &quot;Microsoft Print to PDF&quot;
              si vas a imprimir en papel real).
            </li>
          </ol>
          <p className="border-t border-amber-200 pt-2 text-[11px] text-amber-700">
            <strong>Por que?</strong> El navegador renderiza a 96 DPI, la
            impresora termica imprime a 203 DPI. Chrome reescala 2.1x;
            si ademas le pides &quot;Ajustar a pagina&quot; o &quot;Letter&quot;,
            se rompe el layout y la fuente se ve gris/borrosa. Una vez
            configurado, el resto sale bien automatico.
          </p>
        </div>
      )}
    </div>
  )
}
