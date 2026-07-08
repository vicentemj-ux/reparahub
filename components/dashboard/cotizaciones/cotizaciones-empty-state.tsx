import { FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CotizacionesEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-16 shadow-sm">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
          <FileText className="h-8 w-8 text-slate-300" />
        </div>
        <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-900">NO SE ENCONTRARON COTIZACIONES</h3>
        <p className="mt-2 text-sm text-slate-500">
          Genera tu primera cotizacion formal para el cliente y facilitales la toma de decisiones.
        </p>
        <Button
          type="button"
          onClick={onCreate}
          className="btn-glow mt-6 h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Crear primera cotizacion
        </Button>
      </div>
    </section>
  )
}
