import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { CotizacionEstado } from "@/lib/actions/cotizaciones"

export type FiltroCotizaciones = "todas" | CotizacionEstado

const FILTERS: Array<{ value: FiltroCotizaciones; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "aceptada", label: "Aceptadas" },
  { value: "rechazada", label: "Rechazadas" },
]

export function CotizacionesToolbar(props: {
  search: string
  onSearch: (value: string) => void
  filtro: FiltroCotizaciones
  onFiltro: (value: FiltroCotizaciones) => void
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={props.search}
            onChange={(event) => props.onSearch(event.target.value)}
            placeholder="Buscar por cliente, marca, modelo o folio..."
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const active = props.filtro === filter.value
            return (
              <Button
                key={filter.value}
                type="button"
                onClick={() => props.onFiltro(filter.value)}
                className={
                  active
                    ? "h-9 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"
                    : "h-9 rounded-xl border border-slate-200 bg-slate-100 px-4 text-xs font-bold text-slate-600 hover:bg-slate-200"
                }
              >
                {filter.label}
              </Button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
