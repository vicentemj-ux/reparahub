/**
 * components/printing/
 *
 * Sistema de impresion termica para ReparaHub.
 * Arquitectura basada en Layouts + Shared Components + Templates.
 *
 * @example
 * // Importar layout + shared
 * import { Ticket80mmLayout, BusinessHeader, Divider, Row } from "@/components/printing"
 *
 * // Importar template completo
 * import { RepairIntakeTicket } from "@/components/printing/tickets"
 *
 * // En una page/server action:
 * const data = await getRepairTicketPrintData(folio)
 * <RepairIntakeTicket data={data.repair} business={data.business} />
 */

// Layouts
export { Ticket80mmLayout } from "./layouts"
export type { Ticket80mmLayoutProps } from "./layouts"
export { Label2xLayout } from "./layouts"
export type { Label2xLayoutProps } from "./layouts"

// Shared Components
export { Divider } from "./shared"
export type { DividerProps } from "./shared"
export { Row } from "./shared"
export type { RowProps } from "./shared"
export { MoneyRow } from "./shared"
export type { MoneyRowProps } from "./shared"
export { BusinessHeader } from "./shared"
export type { BusinessHeaderProps } from "./shared"
export { TicketFooter } from "./shared"
export type { TicketFooterProps } from "./shared"

// Tokens & Utilities
export {
  FONT,
  MONO,
  LABEL_FONT,
  BLACK,
  WHITE,
  SHARP,
  w600,
  w700,
  w900,
  LABEL_STYLE,
  DIVIDER_DASH,
  LABEL_DIVIDER,
  TICKET_WIDTH,
  TICKET_PADDING,
  LABEL_WIDTH,
  LABEL_HEIGHT,
  LABEL_PADDING,
  fmtMXN,
  fmtNumber,
  fmtDate,
  fmtPhone,
  METODOS_PAGO_LABEL,
} from "./shared"

// Tickets
export { RepairIntakeTicket } from "./tickets"
export type { RepairIntakeTicketData, RepairIntakeTicketProps } from "./tickets"
export { RepairPaymentTicket } from "./tickets"
export type { RepairPaymentTicketData, RepairPaymentTicketProps } from "./tickets"
export { PosSaleTicket } from "./tickets"
export type { PosSaleTicketData, PosSaleTicketItem, PosSaleTicketProps } from "./tickets"
export { ApartadoTicket } from "./tickets"
export type { ApartadoTicketBusiness, ApartadoTicketData, ApartadoTicketKind, ApartadoTicketProps } from "./tickets"
export { RepairDeliveryTicket } from "./tickets"
export type { RepairDeliveryTicketData, RepairDeliveryTicketProps } from "./tickets"
export { CashRegisterCutTicket } from "./tickets"
export type { CashRegisterCutData, CashRegisterCutTicketProps } from "./tickets"

// Labels
export { AccessoryLabel } from "./tickets"
export type { AccessoryLabelData, AccessoryLabelProps } from "./tickets"
export { DeviceInventoryLabel } from "./tickets"
export type { DeviceInventoryLabelData } from "./tickets"
export { RepairOrderLabel } from "./tickets"
export type { RepairOrderLabelData, RepairOrderLabelProps } from "./tickets"
export { RepairOrderLabelPro } from "./tickets"
export type { RepairOrderLabelProData, RepairOrderLabelProProps } from "./tickets"
export { ProductSaleLabelTemplate } from "./tickets"
export type { ProductSaleLabelTemplateData } from "./tickets"

// Exhibition templates
export { CartelExhibicionTemplate } from "./tickets"
export type { CartelExhibicionTemplateProps } from "./tickets"
export { PosterExhibicion } from "./tickets"
export type { PosterExhibicionProps } from "./tickets"
export { TicketCompraTemplate } from "./tickets"
export type { TicketCompraTemplateProps, TicketCompraData } from "./tickets"
export { VentaLabel } from "./tickets"
export type { VentaLabelData } from "./tickets"
