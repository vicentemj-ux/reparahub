"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "@/hooks/use-toast"
import {
  createProducto,
  uploadProductImage,
  deleteProducto,
  deleteProductImageAction,
  type ProductoRow,
  type CreateProductoInput,
} from "@/lib/actions/productos-prisma"
import { prepareGalleryFiles } from "@/lib/gallery-photo-utils"
import { normalizeInventoryImagePathForDb, parseImagenUrls } from "@/lib/storage"

export type ImageHandler = (file: File, slot: number) => Promise<void>
export type RemoveHandler = (slot: number) => void
export type MultiImageHandler = (files: FileList | File[]) => Promise<void>
export type CameraFilesHandler = (files: File[]) => Promise<void>

export interface UseProductImagesOptions {
  /** Editing product (null when creating new). Used to determine if draft is needed. */
  editingProducto?: ProductoRow | null
  /** Callback to build the product payload for draft creation. */
  buildDraftPayload: (productId: string, nameFallback: string) => CreateProductoInput
}

export interface UseProductImagesReturn {
  imagenUrls: string[]
  setImagenUrls: React.Dispatch<React.SetStateAction<string[]>>
  localPreviewUrls: (string | null)[]
  uploadingImageSlot: number | null
  imageUploadError: string | null
  setImageUploadError: React.Dispatch<React.SetStateAction<string | null>>
  draftProductId: string
  setDraftProductId: React.Dispatch<React.SetStateAction<string>>
  draftProductIdRef: React.MutableRefObject<string | null>
  /** Must be called to populate state when editing a product. */
  loadEditingUrls: (stored: string | null) => void
  handleImageFile: ImageHandler
  removeImage: RemoveHandler
  handleMultipleImageFiles: MultiImageHandler
  handleCameraFiles: CameraFilesHandler
  cleanupDraft: () => Promise<void>
}

