import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSearch,
  Pencil,
  RefreshCcw,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Cotizacion } from "@/lib/actions/cotizaciones"
import { CotizacionStatusBadge } from "@/components/dashboard/cotizaciones/cotizacion-status-badge"

interface CotizacionesListProps {
  data: Cotizacion[]
  onDetail: (cotizacion: Cotizacion) => void
  onEdit: (cotizacion: Cotizacion) => void
  onWhatsApp: (cotizacion: Cotizacion) => void
  onConvert: (cotizacion: Cotizacion) => void
  onSetAceptada: (cotizacion: Cotizacion) => void
  onSetRechazada: (cotizacion: Cotizacion) => void
  onDuplicate: (cotizacion: Cotizacion) => void
}

export function CotizacionesList(props: CotizacionesListProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="w-full overflow-x-auto">
        <table className="min-w-[1180px] w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr className="text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Equipo / articulo</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {props.data.map((cotizacion) => (
              <tr key={cotizacion.id} className="border-b border-slate-100 text-sm text-slate-700">
                <td className="px-4 py-3 font-bold text-slate-900">{cotizacion.folio}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{cotizacion.cliente_nombre}</p>
                  <p className="text-xs text-slate-500">{cotizacion.cliente_telefono || "Sin telefono"}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{cotizacion.equipo_tipo}</p>
                  <p className="text-xs text-slate-500">{cotizacion.marca} {cotizacion.modelo}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
                    {cotizacion.origen}
                  </span>
                </td>
                <td className="px-4 py-3 font-black text-slate-900">${cotizacion.total.toFixed(2)}</td>
                <td className="px-4 py-3"><CotizacionStatusBadge estado={cotizacion.estado} /></td>
                <td className="px-4 py-3 text-xs text-slate-500">{cotizacion.fecha}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <ActionButton icon={<FileSearch className="h-3.5 w-3.5" />} label="Ver" onClick={() => props.onDetail(cotizacion)} />
                    <ActionButton icon={<Pencil className="h-3.5 w-3.5" />} label="Editar" onClick={() => props.onEdit(cotizacion)} />
                    <ActionButton icon={<Copy className="h-3.5 w-3.5" />} label="Duplicar" onClick={() => props.onDuplicate(cotizacion)} />
                    <ActionButton icon={<ExternalLink className="h-3.5 w-3.5" />} label="WhatsApp" onClick={() => props.onWhatsApp(cotizacion)} />
                    <ActionButton
                      icon={<RefreshCcw className="h-3.5 w-3.5" />}
                      label="Convertir"
                      onClick={() => props.onConvert(cotizacion)}
                      disabled={cotizacion.estado === "convertida"}
                    />
                    <ActionButton
                      icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      label="Aceptar"
                      onClick={() => props.onSetAceptada(cotizacion)}
                      disabled={cotizacion.estado === "aceptada" || cotizacion.estado === "convertida"}
                    />
                    <ActionButton
                      icon={<XCircle className="h-3.5 w-3.5" />}
                      label="Rechazar"
                      onClick={() => props.onSetRechazada(cotizacion)}
                      disabled={cotizacion.estado === "rechazada" || cotizacion.estado === "convertida"}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ActionButton(props: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
    >
      {props.icon}
      <span className="ml-1">{props.label}</span>
    </Button>
  )
}
