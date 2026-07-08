# Ventas POS: Integración Cliente + WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar selección de cliente (con FK a `clientes`) en el POS y botón de envío de ticket resumen por WhatsApp en el modal de venta exitosa.

**Architecture:** 4 cambios en cascada — migración DB → backend types → POS state/UI → modal. Cada tarea es independiente y compilable; ninguna rompe funcionalidad existente porque todos los campos nuevos son opcionales/nullable.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), TypeScript, Tailwind CSS, shadcn/ui, `ClientAutocomplete` existente en `components/dashboard/client-autocomplete.tsx`.

---

## Archivos modificados

| Archivo | Operación |
|---|---|
| `supabase/migrations/20260401000001_ventas_cliente_id_telefono.sql` | CREAR |
| `lib/actions/ventas.ts` | EDITAR — interfaces + INSERT + return |
| `app/dashboard/ventas/page.tsx` | EDITAR — estado, import, clearCart, selector, crearVenta call |
| `components/dashboard/ventas/SuccessModal.tsx` | EDITAR — botones, WhatsApp logic, fallback input |

---

## Task 1: Migración de base de datos

**Archivos:**
- Crear: `supabase/migrations/20260401000001_ventas_cliente_id_telefono.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/20260401000001_ventas_cliente_id_telefono.sql
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS cliente_id       UUID REFERENCES clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cliente_telefono TEXT;

CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id
  ON ventas(taller_id, cliente_id)
  WHERE cliente_id IS NOT NULL;
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Ejecutar el SQL directamente en el SQL Editor del dashboard de Supabase (proyecto `reparahub`), o via CLI si está configurado:
```bash
supabase db push
```
Verificar que la tabla `ventas` ahora tenga las columnas `cliente_id` y `cliente_telefono` en Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260401000001_ventas_cliente_id_telefono.sql
git commit -m "feat(db): agregar cliente_id y cliente_telefono a tabla ventas"
```

---

## Task 2: Backend — `lib/actions/ventas.ts`

**Archivos:**
- Modificar: `lib/actions/ventas.ts` (líneas 378–399, 549–566, 672–679)

- [ ] **Step 1: Actualizar `CrearVentaInput` (línea 378)**

Reemplazar el bloque completo de la interfaz:

```typescript
// ANTES (líneas 378-388):
export interface CrearVentaInput {
  caja_id: string | null
  cliente_nombre?: string
  total: number
  metodo_pago: "efectivo" | "tarjeta" | "transferencia" | "mixto"
  monto_efectivo: number
  monto_tarjeta: number
  monto_transferencia: number
  cambio: number
  items: DetalleVentaInput[]
}

// DESPUÉS:
export interface CrearVentaInput {
  caja_id: string | null
  cliente_nombre?: string
  cliente_id?: string
  cliente_telefono?: string
  total: number
  metodo_pago: "efectivo" | "tarjeta" | "transferencia" | "mixto"
  monto_efectivo: number
  monto_tarjeta: number
  monto_transferencia: number
  cambio: number
  items: DetalleVentaInput[]
}
```

- [ ] **Step 2: Actualizar `VentaCreada` (línea 390)**

```typescript
// ANTES (líneas 390-399):
export interface VentaCreada {
  id: string
  folio: string
  total: number
  metodo_pago: string
  cambio: number
  created_at: string
  items: DetalleVentaInput[]
  cliente_nombre?: string
}

// DESPUÉS:
export interface VentaCreada {
  id: string
  folio: string
  total: number
  metodo_pago: string
  cambio: number
  created_at: string
  items: DetalleVentaInput[]
  cliente_nombre?: string
  cliente_telefono?: string
}
```

- [ ] **Step 3: Agregar `cliente_id` y `cliente_telefono` al INSERT (línea ~556)**

