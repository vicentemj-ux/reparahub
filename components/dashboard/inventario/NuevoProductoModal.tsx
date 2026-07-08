"use client"

import { useMemo, useRef, useState, type ReactNode } from "react"
import { InventoryProductImagePreview } from "@/components/dashboard/inventory-product-image"
import { CameraModal } from "@/components/dashboard/camera-modal"
import { ProBarcodeButton } from "@/components/dashboard/pro-barcode-button"
import { beginCameraTrace } from "@/lib/camera-performance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getInventoryFieldLabels } from "@/lib/inventory/inventory-form-labels"
import type { ProductoRow } from "@/lib/actions/productos-prisma"
import { getCategoryIcon } from "@/lib/inventory-category-icons"
import {
  Box,
  Loader2,
  Fingerprint,
  DollarSign,
  ImageIcon,
  Wand2,
  HelpCircle,
  CheckCircle,
  AlertCircle,
  MapPin,
  TriangleAlert,
  Camera,
  X,
  Store,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export type NuevoProductoModalProps = {
  open: boolean
  onClose: () => void
  editingProducto: ProductoRow | null
  draftProductId: string
  saving: boolean
  onSubmit: () => void
  tallerNombre: string
  /** @deprecated No se renderiza en el modal. Mantenido para compatibilidad con page.tsx. */
  footerSlot?: ReactNode
  /** @deprecated La categoria EQUIPOS activa los flags automaticamente. Mantenido para compatibilidad. */
  ensureEquiposCategoria?: () => Promise<void>
  nombre: string
  setNombre: (v: string) => void
  sku: string
  setSku: (v: string) => void
  codigoBarras: string
  setCodigoBarras: (v: string) => void
  categoria: string
  setCategoria: (v: string) => void
  categoriasDisponibles?: Array<{ slug: string; nombre: string; icono: string | null }>
  onCreateCategoria?: () => Promise<void>
  descripcion: string
  setDescripcion: (v: string) => void
  marca: string
  setMarca: (v: string) => void
  modelo: string
  setModelo: (v: string) => void
  ubicacion: string
  setUbicacion: (v: string) => void
  condicion: string
  setCondicion: (v: string) => void
  costo: string
  setCosto: (v: string) => void
  precioVenta: string
  setPrecioVenta: (v: string) => void
  stockActual: string
  setStockActual: (v: string) => void
  stockMinimo: string
  setStockMinimo: (v: string) => void
  esEquipo: boolean
  setEsEquipo: (v: boolean) => void
  registrarIdentificador: boolean
  setRegistrarIdentificador: (v: boolean) => void
  imeiSerie: string
  setImeiSerie: (v: string) => void
  imeiType: "imei" | "serie"
  setImeiType: (v: "imei" | "serie") => void
  imeiError: string | null
  setImeiError: (v: string | null) => void
  color: string
  setColor: (v: string) => void
  procesador: string
  setProcesador: (v: string) => void
  ram: string
  setRam: (v: string) => void
  almacenamiento: string
  setAlmacenamiento: (v: string) => void
  imagenUrls: string[]
  localPreviewUrls: (string | null)[]
  uploadingImageSlot: number | null
  generarCodigoBarrasInterno: () => void
  handleImageFile: (file: File, slot: number) => void
  handleMultipleImageFiles: (files: FileList | File[]) => Promise<void>
  handleCameraFiles: (files: File[]) => Promise<void>
  removeImage: (slot: number) => void
  imageUploadError?: string | null
  onClearImageUploadError?: () => void
  publicadoEnTienda: boolean
  setPublicadoEnTienda: (v: boolean) => void
  descripcionPublica: string
  setDescripcionPublica: (v: string) => void
  tiendaActiva: boolean
  tiendaLimit: number
  tiendaPublishedCount: number
  tiendaInTrial: boolean
}

export function NuevoProductoModal(props: NuevoProductoModalProps) {
  const {
    open,
    onClose,
    editingProducto,
    draftProductId,
    saving,
    onSubmit,
    ensureEquiposCategoria,
    nombre,
    setNombre,
    sku,
    setSku,
    codigoBarras,
    setCodigoBarras,
    categoria,
    setCategoria,
    categoriasDisponibles,
    onCreateCategoria,
    descripcion,
    setDescripcion,
    marca,
    setMarca,
    modelo,
    setModelo,
    ubicacion,
    setUbicacion,
    condicion,
    setCondicion,
    costo,
    setCosto,
    precioVenta,
    setPrecioVenta,
    stockActual,
    setStockActual,
    stockMinimo,
    setStockMinimo,
    esEquipo,
    setEsEquipo,
    registrarIdentificador,
    setRegistrarIdentificador,
    imeiSerie,
    setImeiSerie,
    imeiType,
    setImeiType,
    imeiError,
    setImeiError,
    color,
    setColor,
    procesador,
    setProcesador,
    ram,
    setRam,
    almacenamiento,
    setAlmacenamiento,
    imagenUrls,
    localPreviewUrls,
    uploadingImageSlot,
    generarCodigoBarrasInterno,
    handleImageFile,
    handleMultipleImageFiles,
    handleCameraFiles,
    removeImage,
    imageUploadError,
    onClearImageUploadError,
    publicadoEnTienda,
    setPublicadoEnTienda,
    descripcionPublica,
    setDescripcionPublica,
    tiendaActiva,
    tiendaLimit,
    tiendaPublishedCount,
    tiendaInTrial,
  } = props

  const labels = useMemo(() => getInventoryFieldLabels(categoria), [categoria])

  const esCategoriEquipos = categoria === "EQUIPOS"
  const stockBloqueadoPorImei = esEquipo && registrarIdentificador && !!imeiSerie.trim()
  const [cameraOpen, setCameraOpen] = useState(false)
  const replaceInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null])
  const openCamera = () => {
    beginCameraTrace("inventario-producto")
    setCameraOpen(true)
  }

  // Mi Tienda: calculos de capacidad y validaciones.
  const precioVentaNum = parseFloat(precioVenta) || 0
  const yaEstabaPublicado = Boolean(editingProducto?.publicado_en_tienda)
  const proyectadoPublicado = tiendaPublishedCount + (publicadoEnTienda && !yaEstabaPublicado ? 1 : 0) - (yaEstabaPublicado && !publicadoEnTienda ? 1 : 0)
  const limiteExcedido = publicadoEnTienda && proyectadoPublicado > tiendaLimit
  const faltaPrecio = publicadoEnTienda && precioVentaNum <= 0
  const tiendaNoActivada = publicadoEnTienda && !tiendaActiva
  const puedeCambiarToggle = !saving && !limiteExcedido && !faltaPrecio
  const trialLabel = tiendaInTrial ? "Trial" : null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent
        hideCloseButton
        overlayClassName="backdrop-blur-md bg-slate-200/75"
        className="max-w-full w-full md:max-w-3xl lg:max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-[0_16px_64px_rgba(0,0,0,0.16)] overflow-y-auto overflow-x-hidden p-0 gap-0"
      >

        {/* -- Header -- */}
        <div className="relative px-8 pt-8 pb-4 shrink-0">
          <DialogHeader className="space-y-1 text-left items-start">
            <div className="flex items-center gap-3 mb-1 pr-14">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Box className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <DialogTitle className="text-xl font-black italic uppercase tracking-tight text-slate-900">
                  {editingProducto ? "Editar producto" : "Nuevo producto"}
                </DialogTitle>
                <DialogDescription className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  {editingProducto
                    ? "Actualiza la informacion de este producto en tu inventario."
                    : "Alta precisa: datos estructurados y busqueda unificada."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            disabled={saving}
            aria-label="Cerrar"
            className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-white hover:text-blue-700 active:scale-95 transition-all shadow-sm border border-slate-200/60 disabled:opacity-50"
          >
            <X className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* -- Body -- */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,340px)] gap-0 lg:gap-6 px-8 py-2 min-w-0">

          {/* -- Columna izquierda -- */}
          <div className="flex flex-col gap-4 min-w-0 order-1">

            {/* Identificacion */}
            <section className="rounded-2xl border border-slate-100 bg-slate-50/40 p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Fingerprint className="h-4 w-4 shrink-0 text-blue-500" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">Identificacion</h3>
              </div>
              <div className="space-y-4">

                {/* Nombre */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Nombre del producto</Label>
                  <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre comercial o descriptivo"
                    className="bg-white border-slate-200 rounded-xl min-h-[48px] placeholder:text-slate-400 placeholder:font-medium"
                  />
                </div>

                {/* SKU + Codigo de barras */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">SKU</Label>
                    <Input
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Opcional"
                      className="bg-white border-slate-200 rounded-xl min-h-[48px] placeholder:text-slate-400 placeholder:font-medium"
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Codigo de barras</Label>
                    <div className="relative">
                      <Input
                        value={codigoBarras}
                        onChange={(e) => setCodigoBarras(e.target.value)}
                        placeholder="Opcional"
                        className="bg-white border-slate-200 rounded-xl min-h-[48px] pr-[72px] placeholder:text-slate-400 placeholder:font-medium"
                      />
                      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                        <ProBarcodeButton
                          onScan={(code) => setCodigoBarras(code)}
                          buttonSize="compact"
                          className="static bg-blue-50 text-blue-500 hover:bg-blue-600 hover:text-blue-700"
                        />
                        <button
                          type="button"
                          onClick={generarCodigoBarrasInterno}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-500 hover:bg-blue-600 hover:text-blue-700 transition-colors"
                          title="Generar codigo interno EAN-13"
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categoria + Condicion en la misma fila */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Categoria</Label>
                    <Select
                      value={categoria}
                      onValueChange={(val) => {
                        setCategoria(val)
                        setEsEquipo(val === "EQUIPOS")
                        setRegistrarIdentificador(val === "EQUIPOS")
                        if (val !== "EQUIPOS") {
                          setImeiSerie("")
                          setImeiError(null)
                        }
                        if (val === "EQUIPOS") ensureEquiposCategoria?.()
                      }}
                    >
                      <SelectTrigger className="bg-white border-slate-200 rounded-xl min-h-[48px] justify-between">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        {(categoriasDisponibles ?? []).map((cat) => {
                          const Icon = getCategoryIcon(cat.icono)
                          return (
                            <SelectItem key={cat.slug} value={cat.nombre}>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${cat.nombre === "EQUIPOS" ? "text-blue-600" : "text-blue-400"}`} />
                                <span className={cat.nombre === "EQUIPOS" ? "font-bold text-blue-700" : ""}>{cat.nombre}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                        <div className="px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => void onCreateCategoria?.()}
                            className="w-full rounded-lg border border-dashed border-slate-300 px-2 py-1.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            + Crear nueva categoria
                          </button>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Condicion</Label>
                    <Select
                      value={condicion || "__none__"}
                      onValueChange={(v) => setCondicion(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="bg-white border-slate-200 rounded-xl min-h-[48px]">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin especificar</SelectItem>
                        <SelectItem value="Nuevo">Nuevo</SelectItem>
                        <SelectItem value="Reacondicionado">Reacondicionado</SelectItem>
                        <SelectItem value="Seminuevo">Seminuevo</SelectItem>
                        <SelectItem value="Usado">Usado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Descripcion */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Descripcion</Label>
                  <Textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder={esCategoriEquipos ? "Caracteristicas del equipo como almacenamiento, ram, color" : "Notas, compatibilidades, detalles de vitrina…"}
                    className="bg-white border-slate-200 rounded-xl min-h-[80px] resize-y placeholder:text-slate-400 placeholder:font-medium"
                  />
                </div>
              </div>
            </section>

            {/* Clasificacion: Marca + Modelo */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">Clasificacion</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">{labels.marca}</Label>
                  <Input
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="Ej: Apple"
                    className="bg-slate-50/60 border-slate-200 rounded-xl min-h-[48px] placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">{labels.modelo}</Label>
                  <Input
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Ej: iPhone 17"
                    className="bg-slate-50/60 border-slate-200 rounded-xl min-h-[48px] placeholder:text-slate-400"
                  />
                </div>
              </div>
            </section>

            {/* Identificador IMEI/Serie - visible solo cuando EQUIPOS */}
            <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${esCategoriEquipos ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden min-h-0">
                <div className="space-y-4 pt-1 pb-2">

                  {/* Identificador IMEI/Serie - siempre visible dentro de EQUIPOS */}
                  <section className="rounded-2xl border border-blue-100 bg-blue-50/30 p-5 space-y-3">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">Identificador</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                          IMEI o numero de serie <span className="text-red-500">*</span>
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-slate-500 hover:text-slate-600">
                                <HelpCircle className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[220px] text-xs">
                              <p><strong>IMEI:</strong> 15 digitos. Ajustes {">"} Informacion o *#06#.</p>
                              <p className="mt-1"><strong>Serie:</strong> alfanumerico del fabricante (min. 8 caracteres).</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex gap-1 rounded-xl bg-slate-100/80 border border-slate-200/60 p-1" role="group" aria-label="Tipo de identificador">
                        <button
                          type="button"
                          onClick={() => { setImeiType("imei"); setImeiError(null) }}
                          aria-pressed={imeiType === "imei"}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${imeiType === "imei" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          IMEI
                        </button>
                        <button
                          type="button"
                          onClick={() => { setImeiType("serie"); setImeiError(null) }}
                          aria-pressed={imeiType === "serie"}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${imeiType === "serie" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          Numero de serie
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          value={imeiSerie}
                          onChange={(e) => { setImeiSerie(e.target.value); setImeiError(null) }}
                          placeholder={imeiType === "imei" ? "15 digitos numericos" : "Min. 8 caracteres alfanumericos"}
                          maxLength={imeiType === "imei" ? 15 : 30}
                          className={`bg-white rounded-xl min-h-[48px] font-mono pr-28 ${imeiError ? "border-red-300 focus-visible:ring-red-200" : "border-slate-200"}`}
                        />
                        <div className="absolute inset-y-0 right-9 flex items-center">
                          <ProBarcodeButton
                            onScan={(code) => {
                              const normalized =
                                imeiType === "imei"
                                  ? code.replace(/\D/g, "").slice(0, 15)
                                  : code.trim().slice(0, 30)
                              setImeiSerie(normalized)
                              setImeiError(null)
                            }}
                            buttonSize="compact"
                            iconSize="md"
                            enabledTooltip={imeiType === "imei" ? "Escanear IMEI con la camara" : "Escanear numero de serie con la camara"}
                            ariaLabel={imeiType === "imei" ? "Escanear IMEI" : "Escanear numero de serie"}
                            className="bg-blue-50 text-blue-500 hover:bg-blue-600 hover:text-blue-700"
                          />
                        </div>
                        <span
                          className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono tabular-nums ${
                            imeiType === "imei" && imeiSerie.length === 15
                              ? "text-emerald-600"
                              : imeiError
                                ? "text-red-400"
                                : "text-slate-500"
                          }`}
                        >
                          {imeiSerie.length}/{imeiType === "imei" ? "15" : "30"}
                        </span>
                      </div>
                      {imeiError ? (
                        <p className="flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {imeiError}
                        </p>
                      ) : imeiSerie.length > 0 && imeiType === "imei" && /^\d{15}$/.test(imeiSerie) ? (
                        <p className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                          IMEI valido
                        </p>
                      ) : imeiSerie.length > 0 && imeiType === "serie" && imeiSerie.trim().length >= 8 ? (
                        <p className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                          Numero de serie valido
                        </p>
                      ) : null}
                    </div>
                    {stockBloqueadoPorImei && (
                      <div className="flex items-center gap-2 rounded-xl bg-blue-50/60 border border-blue-100 px-3 py-2 text-xs text-blue-700">
                        <Fingerprint className="h-3.5 w-3.5 shrink-0" />
                        Stock fijado en 1 - identificador unico por unidad.
                      </div>
                    )}
                  </section>

                </div>
              </div>
            </div>
          </div>

          {/* -- Columna derecha -- */}
          <div className="flex flex-col gap-4 min-w-0 order-2">

            {/* Fotos (hasta 3) */}
            <section className="rounded-2xl border border-slate-100 bg-slate-50/30 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" aria-hidden />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">Fotos</h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {imagenUrls.filter((u) => u).length}/3
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((slot) => {
                  const preview = localPreviewUrls[slot] || imagenUrls[slot] || null
                  const isUploading = uploadingImageSlot === slot
                  return (
                     <div key={slot} className="relative">
                      {preview ? (
                        <div className="relative group cursor-pointer">
                          <div onClick={() => replaceInputRefs.current[slot]?.click()}>
                            <InventoryProductImagePreview
                              stored={preview}
                              productId={(editingProducto?.id ?? draftProductId) || undefined}
                              tallerId={editingProducto?.taller_id || undefined}
                              alt={`Foto ${slot + 1}`}
                              className="max-w-none w-full"
                            />
                          </div>
                          <input
                            ref={(el) => { replaceInputRefs.current[slot] = el }}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={uploadingImageSlot !== null}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                onClearImageUploadError?.()
                                handleImageFile(file, slot)
                              }
                              e.target.value = ""
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(slot)}
                            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Eliminar foto ${slot + 1}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label
                          className={`flex flex-col items-center justify-center gap-1 aspect-square rounded-xl border border-dashed cursor-pointer transition-colors ${
                            isUploading
                              ? "border-blue-300 bg-blue-50/50"
                              : "border-slate-200 bg-white hover:border-blue-300/80 hover:bg-blue-50/30"
                          }`}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="sr-only"
                            disabled={uploadingImageSlot !== null}
                            onChange={(e) => {
                              onClearImageUploadError?.()
                              const files = e.target.files
                              if (files?.length) {
                                if (files.length === 1) {
                                  handleImageFile(files[0], slot)
                                } else {
                                  handleMultipleImageFiles(files)
                                }
                              }
                              e.target.value = ""
                            }}
                          />
                          {isUploading ? (
                            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                          ) : (
                            <>
                              <ImageIcon className="h-5 w-5 text-slate-600" strokeWidth={1.25} />
                              <span className="text-[9px] text-slate-500 font-medium">Foto {slot + 1}</span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <label
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 shadow-sm transition-colors cursor-pointer ${
                    uploadingImageSlot !== null || imagenUrls.filter((u) => u).length >= 3
                      ? "opacity-50 pointer-events-none"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    disabled={uploadingImageSlot !== null || imagenUrls.filter((u) => u).length >= 3}
                    onChange={(e) => {
                      onClearImageUploadError?.()
                      if (e.target.files?.length) void handleMultipleImageFiles(e.target.files)
                      e.target.value = ""
                    }}
                  />
                  <ImageIcon className="h-4 w-4" />
                  Agregar fotos
                </label>
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingImageSlot !== null || imagenUrls.filter((u) => u).length >= 3}
                  onClick={openCamera}
                  className="flex-1 border-slate-200 bg-white text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Camara
                </Button>
              </div>
              {imageUploadError ? (
                <p
                  role="status"
                  className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs leading-snug text-slate-600"
                >
                  {imageUploadError}
                </p>
              ) : null}
            </section>

            {/* Mi Tienda */}
            <section
              className={`rounded-2xl border p-5 space-y-3 transition-colors ${
                publicadoEnTienda
                  ? "border-violet-200 bg-gradient-to-br from-violet-50/60 via-white to-fuchsia-50/40 shadow-sm"
                  : "border-slate-100 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-slate-800 min-w-0">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                      publicadoEnTienda ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Store className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">Mi Tienda</h3>
                    <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                      {tiendaPublishedCount}/{tiendaLimit} publicados{trialLabel ? ` \u00b7 ${trialLabel}` : ""}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={publicadoEnTienda}
                  disabled={!puedeCambiarToggle}
                  onCheckedChange={(v) => {
                    if (limiteExcedido) return
                    if (v && precioVentaNum <= 0) return
                    setPublicadoEnTienda(v)
                  }}
                  aria-label="Publicar en Mi Tienda"
                />
              </div>

              {publicadoEnTienda ? (
                <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1">
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Este producto aparecera en tu catalogo publico en{" "}
                    <span className="font-mono text-slate-700">/t/&lt;tu-tienda&gt;</span>.
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                      Descripcion publica (opcional)
                    </Label>
                    <Textarea
                      value={descripcionPublica}
                      onChange={(e) => setDescripcionPublica(e.target.value.slice(0, 500))}
                      placeholder="Detalles, especificaciones o mensaje para tus clientes. Max 500 caracteres."
                      maxLength={500}
                      className="bg-white border-slate-200 rounded-xl min-h-[72px] placeholder:text-slate-400 placeholder:font-medium text-sm"
                    />
                    <p className="text-[10px] font-semibold text-slate-500 text-right">
                      {descripcionPublica.length}/500
                    </p>
                  </div>
                  {faltaPrecio ? (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-[11px] leading-snug text-amber-800">
                        Para publicar, este producto necesita un precio de venta mayor a 0.
                      </p>
                    </div>
                  ) : null}
                  {limiteExcedido ? (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/60 px-2.5 py-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600 mt-0.5 shrink-0" />
                      <p className="text-[11px] leading-snug text-rose-800">
                        Alcanzaste el limite de {tiendaLimit} productos publicados. Mejora a PRO para mas capacidad.
                      </p>
                    </div>
                  ) : null}
                  {tiendaNoActivada ? (
                    <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/60 px-2.5 py-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-[11px] leading-snug text-blue-800">
                        Tu tienda publica aun no esta activada. Activala en Mi Tienda para que se muestre.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Muestra este producto en tu catalogo publico. Los clientes podran consultarte por WhatsApp.
                </p>
              )}
            </section>

            {/* Precios y Stock */}
            <section className="rounded-2xl border border-emerald-100/60 bg-gradient-to-br from-emerald-50/40 via-sky-50/30 to-blue-50/20 p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-blue-700">
                <DollarSign className="h-4 w-4 shrink-0 text-blue-500" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">Precios y stock</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-600">P. venta</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(e.target.value)}
                    className="bg-emerald-50/50 border-emerald-100 text-slate-900 rounded-xl min-h-[48px] font-bold placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Costo</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costo}
                    onChange={(e) => setCosto(e.target.value)}
                    className="bg-slate-50/60 border-slate-200 rounded-xl min-h-[48px] placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Stock actual</Label>
                  <Input
                    type="number"
                    min="0"
                    value={stockBloqueadoPorImei ? "1" : stockActual}
                    onChange={(e) => setStockActual(e.target.value)}
                    disabled={stockBloqueadoPorImei}
                    className={`rounded-xl min-h-[48px] ${stockBloqueadoPorImei ? "bg-slate-100 opacity-80 cursor-not-allowed border-slate-200" : "bg-white border-slate-200"}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-600">Minimo</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          type="number"
                          min="0"
                          value={stockBloqueadoPorImei ? "1" : stockMinimo}
                          onChange={(e) => setStockMinimo(e.target.value)}
                          disabled={stockBloqueadoPorImei}
                          className={`rounded-xl min-h-[48px] ${stockBloqueadoPorImei ? "bg-slate-100 border-slate-200 opacity-80 cursor-not-allowed" : "bg-amber-50/50 border-amber-100 text-slate-900"}`}
                        />
                      </TooltipTrigger>
                      {stockBloqueadoPorImei && (
                        <TooltipContent className="text-xs">Unidad unica: minimo fijo en 1.</TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </section>

            {/* Ubicacion en almacen */}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-blue-500" aria-hidden />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">Almacen</h3>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">{labels.ubicacion}</Label>
                <Input
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej: Estante A1"
                  className="bg-slate-50/60 border-slate-200 rounded-xl min-h-[48px] placeholder:text-slate-400"
                />
              </div>
            </section>

          </div>
        </div>

        {/* -- Footer -- */}
        <div
          className={`flex flex-col gap-3 px-8 py-5 sm:flex-row sm:items-center ${
            esCategoriEquipos ? "sm:justify-between" : "sm:justify-center"
          }`}
        >
          {esCategoriEquipos && (
            <p className="flex items-center gap-1.5 text-xs text-amber-700 order-3 sm:order-1 sm:max-w-[40%]">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              Nota: La categoria EQUIPOS requiere obligatoriamente registrar IMEI/Serie.
            </p>
          )}
          <div className="flex justify-center gap-3 shrink-0 order-1 sm:order-2">
            <Button variant="outline" onClick={onClose} disabled={saving} className="h-12 rounded-2xl border-slate-200 bg-white px-6 font-bold uppercase tracking-wider text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </Button>
            <Button
              onClick={onSubmit}
              disabled={saving}
              className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-sm gap-2 btn-glow shadow-lg shadow-blue-500/25 px-8"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {editingProducto ? "Actualizando..." : "Guardando..."}
                </>
              ) : editingProducto ? (
                "Actualizar"
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>

      </DialogContent>

      <CameraModal
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCaptureAll={(files) => { void handleCameraFiles(files) }}
      />
    </Dialog>
  )
}

