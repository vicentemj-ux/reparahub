import type { ProductoRow } from "@/lib/actions/productos-prisma"
import { getInventoryPublicUrl } from "@/lib/storage"
import { buildWhatsAppSendUrl } from "@/lib/whatsapp-send-url"

/** Descuento referencia para mayoreo 5+ piezas (ajustable en negocio). */
const MAYOREO_FACTOR = 0.88

export function computePrecioMayoreo(precioMenudeo: number): number {
  if (!Number.isFinite(precioMenudeo) || precioMenudeo <= 0) return 0
  return Math.round(precioMenudeo * MAYOREO_FACTOR * 100) / 100
}

export interface PosterTechLine {
  cpu: string
  ram: string
  ssd: string
}

/** Lineas tipo "Procesador: Intel Core i5-1135G7" o "RAM: 8GB". */
function extractLabeledSpecs(descripcion: string): { cpu?: string; ram?: string; storage?: string } {
  const out: { cpu?: string; ram?: string; storage?: string } = {}
  const lines = descripcion.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  for (const line of lines) {
    let m = line.match(/^(?:procesador|cpu)\s*[:：]\s*(.+)$/i)
    if (m?.[1]) out.cpu = m[1].trim()
    m = line.match(/^(?:ram|memoria(?:\s*ram)?)\s*[:：]\s*(.+)$/i)
    if (m?.[1]) out.ram = m[1].trim()
    m = line.match(
      /^(?:almacenamiento|disco|ssd|storage|interna|capacidad)\s*[:：]\s*(.+)$/i
    )
    if (m?.[1]) out.storage = m[1].trim()
  }
  const blob = descripcion.replace(/\s+/g, " ")
  if (!out.cpu) {
    const inline = blob.match(/(?:procesador|cpu)\s*[:：]\s*([^;*|]+)/i)
    if (inline?.[1]) out.cpu = inline[1].trim()
  }
  if (!out.ram) {
    const inline = blob.match(/(?:ram|memoria)\s*[:：]\s*([^;*|]+)/i)
    if (inline?.[1]) out.ram = inline[1].trim()
  }
  if (!out.storage) {
    const inline = blob.match(
      /(?:almacenamiento|disco|ssd|storage|interna)\s*[:：]\s*([^;*|]+)/i
    )
    if (inline?.[1]) out.storage = inline[1].trim()
  }
  return out
}

function extractCpuModelFromText(full: string): string | null {
  const t = full
  const patterns: RegExp[] = [
    /Intel\s+Core(?:\s+Ultra)?\s+i\d+(?:-\d{4}[A-Z]*)?/i,
    /Intel\s+Pentium[^,\n]{0,40}/i,
    /Intel\s+Celeron[^,\n]{0,40}/i,
    /AMD\s+Ryzen\s*(?:\d|\s)+\s*[\dA-Za-z+.-]*/i,
    /Qualcomm\s+Snapdragon\s*[\d\w]+/i,
    /MediaTek\s+[\w\d]+/i,
    /Apple\s+(?:M\d|M\d\s+Pro|M\d\s+Max|M\d\s+Ultra)(?:\s+chip)?/i,
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (m?.[0]) return m[0].replace(/\s+/g, " ").trim()
  }
  return null
}

function extractRamFromBlob(d: string): string | null {
  const low = d.toLowerCase()
  const m = low.match(
    /(\d+)\s*(gb|tb)\s*(?:de\s*)?(?:ram|memoria|lpddr\d*|unified\s*memory|unificada)/i
  )
  if (m) {
    const u = m[2].toLowerCase() === "tb" ? "TB" : "GB"
    return `${m[1]} ${u} RAM`
  }
  const m2 = d.match(/(\d+)\s*(gb|g)\s*(?:ram|mem)/i)
  if (m2) return `${m2[1]} GB RAM`
  return null
}

function extractStorageFromBlob(d: string): string | null {
  const low = d.toLowerCase()
  if (/nvme/i.test(low)) {
    const cap = d.match(/(\d+)\s*(gb|tb)\s*(?:ssd|nvme)?/i)
    if (cap) return `${cap[1]} ${cap[2].toUpperCase()} SSD NVMe`
    return "SSD NVMe"
  }
  if (/\bhdd\b/i.test(low) || /disco\s*duro/i.test(low)) {
    const cap = d.match(/(\d+)\s*(gb|tb)/i)
    if (cap) return `${cap[1]} ${cap[2].toUpperCase()} HDD`
    return "Disco duro (HDD)"
  }
  const m = d.match(/(\d+)\s*(gb|tb)\s*(?:ssd|interna|almacenamiento|de\s*almacenamiento)/i)
  if (m) return `${m[1]} ${m[2].toUpperCase()} interna`
  return null
}

