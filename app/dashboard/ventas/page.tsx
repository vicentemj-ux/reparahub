"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useDataFetchPerf } from "@/hooks/use-data-fetch-perf"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  Store,
  ArrowLeft,
  Banknote,
  Bookmark,
  CalendarDays,
  Clock,
  Download,
  Loader2,
  Package,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag, Smartphone, User, Wrench, X,
} from "lucide-react"
import { getInventoryImagePair } from "@/lib/storage"
import {
  getPosItemsByCategory,
  getPosQuickItems,
  loadPosMountData,
  searchPosItems,
  crearVenta,
  type ProductoDisponible,
  type DetalleVentaInput,
  type VentaCreada,
  type PosQuickMode,
} from "@/lib/actions/ventas-prisma"
import { HistorialCaja } from "@/components/dashboard/historial-caja"
import { ProBarcodeButton } from "@/components/dashboard/pro-barcode-button"
import { type CashPresetConfig } from "@/lib/actions/settings-prisma"
import { ArqueoModal } from "@/components/dashboard/ventas/ArqueoModal"
import { CartPanel } from "@/components/dashboard/ventas/CartPanel"
import { DescuentoModal } from "@/components/dashboard/ventas/DescuentoModal"
import { SpecialModal } from "@/components/dashboard/ventas/SpecialModal"
import { ConfirmModal } from "@/components/dashboard/ventas/ConfirmModal"
import { SuccessModal } from "@/components/dashboard/ventas/SuccessModal"
import { VentaEnEsperaConfirm } from "@/components/dashboard/ventas/VentaEnEsperaConfirm"
import { VentasEnEsperaModal } from "@/components/dashboard/ventas/VentasEnEsperaModal"
import { ApartadoModal } from "@/components/dashboard/ventas/ApartadoModal"
import { ApartadosPanel } from "@/components/dashboard/ventas/ApartadosPanel"
import { ApartadoReceiptModal, type ApartadoReceiptKind } from "@/components/dashboard/ventas/ApartadoReceiptModal"
import { type ApartadoResumen } from "@/lib/actions/apartados-prisma"
import { type ClientAutocompletePayload } from "@/components/dashboard/client-autocomplete"
import { CajaProvider, useCajaContext, OpenCajaModal } from "@/lib/context/caja-context"
import { useActiveCustomer } from "@/lib/context/active-customer-context"
import { getReparacionesListas, type RepairOrder } from "@/lib/actions/repairs-prisma"
import { guardarVentaEnEspera, getVentasEnEspera, type VentaEnEspera } from "@/lib/ventas-en-espera"
import { PRO_FEATURES_TEMP_DISABLED } from "@/lib/runtime-flags"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// --- Types -------------------------------------------------------------------

type CartItem = {
  id: string
  nombre: string
  precio: number
  costo: number
  cantidad: number
  isSpecial: boolean
  productoId?: string
  referencia?: string
  categoria?: string
  // Device fields (es_equipo = true)
  esEquipo?: boolean
  imeiSerie?: string
  color?: string
  condicion?: string
  capacidad?: string
  marca?: string
  modelo?: string
  procesador?: string
  ram?: string
  almacenamiento?: string
}

type MetodoPago = "efectivo" | "tarjeta" | "transferencia" | "mixto"

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)),
  ])
}

// --- Helpers -----------------------------------------------------------------

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ProductThumb({
  src,
  alt,
  productId,
  tallerId,
  size = "sm",
}: {
  src: string | null
  alt: string
  productId?: string
  tallerId?: string
  size?: "sm" | "lg"
}) {
  const { full, thumb } = getInventoryImagePair(src)
  const primarySrc = thumb || full || null
  const [broken, setBroken] = useState(false)
  const [effectiveSrc, setEffectiveSrc] = useState(primarySrc)
  const boxClass = size === "lg" ? "h-20 w-20 rounded-2xl" : "h-12 w-12 rounded-lg"
  const iconClass = size === "lg" ? "h-8 w-8" : "h-5 w-5"

  useEffect(() => {
    setBroken(false)
    setEffectiveSrc(primarySrc)
  }, [primarySrc])

  if (!effectiveSrc || broken) {
    return (
      <div className={`flex shrink-0 items-center justify-center bg-slate-100 text-slate-500 ${boxClass}`}>
        <Package className={iconClass} strokeWidth={1.5} aria-hidden="true" />
      </div>
    )
  }
  return (
    <Image
      src={effectiveSrc}
      alt={alt}
      width={48}
      height={48}
      onError={() => {
        if (effectiveSrc !== full && full) {
          setEffectiveSrc(full)
        } else {
          setBroken(true)
        }
      }}
      className={`shrink-0 border border-slate-200 object-cover ${boxClass}`}
    />
  )
}

// --- Main Page ---------------------------------------------------------------

