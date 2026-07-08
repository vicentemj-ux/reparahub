"use client"

import { useState, useTransition, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Printer, Save } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { TallerSettings } from "@/lib/actions/settings-prisma"
import { updateTallerSettings } from "@/lib/actions/settings-prisma"
import type { DocumentType } from "@/lib/print/demo-data"
import {
  getDefaultConfig,
  parseImpresionConfig,
  buildImpresionConfigPayload,
  type DocConfig,
} from "./imprenta-types"
import {
  directPrintConfigToPayload,
  parseDirectPrintConfig,
  type DirectPrintConfig,
} from "@/lib/printing/direct-print-config"
import { ImprentaDocumentSelector } from "./ImprentaDocumentSelector"
import { ImprentaControlsPanel } from "./ImprentaControlsPanel"
import { ImprentaPreviewCanvas } from "./ImprentaPreviewCanvas"
import { PrintSettingsReminder } from "@/components/printing/shared/PrintSettingsReminder"
import { DirectPrintPanel } from "./DirectPrintPanel"

interface ImprentaProps {
  settings: TallerSettings | null
}

export function Imprenta({ settings }: ImprentaProps) {
  const [selectedDoc, setSelectedDoc] = useState<DocumentType>("reparacion")
  const [config, setConfig] = useState<Record<DocumentType, DocConfig>>(() => {
    if (settings?.impresion_config) {
      return parseImpresionConfig(settings.impresion_config)
    }
    return getDefaultConfig()
  })
  const [mensajeDespedidaGlobal, setMensajeDespedidaGlobal] = useState(
    settings?.mensaje_despedida || ""
  )
  const [directPrint, setDirectPrint] = useState<DirectPrintConfig>(() =>
    parseDirectPrintConfig(settings?.impresion_config?.directPrint)
  )
  const [saving, startSaving] = useTransition()
  const [printing, startPrinting] = useTransition()

  const updateDocConfig = useCallback(
    (next: DocConfig) => {
      setConfig((prev) => ({ ...prev, [selectedDoc]: next }))
    },
    [selectedDoc]
  )

  const handleSave = () => {
    startSaving(async () => {
      const { error } = await updateTallerSettings({
        impresion_config: {
          ...buildImpresionConfigPayload(config),
          directPrint: directPrintConfigToPayload(directPrint),
        },
        mensaje_despedida: mensajeDespedidaGlobal,
      })
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error })
      } else {
        toast({ title: "Guardado", description: "Configuracion de impresion actualizada." })
      }
    })
  }

  const handlePrintTest = () => {
    startPrinting(async () => {
      // En fases posteriores se integrara con imprimirTicket()
      toast({
        title: "Impresion de prueba",
        description: `Se enviara una prueba de ${selectedDoc} a la impresora configurada (proximamente).`,
      })
    })
  }

  const currentConfig = config[selectedDoc]

  return (
    <div className="space-y-6">
      {/* Recordatorio de ajustes del dialog de impresion - critico para calidad termica */}
      <PrintSettingsReminder variant="panel" />

      <DirectPrintPanel
        config={directPrint}
        onChange={setDirectPrint}
        tenantId={settings?.taller_id}
        tallerNombre={settings?.nombre_taller}
        tallerTelefono={settings?.telefono}
      />

      {/* Mensaje de agradecimiento global */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <Label className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase block mb-2">
          Mensaje de agradecimiento (global para todos los tickets)
        </Label>
        <Textarea
          value={mensajeDespedidaGlobal}
          onChange={(e) => setMensajeDespedidaGlobal(e.target.value)}
          placeholder="Ej. ¡Gracias por confiar en nosotros! Síguenos en redes sociales."
          className="min-h-[60px] border-slate-200 bg-white text-sm resize-y"
        />
        <p className="text-[11px] text-slate-500 mt-1.5">
          Este mensaje aparece al final de todos los tickets impresos.
        </p>
      </div>

      {/* Selector de documento */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">
          Tipo de documento
        </h3>
        <ImprentaDocumentSelector selected={selectedDoc} onSelect={setSelectedDoc} />
      </div>

      {/* Layout 45/55 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel de controles — 45% en desktop */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Configuración —{" "}
              {selectedDoc.charAt(0).toUpperCase() + selectedDoc.slice(1)}
            </h4>
            <ImprentaControlsPanel
              docType={selectedDoc}
              config={currentConfig}
              onChange={updateDocConfig}
            />
          </div>

          {/* Botones de accion */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handlePrintTest}
              disabled={printing}
              className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              {printing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Printer className="h-4 w-4 mr-2" />
              Imprimir prueba
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white btn-glow"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Guardar cambios
            </Button>
          </div>
        </div>

        {/* Canvas de preview — 55% en desktop */}
        <div className="lg:col-span-7">
          <ImprentaPreviewCanvas docType={selectedDoc} config={currentConfig} settings={settings} />
        </div>
      </div>
    </div>
  )
}

