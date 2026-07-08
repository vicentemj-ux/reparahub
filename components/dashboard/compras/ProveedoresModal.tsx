"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import {
  getProveedores, createProveedor, updateProveedor, deleteProveedor,
} from "@/lib/actions/compras-prisma"
import type { Proveedor } from "@/lib/actions/compras-prisma"
import {
  Truck, Plus, Phone, Pencil, Trash2, Loader2,
} from "lucide-react"

export function ProveedoresModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Proveedor | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [nombre, setNombre] = useState("")
  const [contacto, setContacto] = useState("")
  const [telefono, setTelefono] = useState("")
  const [email, setEmail] = useState("")
  const [notas, setNotas] = useState("")

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await getProveedores()
    setProveedores(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) fetch()
  }, [open, fetch])

  const resetForm = () => {
    setNombre(""); setContacto(""); setTelefono(""); setEmail(""); setNotas("")
    setEditing(null); setShowForm(false)
  }

  const startEdit = (p: Proveedor) => {
    setNombre(p.nombre)
    setContacto(p.contacto ?? "")
    setTelefono(p.telefono ?? "")
    setEmail(p.email ?? "")
    setNotas(p.notas ?? "")
    setEditing(p)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!nombre.trim()) return
    setSaving(true)
    const payload = { nombre, contacto: contacto || null, telefono: telefono || null, email: email || null, notas: notas || null }
    const { error } = editing
      ? await updateProveedor({ id: editing.id, ...payload })
      : await createProveedor(payload)
    setSaving(false)
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" })
      return
    }
    resetForm()
    fetch()
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const { error } = await deleteProveedor(id)
    setDeletingId(null)
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" })
      return
    }
    fetch()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm() } }}>
      <DialogContent className="max-w-xl bg-white border-slate-200 text-slate-900 p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-6 pb-4 border-b border-slate-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
            <Truck className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="text-lg font-black italic tracking-tight text-white">
                GESTION DE PROVEEDORES
              </DialogTitle>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Administra tus fuentes de abastecimiento
              </p>
            </DialogHeader>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Listado de proveedores ({proveedores.length})
            </p>
            {!showForm && (
              <Button
                size="sm"
                onClick={() => setShowForm(true)}
                className="h-8 gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold uppercase tracking-wider"
              >
                <Plus className="h-3.5 w-3.5" /> Nuevo proveedor
              </Button>
            )}
          </div>

          {showForm && (
            <div className="rounded-xl border border-slate-200 bg-white/90 p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nombre *</Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Refacciones del Norte"
                  className="h-9 bg-white border-slate-200 text-slate-900 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contacto</Label>
                  <Input
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Vendedor"
                    className="h-9 bg-white border-slate-200 text-slate-900 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Telefono</Label>
                  <Input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="668..."
                    className="h-9 bg-white border-slate-200 text-slate-900 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ventas@proveedor.com"
                  className="h-9 bg-white border-slate-200 text-slate-900 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Notas</Label>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Condiciones de pago, tiempos de entrega..."
                  className="bg-white border-slate-200 text-slate-900 text-sm resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={resetForm} className="h-8 text-xs text-slate-500 hover:text-blue-700">
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !nombre.trim()} className="h-8 bg-blue-600 hover:bg-blue-700 text-xs font-bold uppercase tracking-wider">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  {editing ? "Guardar cambios" : "Agregar"}
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[0,1,2].map(i => (
                <div key={i} className="h-12 rounded-xl bg-white/90 animate-pulse" />
              ))}
            </div>
          ) : proveedores.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">No hay proveedores registrados.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {proveedores.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100/30 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700/50">
                      <Truck className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p.nombre}</p>
                      {p.telefono && (
                        <p className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Phone className="h-3 w-3" /> {p.telefono}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => startEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                    >
                      {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