function VentasPageContent() {
  const router = useRouter()
  const { startFetch, stopFetch } = useDataFetchPerf("ventas")
  const { caja, status, refresh, open: openCaja } = useCajaContext()
  const { activeCustomer, setActiveCustomer, clearActiveCustomer } = useActiveCustomer()
  const [kioskRouteRequested, setKioskRouteRequested] = useState(false)

  // -- Products state ----------------------------------------------------------
  const [productos, setProductos] = useState<ProductoDisponible[]>([])
  const [productosLoading, setProductosLoading] = useState(true)
  const [productosError, setProductosError] = useState<string | null>(null)
  const [searchProduct, setSearchProduct] = useState("")
  const [quickCategories, setQuickCategories] = useState<string[]>([])
  const [categoryCatalog, setCategoryCatalog] = useState<Record<string, string>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>("")

  // -- Cart state --------------------------------------------------------------
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [clienteNombre, setClienteNombre] = useState("")
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [clienteTelefono, setClienteTelefono] = useState("")
  const [clienteKey, setClienteKey] = useState(0)

  // -- Special product modal ---------------------------------------------------
  const [showSpecial, setShowSpecial] = useState(false)

  // -- Payment state -----------------------------------------------------------
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo")
  const [montoEfectivo, setMontoEfectivo] = useState("")
  const [montoTarjeta, setMontoTarjeta] = useState("")
  const [montoTransferencia, setMontoTransferencia] = useState("")
  const [referenciaPago, setReferenciaPago] = useState("")

  // -- Sale flow ---------------------------------------------------------------
  const [showConfirm, setShowConfirm] = useState(false)
  const [saleLoading, setSaleLoading] = useState(false)
  const [ventaCreada, setVentaCreada] = useState<VentaCreada | null>(null)
  const [saleError, setSaleError] = useState("")

  // -- Discount state -----------------------------------------------------------
  const [descuentoAplicado, setDescuentoAplicado] = useState(0)
  const [showDescuento, setShowDescuento] = useState(false)

  // -- Ventas en espera ---------------------------------------------------------
  const [showVentaEnEsperaConfirm, setShowVentaEnEsperaConfirm] = useState(false)
  const [showVentasEnEspera, setShowVentasEnEspera] = useState(false)
  const [ventasEnEsperaCount, setVentasEnEsperaCount] = useState(0)
  const [apartadoProduct, setApartadoProduct] = useState<ProductoDisponible | null>(null)
  const [apartadosRefreshKey, setApartadosRefreshKey] = useState(0)
  const [apartadoReceipt, setApartadoReceipt] = useState<{ apartado: ApartadoResumen; kind: ApartadoReceiptKind } | null>(null)

  // -- Tab navigation ----------------------------------------------------------
  const [activeTab, setActiveTab] = useState<"pos" | "historial">("pos")
  const [bottomTab, setBottomTab] = useState<"inventario" | "reparaciones" | "apartados">("inventario")

  // -- User info ---------------------------------------------------------------
  const [userName, setUserName] = useState<string>("Usuario")
  const [kioscoSupported, setKioscoSupported] = useState(false)
  const [kioscoMode, setKioscoMode] = useState(false)
  const [kioscoConfig, setKioscoConfig] = useState<{
    kiosco_enabled: boolean
    cash_presets: CashPresetConfig
    kiosco_whatsapp_step: "inicio" | "final"
    quick_mode: PosQuickMode
    quick_limit: number
    quick_categories: string[]
    manual_quick_ids: string[]
    has_pin: boolean
  } | null>(null)
  const kioskRouteAutoEntered = useRef(false)

  // -- Arqueo modal ------------------------------------------------------------
  const [showArqueo, setShowArqueo] = useState(false)

  // -- Reparaciones listas -----------------------------------------------------
  const [reparacionesListas, setReparacionesListas] = useState<RepairOrder[]>([])
  const [reparacionesLoading, setReparacionesLoading] = useState(false)
  const [searchReparacion, setSearchReparacion] = useState("")

  // -- Taller settings ----------------------------------------------------------
  const [tallerSettings, setTallerSettings] = useState({
    taller_id: "",
    nombre_taller: "Mi Taller",
    telefono: "",
    tamano_papel: "80mm" as "58mm" | "80mm",
    logo_url: null as string | null,
    terminos_garantia: "",
    mensaje_despedida: "",
    impresora_ticket: null as string | null,
    direccion: "",
    pais: null as string | null,
    impresion_config: {} as Record<string, unknown>,
  })
  // -- Mount: single unified Server Action (Promise.all server-side) -----
  const mountRequestIdRef = useRef(0)

  useEffect(() => {
    if (activeCustomer.mode === "selected") {
      setClienteNombre(activeCustomer.nombre)
      setClienteId(activeCustomer.id || null)
      setClienteTelefono(activeCustomer.telefono)
      setClienteKey((k) => k + 1)
      return
    }

    setClienteNombre("")
    setClienteId(null)
    setClienteTelefono("")
    setClienteKey((k) => k + 1)
  }, [activeCustomer])

  useEffect(() => {
    // Sync: cookie reads (instant)
    try {
      const raw = document.cookie.split("tallerName=")[1]?.split(";")[0]
      if (raw) {
        const name = decodeURIComponent(raw)
        setTallerSettings((p) => ({ ...p, nombre_taller: name }))
        setUserName(name || "Usuario")
      }
    } catch {}

    const reqId = ++mountRequestIdRef.current
    startFetch()
    setProductosLoading(true)
    setProductosError(null)

    const init = async () => {
      const data = await withTimeout(loadPosMountData(), 8000, "loadPosMountData")

      // Stale-response guard: discard if a newer mount kicked off
      if (reqId !== mountRequestIdRef.current) return

      if (data.settings) {
        const s = data.settings
        setTallerSettings({
          taller_id: s.taller_id || "",
          nombre_taller: s.nombre_taller || "Mi Taller",
          telefono: s.telefono || "",
          tamano_papel: (s.tamano_papel as "58mm" | "80mm") || "80mm",
          logo_url: s.logo_url ?? null,
          terminos_garantia: s.terminos_garantia || "",
          mensaje_despedida: s.mensaje_despedida || "",
          impresora_ticket: s.impresora_ticket ?? null,
          direccion: s.direccion || "",
          pais: s.pais ?? null,
          impresion_config: s.impresion_config ?? {},
        })
      }

      setKioscoSupported(data.kioscoCapability.canUsePosKiosco)
      setKioscoConfig(data.kioscoConfig)
      if (!data.kioscoCapability.canUsePosKiosco) {
        setKioscoMode(false)
      } else {
        setKioscoMode(Boolean(data.kioscoConfig?.kiosco_enabled))
      }

      setQuickCategories(data.quickCategories)
      setCategoryCatalog(
        data.categoryCatalog.reduce<Record<string, string>>((acc, row) => {
          acc[row.slug] = row.nombre
          return acc
        }, {})
      )
      setProductos(data.productos)
      initialProductosRef.current = data.productos
      if (data.error) setProductosError(data.error)
    }

    init().finally(() => {
      if (reqId === mountRequestIdRef.current) {
        setProductosLoading(false)
        stopFetch()
      }
    })
  }, [])

  useEffect(() => {
    if (kioscoMode && activeTab === "historial") setActiveTab("pos")
  }, [kioscoMode, activeTab])

  useEffect(() => {
    try {
      setKioskRouteRequested(new URLSearchParams(window.location.search).get("view") === "kiosko")
    } catch {
      setKioskRouteRequested(false)
    }
  }, [])

  useEffect(() => {
    if (!kioskRouteRequested) return
    if (!kioscoSupported || !kioscoConfig?.kiosco_enabled) return
    if (kioscoMode || kioskRouteAutoEntered.current) return
    kioskRouteAutoEntered.current = true
    setKioscoMode(true)
  }, [kioskRouteRequested, kioscoSupported, kioscoConfig?.kiosco_enabled, kioscoMode])

  // Load reparaciones on demand — only when the bottom tab is selected
  const reparacionesLoaded = useRef(false)
  useEffect(() => {
    if (bottomTab !== "reparaciones" || reparacionesLoaded.current) return
    reparacionesLoaded.current = true
    setReparacionesLoading(true)
    withTimeout(getReparacionesListas(), 15000, "getReparacionesListas")
      .then(({ data }) => {
        if (data) setReparacionesListas(data)
      })
      .catch((error) => {
        console.error("[ventas] reparaciones load:", error)
        setReparacionesListas([])
      })
      .finally(() => setReparacionesLoading(false))
  }, [bottomTab])

  const refreshProductos = useCallback(async () => {
    const config = kioscoConfig
    const mode: PosQuickMode = config?.quick_mode ?? "latest_added"
    const limit = config?.quick_limit ?? 12
    const manualIds = config?.manual_quick_ids ?? []
    startFetch()
    setProductosLoading(true)
    setProductosError(null)
    try {
      const quickRes = await withTimeout(
        getPosQuickItems({ limit, mode, manualQuickIds: manualIds }),
        8000,
        "getPosQuickItems"
      )
      const configuredQuickCategories = (config?.quick_categories ?? []).filter(Boolean)
      setQuickCategories(configuredQuickCategories.length > 0 ? configuredQuickCategories : [])
      setProductos(quickRes.data)
      initialProductosRef.current = quickRes.data
      if (quickRes.error) setProductosError(quickRes.error)
    } catch (error) {
      console.error("[ventas] refreshProductos:", error)
      setProductos([])
      setProductosError("No se pudo cargar inventario para venta.")
    } finally {
      setProductosLoading(false)
      stopFetch()
    }
  }, [kioscoConfig, startFetch, stopFetch])

  const loadByCategory = useCallback(async (category: string) => {
    setProductosLoading(true)
    setProductosError(null)
    startFetch()
    try {
      const { data, error } = await withTimeout(
        getPosItemsByCategory({ categoria: category, limit: 100 }),
        15000,
        "getPosItemsByCategory"
      )
      setProductos(data)
      if (error) setProductosError(error)
    } catch (error) {
      console.error("[ventas] category load:", error)
      setProductos([])
      setProductosError("No se pudo cargar la categoria seleccionada.")
    } finally {
      setProductosLoading(false)
      stopFetch()
    }
  }, [startFetch, stopFetch])

  const initialProductosRef = useRef<ProductoDisponible[]>([])

  useEffect(() => {
    const q = searchProduct.trim()
    if (!q) {
      if (selectedCategory) {
        loadByCategory(selectedCategory)
      } else {
        setProductos(initialProductosRef.current)
      }
      return
    }

    const t = setTimeout(async () => {
      setProductosLoading(true)
      setProductosError(null)
      try {
        const { data, error } = await withTimeout(searchPosItems({ q, limit: 100 }), 12000, "searchPosItems")
        setProductos(data)
        if (error) setProductosError(error)
      } catch (error) {
        console.error("[ventas] search load:", error)
        setProductos([])
        setProductosError("No se pudo buscar en inventario.")
      } finally {
        setProductosLoading(false)
      }
    }, 220)

    return () => clearTimeout(t)
  }, [searchProduct, selectedCategory, loadByCategory])

  // -- Count ventas en espera on mount ------------------------------------------
  useEffect(() => {
    setVentasEnEsperaCount(getVentasEnEspera().length)
  }, [])

  // -- Derived values ----------------------------------------------------------
  const subtotal = useMemo(
    () => Math.round(cartItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0) * 100) / 100,
    [cartItems]
  )
  const total = useMemo(
    () => Math.max(0, Math.round((subtotal - descuentoAplicado) * 100) / 100),
    [subtotal, descuentoAplicado]
  )

  const cambio = useMemo(() => {
    if (metodoPago === "efectivo") {
      const recibido = Math.round((parseFloat(montoEfectivo.replace(",", ".")) || 0) * 100) / 100
      return Math.max(0, Math.round((recibido - total) * 100) / 100)
    }
    return 0
  }, [metodoPago, montoEfectivo, total])

  const filteredProductos = useMemo(() => productos, [productos])

  const filteredReparaciones = useMemo(() => {
    const q = searchReparacion.toLowerCase().trim()
    if (!q) return reparacionesListas
    return reparacionesListas.filter(
      (r) =>
        r.folio.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q) ||
        r.device.toLowerCase().includes(q) ||
        r.phone.includes(q)
    )
  }, [reparacionesListas, searchReparacion])

  // -- Payment totals for mixto -------------------------------------------------
  const mixtoTotal = useMemo(() => {
    if (metodoPago !== "mixto") return 0
    const e = parseFloat(montoEfectivo.replace(",", ".")) || 0
    const t = parseFloat(montoTarjeta.replace(",", ".")) || 0
    const tr = parseFloat(montoTransferencia.replace(",", ".")) || 0
    return e + t + tr
  }, [metodoPago, montoEfectivo, montoTarjeta, montoTransferencia])

  // -- Cart actions -------------------------------------------------------------
  function addProducto(p: ProductoDisponible) {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.productoId === p.id)
      if (existing) {
        // Devices with IMEI are unique - never more than 1
        if (p.es_equipo && p.imei_serie) return prev
        if (existing.cantidad >= p.stock_actual) return prev
        return prev.map((i) =>
          i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      return [
        ...prev,
        {
          id: `prod-${p.id}`,
          nombre: p.nombre,
          precio: Math.round(Number(p.precio_venta) * 100) / 100,
          costo: Math.round(Number(p.costo) * 100) / 100,
          cantidad: 1,
          isSpecial: false,
          productoId: p.id,
          categoria: p.categoria ?? undefined,
          esEquipo: p.es_equipo,
          imeiSerie: p.imei_serie ?? undefined,
          color: p.color ?? undefined,
          condicion: p.condicion ?? undefined,
          capacidad: p.capacidad ?? undefined,
          marca: p.marca ?? undefined,
          modelo: p.modelo ?? undefined,
          procesador: p.procesador ?? undefined,
          ram: p.ram ?? undefined,
          almacenamiento: p.almacenamiento ?? undefined,
        },
      ]
    })
  }

  function openApartado(p: ProductoDisponible) {
    if (!kioscoSupported) {
      alert("Apartados es una funcion PRO. Puedes usarla durante el trial o al activar PRO.")
      return
    }
    if (p.stock_actual <= 0) return
    setApartadoProduct(p)
  }

  function increment(id: string) {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const maxStock = item.productoId
          ? (productos.find((p) => p.id === item.productoId)?.stock_actual ?? Infinity)
          : Infinity
        if (item.cantidad >= maxStock) return item
        return { ...item, cantidad: item.cantidad + 1 }
      })
    )
  }

  function decrement(id: string) {
    setCartItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item))
        .filter((item) => item.cantidad > 0)
    )
  }

  function removeItem(id: string) {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  function clearCart() {
    setCartItems([])
    setMetodoPago("efectivo")
    setMontoEfectivo("")
    setMontoTarjeta("")
    setMontoTransferencia("")
    setReferenciaPago("")
    setSaleError("")
    setDescuentoAplicado(0)
  }

  // -- Ventas en espera ---------------------------------------------------------
  function handleEnEspera() {
    if (cartItems.length === 0) return
    const venta: VentaEnEspera = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      cartItems: cartItems.map((item) => ({ ...item })),
      clienteNombre,
      clienteId,
      clienteTelefono,
      descuentoAplicado,
      metodoPago,
      montoEfectivo,
      montoTarjeta,
      montoTransferencia,
    }
    guardarVentaEnEspera(venta)
    clearCart()
    setVentasEnEsperaCount(getVentasEnEspera().length)
    setShowVentaEnEsperaConfirm(true)
  }

  function handleRecuperarVentaEnEspera(venta: VentaEnEspera) {
    setCartItems(venta.cartItems.map((item) => ({ ...item })))
    setClienteNombre(venta.clienteNombre)
    setClienteId(venta.clienteId)
    setClienteTelefono(venta.clienteTelefono)
    setDescuentoAplicado(venta.descuentoAplicado)
    setMetodoPago(venta.metodoPago as MetodoPago)
    setMontoEfectivo(venta.montoEfectivo)
    setMontoTarjeta(venta.montoTarjeta)
    setMontoTransferencia(venta.montoTransferencia)
    setClienteKey((k) => k + 1)
    if (venta.clienteTelefono.trim().length >= 6 || Boolean(venta.clienteId)) {
      setActiveCustomer({
        id: venta.clienteId ?? "",
        nombre: venta.clienteNombre || "Cliente",
        telefono: venta.clienteTelefono,
        correo: "",
      })
    }
    setVentasEnEsperaCount(getVentasEnEspera().length)
  }

  // -- Payment method selection -------------------------------------------------
  function selectMetodo(m: MetodoPago) {
    setMetodoPago(m)
    setMontoEfectivo("")
    setMontoTarjeta("")
    setMontoTransferencia("")
    setSaleError("")
  }

  function applyCashPreset(value: number) {
    const current = parseFloat(montoEfectivo.replace(",", ".")) || 0
    const next = Math.round((current + value) * 100) / 100
    setMetodoPago("efectivo")
    setMontoEfectivo(String(next))
    setSaleError("")
  }

  function applyExacto() {
    if (cartItems.length === 0) return
    setMetodoPago("efectivo")
    setMontoEfectivo(total.toFixed(2))
    setMontoTarjeta("")
    setMontoTransferencia("")
    setReferenciaPago("")
    setSaleError("")
  }

  function requestKioscoToggle(target: "enter" | "exit") {
    setSaleError("")
    setKioscoMode(target === "enter")
  }

  function quickPayAndOpenConfirm(m: "tarjeta" | "transferencia") {
    setSaleError("")
    if (cartItems.length === 0) {
      setSaleError("El carrito esta vacio")
      return
    }
    if (!caja) {
      setSaleError("Debes abrir caja para continuar.")
      return
    }
    setMetodoPago(m)
    setMontoEfectivo("")
    setMontoTarjeta("")
    setMontoTransferencia("")
    setShowConfirm(true)
  }

  // -- Validate & open confirm modal --------------------------------------------
  function handleFinalizarVenta() {
    setSaleError("")
    if (cartItems.length === 0) {
      setSaleError("El carrito esta vacio")
      return
    }
    if (metodoPago === "efectivo") {
      const recibido = Math.round((parseFloat(montoEfectivo.replace(",", ".")) || 0) * 100) / 100
      if (Number(recibido.toFixed(2)) < Number(total.toFixed(2))) {
        setSaleError(`El monto recibido ($${fmt(recibido)}) es menor al total ($${fmt(total)})`)
        return
      }
    }
    if (metodoPago === "mixto") {
      const diff = Math.abs(mixtoTotal - total)
      if (diff > 0.01) {
        setSaleError(
          `La suma de metodos ($${fmt(mixtoTotal)}) no coincide con el total ($${fmt(total)})`
        )
        return
      }
    }
    setShowConfirm(true)
  }

  // -- Confirm sale -------------------------------------------------------------
  async function handleConfirmSale() {
    setSaleLoading(true)
    setSaleError("")

    const efectivo =
      metodoPago === "efectivo"
        ? Math.round((parseFloat(montoEfectivo.replace(",", ".")) || total) * 100) / 100
        : metodoPago === "mixto"
          ? Math.round((parseFloat(montoEfectivo.replace(",", ".")) || 0) * 100) / 100
          : 0

    const tarjeta =
      metodoPago === "tarjeta"
        ? total
        : metodoPago === "mixto"
          ? parseFloat(montoTarjeta.replace(",", ".")) || 0
          : 0

    const transferencia =
      metodoPago === "transferencia"
        ? total
        : metodoPago === "mixto"
          ? parseFloat(montoTransferencia.replace(",", ".")) || 0
          : 0

    const items: DetalleVentaInput[] = cartItems.map((item) => ({
      producto_id: item.productoId,
      descripcion: item.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
      costo_unitario: item.costo,
      es_especial: item.isSpecial,
      referencia: item.referencia,
      categoria: item.categoria,
      imei_serie: item.imeiSerie,
      color: item.color,
      condicion: item.condicion,
      marca: item.marca,
      modelo: item.modelo,
      procesador: item.procesador,
      ram: item.ram,
      almacenamiento: item.almacenamiento,
    }))

    const { venta, error: err } = await crearVenta({
      caja_id: caja?.id ?? null,
      cliente_nombre: clienteNombre.trim() || undefined,
      cliente_id: clienteId ?? undefined,
      cliente_telefono: clienteTelefono || undefined,
      total,
      descuento: descuentoAplicado,
      metodo_pago: metodoPago,
      monto_efectivo: efectivo,
      monto_tarjeta: tarjeta,
      monto_transferencia: transferencia,
      cambio,
      referencia_pago: referenciaPago.trim() || undefined,
      items,
    })

    setSaleLoading(false)
    setShowConfirm(false)

    if (err || !venta) {
      setSaleError(err ?? "Error al guardar la venta")
      return
    }

    // Refresh caja totals
    refresh()

    // Refresh stock
    refreshProductos()

    setVentaCreada(venta)
    clearCart()
  }

  // --- Render ------------------------------------------------------------------

  const terminosVenta = (tallerSettings as any).impresion_config?.venta?.terminos ?? tallerSettings.terminos_garantia ?? ""

  return (
    <div className="min-h-screen overflow-x-hidden bg-dashboard-surface">
      <div className={`flex w-full min-w-0 flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10 2xl:px-12 ${activeTab !== "historial" && bottomTab === "inventario" && cartItems.length > 0 ? "pb-24 xl:pb-10" : ""}`}>
      {/* -- Header --------------------------------------------------------- */}
      {activeTab === "historial" && !kioscoMode ? (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab("pos")}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 transition-colors mb-1 sm:mb-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Punto de Venta
                </button>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="italic font-extrabold text-xl tracking-tight text-slate-900 sm:text-2xl">
                    Historial de <span className="text-blue-600">Cortes</span>
                  </h1>
                  <p className="text-[10px] tracking-widest text-slate-500 font-semibold">
                    AUDITORIA CENTRALIZADA Y CONCILIACION BANCARIA
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="h-11 gap-2 rounded-xl border-slate-200 px-4 font-semibold tracking-tight"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar en notas o cajero..."
                    className="h-11 w-full sm:w-56 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" />
                  Fecha inicio
                </p>
                <input
                  type="date"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" />
                  Fecha fin
                </p>
                <input
                  type="date"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  Filtrar por cajero
                </p>
                <select className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 appearance-none">
                  <option>Todos los cajeros</option>
                </select>
              </div>
              <div className="flex items-end">
                <button className="h-11 w-full rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 transition-colors">
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="italic font-extrabold text-xl tracking-tight text-slate-900 sm:text-2xl">
                  PUNTO DE VENTA
                </h1>
                <p className="text-[10px] tracking-widest text-slate-500 font-semibold">
                  ACCESORIOS Y REPUESTOS
                </p>
                <p className="mt-1 text-sm tracking-tight text-slate-500">
                  {kioscoMode ? "Modo kiosco activo: cobro rapido para tablet." : "Facturacion rapida, carrito y cobro en mostrador."}
                </p>
              </div>
            </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            {kioscoSupported && kioscoConfig?.kiosco_enabled && (
              <Button
                onClick={() => requestKioscoToggle(kioscoMode ? "exit" : "enter")}
                variant={kioscoMode ? "outline" : "default"}
                className={
                  kioscoMode
                    ? "col-span-2 sm:col-span-1 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold uppercase gap-2 rounded-2xl px-4 py-2.5 h-auto"
                    : "col-span-2 sm:col-span-1 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase gap-2 rounded-2xl px-4 py-2.5 h-auto"
                }
              >
                {kioscoMode ? <ShieldCheck className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                {kioscoMode ? "Salir kiosco" : "Entrar kiosco"}
              </Button>
            )}

            {kioscoSupported && kioscoConfig?.kiosco_enabled && !kioscoMode && (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/ventas/kiosko")}
                className="group col-span-2 sm:col-span-1 rounded-2xl border-blue-200 bg-blue-50 px-4 py-2.5 h-auto font-bold uppercase gap-2 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
              >
                <ShoppingBag className="h-4 w-4" />
                Abrir kiosco
              </Button>
            )}

            {status !== "open" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={openCaja}
                    className="group flex min-w-0 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-2 text-left shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-100/60 hover:shadow-md btn-glow"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-600 ring-1 ring-emerald-200 transition-colors group-hover:bg-emerald-100">
                      <Store className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 leading-none">
                        Caja
                      </p>
                      <p className="mt-1 truncate text-base font-black leading-none text-slate-900">
                        Abrir caja
                      </p>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  Abre el turno para poder registrar ventas, abonos y movimientos de caja.
                </TooltipContent>
              </Tooltip>
            )}

            {caja && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowArqueo(true)}
                    className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-left shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-md"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 transition-colors group-hover:bg-emerald-100">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none">
                        Caja
                      </p>
                      <p className="mt-1 truncate text-base font-black leading-none text-slate-900 tabular-nums">
                        $ {fmt(caja.monto_inicial + caja.total_efectivo + (caja.total_abonos_efectivo ?? 0) - (caja.total_gastos_efectivo ?? caja.total_gastos ?? 0) - (caja.total_anulaciones_efectivo ?? 0))}
                      </p>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  Mi resumen de turno: revisa efectivo, tarjeta, transferencia, abonos y gastos antes del corte.
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/corte")}
                    disabled={status !== "open"}
                    className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-left shadow-sm transition-all hover:border-red-300 hover:bg-red-50/40 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:shadow-sm"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100 transition-colors group-hover:bg-red-100">
                      <X className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none">
                        Corte
                      </p>
                      <p className="mt-1 truncate text-base font-black leading-none text-slate-900">
                        Cerrar caja
                      </p>
                    </div>
                  </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                Corte de caja: cierra el turno. Revisa primero el resumen para cuadrar.
              </TooltipContent>
            </Tooltip>
          </div>
          </div>
        </div>
      )}

      {activeTab !== "historial" && (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        {/* LEFT COLUMN */}
        <div className="flex min-w-0 flex-col gap-4 w-full">
          {status !== "open" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
                    Caja cerrada
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Abre la caja para iniciar pruebas de ventas, abonos y movimientos.
                  </p>
                </div>
                <Button
                  onClick={openCaja}
                  className="h-11 rounded-xl bg-emerald-600 px-5 text-xs font-black uppercase tracking-wider text-white hover:bg-emerald-700 btn-glow"
                >
                  <Store className="mr-2 h-4 w-4" />
                  Abrir Caja
                </Button>
              </div>
            </div>
          )}

          {/* Tabs */}
          {!kioscoMode && (
          <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:flex sm:items-center sm:gap-1">
            <div className="grid grid-cols-3 gap-1 sm:flex sm:flex-1 sm:items-center sm:gap-1">
              {(
                [
                  { key: "inventario", label: "INVENTARIO", icon: Package },
                  { key: "reparaciones", label: "REPARACIONES", icon: Wrench },
                  { key: "apartados", label: "APARTADOS", icon: Bookmark },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === "apartados" && !kioscoSupported) {
                      alert("Apartados esta disponible en PRO y Trial.")
                      return
                    }
                    setBottomTab(key)
                  }}
                  className={`flex min-w-0 w-full items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[9px] font-bold tracking-tight transition-colors sm:w-auto sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm ${
                    bottomTab === key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                  {key === "reparaciones" && reparacionesListas.length > 0 && (
                    <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 ml-1">{reparacionesListas.length}</Badge>
                  )}
                  {key === "apartados" && <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0 ml-1">PRO</Badge>}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowVentasEnEspera(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] font-black uppercase tracking-tight text-amber-700 transition-colors hover:bg-amber-100 sm:mt-0 sm:ml-auto sm:w-auto sm:px-4 sm:text-sm"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Ventas en espera</span>
              {ventasEnEsperaCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-black text-white">
                  {ventasEnEsperaCount}
                </span>
              )}
            </button>
          </div>
          )}

          {(kioscoMode || bottomTab === "inventario") && (<>
            {/* MAIN CONTENT */}
            <div className="flex flex-col gap-4">
              {/* Search & special button */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    aria-label="Buscar productos"
                    placeholder="Buscar por nombre, SKU, codigo o categoria..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="h-11 pl-10 pr-14"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                    <ProBarcodeButton
                      buttonSize="compact"
                      iconSize="md"
                      enabledTooltip="Abrir camara para escanear codigo"
                      ariaLabel="Abrir camara para escanear codigo"
                      className="bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:text-blue-700 active:bg-blue-800"
                      onScan={(code) => {
                        setSearchProduct(code)
                      }}
                    />
                  </div>
                </div>
                {!kioscoMode && (
                <Button
                  onClick={() => setShowSpecial(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase gap-2 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Producto / Servicio Rapido
                </Button>
                )}
              </div>

              {quickCategories.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("")
                      if (!searchProduct.trim()) setProductos(initialProductosRef.current)
                    }}
                    className={`h-9 shrink-0 rounded-full border px-4 text-[11px] font-black uppercase tracking-wider ${
                      selectedCategory === ""
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                    }`}
                  >
                    Todo
                  </button>
                  {quickCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSearchProduct("")
                        setSelectedCategory(cat)
                        loadByCategory(cat)
                      }}
                      className={`h-9 shrink-0 rounded-full border px-4 text-[11px] font-black uppercase tracking-wider ${
                        selectedCategory === cat
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                      }`}
                    >
                        {categoryCatalog[cat] ?? cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Product grid */}
              <Card className="flex-1 rounded-3xl border-slate-200 bg-white shadow-sm overflow-hidden">
                <CardContent className="p-4">
                  {productosLoading ? (
                    <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                      Cargando inventario...
                    </div>
                  ) : productosError ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                      <AlertCircle className="h-10 w-10 text-red-400" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-red-600">Error al cargar el inventario</p>
                        <button
                          type="button"
                          onClick={refreshProductos}
                          className="mt-1.5 text-xs text-blue-600 underline hover:text-blue-700 transition-colors"
                        >
                          Reintentar
                        </button>
                      </div>
                    </div>
                  ) : filteredProductos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                      <Package className="h-12 w-12 text-muted-foreground/30" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {searchProduct ? "Sin resultados" : "Sin productos con stock"}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {searchProduct
                            ? "Intenta con otro termino"
                            : "Agrega productos en el modulo Inventario"}
                        </p>
                      </div>
                    </div>
                  ) : kioscoMode ? (
                    <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 2xl:grid-cols-4 xl:max-h-[min(66vh,760px)]">
                      {filteredProductos.map((p) => {
                        const inCart = cartItems.find((i) => i.productoId === p.id)
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addProducto(p)}
                            className="group relative flex min-h-[190px] flex-col justify-between rounded-[1.6rem] border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md active:scale-[0.99]"
                          >
                            {inCart && (
                              <span className="absolute right-3 top-3 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white tabular-nums shadow-sm">
                                {inCart.cantidad}
                              </span>
                            )}
                            <div className="flex items-start justify-between gap-3">
                              <ProductThumb src={p.imagen_url} alt={p.nombre} productId={p.id} tallerId={p.taller_id} size="lg" />
                              <div className="flex-1 min-w-0 text-right">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Stock</p>
                                <p className="mt-1 text-base font-black text-slate-900 tabular-nums">{p.stock_actual}</p>
                              </div>
                            </div>
                            <div className="mt-3 min-w-0">
                              <p className="line-clamp-2 text-sm font-black leading-snug text-slate-900">
                                {p.nombre}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {p.categoria && (
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    {p.categoria}
                                  </span>
                                )}
                                {p.es_equipo && (
                                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
                                    Equipo
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 flex items-end justify-between gap-3">
                              <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Precio</p>
                                <p className="text-lg font-black italic text-blue-600">${fmt(p.precio_venta)}</p>
                              </div>
                              <span className="rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                                Agregar
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 overflow-y-auto pr-1 lg:max-h-[min(52vh,560px)]">
                      {filteredProductos.map((p) => {
                        const inCart = cartItems.find((i) => i.productoId === p.id)
                        return (
                          <article
                            key={p.id}
                            className="group relative flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-all hover:border-blue-400 hover:bg-blue-50/50"
                          >
                            {inCart && (
                              <span className="absolute right-2 top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white tabular-nums">
                                {inCart.cantidad}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => addProducto(p)}
                              className="flex min-w-0 flex-1 items-start gap-3 text-left"
                            >
                              <ProductThumb src={p.imagen_url} alt={p.nombre} productId={p.id} tallerId={p.taller_id} />
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="truncate text-sm font-semibold leading-snug text-foreground">
                                  {p.nombre}
                                </p>
                                {p.categoria && (
                                  <p className="mt-0.5 truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                                    {p.categoria}
                                  </p>
                                )}
                                <p className="mt-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                                  Stock <span className="text-slate-800">{p.stock_actual}</span>
                                </p>
                              </div>
                            </button>
                            <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                              <p className="text-sm font-bold tabular-nums text-blue-600">${fmt(p.precio_venta)}</p>
                              <button
                                type="button"
                                onClick={() => openApartado(p)}
                                className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700 transition hover:border-blue-600 hover:bg-blue-600 hover:text-blue-700"
                              >
                                Apartar
                              </button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>)}

          {!kioscoMode && bottomTab === "reparaciones" && (<div id="panel-reparaciones" role="tabpanel" tabIndex={0} className="space-y-5">
            {/* Top actions row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  aria-label="Buscar folio o cliente"
                  placeholder="Buscar folio o cliente..."
                  value={searchReparacion}
                  onChange={(e) => setSearchReparacion(e.target.value)}
                  className="pl-10 rounded-2xl border-slate-200 bg-white h-11"
                />
              </div>
              {!PRO_FEATURES_TEMP_DISABLED && (
                <Button
                  onClick={() => router.push("/dashboard/compras/usados")}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase gap-2 whitespace-nowrap rounded-2xl h-11 px-5"
                >
                  <Smartphone className="h-4 w-4" />
                  Comprar equipo
                </Button>
              )}
              <Button
                onClick={() => setShowSpecial(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase gap-2 whitespace-nowrap rounded-2xl h-11 px-5"
              >
                <Plus className="h-4 w-4" />
                Producto / servicio rapido
              </Button>
              <button
                type="button"
                onClick={() => setShowVentasEnEspera(true)}
                className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-amber-600 hover:bg-amber-100 transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                Ventas en espera
                {ventasEnEsperaCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] font-black text-white">
                    {ventasEnEsperaCount}
                  </span>
                )}
              </button>
            </div>

            {/* Cards grid */}
            {reparacionesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm animate-pulse">
                    <div className="h-3 w-16 bg-slate-200 rounded mb-3" />
                    <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
                    <div className="h-3 w-1/2 bg-slate-200 rounded mb-4" />
                    <div className="flex justify-between mt-4">
                      <div className="h-4 w-12 bg-slate-200 rounded" />
                      <div className="h-4 w-10 bg-slate-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredReparaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Wrench className="h-12 w-12 text-slate-700" />
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {searchReparacion ? "Sin resultados" : "Sin reparaciones listas"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {searchReparacion ? "Intenta con otro termino" : "No hay equipos pendientes de entrega"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredReparaciones.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => router.push(`/dashboard/reparaciones/${r.id}`)}
                    className="group cursor-pointer rounded-3xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
                  >
                    <p className="text-[11px] font-black text-blue-600 uppercase tracking-wider mb-2">
                      #{r.folio}
                    </p>
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 leading-tight">
                      {r.device}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{r.customer}</p>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm font-black text-blue-600">{r.price}</span>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 border border-emerald-100">
                        LISTO
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>)}

          {!kioscoMode && bottomTab === "apartados" && (
            <ApartadosPanel
              refreshKey={apartadosRefreshKey}
              business={{
                name: tallerSettings.nombre_taller,
                phone: tallerSettings.telefono,
                logoUrl: tallerSettings.logo_url,
                mensajeDespedida: tallerSettings.mensaje_despedida,
                countryName: tallerSettings.pais,
              }}
            />
          )}

        </div>

        {/* RIGHT COLUMN - CART (always visible, aligned with tabs) */}
        <div id="cart-panel" className="min-w-0 w-full">
          <CartPanel
            cartItems={cartItems}
            clienteKey={clienteKey}
            clienteNombre={clienteNombre}
            clienteTelefono={clienteTelefono}
            onClientFound={(payload: ClientAutocompletePayload | null) => {
              if (!payload?.id) return
              setActiveCustomer({
                id: payload.id,
                nombre: payload.nombre,
                telefono: payload.telefono,
                correo: payload.correo || "",
              })
            }}
            onUsePublicGeneral={() => {
              clearActiveCustomer()
            }}
            onIncrement={increment}
            onDecrement={decrement}
            onRemove={removeItem}
            onClear={clearCart}
            metodoPago={metodoPago}
            onSelectMetodo={selectMetodo}
            montoEfectivo={montoEfectivo}
            onSetMontoEfectivo={setMontoEfectivo}
            montoTarjeta={montoTarjeta}
            onSetMontoTarjeta={setMontoTarjeta}
            montoTransferencia={montoTransferencia}
            onSetMontoTransferencia={setMontoTransferencia}
            referenciaPago={referenciaPago}
            onSetReferenciaPago={setReferenciaPago}
            subtotal={subtotal}
            total={total}
            descuentoAplicado={descuentoAplicado}
            onOpenDescuento={() => setShowDescuento(true)}
            onApplyExacto={applyExacto}
            cambio={cambio}
            mixtoTotal={mixtoTotal}
            saleError={saleError}
            onSetSaleError={setSaleError}
            onFinalizar={handleFinalizarVenta}
            onEnEspera={handleEnEspera}
            cajaExists={!!caja}
            kioskMode={kioscoMode}
            kioskCompact={kioscoMode}
            cashPresets={kioscoMode ? kioscoConfig?.cash_presets.valores ?? [] : []}
            cashPresetsCurrency={kioscoConfig?.cash_presets.moneda ?? "MXN"}
            onApplyCashPreset={applyCashPreset}
          />
        </div>
      </div>
  )}

      {activeTab === "historial" && (
        <div id="panel-historial" role="tabpanel" tabIndex={0}>
          <HistorialCaja />
        </div>
      )}

      {/* -- Modals ------------------------------------------------------------ */}

      {showArqueo && caja && (
        <ArqueoModal
          open={showArqueo}
          onOpenChange={setShowArqueo}
          caja={caja}
        />
      )}

      {showDescuento && (
        <DescuentoModal
          open={showDescuento}
          onOpenChange={setShowDescuento}
          subtotal={subtotal}
          onApply={(descuento) => setDescuentoAplicado(descuento)}
        />
      )}

      {showSpecial && (
        <SpecialModal
          open={showSpecial}
          onOpenChange={setShowSpecial}
          onAdd={(item) => setCartItems((prev) => [...prev, item])}
        />
      )}

      {showConfirm && (
        <ConfirmModal
          open={showConfirm}
          onOpenChange={setShowConfirm}
          total={total}
          metodo={metodoPago}
          cambio={cambio}
          clienteNombre={clienteNombre}
          itemCount={cartItems.reduce((s, i) => s + i.cantidad, 0)}
          loading={saleLoading}
          onConfirm={handleConfirmSale}
        />
      )}

      {ventaCreada && (
        <SuccessModal
          open={!!ventaCreada}
          venta={ventaCreada}
          tallerNombre={tallerSettings.nombre_taller}
          tallerTelefono={tallerSettings.telefono}
          logoUrl={tallerSettings.logo_url}
          terminosGarantia={terminosVenta}
          mensajeDespedida={tallerSettings.mensaje_despedida}
          impresoraTicket={tallerSettings.impresora_ticket}
          impresionConfig={tallerSettings.impresion_config}
          tallerId={tallerSettings.taller_id}
          direccion={tallerSettings.direccion}
          tallerPais={tallerSettings.pais ?? null}
          onClose={() => { setVentaCreada(null); clearCart() }}
        />
      )}

      <VentaEnEsperaConfirm
        open={showVentaEnEsperaConfirm}
        onClose={() => setShowVentaEnEsperaConfirm(false)}
      />

      <VentasEnEsperaModal
        open={showVentasEnEspera}
        onClose={() => setShowVentasEnEspera(false)}
        onRecuperar={handleRecuperarVentaEnEspera}
      />

      <ApartadoModal
        open={!!apartadoProduct}
        product={apartadoProduct}
        onClose={() => setApartadoProduct(null)}
        onCreated={(_apartado: ApartadoResumen) => {
          setBottomTab("apartados")
          setApartadoReceipt({ apartado: _apartado, kind: "apartado" })
          setApartadosRefreshKey((key) => key + 1)
          void refreshProductos()
        }}
      />

      <ApartadoReceiptModal
        apartado={apartadoReceipt?.apartado ?? null}
        kind={apartadoReceipt?.kind ?? "apartado"}
        onClose={() => setApartadoReceipt(null)}
        business={{
          name: tallerSettings.nombre_taller,
          phone: tallerSettings.telefono,
          logoUrl: tallerSettings.logo_url,
          mensajeDespedida: tallerSettings.mensaje_despedida,
          countryName: tallerSettings.pais,
        }}
      />

      </div>

      {/* -- Mobile sticky cart bar - hidden on lg (two-panel layout visible) -- */}
      {activeTab !== "historial" && cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] xl:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-black" aria-hidden="true">
              {cartItems.reduce((s, i) => s + i.cantidad, 0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 leading-none">Carrito</p>
              <p className="text-base font-black text-slate-900 tabular-nums">${fmt(total)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {kioscoMode ? (
              <>
                <Button
                  variant={metodoPago === "tarjeta" ? "default" : "outline"}
                  size="sm"
                  onClick={() => quickPayAndOpenConfirm("tarjeta")}
                  disabled={cartItems.length === 0 || !caja}
                  className="h-9 text-xs font-bold px-3"
                >
                  Tarjeta
                </Button>
                <Button
                  variant={metodoPago === "transferencia" ? "default" : "outline"}
                  size="sm"
                  onClick={() => quickPayAndOpenConfirm("transferencia")}
                  disabled={cartItems.length === 0 || !caja}
                  className="h-9 text-xs font-bold px-3"
                >
                  Transf.
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    document.getElementById("cart-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }}
                  className="h-9 text-xs font-semibold border-slate-200"
                  aria-label="Ir al carrito"
                >
                  Ver carrito
                </Button>
                <Button
                  onClick={handleFinalizarVenta}
                  disabled={!caja}
                  className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 disabled:opacity-50"
                >
                  Finalizar
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function VentasPage() {
  return (
    <CajaProvider>
      <VentasPageContent />
      <OpenCajaModal />
    </CajaProvider>
  )
}