```typescript
// ANTES:
.insert({
  taller_id: tallerId,
  caja_id: input.caja_id || null,
  folio,
  cliente_nombre: input.cliente_nombre || null,
  total: input.total,
  metodo_pago: input.metodo_pago,
  monto_efectivo: input.monto_efectivo,
  monto_tarjeta: input.monto_tarjeta,
  monto_transferencia: input.monto_transferencia,
  cambio: input.cambio,
})

// DESPUÉS:
.insert({
  taller_id: tallerId,
  caja_id: input.caja_id || null,
  folio,
  cliente_nombre: input.cliente_nombre || null,
  cliente_id: input.cliente_id || null,
  cliente_telefono: input.cliente_telefono || null,
  total: input.total,
  metodo_pago: input.metodo_pago,
  monto_efectivo: input.monto_efectivo,
  monto_tarjeta: input.monto_tarjeta,
  monto_transferencia: input.monto_transferencia,
  cambio: input.cambio,
})
```

- [ ] **Step 4: Agregar `cliente_telefono` al return de `crearVenta` (línea ~672)**

```typescript
// ANTES:
return {
  venta: {
    id: ventaId,
    folio,
    cambio: input.cambio,
    created_at: ventaData.created_at as string,
    items: input.items,
    cliente_nombre: input.cliente_nombre,
  },
  error: null,
}

// DESPUÉS:
return {
  venta: {
    id: ventaId,
    folio,
    total: input.total,
    metodo_pago: input.metodo_pago,
    cambio: input.cambio,
    created_at: ventaData.created_at as string,
    items: input.items,
    cliente_nombre: input.cliente_nombre,
    cliente_telefono: input.cliente_telefono,
  },
  error: null,
}
```

- [ ] **Step 5: Verificar que TypeScript no marque errores**

```bash
npx tsc --noEmit
```
Resultado esperado: sin output (sin errores nuevos).

- [ ] **Step 6: Commit**

```bash
git add lib/actions/ventas.ts
git commit -m "feat(ventas): agregar cliente_id y cliente_telefono a CrearVentaInput y VentaCreada"
```

---

## Task 3: POS — `app/dashboard/ventas/page.tsx`

**Archivos:**
- Modificar: `app/dashboard/ventas/page.tsx` (líneas ~1, ~114-116, ~306-314, ~389-399, ~668-675)

- [ ] **Step 1: Agregar import de `ClientAutocomplete`**

Al inicio del archivo, junto a los otros imports de components, añadir:

```typescript
import { ClientAutocomplete, type ClientAutocompletePayload } from "@/components/dashboard/client-autocomplete"
```

- [ ] **Step 2: Agregar estado `clienteId` y `clienteTelefono` (después de línea 116)**

```typescript
// ANTES (línea 114-116):
// ── Cart state ──────────────────────────────────────────────────────────────
const [cartItems, setCartItems] = useState<CartItem[]>([])
const [clienteNombre, setClienteNombre] = useState("")

// DESPUÉS:
// ── Cart state ──────────────────────────────────────────────────────────────
const [cartItems, setCartItems] = useState<CartItem[]>([])
const [clienteNombre, setClienteNombre] = useState("")
const [clienteId, setClienteId] = useState<string | null>(null)
const [clienteTelefono, setClienteTelefono] = useState("")
```

- [ ] **Step 3: Actualizar `clearCart()` (línea ~306)**

```typescript
// ANTES:
function clearCart() {
  setCartItems([])
  setClienteNombre("")
  setMetodoPago("efectivo")
  setMontoEfectivo("")
  setMontoTarjeta("")
  setMontoTransferencia("")
  setSaleError("")
}

// DESPUÉS:
function clearCart() {
  setCartItems([])
  setClienteNombre("")
  setClienteId(null)
  setClienteTelefono("")
  setMetodoPago("efectivo")
  setMontoEfectivo("")
  setMontoTarjeta("")
  setMontoTransferencia("")
  setSaleError("")
}
```

- [ ] **Step 4: Reemplazar el campo `<Input>` de cliente con `<ClientAutocomplete>` (línea ~668-675)**

```tsx
// ANTES:
{/* Client field */}
<Input
  aria-label="Nombre del cliente"
  placeholder="Nombre del cliente (opcional)..."
  value={clienteNombre}
  onChange={(e) => setClienteNombre(e.target.value)}
  className="text-sm"
/>

// DESPUÉS:
{/* Client selector — nombre + teléfono */}
<ClientAutocomplete
  compact
  onClientFound={(payload: ClientAutocompletePayload | null) => {
    if (payload) {
      setClienteNombre(payload.nombre)
      setClienteId(payload.id || null)
      setClienteTelefono(payload.telefono)
    } else {
      setClienteNombre("")
      setClienteId(null)
      setClienteTelefono("")
    }
  }}
/>
```

