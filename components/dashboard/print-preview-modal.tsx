"use client"

import type { ReactNode } from "react"
import { Printer, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export interface PrintPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tamano fisico del papel, ej. "50MM X 25MM" | "80MM" | "CARTA". */
  paperSize: string
  /** Linea extra bajo paperSize, ej. "CON PRECIO" | "SIN PRECIO". */
  subSpec?: string
  /** Linea extra final, ej. "ETIQUETA DE EXHIBICION (EQUIPO)" | "ETIQUETA DE REPARACION". */
  typeSpec?: string
  /** Texto del boton principal, ej. "IMPRIMIR ETIQUETA" | "IMPRIMIR TICKET". */
  printLabel: string
  /** Nota inferior derecha (configuracion de impresora). */
  paperNote: string
  /** Accion al hacer click en IMPRIMIR. */
  onPrint: () => void | Promise<void>
  /** Deshabilita el boton y muestra spinner. */
  printing?: boolean
  /** Deshabilita el boton (ej. si no hay data todavia). */
  disabled?: boolean
  /** Contenido a renderizar en el area de preview (la etiqueta o el ticket escalado). */
  children: ReactNode
  /** Titulo accesible (sr-only). */
  title?: string
  /** Descripcion accesible (sr-only). */
  description?: string
}

/**
 * Modal estandar de VISTA PREVIA para TODA impresion del SaaS.
 *
 * Replica exactamente la composicion del modal de etiquetas de inventario
 * (app/dashboard/inventario/page.tsx) para que sea consistente en
 * cualquier modulo que imprima (reparaciones, ventas, etc.):
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │                                              VISTA PREVIA
 *   │                                              50MM X 25MM
 *   │                                              CON PRECIO
 *   │                                              ETIQUETA DE ...
 *   │            ┌─────────────────────────┐
 *   │            │      IMPRIMIR           │
 *   │            │      ETIQUETA           │
 *   │            └─────────────────────────┘
 *   │            ┌───────────────────────────────┐
 *   │            │     [PREVIEW CONTENT]         │
 *   │            └───────────────────────────────┘
 *   │                          Asegurate de que tu impresora
 *   │                          este configurada...     × │
 *   └────────────────────────────────────────────────────────────┘
 *
 * El boton IMPRIMIR dispara `onPrint` (que el caller conecta al flujo
 * real: window.open, iframe.print, Tauri, etc). El contenido de preview
 * (`children`) debe ser el MISMO componente que se va a imprimir
 * escalado, para que el usuario vea exactamente lo que saldra en papel.
 */
export function PrintPreviewModal({
  open,
  onOpenChange,
  paperSize,
  subSpec,
  typeSpec,
  printLabel,
  paperNote,
  onPrint,
  printing = false,
  disabled = false,
  children,
  title = "Vista previa de impresion",
  description = "Revisa la previsualizacion antes de imprimir.",
}: PrintPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full md:max-w-3xl bg-white border border-border shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <div className="relative">
          {/* ── Capa superior (control) ── */}
          <div className="relative bg-white px-4 pt-4 pb-3">
            <div className="absolute right-4 top-4 text-right">
              <p className="text-xs font-black italic tracking-wide text-slate-900">
                VISTA PREVIA
              </p>
              <p className="text-[10px] font-semibold tracking-widest text-primary">
                {paperSize}
              </p>
              {subSpec ? (
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                  {subSpec}
                </p>
              ) : null}
              {typeSpec ? (
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                  {typeSpec}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-center">
              <Button
                type="button"
                onClick={onPrint}
                className="bg-primary hover:bg-primary text-primary-foreground font-bold uppercase tracking-wider gap-2 rounded-full px-6 h-11"
                disabled={disabled || printing}
              >
                {printing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                {printLabel}
              </Button>
            </div>
          </div>

          {/* ── Capa inferior (preview del documento) ── */}
          <div className="bg-slate-50/60 px-4 pb-6 pt-3">
            <div className="mx-auto w-full max-w-[720px]">
              <div className="relative mx-auto w-full max-w-[560px]">
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-4 flex items-center justify-center min-h-[60mm]">
                  {children}
                </div>

                <p className="absolute -bottom-4 right-0 text-[10px] text-slate-500 max-w-[320px] text-right">
                  {paperNote}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
