"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Lock, Plus, Receipt, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/actions/clients-prisma"
import type { Client } from "@/lib/actions/clients-prisma"

interface ClientCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: Client) => void
}

type FormFields = {
  telefono: string
  nombre: string
  telefono_secundario: string
  correo: string
  notas: string
  rfc: string
  razon_social: string
  codigo_postal_fiscal: string
  regimen_fiscal: string
  uso_cfdi: string
}

const REGIMENES_FISCALES = [
  { value: "601", label: "601 - General de Ley Personas Morales" },
  { value: "605", label: "605 - Sueldos y Salarios" },
  { value: "606", label: "606 - Arrendamiento" },
  { value: "612", label: "612 - Personas Fisicas con Act. Empresariales" },
  { value: "616", label: "616 - Sin obligaciones fiscales" },
  { value: "621", label: "621 - Incorporacion Fiscal" },
  { value: "625", label: "625 - Plataformas Tecnologicas" },
  { value: "626", label: "626 - RESICO" },
] as const

const USOS_CFDI = [
  { value: "S01", label: "S01 - Sin efectos fiscales (Publico general)" },
  { value: "G01", label: "G01 - Adquisicion de mercancias" },
  { value: "G03", label: "G03 - Gastos en general" },
  { value: "I04", label: "I04 - Equipo de computo y accesorios" },
  { value: "I06", label: "I06 - Comunicaciones telefonicas" },
  { value: "D01", label: "D01 - Honorarios medicos" },
  { value: "CP01", label: "CP01 - Pagos" },
  { value: "P01", label: "P01 - Por definir" },
] as const

