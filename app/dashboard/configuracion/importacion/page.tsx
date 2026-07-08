import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { ChevronLeft, DatabaseBackup } from "lucide-react"
import Link from "next/link"

const ImportadorFolios = dynamic(() => import("@/components/dashboard/configuracion/importador-folios").then(m => m.ImportadorFolios))

export default function ImportacionPage() {
  return (
    <div className="w-full space-y-6 p-6 lg:px-8 xl:px-10 2xl:px-12">
      {/* Header con migas de pan (breadcrumbs) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/configuracion">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <DatabaseBackup className="h-6 w-6 text-blue-600" />
              Importacion de Historial
            </h1>
            <p className="text-sm text-slate-500">
              Migra tus datos de Morelos, Reparatech o sistemas externos.
            </p>
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* El componente maestro que ya creamos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <ImportadorFolios />
      </div>
    </div>
  )
}
