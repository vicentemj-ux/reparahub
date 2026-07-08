'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { InventoryProductImage } from "@/components/dashboard/inventory-product-image"
import { useSearchParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Box,
  Package,
  AlertTriangle,
  TrendingUp,
  Search,
  ArrowUpDown,
  ChevronUp,
  Download,
  Upload,
  Plus,
  ChevronDown,
  Loader2,
  PackageCheck,
  History,
  Printer,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  X,
  Store,
  Crown,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/hooks/use-toast"
import {
  getProductos,
  getProductosInventarioExport,
  getInventoryOperationalKpis,
  createProducto,
  createEquiposLote,
  bulkImportProductos,
  deleteProducto,
  loadInventarioMountData,
  type ProductoRow,
  type CreateEquiposLoteInput,
  type CreateEquiposLoteResult,
  type BulkImportProductoInput,
} from "@/lib/actions/productos-prisma"
import { getMiTiendaConfig, type TiendaConfigFull } from "@/lib/actions/tienda-prisma"
import {
  createInventoryCategory,
  deleteInventoryCategory,
  listInventoryCategories,
  setInventoryCategoryActive,
  updateInventoryCategory,
} from "@/lib/actions/inventory-categories-prisma"
import { getTallerSettings, type TallerSettings } from "@/lib/actions/settings-prisma"
import { getEsUsuarioPro } from "@/lib/actions/auth-prisma"
import { AccessoryLabel, DeviceInventoryLabel, type AccessoryLabelData, type DeviceInventoryLabelData } from "@/components/printing"
import { isEquipoExhibitionCategory } from "@/components/dashboard/inventory-label-utils"
import { getCategoryIcon } from "@/lib/inventory-category-icons"
import { printCartelExhibicion } from "@/components/dashboard/print-cartel-exhibicion"
import { formatPeso, formatMoney } from "@/lib/utils/currency"
import { serializeImagenUrls } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { useProductImages } from "@/lib/hooks/useProductImages"
import { InventoryPublicidadMenu } from "@/components/dashboard/inventory-publicidad-menu"
import { NuevoProductoModal } from "@/components/dashboard/inventario/NuevoProductoModal"
import { AltaEquiposLoteModal } from "@/components/dashboard/inventario/AltaEquiposLoteModal"
import { CrearCategoriaModal } from "@/components/dashboard/inventario/CrearCategoriaModal"
import { generateInventoryBarcode } from "@/lib/inventory-barcode"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const SEARCH_PARAM = "q"
const CATEGORY_PARAM = "cat"
const STATUS_PARAM = "status"

const LABEL_W_MM = 50.8
const LABEL_H_MM = 25.4
const LABEL_PREVIEW_SCALE = 2.6

const INVENTORY_EXPORT_HEADERS = [
  "nombre",
  "sku",
  "categoria",
  "codigo_barras",
  "descripcion",
  "marca",
  "modelo",
  "ubicacion",
  "costo",
  "precio_venta",
  "stock_actual",
  "stock_minimo",
  "es_equipo",
  "imei_serie",
  "color",
  "capacidad",
  "procesador",
  "ram",
  "almacenamiento",
  "condicion",
  "publicado_en_tienda",
  "descripcion_publica",
] as const

const INVENTORY_TEMPLATE_SAMPLE = [
  "iPhone 11 64GB Blanco",
  "IPH11-64-BLA",
  "EQUIPOS",
  "260626000001",
  "Equipo para venta en vitrina",
  "Apple",
  "iPhone 11",
  "Vitrina",
  "3500",
  "5200",
  "1",
  "1",
  "si",
  "356789123456789",
  "Blanco",
  "64GB",
  "",
  "4GB",
  "64GB",
  "Seminuevo",
  "no",
  "Equipo revisado y listo para venta",
] as const

/**
 * Wrapper visual para el preview de la etiqueta dentro del modal.
 * Escala el template (que mide 50.8mm x 25.4mm fisicos) a un tamano
 * visual 2.6x para que la card del modal crezca y no corte las lineas.
 * Mismo patron usado en `components/dashboard/print-menu-dropdown.tsx`
 * para la etiqueta de reparacion — asi preview e impresion usan el
 * mismo template y son visualmente identicos.
 */
function LabelPreviewWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        width: `${LABEL_W_MM * LABEL_PREVIEW_SCALE}mm`,
        height: `${LABEL_H_MM * LABEL_PREVIEW_SCALE}mm`,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `scale(${LABEL_PREVIEW_SCALE})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  )
}

function escapeCsvValue(value: unknown) {
  let v = String(value ?? "")
  if (v.indexOf('"') !== -1) v = v.replace(/"/g, '""')
  if (v.search(/("|,|\n|\r)/) !== -1) v = `"${v}"`
  return v
}

function downloadCsv(filename: string, headers: readonly string[], rows: readonly (readonly unknown[])[]) {
  const csvContent = [headers.join(","), ...rows.map((row) => row.map(escapeCsvValue).join(","))].join("\n")
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function inventoryExportRow(p: ProductoRow) {
  return [
    p.nombre ?? "",
    p.sku ?? "",
    p.categoria ?? "",
    p.codigo_barras ?? "",
    p.descripcion ?? "",
    p.marca ?? "",
    p.modelo ?? "",
    p.ubicacion ?? "",
    p.costo ?? 0,
    p.precio_venta ?? 0,
    p.stock_actual ?? 0,
    p.stock_minimo ?? 0,
    p.es_equipo ? "si" : "no",
    p.imei_serie ?? "",
    p.color ?? "",
    p.capacidad ?? "",
    p.procesador ?? "",
    p.ram ?? "",
    p.almacenamiento ?? "",
    p.condicion ?? "",
    p.publicado_en_tienda ? "si" : "no",
    p.descripcion_publica ?? "",
  ]
}

function normalizeCsvHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
}

function InventarioContent() {
  const [productos, setProductos] = useState<ProductoRow[]>([])
  const [loadingProductos, setLoadingProductos] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingProducto, setEditingProducto] = useState<ProductoRow | null>(null)
  /** null = orden del servidor (created_at desc, ultimo creado arriba). */
  const [sortBy, setSortBy] = useState<"nombre" | "stock" | "precio" | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFileName, setImportFileName] = useState("")
  const [importSummary, setImportSummary] = useState<{
    inserted: number
    skipped: number
    totalCostoCarga: number
    errors?: string[]
  } | null>(null)
  const [showErrorLog, setShowErrorLog] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyProducto, setHistoryProducto] = useState<ProductoRow | null>(null)
  const [labelModalOpen, setLabelModalOpen] = useState(false)
  const [labelProducto, setLabelProducto] = useState<ProductoRow | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [tallerNombre, setTallerNombre] = useState("")
  const [tallerSettings, setTallerSettings] = useState<TallerSettings | null>(null)
  const [isUsuarioPro, setIsUsuarioPro] = useState(false)
  const [showPriceOnLabel, setShowPriceOnLabel] = useState(true)
  const [showMobileKPIs, setShowMobileKPIs] = useState(false)
  const [bulkEquiposOpen, setBulkEquiposOpen] = useState(false)
  const [bulkEquiposSaving, setBulkEquiposSaving] = useState(false)

  // Form state
  const [nombre, setNombre] = useState("")
  const [sku, setSku] = useState("")
  const [codigoBarras, setCodigoBarras] = useState("")
  const [categoria, setCategoria] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [costo, setCosto] = useState("0")
  const [precioVenta, setPrecioVenta] = useState("0")
  const [stockActual, setStockActual] = useState("1")
  const [stockMinimo, setStockMinimo] = useState("5")
  const [esEquipo, setEsEquipo] = useState(false)
  const [imeiSerie, setImeiSerie] = useState("")
  const [imeiType, setImeiType] = useState<"imei" | "serie">("imei")
  const [imeiError, setImeiError] = useState<string | null>(null)
  const [color, setColor] = useState("")
  const [procesador, setProcesador] = useState("")
  const [ram, setRam] = useState("")
  const [almacenamiento, setAlmacenamiento] = useState("")
  const [marca, setMarca] = useState("")
  const [modelo, setModelo] = useState("")
  const [condicion, setCondicion] = useState("")
  const [ubicacion, setUbicacion] = useState("")
  const [registrarIdentificador, setRegistrarIdentificador] = useState(false)
  const [publicadoEnTienda, setPublicadoEnTienda] = useState(false)
  const [descripcionPublica, setDescripcionPublica] = useState("")
  const [tiendaConfig, setTiendaConfig] = useState<TiendaConfigFull | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  const searchTerm = searchParams.get(SEARCH_PARAM) ?? ""
  const categoryFilter = searchParams.get(CATEGORY_PARAM) ?? ""
  const statusFilter = searchParams.get(STATUS_PARAM) ?? ""
  const hasActiveFilter = !!searchTerm || !!categoryFilter || !!statusFilter
  const [searchInput, setSearchInput] = useState(searchTerm)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync searchInput when URL changes (e.g., back button, clear filters)
  useEffect(() => {
    setSearchInput(searchTerm)
  }, [searchTerm])

  const [pageProductos, setPageProductos] = useState(0)
  const [totalProductos, setTotalProductos] = useState(0)
  const [operationalKpis, setOperationalKpis] = useState({
    valorEnRiesgo: 0,
    rotacionDias: 0,
  })
  const [categoriasDisponibles, setCategoriasDisponibles] = useState<Array<{ id: string; slug: string; nombre: string; icono: string | null; tipo: string; activo: boolean; aliases: string[] }>>([])
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false)
  const [categoriasManagerOpen, setCategoriasManagerOpen] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState<null | {
    id: string
    nombre: string
    icono: string | null
    aliases: string[]
    tipo: string
  }>(null)
  const [categoriaPendienteBorrar, setCategoriaPendienteBorrar] = useState<null | {
    id: string
    nombre: string
  }>(null)
  const PAGE_SIZE_PRODUCTOS = 50

  const requestIdRef = useRef(0)
  const editingProductoRef = useRef<ProductoRow | null>(null)

  useEffect(() => { editingProductoRef.current = editingProducto }, [editingProducto])

  const {
    imagenUrls,
    setImagenUrls,
    localPreviewUrls,
    uploadingImageSlot,
    imageUploadError,
    setImageUploadError,
    draftProductId,
    setDraftProductId,
    loadEditingUrls,
    handleImageFile,
    removeImage,
    handleMultipleImageFiles,
    handleCameraFiles,
    cleanupDraft,
  } = useProductImages({
    editingProducto,
    buildDraftPayload: (productId, nameFallback) => {
      const payload = buildProductPayload(productId, nameFallback)
      return { ...payload, imagen_url: undefined }
    },
  })

  const loadProductos = useCallback(async (p: number) => {
    const reqId = ++requestIdRef.current
    setLoadingProductos(true)
    try {
      const [{ data, total }, kpiRes] = await Promise.all([
        getProductos(p, PAGE_SIZE_PRODUCTOS, searchTerm),
        getInventoryOperationalKpis(),
      ])
      if (reqId !== requestIdRef.current) return
      setProductos(data || [])
      setTotalProductos(total)
      if (!kpiRes.error) {
        setOperationalKpis({
          valorEnRiesgo: kpiRes.valorEnRiesgo,
          rotacionDias: kpiRes.rotacionDiasPromedio,
        })
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setLoadingProductos(false)
      }
    }
  }, [searchTerm])

  const ensureEquiposCategoria = async () => {
    setCategoria("EQUIPOS")
  }

  const loadTiendaConfig = useCallback(async () => {
    const res = await getMiTiendaConfig()
    if (res.success && res.data) {
      setTiendaConfig(res.data)
    }
  }, [])

  const handleCreateCategoria = async () => {
    setCategoriaEditando(null)
    setCategoriaModalOpen(true)
  }

  const handleEditCategoria = (categoriaItem: {
    id: string
    nombre: string
    icono: string | null
    aliases: string[]
    tipo: string
  }) => {
    setCategoriaEditando(categoriaItem)
    setCategoriaModalOpen(true)
  }

  const handleSaveCategoria = async (payload: { nombre: string; icono: string; aliases: string[] }) => {
    const res = categoriaEditando
      ? await updateInventoryCategory({
          id: categoriaEditando.id,
          nombre: payload.nombre,
          icono: payload.icono,
          aliases: payload.aliases,
        })
      : await createInventoryCategory(payload.nombre, payload.icono, payload.aliases)
    if (res.error) {
      throw new Error(res.error)
    }
    await loadCategorias()
    if (res.category?.nombre) setCategoria(res.category.nombre)
    toast({
      title: categoriaEditando ? "Categoria actualizada" : "Categoria creada",
      description: `"${res.category?.nombre}" se guardo correctamente.`,
    })
  }

  const handleToggleCategoria = async (categoriaItem: {
    id: string
    nombre: string
    activo: boolean
    tipo: string
  }) => {
    const res = await setInventoryCategoryActive({ id: categoriaItem.id, active: !categoriaItem.activo })
    if (res.error) {
      toast({ title: "No se pudo actualizar", description: res.error, variant: "destructive" })
      return
    }
    await loadCategorias()
    toast({
      title: categoriaItem.activo ? "Categoria archivada" : "Categoria reactivada",
      description: `"${categoriaItem.nombre}" se actualizo correctamente.`,
    })
  }

  const handleDeleteCategoria = async () => {
    if (!categoriaPendienteBorrar) return
    const res = await deleteInventoryCategory(categoriaPendienteBorrar.id)
    if (res.error) {
      toast({ title: "No se pudo borrar", description: res.error, variant: "destructive" })
      return
    }
    setCategoriaPendienteBorrar(null)
    await loadCategorias()
    toast({ title: "Categoria borrada", description: `"${categoriaPendienteBorrar.nombre}" se elimino.` })
  }

  useEffect(() => {
    setPageProductos(0)
  }, [searchTerm])

  useEffect(() => {
    const reqId = ++requestIdRef.current
    setLoadingProductos(true)
    loadInventarioMountData(pageProductos, PAGE_SIZE_PRODUCTOS, searchTerm)
      .then(({ productos: { data, total }, kpis, categorias }) => {
        if (reqId !== requestIdRef.current) return
        setProductos(data || [])
        setTotalProductos(total)
        if (!kpis.error) {
          setOperationalKpis({
            valorEnRiesgo: kpis.valorEnRiesgo,
            rotacionDias: kpis.rotacionDiasPromedio,
          })
        }
        if (!categorias.error) {
          setCategoriasDisponibles(
            categorias.data.map((c) => ({
              id: c.id,
              slug: c.slug,
              nombre: c.nombre,
              icono: c.icono,
              tipo: c.tipo,
              activo: c.activo,
              aliases: c.aliases,
            })),
          )
        }
      })
      .finally(() => {
        if (reqId === requestIdRef.current) setLoadingProductos(false)
      })
  }, [pageProductos, searchTerm])

  const loadCategorias = useCallback(async () => {
    const res = await listInventoryCategories({ includeInactive: true })
    if (!res.error) {
      setCategoriasDisponibles(
        res.data.map((c) => ({
          id: c.id,
          slug: c.slug,
          nombre: c.nombre,
          icono: c.icono,
          tipo: c.tipo,
          activo: c.activo,
          aliases: c.aliases,
        })),
      )
    }
  }, [])

  const activeCategoryOptions = useMemo(
    () =>
      categoriasDisponibles
        .filter((c) => c.activo)
        .map((c) => ({ slug: c.slug, nombre: c.nombre, icono: c.icono })),
    [categoriasDisponibles],
  )

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    Promise.all([getTallerSettings(), getEsUsuarioPro()]).then(([settingsRes, pro]) => {
      if (settingsRes.settings) {
        setTallerSettings(settingsRes.settings)
        setTallerNombre(settingsRes.settings.nombre_taller || "")
      }
      setIsUsuarioPro(pro)
    })
  }, [])

  const openImportModal = () => {
    setImportModalOpen(true)
    setImporting(false)
    setImportFileName("")
    setImportSummary(null)
    setShowErrorLog(false)
  }

  const closeImportModal = () => {
    if (importing) return
    setImportModalOpen(false)
  }

  const toggleSort = (column: "nombre" | "stock" | "precio") => {
    setSortBy((current) => {
      if (current === column) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
        return current
      }
      setSortDir("asc")
      return column
    })
  }

  const updateSearchParams = (params: { q?: string; cat?: string; status?: string }) => {
    const sp = new URLSearchParams(searchParams.toString())
    if (params.q !== undefined) {
      // No hacemos trim aqui: permite escribir espacios (ej: "Cargador tipo c").
      // URLSearchParams se encarga de encodear espacios como %20/+.
      const raw = params.q
      if (raw.trim().length > 0) sp.set(SEARCH_PARAM, raw)
      else sp.delete(SEARCH_PARAM)
    }
    if (params.cat !== undefined) {
      const value = params.cat.trim()
      if (value) sp.set(CATEGORY_PARAM, value)
      else sp.delete(CATEGORY_PARAM)
    }
    if (params.status !== undefined) {
      const value = params.status.trim()
      if (value) sp.set(STATUS_PARAM, value)
      else sp.delete(STATUS_PARAM)
    }
    router.replace(`?${sp.toString()}`, { scroll: false })
  }

  const openModal = () => {
    setEditingProducto(null)
    setDraftProductId(crypto.randomUUID())
    setModalOpen(true)
    setNombre("")
    setSku("")
    setCodigoBarras("")
    setCategoria("")
    setDescripcion("")
    setImagenUrls(["", "", ""])
    setCosto("0")
    setPrecioVenta("0")
    setStockActual("1")
    setStockMinimo("5")
    setEsEquipo(false)
    setImeiSerie("")
    setImeiType("imei")
    setImeiError(null)
    setColor("")
    setProcesador("")
    setRam("")
    setAlmacenamiento("")
    setMarca("")
    setModelo("")
    setCondicion("")
    setUbicacion("")
    setRegistrarIdentificador(false)
    setPublicadoEnTienda(false)
    setDescripcionPublica("")
    void loadTiendaConfig()
  }

  const closeModal = () => {
    if (saving) return
    const wasNew = !editingProducto
    void (async () => {
      if (wasNew) {
        await cleanupDraft()
      }
      setModalOpen(false)
      setEditingProducto(null)
    })()
  }

  const handleEdit = (producto: ProductoRow) => {
    loadEditingUrls(producto.imagen_url)
    setEditingProducto(producto)
    setDraftProductId(producto.id)
    setNombre(producto.nombre || "")
    setSku(producto.sku || "")
    setCodigoBarras(producto.codigo_barras || "")
    setCategoria(producto.categoria || "")
    setDescripcion(producto.descripcion || "")
    setCosto(String(producto.costo ?? 0))
    setPrecioVenta(String(producto.precio_venta ?? 0))
    setStockActual(String(producto.stock_actual ?? 0))
    setStockMinimo(String(producto.stock_minimo ?? 0))
    setEsEquipo(Boolean(producto.es_equipo))
    setImeiSerie(producto.imei_serie || "")
    const storedImei = producto.imei_serie || ""
    setImeiType(storedImei && /^\d{15}$/.test(storedImei) ? "imei" : storedImei ? "serie" : "imei")
    setImeiError(null)
    setColor(producto.color || "")
    setProcesador(producto.procesador || "")
    setRam(producto.ram || "")
    setAlmacenamiento((producto.almacenamiento || producto.capacidad || "").trim())
    setMarca(producto.marca || "")
    setModelo(producto.modelo || "")
    setCondicion(producto.condicion || "")
    setUbicacion(producto.ubicacion || "")
    setRegistrarIdentificador(Boolean(producto.imei_serie?.trim()))
    setPublicadoEnTienda(Boolean(producto.publicado_en_tienda))
    setDescripcionPublica(producto.descripcion_publica || "")
    setImageUploadError(null)
    setModalOpen(true)
    void loadTiendaConfig()
  }

  /** Campos calculados compartidos entre buildProductPayload y buildProductoSnapshotFromForm. */
  const buildFormCore = () => {
    const identificadorUnico = esEquipo && registrarIdentificador && !!imeiSerie.trim()
    const stockFinal = identificadorUnico ? 1 : parseInt(stockActual, 10) || 0
    const almacStr = esEquipo ? almacenamiento.trim() || null : null
    return {
      identificadorUnico,
      stockFinal,
      almacStr,
      nom: nombre.trim(),
      costoVal: Math.max(0, parseFloat(costo) || 0),
      precioVentaVal: Math.max(0, parseFloat(precioVenta) || 0),
      stockMinVal: identificadorUnico ? 1 : parseInt(stockMinimo, 10) || 5,
      skuVal: sku.trim() || null,
      barrasVal: codigoBarras.trim() || null,
      categoriaVal: categoria.trim() || null,
      descripcionVal: descripcion.trim() || null,
      marcaVal: marca.trim() || null,
      modeloVal: modelo.trim() || null,
      ubicacionVal: ubicacion.trim() || null,
      condicionVal: condicion.trim() || null,
      imeiVal: esEquipo && registrarIdentificador ? imeiSerie.trim() || null : null,
      colorVal: esEquipo ? color.trim() || null : null,
      procesadorVal: esEquipo ? procesador.trim() || null : null,
      ramVal: esEquipo ? ram.trim() || null : null,
    }
  }

  /** Payload para la Server Action. Permite nombre vacio -> borrador (para persistir antes de foto). */
  const buildProductPayload = (productId: string, nombreFallback: string, imagenUrlsOverride?: string[]) => {
    const c = buildFormCore()
    const orUndef = (v: string | null) => v ?? undefined
    return {
      id: productId,
      nombre: c.nom || nombreFallback,
      sku: orUndef(c.skuVal),
      codigo_barras: orUndef(c.barrasVal),
      imagen_url: serializeImagenUrls(imagenUrlsOverride ?? imagenUrls) ?? undefined,
      categoria: orUndef(c.categoriaVal),
      descripcion: orUndef(c.descripcionVal),
      marca: orUndef(c.marcaVal),
      modelo: orUndef(c.modeloVal),
      ubicacion: orUndef(c.ubicacionVal),
      costo: c.costoVal,
      precio_venta: c.precioVentaVal,
      stock_actual: c.stockFinal,
      stock_minimo: c.stockMinVal,
      es_equipo: esEquipo,
      imei_serie: orUndef(c.imeiVal),
      color: orUndef(c.colorVal),
      procesador: orUndef(c.procesadorVal),
      ram: orUndef(c.ramVal),
      almacenamiento: orUndef(c.almacStr),
      condicion: orUndef(c.condicionVal),
      publicado_en_tienda: publicadoEnTienda,
      descripcion_publica: descripcionPublica.trim() ? descripcionPublica.trim().slice(0, 500) : null,
    }
  }

  const handleGuardarProducto = async () => {
    const nom = nombre.trim()
    if (!nom) {
      toast({ title: "Campo requerido", description: "Ingresa el nombre del producto.", variant: "destructive" })
      return
    }
    if (esEquipo && registrarIdentificador) {
      const imei = imeiSerie.trim()
      if (!imei) {
        setImeiError('Ingresa el identificador o desactiva "Registrar IMEI o numero de serie".')
        return
      }
      if (imeiType === "imei") {
        if (!/^\d+$/.test(imei)) {
          setImeiError("El IMEI solo debe contener digitos numericos (sin espacios ni letras).")
          return
        }
        if (imei.length !== 15) {
          setImeiError(`IMEI incompleto: ${imei.length}/15 digitos. Verifica el numero.`)
          return
        }
      } else {
        if (imei.length < 8) {
          setImeiError(`Serie muy corta: ${imei.length}/8 caracteres minimos.`)
          return
        }
      }
    }
    setSaving(true)
    const formData = buildProductPayload(editingProducto?.id ?? draftProductId, nom, imagenUrls)
    try {
      const wasEdit = Boolean(editingProducto)
      const result = await createProducto(formData)
      if (result.success) {
        toast({
          title: wasEdit ? "Producto actualizado" : "Producto guardado",
          description: wasEdit
            ? "Los cambios del producto se guardaron correctamente."
            : "El producto se agrego al inventario.",
        })
        setModalOpen(false)
        setNombre("")
        setSku("")
        setCodigoBarras("")
        setCategoria("")
        setDescripcion("")
    setImagenUrls(["", "", ""])
        setCosto("0")
        setPrecioVenta("0")
        setStockActual("1")
        setStockMinimo("5")
        setEsEquipo(false)
        setImeiSerie("")
        setImeiType("imei")
        setImeiError(null)
        setColor("")
        setProcesador("")
        setRam("")
        setAlmacenamiento("")
        setMarca("")
        setModelo("")
        setCondicion("")
        setUbicacion("")
        setRegistrarIdentificador(false)
        setPublicadoEnTienda(false)
        setDescripcionPublica("")
        setEditingProducto(null)
        if (wasEdit) {
          await loadProductos(pageProductos)
        } else {
          setPageProductos(0)
          await loadProductos(0)
        }
      } else {
        const errorMsg = result.error ?? "No se pudo guardar."
        toast({
          title: wasEdit ? "Error al actualizar" : "Error al guardar",
          description: errorMsg,
          variant: "destructive",
        })
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      toast({ title: "Error al guardar", description: errorMsg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateEquiposLote = async (input: CreateEquiposLoteInput): Promise<CreateEquiposLoteResult> => {
    setBulkEquiposSaving(true)
    try {
      const result = await createEquiposLote(input)
      if (result.success) {
        toast({
          title: "Lote creado",
          description: `${result.createdCount} equipos se agregaron al inventario con codigo fechado.`,
        })
        setPageProductos(0)
        await loadProductos(0)
      } else {
        toast({
          title: "No se pudo crear el lote",
          description: result.error ?? result.errors?.[0] ?? "Revisa los datos capturados.",
          variant: "destructive",
        })
      }
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear el lote"
      toast({ title: "Error al crear lote", description: message, variant: "destructive" })
      return { success: false, createdCount: 0, productos: [], error: message }
    } finally {
      setBulkEquiposSaving(false)
    }
  }

  const generarCodigoBarrasInterno = () => {
    setCodigoBarras(generateInventoryBarcode())
  }

  const kpis = useMemo(() => {
    const valorizacionTotal = productos.reduce((sum, p) => {
      const costo = Number(p.costo ?? 0)
      const stock = Number(p.stock_actual ?? 0)
      return sum + costo * stock
    }, 0)

    const stockCritico = productos.filter(
      (p) => Number(p.stock_actual ?? 0) > 0 && Number(p.stock_actual ?? 0) <= Number(p.stock_minimo ?? 0)
    ).length

    const sinExistencia = productos.filter(
      (p) => Number(p.stock_actual ?? 0) <= 0
    ).length

    return { valorizacionTotal, stockCritico, sinExistencia }
  }, [productos])

  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      const matchesSearch =
        !searchTerm.trim() ||
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.codigo_barras ?? "").toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory =
        !categoryFilter.trim() || (p.categoria ?? "").toUpperCase() === categoryFilter.toUpperCase()

      let matchesStatus = true
      if (statusFilter === "critical") {
        matchesStatus = Number(p.stock_actual ?? 0) > 0 && Number(p.stock_actual ?? 0) <= Number(p.stock_minimo ?? 0)
      } else if (statusFilter === "agotado") {
        matchesStatus = Number(p.stock_actual ?? 0) <= 0
      }

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [productos, searchTerm, categoryFilter, statusFilter])

  const sortedProductos = useMemo(() => {
    const arr = [...filteredProductos]
    if (!sortBy) return arr

    return arr.sort((a, b) => {
      let aVal: string | number = ""
      let bVal: string | number = ""

      if (sortBy === "nombre") {
        aVal = (a.nombre || "").toLowerCase()
        bVal = (b.nombre || "").toLowerCase()
      } else if (sortBy === "stock") {
        aVal = a.stock_actual ?? 0
        bVal = b.stock_actual ?? 0
      } else if (sortBy === "precio") {
        aVal = a.precio_venta ?? 0
        bVal = b.precio_venta ?? 0
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        const cmp = aVal.localeCompare(bVal)
        return sortDir === "asc" ? cmp : -cmp
      }

      const diff = Number(aVal) - Number(bVal)
      return sortDir === "asc" ? diff : -diff
    })
  }, [filteredProductos, sortBy, sortDir])

  const exportFileDate = () => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const dd = String(now.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }

  const handleExportReport = () => {
    if (!sortedProductos.length) {
      toast({
        title: "Sin datos para exportar",
        description: "No hay productos que coincidan con los filtros actuales.",
      })
      return
    }

    toast({
      title: "Generando reporte...",
      description: "Tu archivo CSV se descargara en unos segundos.",
    })

    downloadCsv(`Inventario_Reporte_ReparaHub_${exportFileDate()}.csv`, INVENTORY_EXPORT_HEADERS, sortedProductos.map(inventoryExportRow))
  }

  const handleExportBackup = async () => {
    toast({
      title: "Preparando respaldo...",
      description: "Exportaremos todos los productos del inventario, no solo la pagina visible.",
    })

    const result = await getProductosInventarioExport()
    if (result.error) {
      toast({ title: "No se pudo exportar", description: result.error, variant: "destructive" })
      return
    }
    if (!result.data.length) {
      toast({ title: "Inventario vacio", description: "No hay productos para respaldar." })
      return
    }

    downloadCsv(`Inventario_Respaldo_ReparaHub_${exportFileDate()}.csv`, INVENTORY_EXPORT_HEADERS, result.data.map(inventoryExportRow))
  }

  const handleDownloadTemplate = () => {
    downloadCsv(`Plantilla_Inventario_ReparaHub.csv`, INVENTORY_EXPORT_HEADERS, [INVENTORY_TEMPLATE_SAMPLE])
  }

  const handleImportFinish = () => {
    setImportModalOpen(false)
    setImportSummary(null)
    setImportFileName("")
    setShowErrorLog(false)
  }

  const openHistory = (producto: ProductoRow) => {
    setHistoryProducto(producto)
    setHistoryModalOpen(true)
  }

  const openLabelPreview = async (producto: ProductoRow, showPrice: boolean) => {
    setShowPriceOnLabel(showPrice)
    setLabelProducto(producto)
    setLabelModalOpen(true)
  }

  /**
   * Devuelve el codigo a imprimir en la etiqueta (EAN-13 si son 12/13 digitos
   * puros, o el string tal cual si es alfanumerico). Acepta cualquier
   * combinacion de letras y numeros — los codigos de proveedor suelen usar
   * Code 128 / Code 39 y no son EAN-13. No filtra caracteres especiales
   * porque el scanner y el input del form ya los entregan limpios; el
   * template imprime CODE128 cuando no es numerico.
   */
  const getBarcodeValue = (producto: ProductoRow | null) => {
    if (!producto) return ""
    return (producto.codigo_barras || producto.sku || "").trim()
  }

  const buildLabelData = (
    producto: ProductoRow
  ): (AccessoryLabelData & { kind: "accessory-label" }) | (DeviceInventoryLabelData & { kind: "device-inventory-label" }) => {
    const isEquipo = isEquipoExhibitionCategory(producto)
    const barcodeValue = getBarcodeValue(producto)

    if (isEquipo) {
      const brand = (producto.marca ?? "").trim() || ""
      const model = (producto.modelo ?? producto.nombre ?? "").trim()
      const serialNumber = (producto.imei_serie ?? "").trim() || "—"
      const folio = (producto.sku ?? "").trim() || producto.id.slice(0, 8)
      const status = (producto.condicion ?? "").trim() || undefined
      const price = Number(producto.precio_venta ?? 0)
      const storage = (producto.almacenamiento ?? producto.capacidad ?? "").trim() || null
      const sku = (producto.sku ?? "").trim() || barcodeValue || undefined
      const description = (producto.descripcion ?? "").trim() || null

      return {
        kind: "device-inventory-label",
        brand,
        model,
        serialNumber,
        folio,
        barcode: barcodeValue || undefined,
        status,
        price,
        showPrice: showPriceOnLabel,
        storage,
        sku,
        description,
      }
    }

    const productName = (producto.nombre ?? "").trim() || "—"
    const sku = (producto.sku ?? "").trim() || (producto.codigo_barras ?? "").trim() || "—"
    const price = Number(producto.precio_venta ?? 0)
    const category = (producto.categoria ?? "").trim() || null
    const condition = (producto.condicion ?? "").trim() || null
    const barcode = getBarcodeValue(producto) || null

    return {
      kind: "accessory-label",
      productName,
      sku,
      price,
      category,
      condition,
      barcode,
      showPrice: showPriceOnLabel,
    }
  }

  const handlePrintLabel = async () => {
    if (!labelProducto) return
    const data = buildLabelData(labelProducto)
    try {
      window.localStorage.setItem("printLabel", JSON.stringify(data))
      window.open(
        "/print-label",
        "_blank",
        "noopener,noreferrer,width=520,height=300"
      )
    } catch (e) {
      toast({
        title: "Error al preparar la impresion",
        description: e instanceof Error ? e.message : "Intenta de nuevo.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (producto: ProductoRow) => {
    const result = await deleteProducto(producto.id)
    if (!result.success) {
      toast({
        title: "Error al eliminar",
        description: result.error ?? "No se pudo eliminar el producto.",
        variant: "destructive",
      })
      return
    }
    toast({ title: "Producto eliminado", description: "Se elimino el producto del inventario." })
    await loadProductos(pageProductos)
  }

  const handleImportFile = async (file: File | null) => {
    if (!file) return
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (ext !== "csv") {
      toast({
        title: "Formato no soportado",
        description: "Por ahora solo se acepta CSV. Exporta tu Excel a CSV antes de importar.",
        variant: "destructive",
      })
      return
    }

    setImportFileName(file.name)
    setImporting(true)
    setImportSummary(null)

    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (lines.length < 2) {
        throw new Error("El archivo no contiene filas de datos.")
      }

      const parseCsvLine = (line: string): string[] => {
        const result: string[] = []
        let current = ""
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"'
              i++
            } else {
              inQuotes = !inQuotes
            }
          } else if (ch === "," && !inQuotes) {
            result.push(current)
            current = ""
          } else {
            current += ch
          }
        }
        result.push(current)
        return result
      }

      const header = parseCsvLine(lines[0]).map(normalizeCsvHeader)
      const required = ["nombre"]
      const missing = required.filter((col) => !header.includes(col))
      if (missing.length) {
        throw new Error(`Faltan columnas obligatorias en el CSV: ${missing.join(", ")}`)
      }

      const idx = (...names: string[]) => {
        for (const name of names) {
          const found = header.indexOf(normalizeCsvHeader(name))
          if (found >= 0) return found
        }
        return -1
      }
      const idxNombre = idx("nombre")
      const idxSku = idx("sku")
      const idxCategoria = idx("categoria")
      const idxCodigoBarras = idx("codigo_barras", "codigo barras", "barcode", "codigo")
      const idxDescripcion = idx("descripcion", "descripcion interna", "notas")
      const idxMarca = idx("marca")
      const idxModelo = idx("modelo")
      const idxUbicacion = idx("ubicacion", "almacen", "bodega")
      const idxCosto = idx("costo")
      const idxPrecio = idx("precio_venta", "precio venta", "precio")
      const idxStock = idx("stock_actual", "stock", "existencia", "existencias")
      const idxMin = idx("stock_minimo", "minimo", "stock minimo")
      const idxEsEquipo = idx("es_equipo", "equipo")
      const idxImeiSerie = idx("imei_serie", "imei", "serie", "serial")
      const idxColor = idx("color")
      const idxCapacidad = idx("capacidad")
      const idxProcesador = idx("procesador")
      const idxRam = idx("ram", "memoria")
      const idxAlmacenamiento = idx("almacenamiento", "storage")
      const idxCondicion = idx("condicion", "estado fisico")
      const idxPublicado = idx("publicado_en_tienda", "mi tienda", "publicado")
      const idxDescripcionPublica = idx("descripcion_publica", "descripcion publica")

      const rows = lines.slice(1).map((line) => parseCsvLine(line))

      const toVal = (cols: string[], i: number) => (i >= 0 && i < cols.length ? cols[i].trim() : "")

      const payload = rows
        .map((cols) => ({
          nombre: toVal(cols, idxNombre),
          sku: idxSku >= 0 ? toVal(cols, idxSku) : undefined,
          categoria: idxCategoria >= 0 ? toVal(cols, idxCategoria) : undefined,
          codigo_barras: idxCodigoBarras >= 0 ? toVal(cols, idxCodigoBarras) : undefined,
          descripcion: idxDescripcion >= 0 ? toVal(cols, idxDescripcion) : undefined,
          marca: idxMarca >= 0 ? toVal(cols, idxMarca) : undefined,
          modelo: idxModelo >= 0 ? toVal(cols, idxModelo) : undefined,
          ubicacion: idxUbicacion >= 0 ? toVal(cols, idxUbicacion) : undefined,
          costo: idxCosto >= 0 ? toVal(cols, idxCosto) : undefined,
          precio_venta: idxPrecio >= 0 ? toVal(cols, idxPrecio) : undefined,
          stock_actual: idxStock >= 0 ? toVal(cols, idxStock) : undefined,
          stock_minimo: idxMin >= 0 ? toVal(cols, idxMin) : undefined,
          es_equipo: idxEsEquipo >= 0 ? toVal(cols, idxEsEquipo) : undefined,
          imei_serie: idxImeiSerie >= 0 ? toVal(cols, idxImeiSerie) : undefined,
          color: idxColor >= 0 ? toVal(cols, idxColor) : undefined,
          capacidad: idxCapacidad >= 0 ? toVal(cols, idxCapacidad) : undefined,
          procesador: idxProcesador >= 0 ? toVal(cols, idxProcesador) : undefined,
          ram: idxRam >= 0 ? toVal(cols, idxRam) : undefined,
          almacenamiento: idxAlmacenamiento >= 0 ? toVal(cols, idxAlmacenamiento) : undefined,
          condicion: idxCondicion >= 0 ? toVal(cols, idxCondicion) : undefined,
          publicado_en_tienda: idxPublicado >= 0 ? toVal(cols, idxPublicado) : undefined,
          descripcion_publica: idxDescripcionPublica >= 0 ? toVal(cols, idxDescripcionPublica) : undefined,
        }))
        .filter((row) => row.nombre.trim().length > 0)

      if (!payload.length) {
        throw new Error("No se encontraron filas con nombre valido para importar.")
      }

      toast({
        title: "Procesando importacion...",
        description: `Detectadas ${payload.length} filas validas. Guardando en ReparaHub...`,
      })

      const result = await bulkImportProductos(payload as BulkImportProductoInput[])

      if (!result.success) {
        const msg = result.errors?.join(" | ") ?? "Hubo un problema al importar el archivo."
        toast({
          title: "Error al importar",
          description: msg,
          variant: "destructive",
        })
      } else {
        setImportSummary({
          inserted: result.insertedCount,
          skipped: result.skippedCount,
          totalCostoCarga: result.totalCostoCarga ?? 0,
          errors: result.errors,
        })
        toast({
          title: "Importacion completada",
          description: `Productos importados: ${result.insertedCount}. Filas omitidas: ${result.skippedCount}.`,
        })
        await loadProductos(0)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast({
        title: "Error al leer CSV",
        description: message,
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const formatRotacionDias = (dias: number) => {
    if (!Number.isFinite(dias) || dias < 0) return "-"
    if (dias === 0) return "0 dias"
    const rounded = dias >= 100 ? Math.round(dias) : Math.round(dias * 10) / 10
    return `${rounded} dias`
  }

  const handlePrintCartel = async (producto: ProductoRow) => {
    printCartelExhibicion(producto, {
      tallerNombre: (tallerSettings?.nombre_taller || tallerNombre || "Mi Taller").trim(),
      logoUrl: tallerSettings?.logo_url ?? null,
    })
  }

  const buildProductoSnapshotFromForm = (): ProductoRow | null => {
    const c = buildFormCore()
    if (!c.nom) return null
    return {
      id: editingProducto?.id ?? draftProductId,
      taller_id: editingProducto?.taller_id ?? "",
      nombre: c.nom,
      sku: c.skuVal,
      codigo_barras: c.barrasVal,
      imagen_url: serializeImagenUrls(imagenUrls),
      categoria: c.categoriaVal,
      descripcion: c.descripcionVal,
      marca: c.marcaVal,
      modelo: c.modeloVal,
      ubicacion: c.ubicacionVal,
      costo: c.costoVal,
      precio_venta: c.precioVentaVal,
      stock_actual: c.stockFinal,
      stock_minimo: c.stockMinVal,
      es_equipo: esEquipo,
      imei_serie: c.imeiVal,
      color: c.colorVal,
      capacidad: c.almacStr,
      almacenamiento: c.almacStr,
      procesador: c.procesadorVal,
      ram: c.ramVal,
      condicion: c.condicionVal,
      created_at: editingProducto?.created_at ?? new Date().toISOString(),
    }
  }

  const buildProductoSnapshotForCartel = (): ProductoRow | null => {
    const snap = buildProductoSnapshotFromForm()
    if (!snap) {
      toast({
        title: "Nombre requerido",
        description: "Escribe el nombre del producto para generar el cartel.",
        variant: "destructive",
      })
      return null
    }
    return snap
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-dashboard-surface">
      <div className="flex w-full min-w-0 flex-col gap-5 px-3 py-4 pb-24 sm:gap-7 sm:px-5 sm:py-7 sm:pb-8 md:gap-8 md:px-6 md:py-8 lg:px-8 lg:py-10 lg:pb-10 xl:px-10 2xl:px-12">
      {/* -- Header --------------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-blue-50/30 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-sm sm:rounded-3xl sm:p-5 md:p-8">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: icon + title */}
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md shadow-blue-500/20 shrink-0">
              <Box className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="italic font-extrabold text-xl tracking-tight text-slate-900 sm:text-xl md:text-2xl">
                  INVENTARIO
                </h1>
                <span className="rounded-full bg-blue-50 px-3 py-0.5 text-sm font-bold text-blue-600 tabular-nums ring-1 ring-blue-100">
                  {totalProductos.toLocaleString("es-MX")} productos
                </span>
              </div>
              <p className="text-[10px] tracking-widest text-slate-500 font-semibold truncate">
                CONTROL AUTOMATIZADO DE STOCK Y ALMACEN
              </p>
              <p className="mt-1 text-sm tracking-tight text-slate-500 truncate">
                Gestiona tu inventario con control de existencias, categorias y precios.
              </p>
            </div>
          </div>

          {/* Right: search + action buttons */}
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-wrap sm:justify-end xl:flex-nowrap">
            <div className="relative basis-full sm:basis-auto sm:w-56 lg:w-60">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <Input
                value={searchInput}
                onChange={(e) => {
                  const value = e.target.value
                  setSearchInput(value)
                  if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
                  searchDebounceRef.current = setTimeout(() => {
                    const sp = new URLSearchParams(window.location.search)
                    if (value.trim().length > 0) sp.set(SEARCH_PARAM, value)
                    else sp.delete(SEARCH_PARAM)
                    router.replace(`?${sp.toString()}`, { scroll: false })
                  }, 400)
                }}
                placeholder="Buscar: nombre, SKU..."
                className="h-11 rounded-xl border-slate-200/80 bg-slate-50/80 pl-9 pr-8 text-base placeholder:text-slate-400 transition-all focus:bg-white focus:ring-2 focus:ring-blue-400/40 focus:border-blue-300 md:text-sm shadow-sm"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
                    updateSearchParams({ q: "" })
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:text-slate-600 hover:bg-slate-100 transition-all"
                  aria-label="Limpiar busqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowMobileKPIs(!showMobileKPIs)}
              className="flex sm:hidden h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm px-3.5 text-xs font-bold text-slate-600 shadow-sm transition-all hover:bg-white hover:shadow-md"
            >
              {showMobileKPIs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Resumen
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="hidden sm:flex h-11 shrink-0 gap-2 rounded-xl px-4 font-semibold tracking-tight"
                >
                  <Download className="h-4 w-4" />
                  <span>Exportar</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs text-slate-500">Inventario</DropdownMenuLabel>
                <DropdownMenuItem className="cursor-pointer gap-2 py-2.5" onClick={handleExportReport}>
                  <Download className="h-4 w-4 text-emerald-600" />
                  <span className="flex flex-col">
                    <span className="font-semibold">Reporte actual</span>
                    <span className="text-[11px] text-slate-500">Respeta busqueda, filtros y orden visible.</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-2 py-2.5" onClick={() => void handleExportBackup()}>
                  <PackageCheck className="h-4 w-4 text-blue-600" />
                  <span className="flex flex-col">
                    <span className="font-semibold">Respaldo completo</span>
                    <span className="text-[11px] text-slate-500">Todos los productos con campos reimportables.</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer gap-2 py-2.5" onClick={handleDownloadTemplate}>
                  <Upload className="h-4 w-4 text-slate-500" />
                  <span className="flex flex-col">
                    <span className="font-semibold">Plantilla CSV</span>
                    <span className="text-[11px] text-slate-500">Formato recomendado para migrar inventario.</span>
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={openImportModal}
              variant="outline"
              className="hidden sm:flex h-11 shrink-0 gap-2 rounded-xl px-4 font-semibold tracking-tight"
            >
              <Upload className="h-4 w-4" />
              <span>Importar</span>
            </Button>
            <Button
              onClick={() => setBulkEquiposOpen(true)}
              variant="outline"
              className="hidden sm:flex h-11 shrink-0 gap-2 rounded-xl border-amber-200 bg-gradient-to-br from-amber-50 via-white to-blue-50 px-4 font-bold tracking-tight text-blue-800 shadow-[0_8px_22px_-18px_rgba(180,83,9,0.75)] hover:border-amber-300 hover:from-amber-100 hover:text-blue-900"
            >
              <Crown className="h-4 w-4 fill-amber-300 text-amber-7000 drop-shadow-[0_1px_1px_rgba(146,64,14,0.22)]" />
              <span>Lote PRO</span>
            </Button>
            <Button
              onClick={openModal}
              className="h-11 shrink-0 gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-tight px-5 btn-glow"
            >
              <Plus className="h-5 w-5" />
              <span>Nuevo Producto</span>
            </Button>
          </div>
        </div>
      </div>

        {/* -- KPI Cards ---------------------------------------------------- */}
        <div className={cn(showMobileKPIs ? "block" : "hidden", "sm:block")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {/* Total */}
          <button
            type="button"
            onClick={() => updateSearchParams({ status: "" })}
            className={cn(
              "group flex flex-col gap-2.5 rounded-2xl border bg-white p-4 text-left",
              "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]",
              "transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 cursor-pointer",
              !statusFilter
                ? "ring-2 ring-blue-400/60 border-blue-200 bg-gradient-to-br from-white to-blue-50/40"
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 shadow-sm">
              <Box className="h-4 w-4 text-slate-600 transition-transform duration-200 group-hover:scale-110" aria-hidden />
            </div>
            <p className={cn("text-2xl font-black tabular-nums tracking-tight transition-colors", "text-slate-900")}>
              {totalProductos}
            </p>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600 leading-none">Total</p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">Todos los productos</p>
            </div>
            {!statusFilter && (
              <span className="self-start rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-600 ring-1 ring-blue-100">Activo</span>
            )}
          </button>

          {/* Critico */}
          <button
            type="button"
            onClick={() => updateSearchParams({ status: statusFilter === "critical" ? "" : "critical" })}
            className={cn(
              "group flex flex-col gap-2.5 rounded-2xl border bg-white p-4 text-left",
              "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]",
              "transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 cursor-pointer",
              statusFilter === "critical"
                ? "ring-2 ring-amber-400/60 border-amber-200 bg-gradient-to-br from-white to-amber-50/40"
                : "border-slate-200 hover:border-amber-300"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 shadow-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 transition-transform duration-200 group-hover:scale-110" aria-hidden />
            </div>
            <p className={cn("text-2xl font-black tabular-nums tracking-tight transition-colors", kpis.stockCritico > 0 ? "text-amber-600" : "text-slate-900")}>
              {kpis.stockCritico}
            </p>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600 leading-none">Critico</p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">Stock por debajo del minimo</p>
            </div>
            {statusFilter === "critical" && (
              <span className="self-start rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-600 ring-1 ring-amber-100">Activo</span>
            )}
          </button>

          {/* En Riesgo */}
          <button
            type="button"
            onClick={() => updateSearchParams({ status: statusFilter === "critical" ? "" : "critical" })}
            className={cn(
              "group flex flex-col gap-2.5 rounded-2xl border bg-white p-4 text-left",
              "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]",
              "transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 cursor-pointer",
              statusFilter === "critical"
                ? "ring-2 ring-rose-400/60 border-rose-200 bg-gradient-to-br from-white to-rose-50/40"
                : "border-slate-200 hover:border-rose-300"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 shadow-sm">
              <AlertTriangle className="h-4 w-4 text-rose-600 transition-transform duration-200 group-hover:scale-110" aria-hidden />
            </div>
            <p className="text-2xl font-black tabular-nums tracking-tight text-rose-700 truncate">
              {formatMoney(operationalKpis.valorEnRiesgo)}
            </p>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600 leading-none">En Riesgo</p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">Valor total en riesgo</p>
            </div>
          </button>

          {/* Sin Stock */}
          <button
            type="button"
            onClick={() => updateSearchParams({ status: statusFilter === "agotado" ? "" : "agotado" })}
            className={cn(
              "group flex flex-col gap-2.5 rounded-2xl border bg-white p-4 text-left",
              "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]",
              "transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 cursor-pointer",
              statusFilter === "agotado"
                ? "ring-2 ring-slate-400/60 border-slate-200 bg-gradient-to-br from-white to-slate-50"
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 shadow-sm">
              <Package className="h-4 w-4 text-slate-500 transition-transform duration-200 group-hover:scale-110" aria-hidden />
            </div>
            <p className={cn("text-2xl font-black tabular-nums tracking-tight transition-colors", kpis.sinExistencia > 0 ? "text-slate-700" : "text-slate-900")}>
              {kpis.sinExistencia}
            </p>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600 leading-none">Sin Stock</p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">Productos agotados</p>
            </div>
            {statusFilter === "agotado" && (
              <span className="self-start rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-600 ring-1 ring-slate-200">Activo</span>
            )}
          </button>

          {/* Rotacion */}
          <button
            type="button"
            onClick={() => updateSearchParams({ status: "" })}
            className={cn(
              "group flex flex-col gap-2.5 rounded-2xl border bg-white p-4 text-left",
              "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]",
              "transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 cursor-pointer",
              "border-slate-200 hover:border-emerald-300"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 shadow-sm">
              <TrendingUp className="h-4 w-4 text-emerald-600 transition-transform duration-200 group-hover:scale-110" aria-hidden />
            </div>
            <p className="text-2xl font-black tabular-nums tracking-tight text-emerald-700 truncate">
              {formatRotacionDias(operationalKpis.rotacionDias)}
            </p>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600 leading-none">Rotacion</p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">Dias de rotacion promedio</p>
            </div>
          </button>
        </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => updateSearchParams({ cat: "" })}
              className={cn(
                "h-9 shrink-0 rounded-full border px-4 text-[11px] font-black uppercase tracking-wider transition-colors",
                !categoryFilter
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600",
              )}
            >
              Todo
            </button>
            {activeCategoryOptions.map((categoryItem) => {
              const selected = categoryFilter.toUpperCase() === categoryItem.nombre.toUpperCase()
              return (
                <button
                  key={categoryItem.slug}
                  type="button"
                  onClick={() => updateSearchParams({ cat: selected ? "" : categoryItem.nombre })}
                  className={cn(
                    "h-9 shrink-0 rounded-full border px-4 text-[11px] font-black uppercase tracking-wider transition-colors",
                    selected
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600",
                  )}
                >
                  {categoryItem.nombre}
                </button>
              )
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCategoriasManagerOpen(true)}
            className="h-9 shrink-0 rounded-xl border-slate-200 px-3 text-[11px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Gestionar</span>
          </Button>
        </div>

        {!loadingProductos && hasActiveFilter && (
          <div className="flex items-center gap-2 -mt-4 text-xs text-slate-500">
            <span>
              {sortedProductos.length} resultado{sortedProductos.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => { updateSearchParams({ q: "", cat: "", status: "" }) }}
              className="flex items-center gap-1 rounded-md px-2 py-0.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors font-medium"
            >
              <X className="h-3 w-3" /> Limpiar filtros
            </button>
          </div>
        )}

      {/* -- Table -------------------------------------------------------- */}
      <Card className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/30 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-sm overflow-hidden">
        <div className="w-full overflow-x-auto pb-4">
          <Table>
            <TableHeader className="hidden md:table-header-group bg-gradient-to-b from-slate-50 to-slate-100/50 border-b border-slate-200/80">
              <TableRow className="border-b border-slate-200">
                <TableHead
                  className="w-[44%] px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
                  aria-sort={sortBy === "nombre" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort("nombre")}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Producto / Identificacion</span>
                    {sortBy === "nombre" ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </TableHead>
                <TableHead
                  className="w-[18%] px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
                  aria-sort={sortBy === "stock" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort("stock")}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Disponibilidad</span>
                    {sortBy === "stock" ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </TableHead>
                <TableHead
                  className="w-[24%] px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
                  aria-sort={sortBy === "precio" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort("precio")}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Precio / Costo</span>
                    {sortBy === "precio" ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </TableHead>
                    <TableHead className="w-[14%] px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Acciones
                    </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-200/70 bg-slate-50">
              {loadingProductos ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                    <span role="status" aria-live="polite">Cargando...</span>
                  </TableCell>
                </TableRow>
              ) : sortedProductos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-white to-slate-50/50 px-8 py-10 shadow-sm">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 shadow-sm">
                        <Package className="h-7 w-7 text-slate-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">
                        No hay productos que coincidan.
                      </p>
                      <p className="text-xs text-slate-500">
                        Ajusta los filtros o crea un nuevo producto con el boton "Nuevo".
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedProductos.map((p) => {
                  const esAgotado = p.stock_actual <= 0
                  const esCritico = !esAgotado && p.stock_actual <= p.stock_minimo
                  const esApartado = Boolean(p.apartado_activo)
                  const esVendido = p.es_equipo && !!p.imei_serie && p.stock_actual <= 0 && !esApartado
                  const puntoBase = "h-3 w-3 rounded-full"
                  const pulso = esCritico || esAgotado ? " animate-pulse" : ""
                  const puntoColor = esApartado
                    ? " bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.35)]"
                    : esAgotado
                    ? " bg-red-500 shadow-[0_0_0_3px_rgba(248,113,113,0.5)]"
                    : esCritico
                    ? " bg-amber-500 shadow-[0_0_0_3px_rgba(251,191,36,0.45)]"
                    : " bg-emerald-500/70"
                  const cantidadClass = esAgotado
                    ? "text-red-500 font-semibold animate-pulse"
                    : esCritico
                    ? "text-amber-600 font-semibold animate-pulse"
                    : "text-slate-800 font-semibold"
                  const minimoClass = esAgotado ? "text-[11px] text-red-500" : "text-[11px] text-amber-600"

                  const margen =
                    p.precio_venta > 0
                      ? Math.round(((p.precio_venta - p.costo) / p.precio_venta) * 100)
                      : 0
                  const margenClass = margen < 20
                    ? "text-red-500"
                    : margen < 40
                    ? "text-amber-7000"
                    : "text-sky-600"

                  return (
                    <TableRow key={p.id} className="border-0">
                      <TableCell colSpan={4} className="px-0 py-2">
                        <div className="flex min-h-[100px] flex-col md:min-h-[108px] md:flex-row items-stretch justify-between gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 px-4 py-5 md:gap-3 md:px-5 md:py-4 lg:gap-4 lg:px-6 lg:py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-slate-300">
                          {/* Identificacion */}
                          <div className="flex items-start gap-3 md:basis-[44%] md:min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/60 shadow-sm bg-white">
                              <InventoryProductImage
                                stored={p.imagen_url}
                                productId={p.id}
                                tallerId={p.taller_id}
                                alt={p.nombre}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-xl"
                                imgClassName="rounded-xl"
                              />
                            </div>
                            <div className="space-y-1 min-w-0">
                              <p className="text-sm font-bold tracking-tight text-slate-900 truncate">
                                {p.nombre}
                              </p>
                              {p.sku && (
                                <p className="text-sm text-slate-500 truncate">
                                  SKU: {p.sku}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2">
                                {p.categoria && (
                                  <span className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                                    {p.categoria}
                                  </span>
                                )}
                                {p.es_equipo && p.imei_serie ? (
                                  <span
                                    title={p.imei_serie}
                                    className="inline-flex max-w-[260px] items-center rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 font-mono text-[11px] font-black leading-none tracking-[0.02em] text-blue-800 shadow-[0_1px_0_rgba(37,99,235,0.12)]"
                                  >
                                    <span className="truncate">{p.imei_serie}</span>
                                  </span>
                                ) : null}
                                {p.publicado_en_tienda && (
                                  <span
                                    title="Visible en Mi Tienda publica"
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 shadow-sm"
                                  >
                                    <Store className="h-3 w-3" aria-hidden /> Mi Tienda
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Disponibilidad */}
                          <div className="md:basis-[18%] flex items-center justify-start md:justify-center text-center">
                            <div className="flex flex-col items-center gap-1">
                              {esApartado ? (
                                <span className="inline-flex flex-col items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 shadow-sm">
                                  APARTADO
                                  {p.apartado_folio && <span className="font-mono text-[9px] tracking-normal text-blue-500">{p.apartado_folio}</span>}
                                </span>
                              ) : esVendido ? (
                                <span className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-300 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-sm">
                                  VENDIDO
                                </span>
                              ) : (
                              <>
                              <div className="flex items-center gap-2">
                                <div className={puntoBase + puntoColor + pulso} />
                                <span className={cn(cantidadClass, "text-lg font-black tabular-nums")}>{p.stock_actual}</span>
                              </div>
                              <span className="text-[10px] font-bold tracking-[0.25em] text-slate-500">
                                UNIDADES
                              </span>
                              </>
                              )}
                              {(esCritico || esAgotado) && !esVendido && (
                                <span className={minimoClass}>min. {p.stock_minimo}</span>
                              )}
                            </div>
                          </div>

                          {/* Costeo */}
                          <div className="md:basis-[30%] lg:basis-[26%] lg:min-w-[320px] flex items-center gap-3 border-t border-slate-100 pt-3 md:border-t-0 md:pt-0">
                            <div className="h-12 w-2 rounded-full bg-emerald-500" />
                            <div className="space-y-1">
                              <p className="text-sm md:text-base font-black text-slate-900">
                                {formatPeso(p.precio_venta)}
                              </p>
                              <p className="text-sm text-slate-500">
                                Costo {formatPeso(p.costo)}
                              </p>
                            </div>
                            <div className="ml-auto hidden md:block text-right">
                              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                                Margen
                              </p>
                              <p className={`text-sm font-bold ${margenClass}`}>
                                {margen}%
                              </p>
                            </div>
                            <div className="ml-auto md:hidden rounded-lg border border-slate-200/80 bg-slate-100/80 px-3 py-1 shadow-sm">
                              <p className={`text-xs font-bold ${margenClass}`}>Margen {margen}%</p>
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="md:basis-[14%] flex items-center justify-start md:justify-end">
                            <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100/80 border border-slate-200/60 px-1.5 py-1 self-center shadow-sm">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-10 w-10 rounded-full text-slate-500 hover:bg-slate-100 active:bg-slate-200 hover:text-slate-900"
                                onClick={() => openHistory(p)}
                                aria-label="Historial de movimientos"
                              >
                                <History className="h-4 w-4" aria-hidden />
                              </Button>

                              <InventoryPublicidadMenu
                                producto={p}
                                tallerNombre={tallerNombre}
                                onEtiquetaVenta={(showPrice) => openLabelPreview(p, showPrice)}
                                onCartelPrecio={() => void handlePrintCartel(p)}
                                triggerVariant="printer"
                                tallerSettings={tallerSettings}
                                isPro={isUsuarioPro}
                              />

                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-10 w-10 rounded-full text-slate-500 hover:bg-slate-100 active:bg-slate-200 hover:text-slate-900"
                                onClick={() => handleEdit(p)}
                                aria-label="Editar producto"
                              >
                                <Pencil className="h-4 w-4" aria-hidden />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-10 w-10 rounded-full text-slate-500 hover:bg-red-100 active:bg-red-200 hover:text-red-600"
                                    aria-label="Eliminar producto"
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl border border-slate-200/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-bold">Eliminar producto</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta accion no se puede deshacer. Se eliminara{" "}
                                      <span className="font-semibold">{p.nombre}</span> del inventario.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-600 text-white"
                                      onClick={() => void handleDelete(p)}
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          {/* -- Pagination -------------------------------------------------- */}
          {totalProductos > PAGE_SIZE_PRODUCTOS && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 px-4 py-3 text-sm text-slate-500 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span>
                Mostrando {pageProductos * PAGE_SIZE_PRODUCTOS + 1}-{Math.min((pageProductos + 1) * PAGE_SIZE_PRODUCTOS, totalProductos)} de {totalProductos}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl border-slate-200 font-semibold" disabled={pageProductos === 0} onClick={() => setPageProductos((p) => p - 1)}>
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-200 font-semibold"
                  disabled={(pageProductos + 1) * PAGE_SIZE_PRODUCTOS >= totalProductos}
                  onClick={() => setPageProductos((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <NuevoProductoModal
        open={modalOpen}
        onClose={closeModal}
        editingProducto={editingProducto}
        draftProductId={draftProductId}
        saving={saving}
        onSubmit={handleGuardarProducto}
        footerSlot={(() => {
          const snapForm = buildProductoSnapshotFromForm()
          return snapForm ? (
            <InventoryPublicidadMenu
              producto={snapForm}
              tallerNombre={tallerNombre}
              onEtiquetaVenta={(showPrice) => {
                const s = buildProductoSnapshotFromForm()
                if (s) void openLabelPreview(s, showPrice)
              }}
              onCartelPrecio={() => {
                const snap = buildProductoSnapshotForCartel()
                if (snap) void handlePrintCartel(snap)
              }}
              disabled={saving}
              tallerSettings={tallerSettings}
              isPro={isUsuarioPro}
            />
          ) : (
            <span className="text-xs text-muted-foreground">Publicidad: agrega el nombre del producto</span>
          )
        })()}
        nombre={nombre}
        setNombre={setNombre}
        sku={sku}
        setSku={setSku}
        codigoBarras={codigoBarras}
        setCodigoBarras={setCodigoBarras}
        categoria={categoria}
        setCategoria={setCategoria}
        descripcion={descripcion}
        setDescripcion={setDescripcion}
        marca={marca}
        setMarca={setMarca}
        modelo={modelo}
        setModelo={setModelo}
        ubicacion={ubicacion}
        setUbicacion={setUbicacion}
        condicion={condicion}
        setCondicion={setCondicion}
        costo={costo}
        setCosto={setCosto}
        precioVenta={precioVenta}
        setPrecioVenta={setPrecioVenta}
        stockActual={stockActual}
        setStockActual={setStockActual}
        stockMinimo={stockMinimo}
        setStockMinimo={setStockMinimo}
        esEquipo={esEquipo}
        setEsEquipo={setEsEquipo}
        registrarIdentificador={registrarIdentificador}
        setRegistrarIdentificador={setRegistrarIdentificador}
        imeiSerie={imeiSerie}
        setImeiSerie={setImeiSerie}
        imeiType={imeiType}
        setImeiType={setImeiType}
        imeiError={imeiError}
        setImeiError={setImeiError}
        color={color}
        setColor={setColor}
        procesador={procesador}
        setProcesador={setProcesador}
        ram={ram}
        setRam={setRam}
        almacenamiento={almacenamiento}
        setAlmacenamiento={setAlmacenamiento}
        imagenUrls={imagenUrls}
        localPreviewUrls={localPreviewUrls}
        uploadingImageSlot={uploadingImageSlot}
        generarCodigoBarrasInterno={generarCodigoBarrasInterno}
        ensureEquiposCategoria={ensureEquiposCategoria}
        categoriasDisponibles={activeCategoryOptions}
        onCreateCategoria={handleCreateCategoria}
        handleImageFile={handleImageFile}
        handleMultipleImageFiles={handleMultipleImageFiles}
        handleCameraFiles={handleCameraFiles}
        removeImage={removeImage}
        imageUploadError={imageUploadError}
        onClearImageUploadError={() => setImageUploadError(null)}
        tallerNombre={tallerNombre}
        publicadoEnTienda={publicadoEnTienda}
        setPublicadoEnTienda={setPublicadoEnTienda}
        descripcionPublica={descripcionPublica}
        setDescripcionPublica={setDescripcionPublica}
        tiendaActiva={tiendaConfig?.activa ?? false}
        tiendaLimit={tiendaConfig?.limit ?? 5}
        tiendaPublishedCount={tiendaConfig?.publishedCount ?? 0}
        tiendaInTrial={tiendaConfig?.inTrial ?? false}
      />

      <AltaEquiposLoteModal
        open={bulkEquiposOpen}
        onOpenChange={setBulkEquiposOpen}
        isPro={isUsuarioPro}
        saving={bulkEquiposSaving}
        onSubmit={handleCreateEquiposLote}
        tallerNombre={tallerNombre}
        tallerSettings={tallerSettings}
        onPrintEtiqueta={(producto, showPrice) => openLabelPreview(producto, showPrice)}
        onPrintCartel={(producto) => void handlePrintCartel(producto)}
      />

      {/* Mobile sticky FAB: acciones de inventario */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl px-4 py-3 sm:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-[0.82fr_1.18fr] gap-2">
          <Button
            onClick={() => setBulkEquiposOpen(true)}
            variant="outline"
            className="h-12 gap-2 rounded-xl border-amber-200 bg-gradient-to-br from-amber-50 via-white to-blue-50 font-black uppercase tracking-wider text-blue-800"
          >
            <Crown className="h-4 w-4 fill-amber-300 text-amber-7000" />
            Lote
          </Button>
          <Button
            onClick={openModal}
            className="h-12 gap-2 rounded-xl text-base font-black uppercase tracking-wider btn-glow"
          >
            <Plus className="h-5 w-5" />
            Nuevo
          </Button>
        </div>
      </div>

      <CrearCategoriaModal
        open={categoriaModalOpen}
        mode={categoriaEditando ? "edit" : "create"}
        initialNombre={categoriaEditando?.nombre ?? ""}
        initialIcono={categoriaEditando?.icono ?? ""}
        initialAliases={categoriaEditando?.aliases ?? []}
        onClose={() => {
          setCategoriaModalOpen(false)
          setCategoriaEditando(null)
        }}
        onSave={handleSaveCategoria}
      />

      <Dialog open={categoriasManagerOpen} onOpenChange={setCategoriasManagerOpen}>
        <DialogContent className="max-w-full w-full md:max-w-4xl rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-[0_16px_48px_rgba(15,23,42,0.18)]">
          <DialogHeader className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <DialogTitle className="text-base font-black uppercase tracking-[0.18em] text-slate-900">
                  Categorias del taller
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">
                  Administra el catalogo canonico que usan Inventario, POS y Kiosko.
                </DialogDescription>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setCategoriasManagerOpen(false)
                  handleCreateCategoria()
                }}
                className="h-10 shrink-0 rounded-xl bg-blue-600 px-4 font-bold uppercase tracking-wide text-white btn-glow"
              >
                <Plus className="h-4 w-4" />
                Nueva categoria
              </Button>
            </div>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {categoriasDisponibles.map((categoriaItem) => {
                const Icon = getCategoryIcon(categoriaItem.icono)
                const locked = categoriaItem.tipo !== "custom"
                return (
                  <div
                    key={categoriaItem.id}
                    className={cn(
                      "rounded-2xl border p-4 shadow-sm transition-colors",
                      categoriaItem.activo ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                            categoriaItem.activo ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-black text-slate-900">{categoriaItem.nombre}</p>
                            {categoriaItem.nombre === "EQUIPOS" && (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700">
                                Protegida
                              </span>
                            )}
                            {!categoriaItem.activo && (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-600">
                                Archivada
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            {categoriaItem.slug}
                          </p>
                          {categoriaItem.aliases.length > 0 && (
                            <p className="mt-2 line-clamp-2 text-[11px] text-slate-500">
                              Alias: {categoriaItem.aliases.slice(0, 4).join(", ")}
                              {categoriaItem.aliases.length > 4 ? ` +${categoriaItem.aliases.length - 4}` : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      {!locked && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCategoriasManagerOpen(false)
                              handleEditCategoria(categoriaItem)
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-600"
                            title="Editar categoria"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleCategoria(categoriaItem)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-amber-300 hover:text-amber-600"
                            title={categoriaItem.activo ? "Archivar categoria" : "Reactivar categoria"}
                          >
                            {categoriaItem.activo ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoriaPendienteBorrar({ id: categoriaItem.id, nombre: categoriaItem.nombre })}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-red-300 hover:text-red-600"
                            title="Borrar categoria"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(categoriaPendienteBorrar)} onOpenChange={(open) => !open && setCategoriaPendienteBorrar(null)}>
        <AlertDialogContent className="rounded-2xl border border-slate-200 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-black text-slate-900">Borrar categoria</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500">
              {categoriaPendienteBorrar
                ? `Vas a borrar "${categoriaPendienteBorrar.nombre}". Si ya tiene productos, el sistema bloqueara la accion.`
                : "Esta accion no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteCategoria()}
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Importar / Migrar Inventario */}
      <Dialog open={importModalOpen} onOpenChange={(open) => (open ? openImportModal() : closeImportModal())}>
        <DialogContent className="max-w-full w-full md:max-w-2xl bg-white text-slate-900 border border-slate-200/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm rounded-2xl">
          <DialogHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="flex items-center gap-2 text-base font-bold tracking-wide">
                    <Upload className="h-4 w-4 text-blue-600" />
                    Importar / Migrar Inventario
                  </DialogTitle>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                  <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="flex h-5 w-5 items-center justify-center rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                          aria-label="Ayuda para importacion"
                        >
                          ?
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-white text-slate-800 border-slate-200 text-[11px] leading-relaxed shadow-lg">
                        <p>Asegurate de que los precios no tengan letras.</p>
                        <p>El SKU debe ser unico por producto.</p>
                        <p>Si el producto es un equipo, incluye el IMEI en la descripcion o columna correspondiente.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <DialogDescription className="text-xs text-slate-500">
                  Sube un CSV desde Excel, Google Sheets u otro sistema. Puedes migrar productos simples, equipos con IMEI/serie y codigos de barras.
                </DialogDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-200/80 bg-white text-[11px] font-bold uppercase tracking-wide hover:bg-slate-50 rounded-xl shadow-sm"
                onClick={handleDownloadTemplate}
              >
                DESCARGAR PLANTILLA
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Zona de carga o resumen de resultados */}
            {!importSummary && (
              <div
                className="rounded-2xl border border-dashed border-slate-300 bg-gradient-to-br from-white to-slate-50/80 px-4 py-8 flex flex-col items-center justify-center gap-3 text-center transition-all hover:border-blue-300 hover:bg-blue-50/30"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add("border-blue-400", "bg-blue-50")
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove("border-blue-400", "bg-blue-50")
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove("border-blue-400", "bg-blue-50")
                  const file = e.dataTransfer.files?.[0]
                  if (file) void handleImportFile(file)
                }}
              >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 shadow-sm">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold tracking-wide text-slate-700">
                    Arrastra tu archivo CSV aqui
                  </p>
                  <p className="text-[11px] text-slate-500">
                    o haz clic para seleccionar desde tu computadora
                  </p>
                </div>
                <div className="mt-1 flex flex-col items-center gap-1">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    id="inventario-import-file"
                    disabled={importing}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      if (file) void handleImportFile(file)
                      e.target.value = ""
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-slate-200 bg-white text-[11px] font-semibold uppercase tracking-wide hover:bg-slate-50"
                    onClick={() => document.getElementById("inventario-import-file")?.click()}
                    disabled={importing}
                  >
                    Seleccionar archivo CSV
                  </Button>
                  {importFileName && (
                    <p className="mt-1 text-[11px] text-slate-600 truncate max-w-xs">
                      Archivo seleccionado: <span className="font-semibold">{importFileName}</span>
                    </p>
                  )}
                </div>
                <p className="mt-2 text-[10px] text-slate-500 max-w-sm">
                  Formatos soportados: <span className="font-mono">.csv</span>. Si trabajas con Excel,
                  exporta tu hoja como CSV antes de importar. Para respaldo completo usa Exportar &gt; Respaldo.
                </p>
              </div>
            )}

            {importSummary && !importing && (
              <div className="rounded-xl border border-emerald-200 bg-white px-5 py-6 text-[11px] text-slate-800 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                    <PackageCheck className="h-7 w-7 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold tracking-wide text-emerald-700">
                      Importacion completada
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Los datos del archivo se guardaron en tu inventario. Revisa los totales y, si hubo errores,
                      consulta el log de detalle.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-emerald-700">
                      Registros exitosos
                    </p>
                    <p className="mt-1 text-lg font-bold text-emerald-800">
                      {importSummary.inserted}
                    </p>
                    <p className="text-[10px] text-emerald-700">
                      productos anadidos correctamente
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-amber-700">
                      Registros omitidos
                    </p>
                    <p className="mt-1 text-lg font-bold text-amber-800">
                      {importSummary.skipped}
                    </p>
                    <p className="text-[10px] text-amber-700">
                      filas con errores de validacion
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-slate-600">
                      Valor total de carga
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {formatPeso(importSummary.totalCostoCarga || 0)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      suma de costo x stock importado
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-primary hover:bg-primary text-primary-foreground text-[11px] font-semibold uppercase tracking-wide"
                      onClick={handleImportFinish}
                    >
                      Finalizar
                    </Button>
                    {importSummary.skipped > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-slate-200 bg-white text-[11px] font-semibold uppercase tracking-wide hover:bg-slate-50"
                        onClick={() => setShowErrorLog((prev) => !prev)}
                      >
                        {showErrorLog ? "Ocultar log de errores" : "Ver log de errores"}
                      </Button>
                    )}
                  </div>
                  {importFileName && (
                    <p className="text-[10px] text-slate-500 truncate max-w-xs">
                      Archivo procesado: <span className="font-semibold">{importFileName}</span>
                    </p>
                  )}
                </div>

                {showErrorLog && importSummary.errors && importSummary.errors.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-700 space-y-1">
                    {importSummary.errors.map((err, idx) => (
                      <p key={idx}>? {err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {importing && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Procesando archivo y validando productos...</span>
                </div>
              </div>
            )}

            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-50">
                <PackageCheck className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-slate-800 uppercase tracking-wide">
                  SUGERENCIA IA
                </p>
                <p className="text-[11px] text-slate-600">
                  ReparaHub intenta reconocer automaticamente las columnas de tu archivo (nombre,
                  precios, stock, IMEI/serie, codigo de barras, marca y condicion). Revisa la estructura y los encabezados
                  antes de procesar grandes volumenes de datos.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Historial de Movimientos */}
      <Dialog
        open={historyModalOpen}
        onOpenChange={(open) => {
          setHistoryModalOpen(open)
          if (!open) setHistoryProducto(null)
        }}
      >
        <DialogContent className="max-w-full w-full md:max-w-xl bg-white border border-slate-200/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm rounded-2xl">
          <DialogHeader className="border-b border-slate-200/80 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <History className="h-4 w-4 text-primary" />
              Historial de Movimientos
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {historyProducto ? (
                <>
                  Producto: <span className="font-semibold text-foreground">{historyProducto.nombre}</span>
                </>
              ) : (
                "Consulta movimientos de stock y ajustes."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border border-border bg-slate-50/50 p-4">
              <p className="text-sm font-medium text-foreground">Proximamente</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aqui veras entradas de compras, ventas, ajustes y transferencias relacionadas con este producto.
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-border/80">
            <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Vista Previa de Etiqueta (50mm x 25mm) */}
      <Dialog
        open={labelModalOpen}
        onOpenChange={(open) => {
          setLabelModalOpen(open)
          if (!open) setLabelProducto(null)
        }}
      >
        <DialogContent className="max-w-full w-full md:max-w-3xl bg-white border border-slate-200/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm rounded-2xl overflow-hidden">
          <DialogTitle className="sr-only">Vista Previa de Etiqueta</DialogTitle>
          <DialogDescription className="sr-only">Vista previa e impresion de etiqueta del producto</DialogDescription>
          <div className="relative">
            {/* Capa superior (control) */}
            <div className="relative bg-white px-4 pt-4 pb-3">
              <div className="absolute right-4 top-4 text-right">
                <p className="text-xs font-black italic tracking-wide text-slate-900">VISTA PREVIA</p>
                <p className="text-[10px] font-semibold tracking-widest text-primary">50MM X 25MM</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                  {showPriceOnLabel ? "Con precio" : "Sin precio"}
                </p>
                {labelProducto && isEquipoExhibitionCategory(labelProducto) && (
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                    Etiqueta de exhibicion (EQUIPO)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center">
                <Button
                  type="button"
                  onClick={handlePrintLabel}
                  className="bg-primary hover:bg-primary text-primary-foreground font-bold uppercase tracking-wider gap-2 rounded-full px-6 h-11"
                  disabled={!labelProducto}
                >
                  <Printer className="h-4 w-4" />
                  IMPRIMIR ETIQUETA
                </Button>
              </div>
            </div>

            {/* Capa inferior (la etiqueta) */}
              <div className="bg-slate-50/60 px-4 pb-6 pt-3">
              <div className="mx-auto w-full max-w-[720px]">
                <div className="relative mx-auto w-full max-w-[560px]">
                  <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-4">
                    {labelProducto && isClient ? (
                      <LabelPreviewWrapper>
                        {isEquipoExhibitionCategory(labelProducto) ? (
                          <DeviceInventoryLabel
                            data={
                              buildLabelData(labelProducto) as DeviceInventoryLabelData & { kind: "device-inventory-label" }
                            }
                          />
                        ) : (
                          <AccessoryLabel
                            data={
                              buildLabelData(labelProducto) as AccessoryLabelData & { kind: "accessory-label" }
                            }
                          />
                        )}
                      </LabelPreviewWrapper>
                    ) : (
                      <div className="mx-auto flex h-[25mm] w-[50mm] items-center justify-center border border-dashed border-slate-300 text-xs text-slate-500">
                        Cargando vista previa…
                      </div>
                    )}
                  </div>

                  {/* Nota de configuracion (esquina inferior derecha) */}
                  <p className="absolute -bottom-4 right-0 text-[10px] text-slate-500 max-w-[320px] text-right">
                    Asegurate de que tu impresora este configurada en tamano de papel 50x25 mm (2x1 pulg.)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}

export default function InventarioPage() {
  return (
    <Suspense fallback={<div>Cargando inventario...</div>}>
      <InventarioContent />
    </Suspense>
  )
}

