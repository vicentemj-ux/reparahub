/**
 * ThermalTokens.ts
 *
 * Single source of truth para tokens de diseño de impresion termica.
 * Todos los layouts y templates de components/printing/ importan de aqui.
 *
 * REGLAS PERMANENTES DE IMPRESION:
 *  - SOLO negros puros (#000000). Nada de grises, nada de colores.
 *  - Tipografia: Verdana, Tahoma o Roboto Mono exclusivamente.
 *  - Arial, Courier New, Helvetica y cualquier otra fuente esta PROHIBIDA.
 *
 * NOTA: Estos tokens son CSS-in-JS (inline styles). Los templates NUNCA
 * usan Tailwind para contenido de impresion — solo inline styles para
 * maxima compatibilidad con drivers de impresora termica.
 */

import type { CSSProperties } from "react"

// ─── Fuentes (REGLA PERMANENTE: solo Verdana, Tahoma, Roboto Mono) ────────────────

/** Fuente principal para tickets y etiquetas. Verdana / Tahoma. */
export const FONT = "Verdana, Tahoma, Geneva, sans-serif"

/** Fuente monoespaciada para montos, codigos, IMEI, serie. Roboto Mono. */
export const MONO = "Roboto Mono, monospace"

/** Fuente para etiquetas 2x1" (alias de FONT, misma familia). */
export const LABEL_FONT = "Verdana, Tahoma, Geneva, sans-serif"

// ─── Colores (REGLA PERMANENTE: solo negros puros) ───────────────────────────────

/** Negro puro — UNICO color de texto permitido en impresion termica. */
export const BLACK = "#000000"

/** Blanco para fondos. */
export const WHITE = "#ffffff"

// ─── Estilos base ─────────────────────────────────────────────────────────────────

/**
 * Estilos de nitidez extrema para impresion termica.
 * Desactiva suavizado del browser para caracteres nítidos.
 */
export const SHARP: CSSProperties = {
  WebkitFontSmoothing: "none",
  MozOsxFontSmoothing: "grayscale",
  textRendering: "optimizeSpeed",
  imageRendering: "pixelated",
  color: BLACK,
}

// ─── Pesos de fuente ──────────────────────────────────────────────────────────────

/** Peso semibold (600) — util para labels secundarios. */
export const w600: CSSProperties = { ...SHARP, fontWeight: 600, fontFamily: FONT }

/** Peso bold (700) — cuerpo de texto de tickets. */
export const w700: CSSProperties = { ...SHARP, fontWeight: 700, fontFamily: FONT }

/** Peso black (900) — encabezados de seccion y totales. */
export const w900: CSSProperties = { ...SHARP, fontWeight: 900, fontFamily: FONT }

// ─── Estilos predefinidos ─────────────────────────────────────────────────────────

/** Estilo para labels (izquierda en filas label-valor). */
export const LABEL_STYLE: CSSProperties = {
  ...w900,
  fontSize: "9px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  whiteSpace: "nowrap",
  flexShrink: 0,
}

/** Separador de lineas para tickets 80mm. */
export const DIVIDER_DASH = "- - - - - - - - - - - - - - - - - - - - -"

/** Separador de lineas para etiquetas (mas corto). */
export const LABEL_DIVIDER = "---"

// ─── Dimensiones ──────────────────────────────────────────────────────────────────

/** Ancho de area segura para tickets 80mm (72mm utiles + 3mm padding cada lado). */
export const TICKET_WIDTH = "72mm"

/** Ancho de padding horizontal para tickets. */
export const TICKET_PADDING = "0 3mm"

/** Dimensiones para etiquetas 2x1". */
export const LABEL_WIDTH = "50.8mm"
export const LABEL_HEIGHT = "25.4mm"

/** Padding para etiquetas (buffer derecho para zona no imprimible). */
export const LABEL_PADDING = "0.3mm 1.5mm 0.3mm 0.3mm"

// ─── Funciones de formato ─────────────────────────────────────────────────────────

/** Formatea un numero como moneda MXN. */
export function fmtMXN(n: number): string {
  return "$" + n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Formatea un numero como moneda MXN sin simbolo. */
export function fmtNumber(n: number): string {
  return n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Formatea una fecha ISO a formato local MX (DD/MM/YYYY HH:MM). */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Formatea un telefono a formato legible (XX) XXX-XXXX. */
export function fmtPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length <= 2) return raw
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

// ─── Mapas de labels ──────────────────────────────────────────────────────────────

/** Labels para metodos de pago. */
export const METODOS_PAGO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Pago Mixto",
}
