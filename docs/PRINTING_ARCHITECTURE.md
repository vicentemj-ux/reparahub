# ReparaHub Printing Architecture Reference

## Thermal Ticket Formats (80mm / 72mm usable area)

Pure inline styles for maximum POS driver compatibility, monospaced typography for data columns, high contrast.

### 1. RepairIntakeTicket (Order Intake)
**Purpose:** Client receipt of device handoff. The initial contract.
**Trigger:** Registering a new repair at the counter (success modal).
**Key Data:** Folio, customer contact, physical device specs (Brand/Model/Serial), cosmetic conditions (scratches, dents), customer-reported fault, and legal terms & conditions.

### 2. RepairPaymentTicket (Repair Payment/Deposit)
**Purpose:** Record a partial financial movement tied to a service order.
**Trigger:** Customer leaving advance money for parts or partial payment.
**Key Data:** Order folio, deposit ID, highlighted deposit amount, payment method, previous balance breakdown, new remaining balance, cashier signature.

### 3. RepairDeliveryTicket (Delivery & Warranty Ticket)
**Purpose:** Service receipt, repair sales note, and legal warranty policy.
**Trigger:** Delivering repaired device to customer, marking order "Completed".
**Key Data:** Order summary, technical solution applied, strict tabular breakdown of parts used vs labor, exact warranty expiration date, promissory note/clause of conformity with physical signature line.

### 4. PosSaleTicket (POS Sale Ticket)
**Purpose:** Direct counter sale receipt for stock items or accessories.
**Trigger:** Pressing "Charge" in the Point of Sale (POS) module.
**Key Data:** Product list (Qty, Description, Unit Price, Subtotal), tax breakdown (IVA), total paid, payment method, change given, thank-you message.

### 5. CashRegisterCutTicket (Cash Register Cut / Shift Close)
**Purpose:** Accounting administrative report for business fund audit.
**Trigger:** Ending a shift or closing the day by cashier or administrator.
**Key Data:** Register ID, cashier name, opening/closing hours, income balance grouped by method (Cash, Card, Transfer), income segregation (POS vs Repairs), expense log (expenses/withdrawals), final audit balance (Expected Total vs Actual Total = conditionally formatted Difference).

---

## Thermal Label Formats (Transfer $2\times1"$ / $50.8 \times 25.4\text{ mm}$)

Strict defensive truncation (character limits) and millimeter space optimization due to the very small adhesive paper size.

### 6. AccessoryLabel (POS Barcode Label)
**Purpose:** Commercial stock identification on display cases or hooks for quick scanning.
**Trigger:** Receiving merchandise from suppliers or from the accessories inventory module.
**Key Data:** Product name safely truncated to one line (max 22 chars), readable barcode or SKU, and sale price in large font (14px Black) strategically positioned to the right.

### 7. DeviceInventoryLabel (Stock Device Label)
**Purpose:** Internal control, traceability, and logistics for owned devices (purchases, refurbished, exchanges).
**Trigger:** Registering a device in the device inventory module.
**Key Data:** Device brand and model, Serial Number (S/N) or IMEI in highly visible monospace font, internal inventory barcode, and device status badge (e.g., Refurbished / For Parts).

### 8. RepairOrderLabel (Service Order Label)
**Purpose:** Immediate physical identification of customer device in the technician lab.
**Trigger:** Printing the intake order at the counter (stuck directly on the customer device chassis).
**Key Data:** Compact 5-line design: highlighted Folio, intake date, customer name/phone, reported technical fault, and last line in parallel: device lock password (LOCK) alongside initially authorized budget (PREP).

---

## Migration Checklist

If during a migration prompt you see the AI trying to:
- Put prices in repair labels → Wrong template
- Forget the warranty clause in delivery → Use RepairDeliveryTicket
- Use Tailwind classes in print content → Must use inline styles
- Access DB in printing components → Pass data via props only

Reference this document to correct in one shot.
