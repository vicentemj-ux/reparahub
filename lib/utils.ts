import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Decodifica un string si tiene caracteres URL-encoded (%20, %2C, etc).
 * Defensivo para casos donde la DB pueda tener valores encoded por error.
 */
export function decodeIfEncoded(str: string): string {
  if (!str) return str
  if (str.includes("%20") || str.includes("%2C") || str.includes("%")) {
    try {
      return decodeURIComponent(str)
    } catch {
      return str
    }
  }
  return str
}
