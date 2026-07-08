/**
 * Tipos compartidos entre `lib/email/send.ts` (server actions) y
 * `lib/actions/alertas-prisma.ts` (motor de reportes y alertas).
 *
 * Este archivo NO puede tener `"use server"` porque Next.js no permite
 * exportar tipos/interfaces/objetos desde un archivo "use server" (solo
 * async functions). Por eso los tipos viven aqui y se importan desde
 * `send.ts` y `alertas-prisma.ts`.
 */

export interface AlertaStockBajoItem {
  id: string
  nombre: string
  sku: string | null
  stockActual: number
  stockMinimo: number
  categoria: string | null
}

export interface AlertaEstancadasItem {
  id: string
  folio: string
  tipoEquipo: string | null
  marca: string | null
  modelo: string | null
  estado: string
  clienteNombre: string | null
  diasSinMovimiento: number
}

export interface ReporteDiarioResumen {
  ventasTotal: number
  ventasCantidad: number
  reparacionesActivas: number
  reparacionesUrgentes: number
  productosStockBajo: number
  cajaAbierta: boolean
  cajaNumero: number | null
  cajaSaldoEsperado: number | null
  moneda: string
}
