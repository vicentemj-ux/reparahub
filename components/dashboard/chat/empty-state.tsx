import { MessageSquareDashed } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-blue-100 bg-blue-50 shadow-sm">
        <MessageSquareDashed className="h-9 w-9 text-blue-600" aria-hidden />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
        Canal General del Taller
      </p>
      <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">
        Bienvenido al chat interno
      </h3>
      <p className="mt-2 max-w-xl text-sm text-slate-500">
        Aqui pueden coordinar diagnosticos, entregas, pendientes y avisos operativos del dia sin salir de ReparaHub.
      </p>
    </div>
  )
}
