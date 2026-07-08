/**
 * Shim de compatibilidad: mapea la API legacy de Radix Toast a Sonner.
 *
 * Todos los componentes que usen:
 *   import { toast } from "@/hooks/use-toast"
 *   toast({ title: "...", description: "...", variant: "destructive" })
 *
 * ...siguen funcionando sin cambiar ninguna llamada.
 *
 * Mapeo de variantes:
 *   "destructive"  → toast.error()    (rojo)
 *   "warning"      → toast.warning()  (ambar)
 *   "info"         → toast.info()     (azul)
 *   "default" | sin variant → toast.success() (verde)
 *
 * Convenciones (ver AGENTS.md):
 *   - Success: solo titulo
 *   - Error: titulo + description con detalle
 *   - Warning: titulo + description corta
 *   - Info: titulo + description explicativa
 *   - Todos los imports deben ser de "@\/hooks\/use-toast"
 */
import { toast as sonner } from "sonner"

type ToastVariant = "default" | "destructive" | "warning" | "info"

type ToastInput = {
  title?: string
  description?: string
  variant?: ToastVariant
  /** Duracion en ms (opcional, default heredado del Toaster global) */
  duration?: number
  className?: string
  /** Boton inline del toast (feature Sonner) */
  action?: { label: string; onClick: () => void }
}

function toast({ title = "", description, variant, duration, action }: ToastInput) {
  const opts = {
    ...(description ? { description } : {}),
    ...(duration    ? { duration }    : {}),
    ...(action      ? { action }      : {}),
  }

  switch (variant) {
    case "destructive":
      sonner.error(title, opts)
      break
    case "warning":
      sonner.warning(title, opts)
      break
    case "info":
      sonner.info(title, opts)
      break
    default:
      sonner.success(title, opts)
      break
  }
}

// Variantes de conveniencia - para nuevos componentes que quieran la API moderna directa
toast.success = (title: string, opts?: Omit<ToastInput, "title" | "variant">) =>
  sonner.success(title, opts)

toast.error = (title: string, opts?: Omit<ToastInput, "title" | "variant">) =>
  sonner.error(title, opts)

toast.info = (title: string, opts?: Omit<ToastInput, "title" | "variant">) =>
  sonner.info(title, opts)

toast.warning = (title: string, opts?: Omit<ToastInput, "title" | "variant">) =>
  sonner.warning(title, opts)

toast.loading = (title: string, opts?: Omit<ToastInput, "title" | "variant">) =>
  sonner.loading(title, opts)

toast.dismiss = (id?: string | number) => sonner.dismiss(id)

/** Hook legacy - algunos componentes hacen const { toast } = useToast() */
function useToast() {
  return { toast }
}

export { useToast, toast }
