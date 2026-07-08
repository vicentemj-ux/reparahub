"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

export type PhotoItem = {
  id: string
  url: string
  alt?: string
}

type RepairPhotoGalleryProps = {
  photos: PhotoItem[]
  title?: string
}

export function RepairPhotoGallery({ photos, title }: RepairPhotoGalleryProps) {
  const normalized = useMemo(
    () => photos.map((p) => ({ ...p, url: String(p.url ?? "").trim() })).filter((p) => p.url.length > 0),
    [photos],
  )

  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [failed, setFailed] = useState<Record<string, boolean>>({})

  const hasMany = normalized.length > 1
  const isOpen = openIndex != null && openIndex >= 0 && openIndex < normalized.length
  const current = isOpen ? normalized[openIndex] : null

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null)
      if (!hasMany) return
      if (event.key === "ArrowLeft") {
        setOpenIndex((prev) => (prev == null ? 0 : (prev - 1 + normalized.length) % normalized.length))
      }
      if (event.key === "ArrowRight") {
        setOpenIndex((prev) => (prev == null ? 0 : (prev + 1) % normalized.length))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [hasMany, isOpen, normalized.length])

  const markFailed = (photoId: string) => {
    setFailed((prev) => ({ ...prev, [photoId]: true }))
  }

  if (normalized.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 py-8 text-center text-sm text-gray-500">
        Sin fotos adjuntas
      </p>
    )
  }

  return (
    <>
      {title ? <p className="text-xs text-slate-500">{title}</p> : null}

      <div className="flex flex-wrap gap-2 sm:gap-3">
        {normalized.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            className="h-24 w-24 overflow-hidden rounded-xl border border-gray-200 bg-slate-100 sm:h-28 sm:w-28"
            onClick={() => setOpenIndex(index)}
            aria-label={`Abrir foto ${index + 1}`}
          >
            {failed[photo.id] ? (
              <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-slate-500">
                Imagen no disponible
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.url}
                alt={photo.alt ?? `Foto ${index + 1}`}
                className="h-full w-full object-cover rounded-xl"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => markFailed(photo.id)}
              />
            )}
          </button>
        ))}
      </div>

      {isOpen && current ? (
        <div
          className="fixed inset-0 z-50 bg-slate-100/95 p-4"
          onClick={() => setOpenIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Visor de fotos"
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white p-2 text-slate-700 hover:bg-blue-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          {hasMany ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpenIndex((prev) => (prev == null ? 0 : (prev - 1 + normalized.length) % normalized.length))
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2 text-slate-700 hover:bg-blue-50"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}

          <div className="flex h-full w-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {failed[current.id] ? (
              <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-700">Imagen no disponible</div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.url}
                alt={current.alt ?? "Foto del equipo"}
                className="max-h-[85vh] max-w-[90vw] object-contain"
                referrerPolicy="no-referrer"
                onError={() => markFailed(current.id)}
              />
            )}
          </div>

          {hasMany ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpenIndex((prev) => (prev == null ? 0 : (prev + 1) % normalized.length))
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2 text-slate-700 hover:bg-blue-50"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

