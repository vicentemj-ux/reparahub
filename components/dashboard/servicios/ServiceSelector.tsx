"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Search, X, Wrench, Loader2 } from "lucide-react"
import { getServicios } from "@/lib/actions/servicios-prisma"
import type { Servicio } from "@/lib/actions/servicios-prisma"

export interface SelectedServicio {
  servicio_id: string
  cantidad: number
  nombre: string
  precio: number
}

interface ServiceSelectorProps {
  selected: SelectedServicio[]
  onChange: (next: SelectedServicio[]) => void
}

export function ServiceSelector({ selected, onChange }: ServiceSelectorProps) {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getServicios().then(({ data }) => {
      setServicios(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return servicios.filter((s) => !selected.some((sel) => sel.servicio_id === s.id))
    return servicios.filter(
      (s) =>
        !selected.some((sel) => sel.servicio_id === s.id) &&
        (s.nombre.toLowerCase().includes(q) || s.descripcion.toLowerCase().includes(q))
    )
  }, [servicios, selected, query])

  const add = (svc: Servicio) => {
    onChange([...selected, { servicio_id: svc.id, cantidad: 1, nombre: svc.nombre, precio: svc.precio }])
    setQuery("")
    setOpen(false)
    inputRef.current?.focus()
  }

  const remove = (id: string) => {
    onChange(selected.filter((s) => s.servicio_id !== id))
  }

  const total = selected.reduce((sum, s) => sum + s.precio * s.cantidad, 0)

  return (
    <div ref={containerRef} className="space-y-2 relative">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? "Cargando servicios..." : "Buscar y agregar servicio..."}
          className="pl-10 h-10 rounded-lg border-slate-200 bg-white"
          disabled={loading}
        />
      </div>

      {/* Dropdown - absolute, no portal needed because parent Card has no overflow-hidden */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white shadow-xl max-h-64 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 && query.trim() ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              No se encontraron servicios
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((svc) => (
              <button
                key={svc.id}
                type="button"
                onClick={() => add(svc)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors"
              >
                <Wrench className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{svc.nombre}</p>
                  <p className="text-xs text-slate-500 truncate">{svc.descripcion || "Sin descripcion"}</p>
                </div>
                <span className="text-sm font-bold text-slate-900 shrink-0">
                  ${svc.precio.toLocaleString("es-MX")}
                </span>
              </button>
            ))
          ) : null}
        </div>
      )}

      {/* Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selected.map((s) => (
            <div
              key={s.servicio_id}
              className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-sm"
            >
              <span className="font-semibold text-blue-900">{s.nombre}</span>
              <span className="text-blue-700 text-xs">
                ${(s.precio * s.cantidad).toLocaleString("es-MX")}
              </span>
              <button
                type="button"
                onClick={() => remove(s.servicio_id)}
                className="rounded-full p-0.5 text-blue-400 hover:text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {selected.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Total servicios
          </span>
          <span className="text-base font-black text-slate-900">
            ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  )
}
