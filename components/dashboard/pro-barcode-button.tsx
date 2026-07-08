"use client"

import { useEffect, useState } from "react"
import { Camera, Crown } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BarcodeScannerModal } from "@/components/dashboard/barcode-scanner-modal"
import { canUseBarcodeScanner, type BarcodeScannerAccess } from "@/lib/actions/scanner-gate-prisma"

export type ProBarcodeButtonProps = {
  /** Callback que recibe el codigo detectado o ingresado manualmente. */
  onScan: (code: string) => void
  /** Tooltip cuando esta enabled. Default: "Escanear codigo de barras o QR". */
  enabledTooltip?: string
  /** Tooltip cuando esta disabled por plan. Default: "Funcion PRO · Mejora tu plan". */
  disabledTooltip?: string
  /** Tamano del icono. Default: h-3.5 w-3.5. */
  iconSize?: "xs" | "sm" | "md"
  /** Tamano del boton. `default` = h-9 w-9 (icono suelto). `compact` = h-7 w-7 (inline en input). */
  buttonSize?: "default" | "compact"
  /** aria-label del boton. Default: "Escanear codigo de barras o QR". */
  ariaLabel?: string
  /** className adicional para el boton. */
  className?: string
}

const ICON_CLASS = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
}

const BUTTON_SIZE_CLASS = {
  default: "h-9 w-9",
  compact: "h-8 w-8",
}

/**
 * Boton de escaneo de codigos de barras con gate PRO.
 *
 * Comportamiento:
 * - Siempre se renderiza (descubribilidad + upsell).
 * - Si el tenant es PRO/Trial y el feature flag esta activo: enabled, abre scanner.
 * - Si el tenant es Normal: disabled, badge "PRO", toast con CTA al upgrade.
 * - Si el feature flag esta apagado: disabled sin upsell (kill-switch).
 */
export function ProBarcodeButton({
  onScan,
  enabledTooltip = "Escanear codigo de barras o QR",
  disabledTooltip = "Funcion PRO · Mejora tu plan",
  iconSize = "sm",
  buttonSize = "default",
  ariaLabel = "Escanear codigo de barras o QR",
  className,
}: ProBarcodeButtonProps) {
  const [access, setAccess] = useState<BarcodeScannerAccess | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void canUseBarcodeScanner().then((res) => {
      if (!cancelled) setAccess(res)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleClick = () => {
    if (access?.canScan) {
      setScannerOpen(true)
      return
    }
    if (access?.reason === "feature_disabled") {
      toast.error("El escaner de codigos esta temporalmente desactivado.", {
        description: "Contacta al administrador del sistema.",
      })
      return
    }
    // reason === "not_pro" | "error" | null (aun chequeando)
    toast({
      title: "Funcion exclusiva de PLAN PRO",
      description: "Mejora tu plan para usar el escaner de codigos con la camara del dispositivo.",
      variant: "info",
    })
  }

  const isPro = access?.canScan === true
  const iconCls = ICON_CLASS[iconSize]
  const sizeCls = BUTTON_SIZE_CLASS[buttonSize]

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleClick}
              aria-label={ariaLabel}
              className={`relative ${sizeCls} rounded-full text-slate-500 hover:bg-slate-100 active:bg-slate-200 hover:text-slate-900 ${
                isPro ? "" : "opacity-70"
              } ${className ?? ""}`}
            >
              <Camera className={iconCls} aria-hidden />
              {!isPro ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Crown className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                </span>
              ) : null}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            {isPro ? enabledTooltip : disabledTooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isPro ? (
        <BarcodeScannerModal
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onScan={onScan}
        />
      ) : null}
    </>
  )
}
