"use client"

import { useState, useCallback, useEffect } from "react"
import { NuevoProductoModal } from "./NuevoProductoModal"
import { createProducto } from "@/lib/actions/productos-prisma"
import { generateInventoryBarcode } from "@/lib/inventory-barcode"
import { useProductImages } from "@/lib/hooks/useProductImages"
import { getMiTiendaConfig } from "@/lib/actions/tienda-prisma"
import { serializeImagenUrls } from "@/lib/storage"
import { toast } from "@/hooks/use-toast"

export function NuevoProductoModalWrapper({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [editingProducto, setEditingProducto] = useState<null>(null)
  const [publicadoEnTienda, setPublicadoEnTienda] = useState(false)
  const [descripcionPublica, setDescripcionPublica] = useState("")
  const [tiendaActiva, setTiendaActiva] = useState(false)
  const [tiendaLimit, setTiendaLimit] = useState(5)
  const [tiendaPublishedCount, setTiendaPublishedCount] = useState(0)
  const [tiendaInTrial, setTiendaInTrial] = useState(false)

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

  const {
    imagenUrls,
    setImagenUrls,
    localPreviewUrls,
    uploadingImageSlot,
    imageUploadError,
    setImageUploadError,
    draftProductId,
    setDraftProductId,
    draftProductIdRef,
    loadEditingUrls,
    handleImageFile,
    removeImage,
    handleMultipleImageFiles,
    handleCameraFiles,
    cleanupDraft,
  } = useProductImages({
    editingProducto,
    buildDraftPayload: (productId, nameFallback) => ({
      id: productId,
      nombre: nameFallback,
    }),
  })

  const resetForm = useCallback(() => {
    setEditingProducto(null)
    setDraftProductId("")
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
  }, [])

  const refreshTiendaConfig = useCallback(async () => {
    const res = await getMiTiendaConfig()
    if (res.success && res.data) {
      setTiendaActiva(res.data.activa)
      setTiendaLimit(res.data.limit)
      setTiendaPublishedCount(res.data.publishedCount)
      setTiendaInTrial(res.data.inTrial)
    }
  }, [])

  useEffect(() => {
    if (open) void refreshTiendaConfig()
  }, [open, refreshTiendaConfig])

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      if (saving) return
      void cleanupDraft()
      resetForm()
      onClose()
    }
  }, [saving, cleanupDraft, resetForm, onClose])

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

  const buildProductPayload = (productId: string, nombreFallback: string) => {
    const c = buildFormCore()
    const orUndef = (v: string | null) => v ?? undefined
    return {
      id: productId,
      nombre: c.nom || nombreFallback,
      sku: orUndef(c.skuVal),
      codigo_barras: orUndef(c.barrasVal),
      imagen_url: serializeImagenUrls(imagenUrls) ?? undefined,
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

  const handleSubmit = async () => {
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
    const pid = draftProductId || crypto.randomUUID()
    if (!draftProductId) setDraftProductId(pid)
    const formData = buildProductPayload(pid, nom)
    try {
      const result = await createProducto(formData)
      if (result.success) {
        toast({ title: "Producto guardado", description: "El producto se agrego al inventario." })
        resetForm()
        onClose()
        onSaved?.()
      } else {
        toast({ title: "Error al guardar", description: result.error ?? "No se pudo guardar.", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error al guardar", description: e instanceof Error ? e.message : String(e), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const generarCodigoBarrasInterno = () => {
    setCodigoBarras(generateInventoryBarcode())
  }

  return (
    <NuevoProductoModal
      open={open}
      onClose={() => handleOpenChange(false)}
      editingProducto={null}
      draftProductId={draftProductId || crypto.randomUUID()}
      saving={saving}
      onSubmit={handleSubmit}
      tallerNombre=""
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
      handleImageFile={handleImageFile}
      handleMultipleImageFiles={handleMultipleImageFiles}
      handleCameraFiles={handleCameraFiles}
      removeImage={removeImage}
      imageUploadError={imageUploadError}
      onClearImageUploadError={() => setImageUploadError(null)}
      publicadoEnTienda={publicadoEnTienda}
      setPublicadoEnTienda={setPublicadoEnTienda}
      descripcionPublica={descripcionPublica}
      setDescripcionPublica={setDescripcionPublica}
      tiendaActiva={tiendaActiva}
      tiendaLimit={tiendaLimit}
      tiendaPublishedCount={tiendaPublishedCount}
      tiendaInTrial={tiendaInTrial}
    />
  )
}

