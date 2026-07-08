import { CheckCircle2, Clock3, FileText, TrendingUp, XCircle } from "lucide-react"
import type { CotizacionOrigen } from "@/lib/actions/cotizaciones"

interface Stats {
  total: number
  pendientes: number
  aceptadas: number
  rechazadas: number
}

export interface OrigenStatsData {
  total: number
  porOrigen: Record<CotizacionOrigen, number>
  conversionPct: number
  autorizadas: number
}

interface CotizacionesStatsProps {
  stats: Stats
  origenStats?: OrigenStatsData | null
}

function StatCard(props: { title: string; value: number | string; icon: React.ReactNode; iconBg: string; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${props.iconBg}`}>{props.icon}</div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{props.title}</p>
          <p className="text-3xl font-black leading-none text-slate-900">
            {props.value}
            {props.suffix ? <span className="ml-0.5 text-base font-bold text-slate-500">{props.suffix}</span> : null}
          </p>
        </div>
      </div>
    </div>
  )
}

export function CotizacionesStats({ stats, origenStats }: CotizacionesStatsProps) {
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Generado" value={stats.total} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50" />
        <StatCard title="Pendientes" value={stats.pendientes} icon={<Clock3 className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50" />
        <StatCard title="Aceptadas" value={stats.aceptadas} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50" />
        <StatCard title="Rechazadas" value={stats.rechazadas} icon={<XCircle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50" />
        <StatCard
          title="% Conversion"
          value={origenStats ? origenStats.conversionPct : 0}
          icon={<TrendingUp className="h-4 w-4 text-slate-900" />}
          iconBg="bg-slate-100"
          suffix="%"
        />
      </div>
    </section>
  )
}
