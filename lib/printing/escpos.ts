"use client"

import type { PosSaleTicketData } from "@/components/printing"
import type { RepairIntakeTicketData } from "@/components/printing"

interface BusinessInfo {
  name: string
  phone?: string
  terminosGarantia?: string
  mensajeDespedida?: string
}

const ESC = "\x1b"
const GS = "\x1d"

const INIT = `${ESC}@`
const ALIGN_LEFT = `${ESC}a\x00`
const ALIGN_CENTER = `${ESC}a\x01`
const BOLD_ON = `${ESC}E\x01`
const BOLD_OFF = `${ESC}E\x00`
const SIZE_NORMAL = `${GS}!\x00`
const SIZE_DOUBLE = `${GS}!\x11`
const CUT = `${GS}V\x00`

function sanitize(text: unknown): string {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function money(value: number | null | undefined): string {
  return `$${Number(value ?? 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return sanitize(value)
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function line(width: number, char = "-") {
  return char.repeat(width)
}

function wrap(text: string, width: number): string[] {
  const clean = sanitize(text)
  if (!clean) return []
  const words = clean.split(" ")
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    if (!current) {
      current = word
    } else if (`${current} ${word}`.length <= width) {
      current += ` ${word}`
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function kv(label: string, value: string, width: number): string {
  const left = sanitize(label)
  const right = sanitize(value)
  const available = Math.max(1, width - left.length)
  if (right.length >= available) return `${left} ${right}`.slice(0, width)
  return `${left}${" ".repeat(width - left.length - right.length)}${right}`
}

function encodeBase64(raw: string): string {
  const bytes = new TextEncoder().encode(raw)
  let binary = ""
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize))
  }
  return btoa(binary)
}

function header(business: BusinessInfo, title: string, width: number): string[] {
  return [
    ALIGN_CENTER,
    BOLD_ON,
    SIZE_DOUBLE,
    sanitize(business.name || "ReparaHub"),
    SIZE_NORMAL,
    BOLD_OFF,
    business.phone ? `Tel: ${sanitize(business.phone)}` : "",
    line(width),
    BOLD_ON,
    sanitize(title),
    BOLD_OFF,
    line(width),
    ALIGN_LEFT,
  ].filter(Boolean)
}

function footer(business: BusinessInfo, width: number): string[] {
  const msg = sanitize(business.mensajeDespedida || "Gracias por su preferencia")
  return [
    line(width),
    ALIGN_CENTER,
    ...wrap(msg, width),
    "\n",
  ]
}

export function buildPosSaleEscposBase64(input: {
  data: PosSaleTicketData
  business: BusinessInfo
  paperWidth?: 58 | 80
}): string {
  const width = input.paperWidth === 58 ? 32 : 48
  const { data, business } = input
  const subtotal = data.items.reduce((sum, i) => sum + i.precioUnitario * i.cantidad, 0)
  const metodo = sanitize(data.metodoPago).toLowerCase()
  const lines: string[] = [
    INIT,
    ...header(business, "Comprobante de Venta", width),
    `Folio: ${sanitize(data.folio || data.id)}`,
    `Fecha: ${formatDate(data.createdAt)}`,
    `Cliente: ${sanitize(data.clienteNombre || "Venta General")}`,
    data.clienteTelefono ? `Tel: ${sanitize(data.clienteTelefono)}` : "",
    line(width),
  ].filter(Boolean)

  for (const item of data.items) {
    const name = `${item.categoria ? `${item.categoria} ` : ""}${item.descripcion}`
    const amount = money(item.precioUnitario * item.cantidad)
    const first = `${item.cantidad}x ${sanitize(name)}`
    for (const [index, wrapped] of wrap(first, width - amount.length - 1).entries()) {
      lines.push(index === 0 ? kv(wrapped, amount, width) : wrapped)
    }
    if (item.referencia) lines.push(`  Ref: ${sanitize(item.referencia)}`)
  }

  lines.push(line(width))
  lines.push(kv("Subtotal", money(subtotal), width))
  if ((data.descuento ?? 0) > 0) lines.push(kv("Descuento", `-${money(data.descuento)}`, width))
  lines.push(BOLD_ON, kv("TOTAL", money(data.total), width), BOLD_OFF)
  lines.push(kv("Metodo", metodo || "efectivo", width))
  if (metodo === "mixto") {
    if ((data.montoEfectivo ?? 0) > 0) lines.push(kv("Efectivo", money(data.montoEfectivo), width))
    if ((data.montoTarjeta ?? 0) > 0) lines.push(kv("Tarjeta", money(data.montoTarjeta), width))
    if ((data.montoTransferencia ?? 0) > 0) lines.push(kv("Transfer.", money(data.montoTransferencia), width))
  }
  if (data.referenciaPago) lines.push(`Ref: ${sanitize(data.referenciaPago)}`)
  if ((data.cambio ?? 0) > 0) {
    lines.push(kv("Pago con", money(data.total + (data.cambio ?? 0)), width))
    lines.push(kv("Cambio", money(data.cambio), width))
  }
  lines.push(...footer(business, width), CUT)
  return encodeBase64(lines.join("\n"))
}

export function buildRepairIntakeEscposBase64(input: {
  data: RepairIntakeTicketData
  business: BusinessInfo
  paperWidth?: 58 | 80
}): string {
  const width = input.paperWidth === 58 ? 32 : 48
  const { data, business } = input
  const totalServicios = (data.servicios ?? []).reduce((sum, s) => sum + s.precio * s.cantidad, 0)
  const presupuesto = Math.max(Number(data.estimatedPrice ?? 0), totalServicios)
  const anticipo = Number(data.deposit ?? 0)
  const saldo = Math.max(0, presupuesto - anticipo)
  const lines: string[] = [
    INIT,
    ...header(business, "Orden de Servicio", width),
    BOLD_ON,
    ALIGN_CENTER,
    `#${sanitize(data.folio)}`,
    BOLD_OFF,
    ALIGN_LEFT,
    `Fecha: ${sanitize(data.date)}`,
    `Cliente: ${sanitize(data.customerName || "-")}`,
    data.customerPhone ? `Tel: ${sanitize(data.customerPhone)}` : "",
    line(width),
    `Equipo: ${sanitize(`${data.deviceType ? `${data.deviceType} ` : ""}${data.deviceBrand} ${data.deviceModel}`)}`,
    data.imei ? `IMEI: ${sanitize(data.imei)}` : "",
    data.color ? `Color: ${sanitize(data.color)}` : "",
    line(width),
    "Falla reportada:",
    ...wrap(data.reportedFault || "Sin descripcion inicial", width),
  ].filter(Boolean)

  if (data.checklistIngreso?.encendido) {
    lines.push(line(width), `Enciende: ${sanitize(data.checklistIngreso.encendido)}`)
  }
  if (data.checklistIngreso?.observacionesEsteticas) {
    lines.push("Obs:", ...wrap(data.checklistIngreso.observacionesEsteticas, width))
  }
  if (data.servicios?.length) {
    lines.push(line(width), "Servicios:")
    for (const s of data.servicios) {
      lines.push(kv(`${s.nombre}${s.cantidad > 1 ? ` x${s.cantidad}` : ""}`, money(s.precio * s.cantidad), width))
    }
  }
  lines.push(line(width))
  lines.push(kv("Presupuesto", money(presupuesto), width))
  lines.push(kv("Anticipo", money(anticipo), width))
  lines.push(BOLD_ON, kv("Saldo", money(saldo), width), BOLD_OFF)
  if (business.terminosGarantia) {
    lines.push(line(width), "Terminos:", ...wrap(business.terminosGarantia, width))
  }
  lines.push(line(width), ALIGN_CENTER, "Firma del cliente", "\n\n________________________", ...footer(business, width), CUT)
  return encodeBase64(lines.join("\n"))
}

