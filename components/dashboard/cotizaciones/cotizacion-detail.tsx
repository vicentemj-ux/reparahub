import { Copy } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Cotizacion } from "@/lib/actions/cotizaciones"
import { CotizacionStatusBadge } from "@/components/dashboard/cotizaciones/cotizacion-status-badge"

export function CotizacionDetail(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cotizacion: Cotizacion | null
}) {
  const router = useRouter()

  const handleDuplicate = () => {
    if (!props.cotizacion) return
    router.push(`/dashboard/cotizaciones/nueva?dup=${encodeURIComponent(props.cotizacion.id)}`)
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl border-slate-200 bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-black text-slate-900">
            Detalle de cotizacion {props.cotizacion?.folio ?? ""}
          </DialogTitle>
        </DialogHeader>
        {!props.cotizacion ? null : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <CotizacionStatusBadge estado={props.cotizacion.estado} />
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
                {props.cotizacion.origen}
              </span>
              <span className="text-xs text-slate-500">Cliente: {props.cotizacion.cliente_nombre}</span>
              <Button
                type="button"
                onClick={handleDuplicate}
                className="ml-auto h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="ml-1">Duplicar</span>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-2">
              <p><strong>Telefono:</strong> {props.cotizacion.cliente_telefono || "N/A"}</p>
              <p><strong>Equipo:</strong> {props.cotizacion.equipo_tipo}</p>
              <p><strong>Marca:</strong> {props.cotizacion.marca}</p>
              <p><strong>Modelo:</strong> {props.cotizacion.modelo}</p>
              <p><strong>Fecha:</strong> {props.cotizacion.fecha}</p>
              <p><strong>Expira:</strong> {props.cotizacion.fecha_expiracion || "Sin vencimiento"}</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Principal</th>
                    <th className="px-3 py-2">Descripcion</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">P. Unitario</th>
                    <th className="px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {props.cotizacion.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{item.orden === 0 ? "⭐" : ""}</td>
                      <td className="px-3 py-2">{item.descripcion}</td>
                      <td className="px-3 py-2">{item.cantidad}</td>
                      <td className="px-3 py-2">${item.precio_unitario.toFixed(2)}</td>
                      <td className="px-3 py-2 font-semibold">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ml-auto w-full max-w-xs space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <p className="flex justify-between"><span>Subtotal</span><strong>${props.cotizacion.subtotal.toFixed(2)}</strong></p>
              <p className="flex justify-between"><span>Descuento</span><strong>${props.cotizacion.descuento.toFixed(2)}</strong></p>
              <p className="flex justify-between text-base"><span>Total</span><strong>${props.cotizacion.total.toFixed(2)}</strong></p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
