"use client"

import { useState, useEffect, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Wrench } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { createServicio, updateServicio } from "@/lib/actions/servicios-prisma"
import type { Servicio } from "@/lib/actions/servicios-prisma"

interface ServicioModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  servicio?: Servicio | null
}

export function ServicioModal({ open, onClose, onSuccess, servicio }: ServicioModalProps) {
  const isEdit = !!servicio
  const [nombre, setNombre] = useState(servicio?.nombre ?? "")
  const [descripcion, setDescripcion] = useState(servicio?.descripcion ?? "")
  const [precio, setPrecio] = useState(servicio?.precio?.toString() ?? "")
  const [saving, startSaving] = useTransition()

  useEffect(() => {
    if (open) {
      setNombre(servicio?.nombre ?? "")
      setDescripcion(servicio?.descripcion ?? "")
      setPrecio(servicio?.precio?.toString() ?? "")
    }
  }, [open, servicio])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const priceNum = parseFloat(precio)
    if (!nombre.trim()) {
      toast({ variant: "destructive", title: "Nombre requerido" })
      return
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast({ variant: "destructive", title: "Precio invalido" })
      return
    }

    startSaving(async () => {
      if (isEdit && servicio) {
        const { error } = await updateServicio(servicio.id, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          precio: priceNum,
        })
        if (error) {
          toast({ variant: "destructive", title: "Error", description: error })
        } else {
          toast({ title: "Servicio actualizado" })
          onSuccess()
          onClose()
        }
      } else {
        const { error } = await createServicio({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          precio: priceNum,
        })
        if (error) {
          toast({ variant: "destructive", title: "Error", description: error })
        } else {
          toast({ title: "Servicio creado" })
          setNombre("")
          setDescripcion("")
          setPrecio("")
          onSuccess()
          onClose()
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Wrench className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {isEdit ? "Editar Servicio" : "Nuevo Servicio"}
            </DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="svc-nombre" className="text-sm font-semibold text-slate-700">
              Nombre del servicio
            </Label>
            <Input
              id="svc-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Formateo sin respaldo Windows"
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="svc-desc" className="text-sm font-semibold text-slate-700">
              Descripcion
            </Label>
            <Textarea
              id="svc-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Incluye instalacion de sistema operativo, office y programas basicos."
              className="min-h-[80px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="svc-precio" className="text-sm font-semibold text-slate-700">
              Precio (MXN)
            </Label>
            <Input
              id="svc-precio"
              type="number"
              step="0.01"
              min="0"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="0.00"
              className="h-11"
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white btn-glow"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
