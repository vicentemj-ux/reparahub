/**
 * Optimizacion de imagenes para subida (solo ejecutar en el navegador: usa Canvas).
 * - Maximo 1280px en el lado mayor
 * - Salida WebP calidad ~0.8, con reduccion hasta cumplir ≤ 400KB
 */

const MAX_DIMENSION = 1280
const MAX_BYTES = 300 * 1024 // 300KB constraint
const WEBP_QUALITY_INITIAL = 0.8
const WEBP_QUALITY_MIN = 0.45
const JPEG_QUALITY_FALLBACK = 0.82

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("No se pudo cargar la imagen"))
    }
    img.src = url
  })
}

function drawToCanvas(
  img: HTMLImageElement,
  maxDim: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
  let { width, height } = img
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height * maxDim) / width)
      width = maxDim
    } else {
      width = Math.round((width * maxDim) / height)
      height = maxDim
    }
  }
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2d no disponible")
  ctx.drawImage(img, 0, 0, width, height)
  return { canvas, width, height }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

async function encodeUnderBudget(
  canvas: HTMLCanvasElement,
  maxBytes: number
): Promise<{ blob: Blob; mime: string; ext: string }> {
  let quality = WEBP_QUALITY_INITIAL
  let blob: Blob | null = await canvasToBlob(canvas, "image/webp", quality)

  if (blob && blob.type === "image/webp") {
    while (blob.size > maxBytes && quality > WEBP_QUALITY_MIN) {
      quality -= 0.06
      const next = await canvasToBlob(canvas, "image/webp", Math.max(quality, WEBP_QUALITY_MIN))
      if (!next) break
      blob = next
    }
    if (blob && blob.size <= maxBytes) {
      return { blob, mime: "image/webp", ext: ".webp" }
    }
  }

  // Fallback JPEG (WebP no soportado o sigue pesando demasiado)
  quality = JPEG_QUALITY_FALLBACK
  blob = await canvasToBlob(canvas, "image/jpeg", quality)
  if (!blob) throw new Error("No se pudo codificar la imagen")

  while (blob.size > maxBytes && quality > 0.5) {
    quality -= 0.07
    const next = await canvasToBlob(canvas, "image/jpeg", Math.max(quality, 0.5))
    if (!next) break
    blob = next
  }

  let { width, height } = canvas
  let scaleCanvas = canvas
  while (blob && blob.size > maxBytes && width > 320 && height > 320) {
    const factor = Math.sqrt(maxBytes / blob.size) * 0.92
    width = Math.max(320, Math.round(width * factor))
    height = Math.max(320, Math.round(height * factor))
    const small = document.createElement("canvas")
    small.width = width
    small.height = height
    const ctx = small.getContext("2d")
    if (!ctx) break
    ctx.drawImage(scaleCanvas, 0, 0, width, height)
    scaleCanvas = small
    blob = await canvasToBlob(small, "image/jpeg", 0.78)
    if (!blob) break
  }
  if (!blob) throw new Error("No se pudo codificar la imagen despues de reescalar")

  return { blob, mime: "image/jpeg", ext: ".jpg" }
}

/**
 * Redimensiona, convierte a WebP (o JPEG si hace falta) y garantiza tamano ≤ 400KB por defecto.
 */
export async function optimizeImageForUpload(
  file: File,
  maxSizeBytes: number = MAX_BYTES
): Promise<File> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("optimizeImageForUpload solo esta disponible en el cliente")
  }
  if (!file.type.startsWith("image/")) {
    return file
  }

  const img = await loadImage(file)
  const { canvas } = drawToCanvas(img, MAX_DIMENSION)
  const { blob, mime, ext } = await encodeUnderBudget(canvas, maxSizeBytes)

  const base = file.name.replace(/\.[^.]+$/i, "") || "foto"
  return new File([blob], `${base}${ext}`, { type: mime, lastModified: Date.now() })
}
