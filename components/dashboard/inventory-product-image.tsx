"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { Package } from "lucide-react"
import { getInventoryImagePair, getInventoryPublicUrl, parseImagenUrls } from "@/lib/storage"
import { cn } from "@/lib/utils"

export type InventoryProductImageProps = {
  /** Valor de `productos.imagen_url`: path relativo, URL completa, o JSON array de URLs. */
  stored: string | null | undefined
  /** `productos.id` (para preferir la ruta canonica `{tallerId}/{productId}.webp`) */
  productId?: string
  /** `productos.taller_id` */
  tallerId?: string
  alt: string
  width: number
  height: number
  className?: string
  imgClassName?: string
}

function getFirstStoredUrl(stored: string | null | undefined): string | null {
  if (!stored) return null
  const paths = parseImagenUrls(stored)
  return paths[0] || null
}

function PlaceholderIcon({ width, height, className }: { width: number; height: number; className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-slate-100 text-slate-400",
        className
      )}
      style={{ width, height }}
      aria-hidden
    >
      <Package className="max-h-[45%] max-w-[45%]" strokeWidth={1.5} />
    </div>
  )
}

/**
 * Miniatura de producto: intenta cargar thumbnail primero (300px, rapido),
 * cae a la imagen full si no existe thumbnail, luego a placeholder.
 */
export function InventoryProductImage({
  stored,
  productId,
  tallerId,
  alt,
  width,
  height,
  className,
  imgClassName,
}: InventoryProductImageProps) {
  const { full, thumb } = getInventoryImagePair(stored)
  const [src, setSrc] = useState(thumb || full || null)
  const [stage, setStage] = useState<"thumb" | "full" | "broken">(thumb ? "thumb" : "full")

  useEffect(() => {
    setSrc(thumb || full || null)
    setStage(thumb ? "thumb" : full ? "full" : "broken")
  }, [full, thumb])

  if (!src || stage === "broken") {
    return <PlaceholderIcon width={width} height={height} className={className} />
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn("object-cover", imgClassName, className)}
      onError={() => {
        if (stage === "thumb" && full) {
          setSrc(full)
          setStage("full")
        } else {
          setStage("broken")
          setSrc(null)
        }
      }}
    />
  )
}

type InventoryProductImagePreviewProps = {
  stored: string | null | undefined
  productId?: string
  tallerId?: string
  alt: string
  className?: string
}

/** Vista previa cuadrada (modal inventario): thumbnail-first, fallback full, luego placeholder. */
export function InventoryProductImagePreview({ stored, productId, tallerId, alt, className }: InventoryProductImagePreviewProps) {
  const { full, thumb } = getInventoryImagePair(stored)
  const firstStored = getFirstStoredUrl(stored)
  const isBlob = firstStored?.startsWith("blob:") ?? false

  const primarySrc = isBlob ? firstStored : (thumb || full || null)
  const [src, setSrc] = useState(primarySrc)
  const [stage, setStage] = useState<"primary" | "full" | "broken">(
    primarySrc ? "primary" : "broken"
  )

  useEffect(() => {
    setSrc(primarySrc)
    setStage(primarySrc ? "primary" : "broken")
  }, [primarySrc])

  if (!src || stage === "broken") {
    return (
      <div
        className={cn(
          "flex aspect-square w-full max-w-[200px] items-center justify-center rounded-lg border border-border bg-slate-100 text-slate-400",
          className
        )}
        aria-hidden
      >
        <Package className="h-12 w-12" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <div className={cn("relative aspect-square w-full max-w-[200px] overflow-hidden rounded-lg border border-border bg-white", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="200px"
        className="object-cover"
        unoptimized={isBlob}
        onError={() => {
          if (stage === "primary" && full && src !== full) {
            setSrc(full)
            setStage("full")
          } else {
            setStage("broken")
            setSrc(null)
          }
        }}
      />
    </div>
  )
}
