"use client"

import { createRoot, type Root } from "react-dom/client"
import { CartelExhibicionTemplate } from "@/components/printing"
import { buildCartelFeatures } from "@/components/dashboard/inventory-label-utils"
import type { ProductoRow } from "@/lib/actions/productos-prisma"
import { formatPeso } from "@/lib/utils/currency"

/**
 * Abre el dialogo de impresion con un cartel 4x6 (iframe + React).
 */
export function printCartelExhibicion(
  producto: ProductoRow,
  branding: { tallerNombre: string; logoUrl: string | null }
): void {
  const iframe = document.createElement("iframe")
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;"
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = win?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: 4in 6in; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style>
</head><body><div id="cartel-root"></div></body></html>`

  doc.open()
  doc.write(html)
  doc.close()

  const mount = doc.getElementById("cartel-root")
  if (!mount) {
    document.body.removeChild(iframe)
    return
  }

  const features = buildCartelFeatures(producto)
  const precio = formatPeso(Number(producto.precio_venta ?? 0))
  const businessName = (branding.tallerNombre || "Mi taller").trim()

  let root: Root | null = createRoot(mount)
  root.render(
    <CartelExhibicionTemplate
      nombreProducto={producto.nombre || "Producto"}
      features={features}
      precioContadoFormatted={precio}
      businessName={businessName}
      logoUrl={branding.logoUrl}
    />
  )

  const cleanup = () => {
    try {
      root?.unmount()
    } catch {
      /* noop */
    }
    root = null
    if (document.body.contains(iframe)) document.body.removeChild(iframe)
  }

  setTimeout(() => {
    win?.focus()
    win?.print()
    setTimeout(cleanup, 1000)
  }, 350)
}

