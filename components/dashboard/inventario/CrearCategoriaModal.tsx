"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Cpu,
  HardDrive,
  Battery,
  Cable,
  Headphones,
  Camera,
  Watch,
  Gamepad2,
  Printer,
  Wrench,
  Truck,
  Package,
  Tag,
  Shirt,
  Book,
  Zap,
  Heart,
  Settings,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react"

const CATEGORY_ICONS: { icon: LucideIcon; label: string; value: string }[] = [
  { icon: Smartphone, label: "Smartphone", value: "Smartphone" },
  { icon: Tablet, label: "Tablet", value: "Tablet" },
  { icon: Laptop, label: "Laptop", value: "Laptop" },
  { icon: Monitor, label: "Monitor", value: "Monitor" },
  { icon: Cpu, label: "CPU", value: "Cpu" },
  { icon: HardDrive, label: "Disco", value: "HardDrive" },
  { icon: Battery, label: "Bateria", value: "Battery" },
  { icon: Cable, label: "Cable", value: "Cable" },
  { icon: Headphones, label: "Audifonos", value: "Headphones" },
  { icon: Camera, label: "Camara", value: "Camera" },
  { icon: Watch, label: "Reloj", value: "Watch" },
  { icon: Gamepad2, label: "Consola", value: "Gamepad2" },
  { icon: Printer, label: "Impresora", value: "Printer" },
  { icon: Wrench, label: "Herramienta", value: "Wrench" },
  { icon: Truck, label: "Transporte", value: "Truck" },
  { icon: Package, label: "Paquete", value: "Package" },
  { icon: Tag, label: "Accesorio", value: "Tag" },
  { icon: Shirt, label: "Ropa", value: "Shirt" },
  { icon: Book, label: "Libro", value: "Book" },
  { icon: Zap, label: "Energia", value: "Zap" },
  { icon: Heart, label: "Salud", value: "Heart" },
  { icon: Settings, label: "General", value: "Settings" },
  { icon: MoreHorizontal, label: "Otro", value: "MoreHorizontal" },
]

export function CrearCategoriaModal({
  open,
  onClose,
  onSave,
  mode = "create",
  initialNombre = "",
  initialIcono = "",
  initialAliases = [],
}: {
  open: boolean
  onClose: () => void
  onSave: (payload: { nombre: string; icono: string; aliases: string[] }) => Promise<void>
  mode?: "create" | "edit"
  initialNombre?: string
  initialIcono?: string
  initialAliases?: string[]
}) {
  const [nombre, setNombre] = useState(initialNombre)
  const [icono, setIcono] = useState(initialIcono)
  const [aliases, setAliases] = useState(initialAliases.join(", "))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const aliasesSeed = initialAliases.join(",")

  const parsedAliases = useMemo(
    () =>
      Array.from(
        new Set(
          aliases
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ),
    [aliases],
  )

  useEffect(() => {
    if (!open) return
    setNombre(initialNombre)
    setIcono(initialIcono)
    setAliases(aliasesSeed)
    setError(null)
  }, [open, initialNombre, initialIcono, aliasesSeed])

  const handleSubmit = async () => {
    const trimmed = nombre.trim()
    if (!trimmed) {
      setError("El nombre de la categoria es obligatorio")
      return
    }
    if (!icono) {
      setError("Selecciona un icono para la categoria")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({ nombre: trimmed, icono, aliases: parsedAliases })
      setNombre("")
      setIcono("")
      setAliases("")
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar la categoria")
    } finally {
      setSaving(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setNombre("")
      setIcono("")
      setAliases("")
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-white border border-slate-200/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm rounded-2xl">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base font-semibold tracking-wide text-slate-900">
            {mode === "edit" ? "Editar Categoria" : "Nueva Categoria"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {mode === "edit"
              ? "Actualiza nombre, icono y alias para mantener el catalogo limpio."
              : "Crea una categoria personalizada con nombre, icono y alias opcionales."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Nombre
            </Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Cargadores, Fundas, Pantallas..."
              className="bg-white border-slate-200 rounded-xl min-h-[48px] placeholder:text-slate-300 placeholder:font-medium"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSubmit()
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Icono
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {CATEGORY_ICONS.map(({ icon: Icon, label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setIcono(value)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-2 transition-all",
                    icono === value
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700",
                  )}
                  title={label}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[8px] font-semibold uppercase leading-tight text-inherit">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Alias / sinonimos
            </Label>
            <Input
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="Ej. fundas, case, forro"
              className="bg-white border-slate-200 rounded-xl min-h-[48px] placeholder:text-slate-300 placeholder:font-medium"
            />
            <p className="text-[10px] text-slate-400">Separados por coma. Ayudan a buscar y evitar duplicados.</p>
          </div>

          {error && (
            <p className="text-[11px] font-medium text-red-500 flex items-center gap-1.5">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="rounded-xl border-slate-200 text-slate-700"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white btn-glow rounded-xl"
          >
            {saving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
