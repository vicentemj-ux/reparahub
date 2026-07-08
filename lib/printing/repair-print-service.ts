"use client"

import { parseDirectPrintConfig, type DirectPrintConfig } from "@/lib/printing/direct-print-config"
import { DaemonPrintError } from "@/lib/printing/daemon-client"
import { getTallerSettings } from "@/lib/actions/settings-prisma"

export type PrintProvider = "web" | "daemon" | "tauri"

type PrintResult = {
  provider: PrintProvider
  usedFallback: boolean
  errorMessage?: string
}

type PrintOptions = {
  webPrint: () => void
  daemonPrint?: (config: DirectPrintConfig, tenantId: string) => Promise<void>
  directPrintConfig?: DirectPrintConfig | null
  tenantId?: string | null
  tauriPrint?: () => Promise<void>
}

export async function printWithProvider(options: PrintOptions): Promise<PrintResult> {
  const { webPrint, daemonPrint, tauriPrint } = options

  if (daemonPrint) {
    let config = options.directPrintConfig ?? null
    let tenantId = options.tenantId ?? null
    if (!config || !tenantId) {
      try {
        const { settings } = await getTallerSettings()
        config = parseDirectPrintConfig(settings?.impresion_config?.directPrint)
        tenantId = settings?.taller_id ?? null
      } catch {
        config = null
      }
    }

    if (config?.enabled) {
      try {
        await daemonPrint(config, tenantId ?? "")
        return { provider: "daemon", usedFallback: false }
      } catch (error) {
        const message =
          error instanceof DaemonPrintError
            ? error.message
            : error instanceof Error
              ? error.message
              : "No se pudo imprimir con el daemon local."
        if (!config.fallbackToWeb) {
          throw new Error(message)
        }
        webPrint()
        return { provider: "web", usedFallback: true, errorMessage: message }
      }
    }
  }

  if (tauriPrint) {
    try {
      await tauriPrint()
      return { provider: "tauri", usedFallback: false }
    } catch {
      // fallback a web
    }
  }

  webPrint()
  return { provider: "web", usedFallback: false }
}
