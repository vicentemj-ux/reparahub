export const PRO_FEATURES_TEMP_DISABLED = false

export const PRO_DISABLED_ROUTES = [
  "/dashboard/bitacora-visitas",
  "/dashboard/chat",
  "/dashboard/cotizaciones",
  "/dashboard/compras",
  "/dashboard/utilidad",
  "/dashboard/mercado",
  "/dashboard/reportes",
  "/dashboard/servicios",
] as const

/**
 * Kill-switch del escaner de codigos de barras (PRO).
 * Cambiar a `false` en commit para apagar el feature en produccion sin redeploy.
 * Usado por: BarcodeScannerModal, ProBarcodeButton, canUseBarcodeScanner().
 */
export const BARCODE_SCANNER_ENABLED = true
