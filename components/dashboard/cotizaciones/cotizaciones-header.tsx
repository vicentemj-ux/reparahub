import { FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModuleHeader } from "@/components/dashboard/module-header"

export function CotizacionesHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <ModuleHeader
      icon={FileText}
      title="MODULO DE COTIZACIONES"
      eyebrow="COTIZACIONES PRO"
      description="Genera presupuestos dinamicos, envialos por WhatsApp y conviertelos a orden fisica en un clic"
      actions={
        <Button
          type="button"
          onClick={onCreate}
          className="btn-glow h-11 rounded-xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva cotizacion
        </Button>
      }
    />
  )
}
