"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Lock, Receipt, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateClient } from "@/lib/actions/clients-prisma"
import type { Client } from "@/lib/actions/clients-prisma"

// ─── Catalogos SAT CFDI 4.0 ──────────────────────────────────────────────────

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

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ClientEditModalProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedClient: Client) => void
}

type FormFields = {
  nombre: string
  telefono: string
  telefono_secundario: string
  correo: string
  notas: string
  rfc: string
  razon_social: string
  codigo_postal_fiscal: string
  regimen_fiscal: string
  uso_cfdi: string
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ClientEditModal({ client, isOpen, onClose, onSave }: ClientEditModalProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormFields>({
    nombre: "",
    telefono: "",
    telefono_secundario: "",
    correo: "",
    notas: "",
    rfc: "",
    razon_social: "",
    codigo_postal_fiscal: "",
    regimen_fiscal: "",
    uso_cfdi: "",
  })
  const [showFiscal, setShowFiscal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (client) {
      setForm({
        nombre: client.nombre ?? "",
        telefono: client.telefono ?? "",
        telefono_secundario: client.telefono_secundario ?? "",
        correo: client.correo ?? "",
        notas: client.notas ?? "",
        rfc: client.rfc ?? "",
        razon_social: client.razon_social ?? "",
        codigo_postal_fiscal: client.codigo_postal_fiscal ?? "",
        regimen_fiscal: client.regimen_fiscal ?? "",
        uso_cfdi: client.uso_cfdi ?? "",
      })
      // Auto-abrir pestana fiscal si el cliente ya tiene RFC
      setShowFiscal(!!client.rfc)
      setError(null)
    }
  }, [client, isOpen])

  if (!client) return null

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
      const result = await updateClient(client.id, {
        nombre: form.nombre,
        telefono: form.telefono,
        telefono_secundario: form.telefono_secundario || null,
        correo: form.correo || null,
        notas: form.notas || null,
        rfc: form.rfc.toUpperCase() || null,
        razon_social: form.razon_social || null,
        codigo_postal_fiscal: form.codigo_postal_fiscal || null,
        regimen_fiscal: form.regimen_fiscal || null,
        uso_cfdi: form.uso_cfdi || null,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.client) {
        onSave(result.client)
        router.refresh()
        onClose()
      }
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
        {/* ── Header ── */}
        <DialogHeader className="shrink-0 gap-0 border-0 bg-transparent p-0">
          <div
            className="relative rounded-t-3xl px-5 py-3 pr-14"
            style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" }}
          >
            <DialogTitle className="sr-only">Editar Cliente</DialogTitle>
            <DialogDescription className="sr-only">Formulario para editar los datos del cliente</DialogDescription>

            <div className="flex items-center justify-between gap-3 min-w-0">
              {/* Titulo */}
              <span className="text-xl font-black italic leading-tight tracking-tight text-white truncate">
                EDITAR CLIENTE
              </span>

              {/* Toggle BASICO / FACTURACION */}
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
                      : "text-slate-500 hover:bg-blue-50 hover:text-blue-700/60"
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
                      : "text-slate-500 hover:bg-blue-50 hover:text-blue-700/60"
                  )}
                >
                  <Receipt className="h-3 w-3" />
                  Facturacion
                </Button>
              </div>
            </div>

            {/* Boton cerrar */}
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

        {/* ── Cuerpo scrollable ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <form id="client-edit-form" onSubmit={handleSubmit} className="space-y-3">

            {/* Fila 1: Nombre / Telefono Principal */}
            <div className="grid grid-cols-2 gap-3">
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
                  className="h-10 rounded-xl border-slate-200 text-sm"
                />
              </div>
            </div>

            {/* Fila 2: Telefono Secundario / Correo */}
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

            {/* Notas (compacto) */}
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

            {/* ── Panel Fiscal (condicional) ── */}
            {showFiscal && (
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/70 to-slate-50/50 p-4 space-y-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600">
                  <Receipt className="h-3 w-3" />
                  Datos Fiscales - CFDI 4.0
                </p>

                {/* RFC / Razon Social */}
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
                      style={{ textTransform: "uppercase" }}
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

                {/* CP Fiscal / Regimen Fiscal */}
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
                    <Select
                      value={form.regimen_fiscal}
                      onValueChange={(v) => handleSelect("regimen_fiscal", v)}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-blue-100 bg-white text-sm">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIMENES_FISCALES.map((r) => (
                          <SelectItem key={r.value} value={r.value} className="text-sm">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Uso CFDI */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Uso CFDI</Label>
                  <Select
                    value={form.uso_cfdi}
                    onValueChange={(v) => handleSelect("uso_cfdi", v)}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-blue-100 bg-white text-sm">
                      <SelectValue placeholder="Seleccionar uso..." />
                    </SelectTrigger>
                    <SelectContent>
                      {USOS_CFDI.map((u) => (
                        <SelectItem key={u.value} value={u.value} className="text-sm">
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* ── Footer ── */}
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
            form="client-edit-form"
            disabled={saving}
            className="h-9 rounded-xl bg-blue-600 px-5 text-sm font-semibold hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
