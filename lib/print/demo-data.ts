/**
 * Datos de demostracion para la vista previa en tiempo real del modulo IMPRENTA.
 * Cada tipo de documento tiene un mock realista para renderizar su template.
 */

import type {
  RepairIntakeTicketData,
  RepairOrderLabelProData,
  ProductSaleLabelTemplateData,
} from "@/components/printing"
import type { VentaCreada } from "@/lib/actions/ventas-prisma"

export type DocumentType = "reparacion" | "venta" | "compra" | "etiqueta" | "barras"

export interface PurchaseTicketData {
  folio: string
  fecha: string
  vendedor: string
  documento: string
  marca: string
  modelo: string
  serial: string
  imei: string
  monto: number
  condicion: string
  color: string
  capacidad: string
  observaciones: string
}

export const DEMO_REPARACION: RepairIntakeTicketData = {
  folio: "REP-00152",
  customerName: "Juan Perez Garcia",
  customerPhone: "6681234567",
  deviceModel: "iPhone 14 Pro",
  deviceBrand: "Apple",
  deviceType: "smartphone",
  imei: "35 123402 123456 7",
  color: "Morado oscuro",
  reportedFault: "No enciende, posible dano en placa logica tras caida. Cliente reporta que se apago y no respondio.",
  estimatedPrice: "2,850.00",
  deposit: "500.00",
  date: new Date().toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
  repairId: "rep-demo-123",
}

export const DEMO_VENTA: VentaCreada = {
  id: "venta-demo-456",
  folio: "V-00842",
  total: 3850.0,
  descuento: 0,
  metodo_pago: "tarjeta",
  monto_efectivo: 0,
  monto_tarjeta: 3850.0,
  monto_transferencia: 0,
  cambio: 0,
  created_at: new Date().toISOString(),
  cliente_nombre: "Maria Elena Rodriguez",
  cliente_telefono: "6689876543",
  items: [
    {
      descripcion: "Pantalla iPhone 13 Original",
      cantidad: 1,
      precio_unitario: 2850.0,
      costo_unitario: 1800.0,
      es_especial: false,
      marca: "Apple",
      modelo: "iPhone 13",
      color: "Negro",
    },
    {
      descripcion: "Mica de Cristal Templado",
      cantidad: 2,
      precio_unitario: 150.0,
      costo_unitario: 45.0,
      es_especial: false,
    },
    {
      descripcion: "Servicio de instalacion",
      cantidad: 1,
      precio_unitario: 200.0,
      costo_unitario: 0,
      es_especial: true,
    },
  ],
}

export const DEMO_COMPRA: PurchaseTicketData = {
  folio: "C-00091",
  fecha: new Date().toLocaleString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
  vendedor: "Carlos Alberto Mendez Lopez",
  documento: "INE 12345678901",
  marca: "Samsung",
  modelo: "Galaxy S23 Ultra",
  serial: "R52RA00ABCD1",
  imei: "35 890701 234567 8",
  monto: 4200.0,
  condicion: "Usado - Buen estado",
  color: "Verde",
  capacidad: "256 GB",
  observaciones: "Equipo desbloqueado de fabrica. Sin cuenta Samsung vinculada. Bateria al 87% de salud.",
}

export const DEMO_ETIQUETA: RepairOrderLabelProData = {
  kind: "repair-label-pro",
  shopName: "Reparatech",
  folio: "REP-00152",
  deviceDescription: "iPhone 14 Pro",
  customerName: "Juan Perez",
  customerPhone: "6681234567",
  reportedFault: "No enciende - dano en placa",
  estimatedBudget: 2850,
  accessCode: "PIN: 2580",
  entryDate: new Date().toISOString(),
}

export const DEMO_BARRAS: ProductSaleLabelTemplateData = {
  kind: "product-sale-label",
  shopName: "Electronica del Centro",
  deviceName: "iPhone 13 128GB",
  marca: "Apple",
  modelo: "iPhone 13",
  imei: "35 123402 123456 7",
  color: "Medianoche",
  condicion: "Seminuevo",
  capacidad: "128 GB",
  procesador: "A15 Bionic",
  ram: "4 GB",
  almacenamiento: "128 GB",
  precio: 9850.0,
  folio: "EQ-0045",
}

export function getDemoData(type: DocumentType) {
  switch (type) {
    case "reparacion":
      return DEMO_REPARACION
    case "venta":
      return DEMO_VENTA
    case "compra":
      return DEMO_COMPRA
    case "etiqueta":
      return DEMO_ETIQUETA
    case "barras":
      return DEMO_BARRAS
    default:
      return DEMO_REPARACION
  }
}
