"use client"

import { optimizeImageForUpload } from "@/lib/image-optimizer"

interface PrepareGalleryFilesOptions {
  currentCount: number
  maxFiles: number
}

export async function prepareGalleryFiles(
  files: File[] | FileList,
  options: PrepareGalleryFilesOptions
): Promise<File[]> {
  const { currentCount, maxFiles } = options
  const remainingSlots = Math.max(0, maxFiles - currentCount)

  if (remainingSlots <= 0) return []

  const validFiles = Array.from(files)
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, remainingSlots)

  if (validFiles.length === 0) return []

  return Promise.all(
    validFiles.map((file) => optimizeImageForUpload(file).catch(() => file))
  )
}
