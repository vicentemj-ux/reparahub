"use client"

export interface VentaEnEspera {
  id: string
  timestamp: number
  cartItems: {
    id: string
    nombre: string
    precio: number
    costo: number
    cantidad: number
    isSpecial: boolean
    productoId?: string
    referencia?: string
    esEquipo?: boolean
    imeiSerie?: string
    color?: string
    condicion?: string
    capacidad?: string
    marca?: string
    modelo?: string
    procesador?: string
    ram?: string
    almacenamiento?: string
  }[]
  clienteNombre: string
  clienteId: string | null
  clienteTelefono: string
  descuentoAplicado: number
  metodoPago: string
  montoEfectivo: string
  montoTarjeta: string
  montoTransferencia: string
}

const STORAGE_KEY = "reparahub_ventas_en_espera"

export function getVentasEnEspera(): VentaEnEspera[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as VentaEnEspera[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function guardarVentaEnEspera(venta: VentaEnEspera): void {
  if (typeof window === "undefined") return
  const existing = getVentasEnEspera()
  existing.push(venta)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

export function eliminarVentaEnEspera(id: string): void {
  if (typeof window === "undefined") return
  const existing = getVentasEnEspera()
  const filtered = existing.filter((v) => v.id !== id)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export function recuperarVentaEnEspera(id: string): VentaEnEspera | null {
  const existing = getVentasEnEspera()
  return existing.find((v) => v.id === id) ?? null
}
