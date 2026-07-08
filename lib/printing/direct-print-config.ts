"use client"

export type DirectPrintPrinterMode = "default" | "by_name"

export interface DirectPrintConfig {
  enabled: boolean
  pairingToken: string
  printerMode: DirectPrintPrinterMode
  printerName?: string
  paperWidth: 58 | 80
  fallbackToWeb: boolean
}

export const DEFAULT_DIRECT_PRINT_CONFIG: DirectPrintConfig = {
  enabled: false,
  pairingToken: "",
  printerMode: "default",
  printerName: "",
  paperWidth: 80,
  fallbackToWeb: true,
}

export function parseDirectPrintConfig(raw: unknown): DirectPrintConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_DIRECT_PRINT_CONFIG
  const source = raw as Record<string, unknown>
  const printerMode = source.printerMode === "by_name" ? "by_name" : "default"
  const paperWidth = Number(source.paperWidth) === 58 ? 58 : 80
  return {
    enabled: Boolean(source.enabled),
    pairingToken: typeof source.pairingToken === "string" ? source.pairingToken.trim() : "",
    printerMode,
    printerName: typeof source.printerName === "string" ? source.printerName.trim() : "",
    paperWidth,
    fallbackToWeb: source.fallbackToWeb !== false,
  }
}

export function directPrintConfigToPayload(config: DirectPrintConfig): Record<string, unknown> {
  return {
    enabled: Boolean(config.enabled),
    pairingToken: config.pairingToken.trim(),
    printerMode: config.printerMode === "by_name" ? "by_name" : "default",
    printerName: config.printerName?.trim() ?? "",
    paperWidth: config.paperWidth === 58 ? 58 : 80,
    fallbackToWeb: config.fallbackToWeb !== false,
  }
}

