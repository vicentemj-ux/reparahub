"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Printer, FileText, Info, AlertTriangle } from "lucide-react"
import type { DocumentType } from "@/lib/print/demo-data"
import type { DocConfig } from "./imprenta-types"

interface ImprentaControlsPanelProps {
  docType: DocumentType
  config: DocConfig
  onChange: (next: DocConfig) => void
}

export function ImprentaControlsPanel({
  docType,
  config,
  onChange,
}: ImprentaControlsPanelProps) {
  const patch = (partial: Partial<DocConfig>) => {
    onChange({ ...config, ...partial })
  }

  const isLabel = docType === "etiqueta" || docType === "barras"
  const isCompra = docType === "compra"

  // ── Panel de instrucciones para etiquetas ───────────────────────────────
  if (isLabel) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-amber-900">Nota de impresion</h5>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Para etiquetas, recomendamos usar impresoras termicas de etiquetas
                (ej. Zebra, Dymo) con el tamano de papel ajustado en el driver.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-slate-500" />
            <h5 className="text-xs font-bold uppercase tracking-widest text-slate-700">
              ¿Que significa "ajustado en el driver"?
            </h5>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Significa que debes configurar en Windows/Linux/Mac (Propiedades de
            impresora) que el tamano del papel sea identico al que tienes fisicamente
            (ej. 50mm x 25mm), para que el sistema imprima justo en el centro de la
            etiqueta.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h5 className="text-xs font-bold uppercase tracking-widest text-slate-700 mb-3">
            Consejos utiles
          </h5>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              Usa papel termico de buena calidad para evitar que el texto se borre.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              Realiza una prueba de impresion antes de pegar la etiqueta en el equipo.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              Si el texto se corta, revisa que el tamano de pagina en el driver coincida
              con la etiqueta fisica.
            </li>
          </ul>
        </div>
      </div>
    )
  }

  // ── Panel de controles para documentos 1-3 ──────────────────────────────
  return (
    <div className="space-y-6">
      {/* Formato de papel - dos botones grandes */}
      <div className="space-y-2">
        <Label className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
          Formato de papel
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => patch({ formato: "80mm" })}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center transition-all ${
              config.formato === "80mm"
                ? "border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-600"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Printer
              className={`h-5 w-5 ${
                config.formato === "80mm" ? "text-blue-600" : "text-slate-400"
              }`}
            />
            <span
              className={`text-xs font-bold uppercase tracking-wide ${
                config.formato === "80mm" ? "text-blue-700" : "text-slate-700"
              }`}
            >
              Termico 80mm
            </span>
          </button>

          <button
            type="button"
            onClick={() => patch({ formato: "A4" })}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center transition-all ${
              config.formato === "A4"
                ? "border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-600"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <FileText
              className={`h-5 w-5 ${
                config.formato === "A4" ? "text-blue-600" : "text-slate-400"
              }`}
            />
            <span
              className={`text-xs font-bold uppercase tracking-wide ${
                config.formato === "A4" ? "text-blue-700" : "text-slate-700"
              }`}
            >
              Carta / A4
            </span>
          </button>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <Label className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase block">
          Informacion visible
        </Label>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-700">Logotipo</p>
            <p className="text-[11px] text-slate-500">Mostrar logo en la parte superior</p>
          </div>
          <Switch
            checked={config.mostrarLogo}
            onCheckedChange={(v) => patch({ mostrarLogo: v })}
          />
        </div>

        {docType === "reparacion" && (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-slate-700">Tecnico</p>
              <p className="text-[11px] text-slate-500">Incluir nombre del tecnico asignado</p>
            </div>
            <Switch
              checked={config.mostrarTecnico}
              onCheckedChange={(v) => patch({ mostrarTecnico: v })}
            />
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-700">Precios</p>
            <p className="text-[11px] text-slate-500">Mostrar costos y totales</p>
          </div>
          <Switch
            checked={config.mostrarPrecios}
            onCheckedChange={(v) => patch({ mostrarPrecios: v })}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-700">Redes sociales</p>
            <p className="text-[11px] text-slate-500">Incluir links de contacto al final</p>
          </div>
          <Switch
            checked={config.mostrarRedesSociales}
            onCheckedChange={(v) => patch({ mostrarRedesSociales: v })}
          />
        </div>
      </div>

      {/* Textareas */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
            Garantia / Terminos de reparacion
          </Label>
          <Textarea
            value={config.terminos}
            onChange={(e) => patch({ terminos: e.target.value })}
            placeholder="Ej. 30 dias de garantia en mano de obra..."
            className="min-h-[80px] border-slate-200 bg-white text-sm resize-y"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
            Mensaje adicional al pie (agradecimiento)
          </Label>
          <Textarea
            value={config.despedida}
            onChange={(e) => patch({ despedida: e.target.value })}
            placeholder="Gracias por su confianza..."
            className="min-h-[60px] border-slate-200 bg-white text-sm resize-y"
          />
        </div>
      </div>

      {isCompra && (
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
            Declaracion jurada
          </Label>
          <p className="text-[11px] text-slate-500">
            Variables disponibles: {"{{vendedor}}"}, {"{{documento}}"}, {"{{marca}}"}, {"{{modelo}}"},{" "}
            {"{{serial}}"}, {"{{imei}}"}, {"{{monto}}"}
          </p>
          <Textarea
            value={config.declaracionJurat}
            onChange={(e) => patch({ declaracionJurat: e.target.value })}
            placeholder="Texto de declaracion jurada..."
            className="min-h-[120px] border-slate-200 bg-white text-sm resize-y font-mono text-xs"
          />
        </div>
      )}
    </div>
  )
}