export function ClientCreateModal({ isOpen, onClose, onSave }: ClientCreateModalProps) {
  const router = useRouter()
  const [showFiscal, setShowFiscal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormFields>({
    telefono: "",
    nombre: "",
    telefono_secundario: "",
    correo: "",
    notas: "",
    rfc: "",
    razon_social: "",
    codigo_postal_fiscal: "",
    regimen_fiscal: "",
    uso_cfdi: "",
  })

  useEffect(() => {
    if (!isOpen) return
    setShowFiscal(false)
    setSaving(false)
    setError(null)
    setForm({
      telefono: "",
      nombre: "",
      telefono_secundario: "",
      correo: "",
      notas: "",
      rfc: "",
      razon_social: "",
      codigo_postal_fiscal: "",
      regimen_fiscal: "",
      uso_cfdi: "",
    })
  }, [isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === "rfc" ? value.toUpperCase() : value,
    }))
  }

  const handleSelect = (field: keyof FormFields, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const result = await createClient({
        telefono: form.telefono,
        nombre: form.nombre,
        telefono_secundario: form.telefono_secundario || null,
        correo: form.correo || null,
        notas: form.notas || null,
        rfc: form.rfc || null,
        razon_social: form.razon_social || null,
        codigo_postal_fiscal: form.codigo_postal_fiscal || null,
        regimen_fiscal: form.regimen_fiscal || null,
        uso_cfdi: form.uso_cfdi || null,
      })

      if (result.error || !result.client) {
        setError(result.error ?? "No se pudo crear el cliente")
        return
      }

      onSave(result.client)
      router.refresh()
      onClose()
    } catch {
      setError("Error de conexion. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg w-[95vw] max-h-[90vh] flex flex-col gap-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-xl"
      >
        <DialogHeader className="shrink-0 gap-0 border-0 bg-transparent p-0">
          <div
            className="relative rounded-t-3xl px-5 py-3 pr-14"
            style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" }}
          >
            <DialogTitle className="sr-only">Nuevo cliente</DialogTitle>
            <DialogDescription className="sr-only">Alta de nuevo cliente</DialogDescription>
            <div className="flex items-center justify-between gap-3 min-w-0">
              <span className="text-xl font-black italic leading-tight tracking-tight text-white truncate">
                NUEVO CLIENTE
              </span>
              <div className="flex shrink-0 gap-0.5 rounded-xl border border-slate-200 bg-blue-50 p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowFiscal(false)}
                  className={cn(
                    "h-7 gap-1.5 rounded-lg px-2.5 text-[11px] font-bold uppercase tracking-wide transition-all",
                    !showFiscal
                      ? "bg-blue-100 text-white hover:bg-blue-100"
                      : "text-slate-500 hover:bg-blue-50 hover:text-blue-700/60",
                  )}
                >
                  <Lock className="h-3 w-3" />
                  Basico
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowFiscal(true)}
                  className={cn(
                    "h-7 gap-1.5 rounded-lg px-2.5 text-[11px] font-bold uppercase tracking-wide transition-all",
                    showFiscal
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "text-slate-500 hover:bg-blue-50 hover:text-blue-700/60",
                  )}
                >
                  <Receipt className="h-3 w-3" />
                  Facturacion
                </Button>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute right-3 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <form id="client-create-form" onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="telefono" className="text-xs font-semibold text-slate-700">
                  Telefono Principal
                </Label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="6681234567"
                  type="tel"
                  required
                  autoFocus
                  className="h-10 rounded-xl border-slate-200 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-xs font-semibold text-slate-700">
                  Nombre Completo
                </Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Maria Lopez Garcia"
                  required
                  className="h-10 rounded-xl border-slate-200 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="telefono_secundario" className="text-xs font-semibold text-slate-700">
                  Tel. Secundario <span className="font-normal text-slate-500">(opc.)</span>
                </Label>
                <Input
                  id="telefono_secundario"
                  name="telefono_secundario"
                  value={form.telefono_secundario}
                  onChange={handleChange}
                  placeholder="6689876543"
                  type="tel"
                  className="h-10 rounded-xl border-slate-200 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="correo" className="text-xs font-semibold text-slate-700">
                  Correo <span className="font-normal text-slate-500">(opc.)</span>
                </Label>
                <Input
                  id="correo"
                  name="correo"
                  value={form.correo}
                  onChange={handleChange}
                  placeholder="cliente@email.com"
                  type="email"
                  className="h-10 rounded-xl border-slate-200 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notas" className="text-xs font-semibold text-slate-700">
                Notas del Cliente
              </Label>
              <Textarea
                id="notas"
                name="notas"
                value={form.notas}
                onChange={handleChange}
                placeholder="Notas relevantes..."
                className="resize-none rounded-xl border-slate-200 text-sm"
                rows={2}
              />
            </div>

            {showFiscal && (
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/70 to-slate-50/50 p-4 space-y-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600">
                  <Receipt className="h-3 w-3" />
                  Datos Fiscales - CFDI 4.0
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rfc" className="text-xs font-semibold text-slate-700">RFC</Label>
                    <Input
                      id="rfc"
                      name="rfc"
                      value={form.rfc}
                      onChange={handleChange}
                      placeholder="LOGL900101ABC"
                      maxLength={13}
                      className="h-10 rounded-xl border-blue-100 bg-white font-mono text-sm uppercase tracking-wide"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="razon_social" className="text-xs font-semibold text-slate-700">Razon Social</Label>
                    <Input
                      id="razon_social"
                      name="razon_social"
                      value={form.razon_social}
                      onChange={handleChange}
                      placeholder="Como en constancia fiscal"
                      className="h-10 rounded-xl border-blue-100 bg-white text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="codigo_postal_fiscal" className="text-xs font-semibold text-slate-700">C.P. Fiscal</Label>
                    <Input
                      id="codigo_postal_fiscal"
                      name="codigo_postal_fiscal"
                      value={form.codigo_postal_fiscal}
                      onChange={handleChange}
                      placeholder="81200"
                      maxLength={5}
                      className="h-10 rounded-xl border-blue-100 bg-white font-mono text-sm"
                    />
                  </div>
                  <div className="col-span-3 space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Regimen Fiscal</Label>
                    <Select value={form.regimen_fiscal} onValueChange={(v) => handleSelect("regimen_fiscal", v)}>
                      <SelectTrigger className="h-10 rounded-xl border-blue-100 bg-white text-sm">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIMENES_FISCALES.map((item) => (
                          <SelectItem key={item.value} value={item.value} className="text-sm">
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Uso CFDI</Label>
                  <Select value={form.uso_cfdi} onValueChange={(v) => handleSelect("uso_cfdi", v)}>
                    <SelectTrigger className="h-10 rounded-xl border-blue-100 bg-white text-sm">
                      <SelectValue placeholder="Seleccionar uso..." />
                    </SelectTrigger>
                    <SelectContent>
                      {USOS_CFDI.map((item) => (
                        <SelectItem key={item.value} value={item.value} className="text-sm">
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          </form>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="h-9 rounded-xl border-slate-200 px-4 text-sm"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="client-create-form"
            disabled={saving}
            className="h-9 rounded-xl bg-blue-600 px-5 text-sm font-semibold hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Crear cliente
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
