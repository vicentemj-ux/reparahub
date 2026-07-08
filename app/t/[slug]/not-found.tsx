import Link from "next/link"
import { Store } from "lucide-react"

export default function TiendaNotFound() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
          <Store className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Tienda no disponible
        </h1>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          La tienda que buscas no existe o aun no ha sido activada por su propietario.
        </p>
        <Link
          href="https://reparahub.com"
          className="mt-6 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Conocer ReparaHub
        </Link>
      </div>
    </div>
  )
}