- [ ] **Step 5: Actualizar la llamada a `crearVenta()` (línea ~389)**

```typescript
// ANTES:
const { venta, error: err } = await crearVenta({
  caja_id: caja?.id ?? null,
  cliente_nombre: clienteNombre.trim() || undefined,
  total,
  metodo_pago: metodoPago,
  monto_efectivo: efectivo,
  monto_tarjeta: tarjeta,
  monto_transferencia: transferencia,
  cambio,
  items,
})

// DESPUÉS:
const { venta, error: err } = await crearVenta({
  caja_id: caja?.id ?? null,
  cliente_nombre: clienteNombre.trim() || undefined,
  cliente_id: clienteId ?? undefined,
  cliente_telefono: clienteTelefono || undefined,
  total,
  metodo_pago: metodoPago,
  monto_efectivo: efectivo,
  monto_tarjeta: tarjeta,
  monto_transferencia: transferencia,
  cambio,
  items,
})
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Sin output esperado.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/ventas/page.tsx
git commit -m "feat(ventas): reemplazar input cliente por ClientAutocomplete con id y teléfono"
```

---

## Task 4: `SuccessModal` — Botones WhatsApp y limpieza

**Archivos:**
- Modificar: `components/dashboard/ventas/SuccessModal.tsx` (completo, 135 líneas)

- [ ] **Step 1: Actualizar imports**

```typescript
// ANTES (línea 1-8):
"use client"

import { memo, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Printer, Tag, X } from "lucide-react"
import { TicketVentaTemplate } from "@/components/print-templates"
import type { VentaCreada } from "@/lib/actions/ventas"

// DESPUÉS:
"use client"

import { memo, useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MessageCircle, Printer, X } from "lucide-react"
import { TicketVentaTemplate } from "@/components/print-templates"
import type { VentaCreada } from "@/lib/actions/ventas"
```

- [ ] **Step 2: Agregar estado interno y funciones WhatsApp**

Después de la línea `const ticketPxWidth = tamano === "58mm" ? 205 : 288` y antes del primer `useEffect`, agregar:

```typescript
const [phoneInput, setPhoneInput] = useState("")
const [showPhoneInput, setShowPhoneInput] = useState(false)

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  return digits.startsWith("52") ? digits : `52${digits}`
}

function handleSendWhatsApp(overridePhone?: string) {
  const resolved = overridePhone ?? venta.cliente_telefono
  if (!resolved?.trim()) {
    setShowPhoneInput(true)
    return
  }
  const nombre = venta.cliente_nombre ?? "cliente"
  const itemLines = (venta.items ?? [])
    .map(
      (i) =>
        `  • ${i.descripcion} x${i.cantidad} — $${(i.precio_unitario * i.cantidad).toLocaleString("es-MX")}`,
    )
    .join("\n")
  const msg = [
    `¡Hola ${nombre}! 📱 Gracias por tu compra en ${tallerNombre}.`,
    `📄 Folio: ${venta.folio ?? venta.id}`,
    `📦 Artículos:\n${itemLines}`,
    `💰 Total: $${venta.total.toLocaleString("es-MX")}`,
    `¡Esperamos verte pronto! 🚀`,
  ].join("\n")
  const url = `https://api.whatsapp.com/send?phone=${normalizePhone(resolved)}&text=${encodeURIComponent(msg)}`
  window.open(url, "_blank", "noopener,noreferrer")
}
```

- [ ] **Step 3: Actualizar `onOpenChange` para limpiar estado al cerrar**

```tsx
// ANTES:
<Dialog open={open} onOpenChange={(next) => !next && onClose()}>

// DESPUÉS:
<Dialog
  open={open}
  onOpenChange={(next) => {
    if (!next) {
      setShowPhoneInput(false)
      setPhoneInput("")
      onClose()
    }
  }}
>
```

- [ ] **Step 4: Actualizar `DialogDescription` (eliminar referencia a "etiqueta")**

```tsx
// ANTES:
<DialogDescription className="mt-1 font-mono text-sm text-slate-500">
  {venta.folio} · Imprime el ticket o la etiqueta, o cierra para seguir cobrando.
