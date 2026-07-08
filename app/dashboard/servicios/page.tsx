"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Wrench, Plus, Search, Trash2, Pencil, Loader2, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { getServicios, deleteServicio } from "@/lib/actions/servicios-prisma"
import type { Servicio } from "@/lib/actions/servicios-prisma"
import { ServicioModal } from "@/components/dashboard/servicios/ServicioModal"
import { ModuleHeader } from "@/components/dashboard/module-header"

function fmtMoney(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 })
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Servicio | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await getServicios()
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error })
    } else {
      setServicios(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return servicios
    return servicios.filter(
      (s) =>
        s.nombre.toLowerCase().includes(q) ||
        s.descripcion.toLowerCase().includes(q)
    )
  }, [servicios, searchQuery])

  const handleDelete = (id: string) => {
    setDeletingId(id)
    const run = async () => {
      const { error } = await deleteServicio(id)
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error })
      } else {
        toast({ title: "Servicio eliminado" })
        setServicios((prev) => prev.filter((s) => s.id !== id))
      }
      setDeletingId(null)
    }
    run()
  }

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="flex w-full flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <ModuleHeader
          icon={Wrench}
          title="SERVICIOS PRO"
          eyebrow="CATALOGO DE MANO DE OBRA Y SERVICIOS"
          description="Define precios comunes para agilizar presupuestos, reparaciones y ventas recurrentes."
          stats={[
            {
              label: "Servicios",
              value: servicios.length.toLocaleString("es-MX"),
              tone: "blue",
            },
          ]}
          actions={(
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative flex-1 sm:w-56 lg:w-72">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  placeholder="Buscar servicio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-8 text-sm placeholder:text-slate-400 transition-colors focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label="Limpiar busqueda"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                onClick={() => {
                  setEditing(null)
                  setModalOpen(true)
                }}
                className="h-10 shrink-0 gap-2 rounded-xl bg-blue-600 px-4 font-semibold tracking-tight text-white hover:bg-blue-700 btn-glow"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo Servicio</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </div>
          )}
        />

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-slate-300 bg-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
              <Wrench className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {searchQuery ? "No se encontraron servicios" : "No hay servicios registrados"}
            </h2>
            <p className="text-sm text-slate-500">
              {searchQuery
                ? "Intenta con otra busqueda."
                : "Agrega tu primer servicio para empezar."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((svc) => (
              <div
                key={svc.id}
                className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-300"
              >
                {/* Actions */}
                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditing(svc)
                      setModalOpen(true)
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(svc.id)}
                    disabled={deletingId === svc.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Eliminar"
                  >
                    {deletingId === svc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Icon */}
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
                  <Wrench className="h-6 w-6" />
                </div>

                {/* Content */}
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wide leading-tight pr-10">
                  {svc.nombre}
                </h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-3">
                  {svc.descripcion || "Sin descripcion"}
                </p>

                {/* Price */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Precio de servicio
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {fmtMoney(svc.precio)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ServicioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
        servicio={editing}
      />
    </div>
  )
}
