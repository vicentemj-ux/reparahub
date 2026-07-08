import {
  Wrench,
  DollarSign,
  Package,
  Tag,
  Barcode,
  type LucideIcon,
} from "lucide-react"
import type { DocumentType } from "@/lib/print/demo-data"

export interface DocConfig {
  formato: "80mm" | "A4"
  mostrarLogo: boolean
  mostrarTecnico: boolean
  mostrarPrecios: boolean
  mostrarRedesSociales: boolean
  terminos: string
  despedida: string
  declaracionJurat: string
}

export const DEFAULT_DOC_CONFIG: DocConfig = {
  formato: "80mm",
  mostrarLogo: true,
  mostrarTecnico: true,
  mostrarPrecios: true,
  mostrarRedesSociales: false,
  terminos: "",
  despedida: "¡Gracias por su preferencia!",
  declaracionJurat: "",
}

export const DOCUMENT_TYPES: {
  id: DocumentType
  label: string
  icon: LucideIcon
  description: string
}[] = [
  {
    id: "reparacion",
    label: "Reparacion",
    icon: Wrench,
    description: "Ticket de recepcion y cobro",
  },
  {
    id: "venta",
    label: "Venta / POS",
    icon: DollarSign,
    description: "Ticket de punto de venta",
  },
  {
    id: "compra",
    label: "Compra",
    icon: Package,
    description: "Adquisicion de equipos usados",
  },
  {
    id: "etiqueta",
    label: "Etiqueta",
    icon: Tag,
    description: "Etiqueta de reparacion 2x1″",
  },
  {
    id: "barras",
    label: "Barras",
    icon: Barcode,
    description: "Etiqueta de producto en venta",
  },
]

export function getDefaultConfig(): Record<DocumentType, DocConfig> {
  return {
    reparacion: {
      ...DEFAULT_DOC_CONFIG,
      terminos:
        "Garantia de 30 dias en reparaciones. No cubre danos por liquidos ni golpes posteriores.",
    },
    venta: {
      ...DEFAULT_DOC_CONFIG,
      mostrarTecnico: false,
      terminos:
        "Garantia de 30 dias en reparaciones. Los accesorios no tienen cambio ni devolucion.",
    },
    compra: {
      ...DEFAULT_DOC_CONFIG,
      formato: "A4",
      mostrarTecnico: false,
      declaracionJurat:
        "Yo, {{vendedor}}, identificado con {{documento}}, declaro que el equipo {{marca}} {{modelo}} con serial {{serial}} e IMEI {{imei}} es de mi propiedad, me funciona correctamente y lo vendo libre de adeudos por la cantidad de ${{monto}}.",
    },
    etiqueta: {
      ...DEFAULT_DOC_CONFIG,
      formato: "80mm",
      mostrarLogo: false,
      mostrarTecnico: false,
      mostrarPrecios: true,
      mostrarRedesSociales: false,
      despedida: "",
      terminos: "",
    },
    barras: {
      ...DEFAULT_DOC_CONFIG,
      formato: "80mm",
      mostrarLogo: false,
      mostrarTecnico: false,
      mostrarPrecios: true,
      mostrarRedesSociales: false,
      despedida: "",
      terminos: "",
    },
  }
}

function normalizeFormato(v: unknown): DocConfig["formato"] {
  if (v === "A4" || v === "carta") return "A4"
  if (v === "80mm" || v === "58mm") return "80mm"
  return "80mm"
}

export function parseImpresionConfig(raw: unknown): Record<DocumentType, DocConfig> {
  const defaults = getDefaultConfig()
  if (!raw || typeof raw !== "object") return defaults
  const obj = raw as Record<string, unknown>

  const result = { ...defaults }
  for (const key of Object.keys(defaults) as DocumentType[]) {
    const docRaw = obj[key]
    if (docRaw && typeof docRaw === "object") {
      const d = docRaw as Record<string, unknown>
      result[key] = {
        formato: normalizeFormato(d.formato) ?? defaults[key].formato,
        mostrarLogo: Boolean(d.mostrarLogo ?? defaults[key].mostrarLogo),
        mostrarTecnico: Boolean(d.mostrarTecnico ?? defaults[key].mostrarTecnico),
        mostrarPrecios: Boolean(d.mostrarPrecios ?? defaults[key].mostrarPrecios),
        mostrarRedesSociales: Boolean(d.mostrarRedesSociales ?? defaults[key].mostrarRedesSociales),
        terminos: String(d.terminos ?? defaults[key].terminos),
        despedida: String(d.despedida ?? defaults[key].despedida),
        declaracionJurat: String(d.declaracionJurat ?? defaults[key].declaracionJurat),
      }
    }
  }
  return result
}

export function buildImpresionConfigPayload(
  config: Record<DocumentType, DocConfig>
): Record<string, unknown> {
  return config as unknown as Record<string, unknown>
}