</DialogDescription>

// DESPUÉS:
<DialogDescription className="mt-1 font-mono text-sm text-slate-500">
  {venta.folio} · Imprime el ticket, envía por WhatsApp o cierra para seguir.
</DialogDescription>
```

- [ ] **Step 5: Reemplazar el bloque de botones completo**

```tsx
// ANTES (líneas 117-130):
<div className="flex gap-3 p-5 pt-0 bg-slate-50">
  <Button variant="outline" className="flex-1 gap-2 bg-white" onClick={handlePrintTicket}>
    <Printer className="h-4 w-4" />
    Ticket
  </Button>
  <Button variant="outline" className="flex-1 gap-2 bg-white" onClick={handlePrintVentaLabel}>
    <Tag className="h-4 w-4" />
    Etiqueta
  </Button>
  <Button onClick={onClose} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
    <X className="h-4 w-4" />
    Cerrar
  </Button>
</div>

// DESPUÉS:
<div className="flex flex-col gap-3 p-5 pt-0 bg-slate-50">
  {showPhoneInput && (
    <div className="flex gap-2">
      <Input
        type="tel"
        placeholder="Número de WhatsApp (10 dígitos)"
        value={phoneInput}
        onChange={(e) => setPhoneInput(e.target.value)}
        className="flex-1 text-sm"
        autoFocus
      />
      <Button
        onClick={() => handleSendWhatsApp(phoneInput)}
        disabled={phoneInput.replace(/\D/g, "").length < 10}
        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shrink-0"
      >
        Enviar →
      </Button>
    </div>
  )}
  <div className="flex gap-3">
    <Button variant="outline" className="flex-1 gap-2 bg-white" onClick={handlePrintTicket}>
      <Printer className="h-4 w-4" />
      Imprimir
    </Button>
    <Button
      className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
      onClick={() => handleSendWhatsApp()}
    >
      <MessageCircle className="h-4 w-4" />
      WhatsApp
    </Button>
    <Button
      onClick={() => { setShowPhoneInput(false); setPhoneInput(""); onClose() }}
      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
    >
      <X className="h-4 w-4" />
      Cerrar
    </Button>
  </div>
</div>
```

- [ ] **Step 6: Eliminar `handlePrintVentaLabel` (ya no se usa)**

Borrar el bloque completo de la función `handlePrintVentaLabel` (líneas 67-82 del archivo original):

```typescript
// ELIMINAR este bloque completo:
const handlePrintVentaLabel = () => {
  const labelData = {
    kind: "venta-label" as const,
    folio: venta.folio ?? venta.id,
    clienteNombre: venta.cliente_nombre ?? null,
    items: (venta.items ?? []).map((item) => ({
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
    })),
    total: venta.total ?? 0,
    fecha: venta.created_at,
  }
  window.localStorage.setItem("printLabel", JSON.stringify(labelData))
  window.open("/print-label", "_blank", "noopener,noreferrer,width=520,height=420")
}
```

- [ ] **Step 7: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Sin output esperado.

- [ ] **Step 8: Commit final**

```bash
git add components/dashboard/ventas/SuccessModal.tsx
git commit -m "feat(ventas): refactor SuccessModal con botones WhatsApp y fallback de teléfono manual"
```

---

## Task 5: Push y verificación

- [ ] **Step 1: Push a main**

```bash
git push origin main
```

- [ ] **Step 2: Verificación manual en desarrollo**

```bash
pnpm dev
```

Flujo a probar:
1. Abrir POS (`/dashboard/ventas`)
2. Ingresar un teléfono de 10 dígitos en el selector de cliente → verificar que aparece "Cliente Frecuente" si existe
3. Agregar producto al carrito y completar venta
4. En modal de éxito:
   - Con cliente con teléfono → botón WhatsApp abre enlace directo
   - Sin cliente → botón WhatsApp muestra input manual → ingresar número → click "Enviar →" → abre enlace
5. Verificar que el botón "Etiqueta" ya no existe
6. Verificar en Supabase Table Editor que la venta guardó `cliente_id` y `cliente_telefono`
