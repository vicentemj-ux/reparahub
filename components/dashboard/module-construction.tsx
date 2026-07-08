import { Construction, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ModuleConstructionProps {
  moduleName: string
  moduleIcon?: React.ReactNode
  description?: string
}

export function ModuleConstruction({ 
  moduleName, 
  moduleIcon,
  description 
}: ModuleConstructionProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] gap-6 p-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
        {moduleIcon || <Construction className="h-10 w-10 text-muted-foreground" />}
      </div>
      
      <div className="text-center space-y-2 max-w-md">
        <h2 className="text-3xl font-bold text-foreground">
          {moduleName}
        </h2>
        <p className="text-muted-foreground">
          {description || "Este modulo esta en construccion. Regresa pronto para nuevas actualizaciones."}
        </p>
      </div>

      <Link href="/dashboard">
        <Button className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Button>
      </Link>
    </div>
  )
}
