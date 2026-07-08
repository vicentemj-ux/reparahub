import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle2, AlertCircle, Info, XCircle, Loader2 } from "lucide-react"

/**
 * Toaster global de ReparaHub - estilo claro institucional (pill shape).
 *
 * - Success: fondo blanco, icono emerald, titulo uppercase tracking-widest
 * - Error: fondo blanco, icono rojo
 * - Warning: fondo blanco, icono ambar
 * - Info: fondo blanco, icono azul
 * - Todos los toast: border-radius 9999px (pill), close button siempre visible
 *
 * Montado en app/layout.tsx.
 *
 * IMPORTANTE: todos los imports deben ser de "@/hooks/use-toast", nunca de "sonner".
 * Ver AGENTS.md para convenciones de uso.
 */
const Toaster = (props: ToasterProps) => (
  <Sonner
    closeButton
    position="top-right"
    offset={200}
    duration={4000}
    expand={false}
    icons={{
      success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
      error: <XCircle className="h-4 w-4 text-red-400" />,
      info: <Info className="h-4 w-4 text-blue-400" />,
      warning: <AlertCircle className="h-4 w-4 text-amber-400" />,
      loading: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
    }}
    toastOptions={{
      classNames: {
        toast:
          "!bg-white !text-slate-900 !border-slate-200 !rounded-full !px-5 !py-3 !shadow-lg !shadow-slate-200/70",
        title:
          "!text-[11px] !font-bold !uppercase !tracking-widest !text-slate-900",
        description:
          "!text-[11px] !text-slate-600 !font-medium",
        closeButton:
          "!bg-transparent !text-slate-400 hover:!text-slate-700 !border-slate-200",
      },
    }}
    {...props}
  />
)

export { Toaster }
