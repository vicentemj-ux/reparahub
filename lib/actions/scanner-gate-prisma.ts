import { BARCODE_SCANNER_ENABLED } from "@/lib/runtime-flags"
import { getEsUsuarioPro } from "@/lib/actions/auth-prisma"

export type BarcodeScannerAccess = {
  canScan: boolean
  reason?: "not_pro" | "feature_disabled" | "error"
}

/**
 * Determina si el tenant actual puede usar el escaner de codigos de barras.
 *
 * Reglas (en orden de evaluacion):
 *  1. Si `BARCODE_SCANNER_ENABLED === false`, no se puede usar (kill-switch).
 *  2. Si el tenant no es PRO ni Trial activo, no se puede usar.
 *  3. Si todo OK, puede usar.
 *
 * Usado por ProBarcodeButton para decidir si renderiza enabled o disabled+upsell.
 */
export async function canUseBarcodeScanner(): Promise<BarcodeScannerAccess> {
  try {
    if (!BARCODE_SCANNER_ENABLED) {
      return { canScan: false, reason: "feature_disabled" }
    }
    const isPro = await getEsUsuarioPro()
    if (!isPro) {
      return { canScan: false, reason: "not_pro" }
    }
    return { canScan: true }
  } catch (e) {
    console.error("[scanner-gate] canUseBarcodeScanner:", e)
    return { canScan: false, reason: "error" }
  }
}
