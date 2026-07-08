/** Convierte un data URL (p. ej. de IndexedDB) a `File` para rehidratar fotos en el formulario. */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const parts = dataUrl.split(",")
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg"
  const bstr = atob(parts[1] ?? "")
  const n = bstr.length
  const u8arr = new Uint8Array(n)
  for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i)
  return new File([u8arr], filename, { type: mime })
}
