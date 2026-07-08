"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft, Plus, Search, Trash2, Package, Calendar, FileText,
  ShoppingCart, Loader2,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  createOrden, buscarProductosParaCompra, getProveedores,
} from "@/lib/actions/compras-prisma"
import type { Proveedor } from "@/lib/actions/compras-prisma"
import { ProveedoresModal } from "@/components/dashboard/compras/ProveedoresModal"
import { NuevoProductoModalWrapper } from "@/components/dashboard/inventario/NuevoProductoModalWrapper"
import { ModuleHeader } from "@/components/dashboard/module-header"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMXN(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 })
}

interface CartItem {
  producto_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NuevaOrdenPage() {
  const router = useRouter()

  // ── Header state ──
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [provId, setProvId] = useState<string>("")
  const [provNombre, setProvNombre] = useState<string>("")
  const [fechaEntrega, setFechaEntrega] = useState<string>("")
  const [referencia, setReferencia] = useState<string>("")

  // ── Product search ──
  const [prodQuery, setProdQuery] = useState("")
  const [prodResults, setProdResults] = useState<{ id: string; nombre: string; stock_actual: number; costo: number; sku: string | null }[]>([])
  const [searchingProd, setSearchingProd] = useState(false)
  const prodTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─- Cart / Auditoria ──
  const [cart, setCart] = useState<CartItem[]>([])

  // ─- Modals ──
  const [showProvModal, setShowProvModal] = useState(false)
  const [showProductoModal, setShowProductoModal] = useState(false)

  // ─- Submit ──
  const [saving, setSaving] = useState(false)

  const fetchProveedores = useCallback(async () => {
    const { data } = await getProveedores()
    setProveedores(data)
  }, [])

  useEffect(() => {
    fetchProveedores()
  }, [fetchProveedores])

  const handleProdSearch = (q: string) => {
    setProdQuery(q)
    if (prodTimer.current) clearTimeout(prodTimer.current)
    if (q.length < 2) { setProdResults([]); return }
    prodTimer.current = setTimeout(async () => {
      setSearchingProd(true)
      const { data } = await buscarProductosParaCompra(q)
      setProdResults(data)
      setSearchingProd(false)
    }, 300)
  }

  const addToCart = (p: { id: string; nombre: string; costo: number }) => {
    const existing = cart.find(c => c.producto_id === p.id)
    if (existing) {
      setCart(prev => prev.map(c => c.producto_id === p.id ? { ...c, cantidad: c.cantidad + 1 } : c))
      return
    }
    setCart(prev => [...prev, {
      producto_id: p.id,
      descripcion: p.nombre,
      cantidad: 1,
      precio_unitario: p.costo,
    }])
  }

  const updateCartQty = (index: number, qty: number) => {
    if (qty < 1) return
    setCart(prev => prev.map((c, i) => i === index ? { ...c, cantidad: qty } : c))
  }

  const updateCartPrice = (index: number, price: number) => {
    if (price < 0) return
    setCart(prev => prev.map((c, i) => i === index ? { ...c, precio_unitario: price } : c))
  }

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const addManualItem = () => {
    setCart(prev => [...prev, { producto_id: null, descripcion: "", cantidad: 1, precio_unitario: 0 }])
  }

  const updateManualDesc = (index: number, desc: string) => {
    setCart(prev => prev.map((c, i) => i === index ? { ...c, descripcion: desc } : c))
  }

  const cartTotal = cart.reduce((s, c) => s + c.cantidad * c.precio_unitario, 0)
  const cartCount = cart.length

  const handleSubmit = async () => {
    if (!provNombre.trim() && !provId) {
      toast({ title: "Proveedor requerido", description: "Selecciona o escribe un proveedor.", variant: "destructive" })
      return
    }
    if (cart.length === 0) {
      toast({ title: "Carrito vacio", description: "Agrega al menos un articulo.", variant: "destructive" })
      return
    }
    const hasEmpty = cart.some(c => !c.descripcion.trim())
    if (hasEmpty) {
      toast({ title: "Descripcion requerida", description: "Todos los articulos deben tener descripcion.", variant: "destructive" })
      return
    }

    setSaving(true)
    const input = {
      proveedor_id: provId || null,
      proveedor_nombre: provNombre.trim() || proveedores.find(p => p.id === provId)?.nombre || "Sin proveedor",
      fecha_orden: new Date().toISOString().slice(0, 10),
      fecha_entrega: fechaEntrega || null,
      notas: referencia.trim() || null,
      detalle: cart.map(c => ({
        descripcion: c.descripcion,
        cantidad: c.cantidad,
        precio_unitario: c.precio_unitario,
        producto_id: c.producto_id,
      })),
    }
    const { data, error } = await createOrden(input)
    setSaving(false)
    if (error || !data) {
      toast({ title: "Error", description: error || "No se pudo crear la orden.", variant: "destructive" })
      return
    }
    toast({ title: "Orden creada", description: `Folio ${data.folio} en borrador.` })
    router.push("/dashboard/compras")
  }

  return (
    <div className="min-h-screen bg-dashboard-surface">
      <div className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">

        <ModuleHeader
          icon={ShoppingCart}
          title="CONFIGURAR PROVISION"
          eyebrow="REGISTRO DE NUEVA ORDEN DE ENTRADA AL INVENTARIO"
          description="Define proveedor, articulos y costos antes de generar una orden de abastecimiento."
          stats={[
            {
              label: "Articulos",
              value: cartCount,
              tone: "blue",
            },
            {
              label: "Total",
              value: fmtMXN(cartTotal),
              tone: "slate",
            },
          ]}
          actions={(
            <button
              onClick={() => router.push("/dashboard/compras")}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
          )}
        />

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-6">

            {/* Seccion 1: Matriz de origen */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-black">
                  1
                </div>
                <h2 className="text-sm font-black italic tracking-tight text-slate-900 uppercase">
                  MATRIZ DE ORIGEN
                </h2>
              </div>

              <div className="space-y-5">
                {/* Proveedor */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Socio comercial suministrador
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={provId}
                        onChange={(e) => {
                          const id = e.target.value
                          setProvId(id)
                          const p = proveedores.find(x => x.id === id)
                          setProvNombre(p?.nombre || "")
                        }}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 appearance-none"
                      >
                        <option value="">Seleccionar proveedor...</option>
                        {proveedores.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowProvModal(true)}
                      className="h-12 w-12 rounded-xl border-slate-200 p-0 text-slate-500 hover:text-blue-600 hover:border-blue-300"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fecha estimada */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Fecha estimada recepcion
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        type="date"
                        value={fechaEntrega}
                        onChange={(e) => setFechaEntrega(e.target.value)}
                        placeholder="DD/MM/AAAA"
                        className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-sm font-bold text-slate-800 uppercase tracking-wider placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                  {/* Referencia */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Referencia operativa
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        placeholder="P. ej. recompra stock iPhone 15..."
                        className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-sm font-medium text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Seccion 2: Seleccion de activos */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-black">
                    2
                  </div>
                  <h2 className="text-sm font-black italic tracking-tight text-slate-900 uppercase">
                    SELECCION DE ACTIVOS
                  </h2>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowProductoModal(true)}
                  className="h-9 gap-2 rounded-full border-slate-200 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:text-blue-600 hover:border-blue-300"
                >
                  <Plus className="h-3.5 w-3.5" /> Alta maestra producto
                </Button>
              </div>

              {/* Buscador */}
              <div className="relative mb-5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="FILTRAR POR CODIGO SKU O DESCRIPTOR..."
                  value={prodQuery}
                  onChange={(e) => handleProdSearch(e.target.value)}
                  className="h-12 rounded-full border-slate-200 bg-white pl-11 pr-4 text-sm font-medium uppercase tracking-wider text-slate-800 placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Resultados */}
              {searchingProd ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[0,1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
              ) : prodResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {prodResults.map((p) => (
                    <div
                      key={p.id}
                      className="group relative rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <button
                        onClick={() => addToCart(p)}
                        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 hover:text-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 mb-3">
                        <Package className="h-5 w-5 text-slate-500" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 leading-tight pr-6">{p.nombre}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">
                        STOCK: {p.stock_actual} UNIDADES
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">COSTO ACTUAL</p>
                          <p className="text-sm font-black text-blue-600">{fmtMXN(p.costo)}</p>
                        </div>
                        {p.sku && (
                          <span className="inline-flex rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                            {p.sku}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : prodQuery.length >= 2 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500">No se encontraron productos.</p>
                </div>
              ) : null}

              {/* Agregar manual */}
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={addManualItem}
                  className="h-10 gap-2 rounded-full border-dashed border-slate-300 px-5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 hover:border-slate-400"
                >
                  <Plus className="h-4 w-4" /> Agregar articulo manual
                </Button>
              </div>
            </section>
          </div>

          {/* ── RIGHT COLUMN: AUDITORIA PO ── */}
          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sticky top-6">
              {/* Header auditoria */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-slate-700" />
                  <div>
                    <h3 className="text-sm font-black italic tracking-tight text-slate-900">AUDITORIA PO</h3>
                  </div>
                </div>
                <span className="inline-flex h-6 items-center justify-center rounded-full bg-slate-100 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {cartCount} SKUs
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500">Selecciona productos para auditarnos.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {item.producto_id ? (
                            <p className="text-sm font-bold text-slate-900 leading-tight">{item.descripcion}</p>
                          ) : (
                            <Input
                              value={item.descripcion}
                              onChange={(e) => updateManualDesc(idx, e.target.value)}
                              placeholder="Descripcion del articulo"
                              className="h-9 rounded-xl border-slate-200 bg-white text-sm font-bold text-slate-900"
                            />
                          )}
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                            Articulos seleccionados
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cantidad</Label>
                          <Input
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) => updateCartQty(idx, Number(e.target.value))}
                            className="h-10 rounded-xl border-slate-200 bg-white text-center text-sm font-bold text-slate-900"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Costo unit.</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.precio_unitario}
                            onChange={(e) => updateCartPrice(idx, Number(e.target.value))}
                            className="h-10 rounded-xl border-slate-200 bg-white text-center text-sm font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subtotal SKU</span>
                        <span className="text-sm font-black text-blue-600">{fmtMXN(item.cantidad * item.precio_unitario)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total y accion */}
              <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Inversion logistica proyectada
                  </p>
                  <p className="text-3xl font-black text-slate-900 tabular-nums mt-1">{fmtMXN(cartTotal)}</p>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={saving || cart.length === 0}
                  className="w-full h-12 gap-2 rounded-xl bg-blue-600 text-sm font-bold uppercase tracking-wider text-white hover:bg-blue-700 disabled:opacity-50 btn-glow"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Ejecutar despliegue PO
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProveedoresModal
        open={showProvModal}
        onClose={() => { setShowProvModal(false); fetchProveedores() }}
      />
      <NuevoProductoModalWrapper
        open={showProductoModal}
        onClose={() => setShowProductoModal(false)}
        onSaved={() => { setShowProductoModal(false) }}
      />
    </div>
  )
}