export function useProductImages(
  options: UseProductImagesOptions
): UseProductImagesReturn {
  const { editingProducto, buildDraftPayload } = options

  const [imagenUrls, setImagenUrls] = useState<string[]>(["", "", ""])
  const [localPreviewUrls, setLocalPreviewUrls] = useState<(string | null)[]>([null, null, null])
  const [uploadingImageSlot, setUploadingImageSlot] = useState<number | null>(null)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)
  const [draftProductId, setDraftProductId] = useState("")

  const imagenUrlsRef = useRef(imagenUrls)
  const localPreviewUrlsRef = useRef(localPreviewUrls)
  const draftProductIdRef = useRef<string | null>(null)

  useEffect(() => { imagenUrlsRef.current = imagenUrls }, [imagenUrls])
  useEffect(() => { localPreviewUrlsRef.current = localPreviewUrls }, [localPreviewUrls])
  useEffect(() => { draftProductIdRef.current = draftProductId }, [draftProductId])

  // Cleanup draft on unmount (user navigated away)
  useEffect(() => {
    const pid = draftProductIdRef.current
    const editing = editingProducto
    return () => {
      if (pid && !editing) {
        deleteProducto(pid).catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadEditingUrls = useCallback((stored: string | null) => {
    localPreviewUrlsRef.current.forEach((url) => { if (url) URL.revokeObjectURL(url) })
    setLocalPreviewUrls([null, null, null])
    const next = parseImagenUrls(stored).concat(["", "", ""]).slice(0, 3)
    imagenUrlsRef.current = next
    setImagenUrls(next)
  }, [])

  const handleImageFile = useCallback(async (file: File | null, slot: number = 0) => {
    if (!file || !file.type.startsWith("image/")) return
    if (slot < 0 || slot > 2) return
    setUploadingImageSlot(slot)
    setImageUploadError(null)
    try {
      let productId = editingProducto?.id ?? draftProductIdRef.current ?? draftProductId
      if (!productId) {
        productId = crypto.randomUUID()
        setDraftProductId(productId)
        draftProductIdRef.current = productId
      }

      // New product: persist draft in DB first (stable ID for R2 path)
      if (!editingProducto) {
        const persist = await createProducto(buildDraftPayload(productId, "Producto (borrador)"))
        if (!persist.success) {
          const msg = persist.error?.trim() || "No se pudo guardar el producto."
          setImageUploadError("Error al subir. " + msg)
          toast({ title: "No se pudo preparar la foto", description: msg, variant: "destructive" })
          return
        }
      }

      // Import image optimizer and use it
      const { optimizeImageForUpload } = await import("@/lib/image-optimizer")
      const compressedFile = await optimizeImageForUpload(file)

      setLocalPreviewUrls((prev) => {
        const next = [...prev]
        if (next[slot]) URL.revokeObjectURL(next[slot]!)
        next[slot] = URL.createObjectURL(compressedFile)
        return next
      })

      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(String(r.result))
        r.onerror = rej
        r.readAsDataURL(compressedFile)
      })
      const mimeType = compressedFile.type || "image/webp"
      const slotIndex = slot + 1
      const res = await uploadProductImage(base64, productId, mimeType, slotIndex)
      if (!res.success) {
        const short =
          res.error && res.error.length > 120 ? "Revisa la conexion o el bucket de fotos en Supabase." : res.error
        setImageUploadError("Error al subir. " + (short || "Intenta de nuevo."))
        toast({ title: "No se pudo subir la imagen", description: short || "Intenta de nuevo.", variant: "destructive" })
        return
      }

      // If replacing an existing image, clean up the old one from R2
      const oldPath = normalizeInventoryImagePathForDb(imagenUrlsRef.current[slot])
      if (oldPath && oldPath.startsWith("inventario/") && oldPath !== res.path) {
        deleteProductImageAction(oldPath).catch(() => {})
      }

      setImagenUrls((prev) => {
        const next = [...prev]
        next[slot] = res.path
        imagenUrlsRef.current = next
        return next
      })
      setImageUploadError(null)
    } catch {
      setImageUploadError("Error al subir. No se pudo procesar la imagen.")
      toast({ title: "No se pudo subir la imagen", description: "Revisa el archivo e intenta de nuevo." })
    } finally {
      setUploadingImageSlot(null)
    }
  }, [editingProducto, buildDraftPayload, draftProductId])

  const removeImage = useCallback((slot: number) => {
    const currentUrl = normalizeInventoryImagePathForDb(imagenUrlsRef.current[slot])
    setImagenUrls((prev) => {
      const next = [...prev]
      next[slot] = ""
      imagenUrlsRef.current = next
      return next
    })
    setImageUploadError(null)
    setLocalPreviewUrls((prev) => {
      const next = [...prev]
      if (next[slot]) URL.revokeObjectURL(next[slot]!)
      next[slot] = null
      return next
    })
    if (currentUrl && currentUrl.startsWith("inventario/")) {
      deleteProductImageAction(currentUrl).catch(() => {})
    }
  }, [])

  const assignPreparedFiles = useCallback(async (files: FileList | File[]) => {
    const currentCount = imagenUrlsRef.current.filter(Boolean).length + localPreviewUrlsRef.current.filter(Boolean).length
    const preparedFiles = await prepareGalleryFiles(files, {
      currentCount,
      maxFiles: 3,
    })
    if (preparedFiles.length === 0) return

    const occupiedSlots = new Set<number>()
    for (let i = 0; i < preparedFiles.length; i++) {
      const urls = imagenUrlsRef.current
      const previews = localPreviewUrlsRef.current
      const emptySlot = [0, 1, 2].find(
        (s) => !urls[s] && !previews[s] && !occupiedSlots.has(s)
      )
      if (emptySlot == null) break
      occupiedSlots.add(emptySlot)
      await handleImageFile(preparedFiles[i], emptySlot)
    }
  }, [handleImageFile])

  const handleMultipleImageFiles = useCallback(async (files: FileList | File[]) => {
    await assignPreparedFiles(files)
  }, [assignPreparedFiles])

  const handleCameraFiles = useCallback(async (files: File[]) => {
    await assignPreparedFiles(files)
  }, [assignPreparedFiles])

  const cleanupDraft = useCallback(async () => {
    if (draftProductId && !editingProducto) {
      await deleteProducto(draftProductId)
    }
    localPreviewUrls.forEach((url) => { if (url) URL.revokeObjectURL(url) })
    setLocalPreviewUrls([null, null, null])
  }, [draftProductId, editingProducto, localPreviewUrls])

  return {
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
  }
}
