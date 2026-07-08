"use client"

import { useEffect } from "react"

/**
 * Cierra la ventana al cerrar el dialogo de impresion (imprimir o cancelar).
 * Solo funciona en ventanas abiertas con `window.open`.
 */
export function usePrintWindowClose() {
  useEffect(() => {
    const onAfterPrint = () => {
      window.close()
    }
    window.addEventListener("afterprint", onAfterPrint)
    return () => window.removeEventListener("afterprint", onAfterPrint)
  }, [])
}
