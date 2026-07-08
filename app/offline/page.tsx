import Link from "next/link"
import { CloudOff, RefreshCw, Smartphone, Wrench } from "lucide-react"

export const metadata = {
  title: "Modo offline",
  description: "Pantalla de contingencia de ReparaHub cuando no hay conexion.",
}

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(21,94,239,0.18),_transparent_42%),linear-gradient(135deg,#EFF8FF_0%,#FFFFFF_52%,#F8FAFC_100%)] p-6 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <CloudOff className="h-7 w-7" />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-blue-700">
              PWA de emergencia
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              ReparaHub sigue contigo aunque falte la red
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Esta version instalada puede abrir una vista segura mientras vuelve la conexion.
              Los borradores y tickets en cola siguen protegidos localmente, pero el dashboard
              completo necesita internet para cargar datos nuevos.
            </p>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
            <InfoCard
              icon={<Wrench className="h-5 w-5" />}
              title="Captura protegida"
              description="Los flujos que ya guardan borradores locales o cola IndexedDB pueden retomarse cuando regrese la senal."
            />
            <InfoCard
              icon={<RefreshCw className="h-5 w-5" />}
              title="Sincronizacion posterior"
              description="En cuanto vuelvas a estar online, ReparaHub intentara reconectar y subir lo pendiente."
            />
            <InfoCard
              icon={<Smartphone className="h-5 w-5" />}
              title="Instalada como app"
              description="Si agregaste ReparaHub a tu pantalla de inicio, puedes abrirla como app standalone desde aqui."
            />
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Vuelve a intentar cuando haya conexion o abre el centro de ayuda para repasar el modo offline.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 btn-glow"
                >
                  Reintentar dashboard
                </Link>
                <Link
                  href="/dashboard/ayuda#offline"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  Ver ayuda offline
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        {icon}
      </div>
      <h2 className="mt-4 text-base font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}
