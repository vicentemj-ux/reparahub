"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Facebook,
  Instagram,
  MessageCircle,
  Save,
  Store,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ModuleHeader } from "@/components/dashboard/module-header"
import { ModuleConstruction } from "@/components/dashboard/module-construction"
import { InventoryProductImage } from "@/components/dashboard/inventory-product-image"
import { formatCurrency } from "@/lib/utils/currency"
import {
  getMiTiendaConfig,
  getProductosParaMiTienda,
  toggleProductoEnTienda,
  updateMiTiendaConfig,
  type TiendaConfigFull,
  type TiendaProductoItem,
  type TiendaRedesInput,
} from "@/lib/actions/tienda-prisma"

export default function MiTiendaPage() {
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<TiendaConfigFull | null>(null)
  const [productos, setProductos] = useState<TiendaProductoItem[]>([])
  const [saving, setSaving] = useState(false)
  const [slogan, setSlogan] = useState("")
  const [redes, setRedes] = useState<TiendaRedesInput>({})
  const [search, setSearch] = useState("")
  const [filterTab, setFilterTab] = useState<"publicados" | "disponibles">("publicados")
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [configRes, productosRes] = await Promise.all([
        getMiTiendaConfig(),
        getProductosParaMiTienda(),
      ])
      if (configRes.success && configRes.data) {
        setConfig(configRes.data)
        setSlogan(configRes.data.slogan ?? "")
        setRedes(configRes.data.redes ?? {})
      } else if (!configRes.success) {
        toast({ variant: "destructive", title: "Error", description: configRes.error })
      }
      if (productosRes.success && productosRes.data) {
        setProductos(productosRes.data)
      } else if (!productosRes.success) {
        toast({ variant: "destructive", title: "Error", description: productosRes.error })
      }
    } catch (err) {
      console.error("[mi-tienda] loadData:", err)
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar Mi Tienda." })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const tiendaUrl = useMemo(() => {
    if (!config) return ""
    if (typeof window !== "undefined") {
      return `${window.location.origin}/t/${config.slug}`
    }
    return `/t/${config.slug}`
  }, [config])

  const buildConfigPayload = (activa: boolean) => ({
    activa,
    slogan: slogan.trim() || null,
    redes,
    horarios: null,
  })

  const handleToggleActiva = async (nextActiva: boolean) => {
    if (!config) return
    setSaving(true)
    try {
      const res = await updateMiTiendaConfig(buildConfigPayload(nextActiva))
      if (!res.success) {
        toast({ variant: "destructive", title: "Error", description: res.error })
        return
      }
      setConfig({ ...config, activa: nextActiva })
      toast({
        title: nextActiva ? "Mi Tienda activada" : "Mi Tienda desactivada",
        description: nextActiva
          ? "Tu catalogo publico ya es visible."
          : "Tu catalogo publico ya no es visible.",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      const res = await updateMiTiendaConfig(buildConfigPayload(config?.activa ?? false))
      if (!res.success) {
        toast({ variant: "destructive", title: "Error", description: res.error })
        return
      }
      toast({ title: "Configuracion guardada" })
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const handleToggleProducto = async (producto: TiendaProductoItem) => {
    setTogglingId(producto.id)
    try {
      const res = await toggleProductoEnTienda(producto.id, !producto.publicadoEnTienda)
      if (!res.success) {
        toast({ variant: "destructive", title: "No se pudo actualizar", description: res.error })
        return
      }
      setProductos((prev) =>
        prev.map((p) => (p.id === producto.id ? { ...p, publicadoEnTienda: !p.publicadoEnTienda } : p)),
      )
      if (config && res.data) {
        setConfig({ ...config, publishedCount: res.data.publishedCount, remaining: res.data.remaining })
      }
      toast({
        title: producto.publicadoEnTienda ? "Producto retirado de Mi Tienda" : "Producto publicado",
      })
    } finally {
      setTogglingId(null)
    }
  }

  const handleCopyUrl = async () => {
    if (!tiendaUrl) return
    try {
      await navigator.clipboard.writeText(tiendaUrl)
      toast({ title: "Enlace copiado al portapapeles" })
    } catch {
      toast({ variant: "destructive", title: "No se pudo copiar el enlace" })
    }
  }

  const productosFiltrados = useMemo(() => {
    const lower = search.toLowerCase().trim()
    const base = lower
      ? productos.filter(
          (p) =>
            p.nombre.toLowerCase().includes(lower) ||
            (p.marca?.toLowerCase().includes(lower) ?? false) ||
            (p.modelo?.toLowerCase().includes(lower) ?? false) ||
            (p.categoria?.toLowerCase().includes(lower) ?? false),
        )
      : productos
    return base.filter((p) => (filterTab === "publicados" ? p.publicadoEnTienda : !p.publicadoEnTienda))
  }, [productos, search, filterTab])

  if (loading) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-dashboard-surface">
        <div className="flex w-full min-w-0 flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
          <ModuleHeader
            icon={Store}
            title="MI TIENDA"
            eyebrow="CATALOGO PUBLICO DE PRODUCTOS"
            description="Publica tus productos para que tus clientes te contacten por WhatsApp."
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm sm:rounded-3xl">
            <p>Cargando Mi Tienda...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-dashboard-surface">
        <div className="flex w-full min-w-0 flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
          <ModuleConstruction
            moduleName="Mi Tienda"
            moduleIcon={<Store className="h-10 w-10 text-blue-600" />}
            description="No se pudo cargar la configuracion. Recarga la pagina."
          />
        </div>
      </div>
    )
  }

  const limitReached = config.remaining === 0
  const publishedProducts = productos.filter((p) => p.publicadoEnTienda)
  const availableProducts = productos.filter((p) => !p.publicadoEnTienda)
  const canActivate = !config.activa || config.publishedCount > 0 || availableProducts.length > 0

  return (
    <div className="min-h-screen overflow-x-hidden bg-dashboard-surface">
      <div className="flex w-full min-w-0 flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12">
        <ModuleHeader
          icon={Store}
          title="MI TIENDA"
          eyebrow="CATALOGO PUBLICO DE PRODUCTOS"
          description="Publica tus productos para que tus clientes te encuentren y te contacten por WhatsApp."
          stats={[
            { label: "Publicados", value: `${config.publishedCount} / ${config.limit}`, tone: config.isPro ? "emerald" : "blue" },
            { label: "Disponibles", value: config.totalProductos - config.publishedCount, tone: "slate" },
            {
              label: "Plan",
              value: config.inTrial ? "TRIAL" : config.isPro ? "PRO" : "NORMAL",
              tone: config.isPro ? "emerald" : "amber",
            },
          ]}
        />

        {/* Activation card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Tu tienda publica</h2>
              <p className="mt-1 text-sm text-slate-600">
                URL:{" "}
                <a
                  href={tiendaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-blue-600 hover:underline sm:text-sm"
                >
                  {tiendaUrl}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </p>
              {!config.activa && (
                <p className="mt-2 text-xs text-amber-700 sm:text-sm">
                  Tu tienda esta desactivada. Los clientes no podran verla hasta que la actives.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className="gap-1.5"
                aria-label="Copiar enlace"
              >
                <Copy className="h-4 w-4" aria-hidden /> Copiar
              </Button>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Switch
                  checked={config.activa}
                  onCheckedChange={handleToggleActiva}
                  disabled={saving || (config.activa === false && !canActivate)}
                  aria-label="Activar Mi Tienda"
                />
                <span className="hidden sm:inline">{config.activa ? "Activa" : "Inactiva"}</span>
              </label>
            </div>
          </div>
        </section>

        {/* Identidad y redes (seccion unificada) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
            Identidad y redes
          </h3>
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Slogan
              </span>
              <Input
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                placeholder="Refacciones y reparacion profesional"
                maxLength={120}
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <RedesField
                label="WhatsApp"
                icon={<MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden />}
                placeholder="+52 55 1234 5678"
                value={redes.whatsapp ?? ""}
                onChange={(v) => setRedes((r) => ({ ...r, whatsapp: v || null }))}
              />
              <RedesField
                label="Instagram"
                icon={<Instagram className="h-4 w-4 text-pink-600" aria-hidden />}
                placeholder="@tu.taller"
                value={redes.instagram ?? ""}
                onChange={(v) => setRedes((r) => ({ ...r, instagram: v || null }))}
              />
              <RedesField
                label="Facebook"
                icon={<Facebook className="h-4 w-4 text-blue-700" aria-hidden />}
                placeholder="facebook.com/tu.taller"
                value={redes.facebook ?? ""}
                onChange={(v) => setRedes((r) => ({ ...r, facebook: v || null }))}
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              onClick={handleSaveConfig}
              disabled={saving}
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700 btn-glow"
            >
              <Save className="h-4 w-4" aria-hidden /> Guardar configuracion
            </Button>
          </div>
        </section>

        {/* Products */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
          <header className="border-b border-slate-200 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Productos</h2>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  {limitReached && !config.isPro
                    ? "Limite alcanzado. Actualiza a PRO para mas capacidad."
                    : `Tienes ${config.remaining} espacios disponibles en tu plan.`}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="h-9 w-full sm:w-56"
                />
                <div className="flex rounded-full bg-slate-100 p-0.5">
                  <button
                    onClick={() => setFilterTab("publicados")}
                    className={`flex-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
                      filterTab === "publicados" ? "bg-white text-slate-900 shadow" : "text-slate-600"
                    }`}
                  >
                    Publicados ({publishedProducts.length})
                  </button>
                  <button
                    onClick={() => setFilterTab("disponibles")}
                    className={`flex-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
                      filterTab === "disponibles" ? "bg-white text-slate-900 shadow" : "text-slate-600"
                    }`}
                  >
                    Disponibles ({availableProducts.length})
                  </button>
                </div>
              </div>
            </div>
          </header>

          {productosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              {filterTab === "publicados"
                ? "Aun no tienes productos publicados."
                : search
                ? "No hay productos que coincidan con tu busqueda."
                : "No tienes productos disponibles para publicar."}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {productosFiltrados.map((p) => (
                <ProductoRow
                  key={p.id}
                  producto={p}
                  disabled={
                    togglingId === p.id ||
                    (!p.publicadoEnTienda && limitReached && !config.isPro)
                  }
                  onToggle={() => handleToggleProducto(p)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function RedesField({
  label,
  icon,
  placeholder,
  value,
  onChange,
}: {
  label: string
  icon: React.ReactNode
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
        {icon}
        {label}
      </span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  )
}

function ProductoRow({
  producto,
  disabled,
  onToggle,
}: {
  producto: TiendaProductoItem
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <li className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
      <InventoryProductImage
        stored={producto.imagenUrl}
        alt={producto.nombre}
        width={64}
        height={64}
        className="h-14 w-14 shrink-0 rounded-xl sm:h-16 sm:w-16"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{producto.nombre}</p>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
          {formatCurrency(producto.precioVenta)}
          {producto.marca || producto.modelo ? (
            <span className="ml-2 text-slate-400">
              {[producto.marca, producto.modelo].filter(Boolean).join(" \u00b7 ")}
            </span>
          ) : null}
        </p>
      </div>
      <Button
        size="sm"
        variant={producto.publicadoEnTienda ? "outline" : "default"}
        onClick={onToggle}
        disabled={disabled}
        className={
          producto.publicadoEnTienda
            ? "gap-1.5"
            : "gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
        }
      >
        {producto.publicadoEnTienda ? (
          <>
            <Eye className="h-3.5 w-3.5" aria-hidden /> Quitar
          </>
        ) : (
          <>
            <EyeOff className="h-3.5 w-3.5" aria-hidden /> Publicar
          </>
        )}
      </Button>
    </li>
  )
}