/**
 * Ficha tecnica: prioriza datos explicitos en descripcion/capacidad (BD), luego patrones en texto.
 */
export function inferPosterTechSpecs(producto: ProductoRow): PosterTechLine {
  const nombre = producto.nombre ?? ""
  const rawDesc = producto.descripcion ?? ""
  const rawName = `${nombre} ${rawDesc}`
  const d = rawDesc
  const dLower = d.toLowerCase()
  const cap = (producto.almacenamiento || producto.capacidad || "").trim()

  const labeled = extractLabeledSpecs(d)

  let cpu = labeled.cpu?.trim()
  if (!cpu) {
    cpu = extractCpuModelFromText(rawName) ?? undefined
  }
  if (!cpu) {
    if (/i9\b/i.test(rawName)) cpu = "Intel Core i9 (o equivalente)"
    else if (/i7\b/i.test(rawName)) cpu = "Intel Core i7 (o equivalente)"
    else if (/i5\b/i.test(rawName)) cpu = "Intel Core i5 (o equivalente)"
    else if (/i3\b/i.test(rawName)) cpu = "Intel Core i3 (o equivalente)"
    else if (/ryzen\s*9/i.test(dLower)) cpu = "AMD Ryzen 9 (o equivalente)"
    else if (/ryzen\s*7/i.test(dLower)) cpu = "AMD Ryzen 7 (o equivalente)"
    else if (/ryzen\s*5/i.test(dLower)) cpu = "AMD Ryzen 5 (o equivalente)"
    else if (/snapdragon/i.test(rawName)) cpu = "Qualcomm Snapdragon"
    else if (/mediatek|dimensity/i.test(rawName)) cpu = "MediaTek / Dimensity"
    else cpu = "Ver descripcion o consultar en tienda"
  }

  let ram = labeled.ram?.trim()
  let ramUsedCap = false
  if (!ram) ram = extractRamFromBlob(d) ?? undefined
  if (!ram && cap) {
    const mCap = cap.match(/^(\d+)\s*(gb|g)\s*$/i)
    if (mCap) {
      const n = Number(mCap[1])
      if (n > 0 && n <= 64) {
        ram = `${mCap[1]} GB RAM`
        ramUsedCap = true
      }
    }
  }
  if (!ram) ram = "-"

  let ssd = labeled.storage?.trim()
  if (!ssd && cap && !ramUsedCap) {
    ssd = cap
  }
  if (!ssd) ssd = extractStorageFromBlob(d) ?? undefined
  if (!ssd) {
    if (/nvme/i.test(dLower)) ssd = "SSD NVMe"
    else if (/\bhdd\b/i.test(dLower)) ssd = "Disco duro (HDD)"
    else if (cap && !ramUsedCap) ssd = `${cap} · almacenamiento`
    else ssd = "Ver descripcion o consultar en tienda"
  }

  return { cpu, ram, ssd }
}

export { normalizePhoneForWhatsApp as normalizeWhatsAppPhoneDigits } from "@/lib/whatsapp-utils"

export function buildWhatsAppPosterMessage(
  tallerNombre: string,
  productoNombre: string,
  precioMenudeoFormatted: string,
): string {
  const tn = tallerNombre.trim() || "su taller"
  const pn = (productoNombre || "este producto").trim()
  return `Hola ${tn}, me interesa el ${pn} que vi por ${precioMenudeoFormatted}. ¿Me dan mas info?`
}

export function buildWhatsAppApiSendUrl(phoneDigits: string, message: string): string {
  return buildWhatsAppSendUrl(phoneDigits, message)
}

/**
 * URL absoluta para `<img>` en poster (html2canvas / impresion).
 * Devuelve null si no hay imagen almacenada para evitar peticiones 400
 * a rutas canonicas que no existen (productos sin foto).
 */
export function resolvePosterProductImageUrl(producto: ProductoRow): string | null {
  const stored = producto.imagen_url
  if (!stored || !String(stored).trim()) return null
  return getInventoryPublicUrl(stored)
}


