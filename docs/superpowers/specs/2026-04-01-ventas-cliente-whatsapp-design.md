# Spec: Integración de Cliente y WhatsApp en Cierre de Ventas (POS)

**Fecha:** 2026-04-01
**Estado:** Aprobado
**Contexto:** Sistema de recompensas futuro requiere vincular ventas a clientes con FK real.

---

## Objetivo

Profesionalizar el flujo de cierre de ventas integrando selección de cliente (nombre + teléfono + ID) y envío de ticket resumen por WhatsApp al finalizar una venta.

---

## 1. Base de Datos

**Migración:** `supabase/migrations/[timestamp]_ventas_cliente_id_telefono.sql`

```sql
ALTER TABLE ventas
  ADD COLUMN cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  ADD COLUMN cliente_telefono TEXT;

CREATE INDEX idx_ventas_cliente_id ON ventas(taller_id, cliente_id)
  WHERE cliente_id IS NOT NULL;
```

- Ambas columnas nullable — ventas sin cliente siguen funcionando.
- `ON DELETE SET NULL` protege la integridad si se borra un cliente.
- Índice `(taller_id, cliente_id)` preparado para queries del sistema de recompensas: `SUM(total) WHERE taller_id = X AND cliente_id = Y`.

---

## 2. Backend — `lib/actions/ventas.ts`

### `CrearVentaInput` (campos nuevos)
```typescript
cliente_id?: string        // UUID del cliente si se seleccionó de la DB
cliente_telefono?: string  // teléfono normalizado para WhatsApp
```

### `crearVenta()`
Persiste `cliente_id` y `cliente_telefono` en el INSERT a `ventas`. Sin cambios en lógica de stock, caja, ni movimientos.

### `VentaCreada` (campo nuevo en respuesta)
```typescript
cliente_telefono?: string  // devuelto para que SuccessModal genere el link sin estado extra
```

---

## 3. POS — `app/dashboard/ventas/page.tsx`

### Estado nuevo
```typescript
const [clienteId, setClienteId]           = useState<string | null>(null)
const [clienteTelefono, setClienteTelefono] = useState("")
// clienteNombre ya existe — sigue funcionando
```

### Reemplazo del Input de cliente
El `<Input value={clienteNombre}>` libre se reemplaza por `<ClientAutocomplete compact onClientFound={handler}>` (componente existente, ya usado en Reparaciones).

### Handler `onClientFound`
```typescript
// Cliente seleccionado de la DB
onClientFound={(payload) => {
  if (payload) {
    setClienteNombre(payload.nombre)
    setClienteId(payload.id)
    setClienteTelefono(payload.telefono)
  } else {
    setClienteNombre("")
    setClienteId(null)
    setClienteTelefono("")
  }
}}
```

### Llamada a `crearVenta()`
```typescript
await crearVenta({
  ...camposExistentes,
  cliente_nombre: clienteNombre.trim() || undefined,
  cliente_id: clienteId || undefined,
  cliente_telefono: clienteTelefono || undefined,
})
```

### Limpieza post-venta
Al cerrar el modal de éxito, limpiar `clienteNombre`, `clienteId` y `clienteTelefono` junto con el carrito.

### "VENTA GENERAL"
Si el usuario no selecciona cliente, `clienteId = null` y `clienteTelefono = ""`. La venta se guarda con `cliente_nombre = null`, `cliente_id = null`, `cliente_telefono = null`. Identificado como "VENTA GENERAL" en el modal.

---

## 4. `SuccessModal` — `components/dashboard/ventas/SuccessModal.tsx`

### Props nuevos
```typescript
tallerNombre: string       // para el mensaje de WhatsApp
// venta.cliente_telefono ya llega dentro de VentaCreada
```

### Botones (reemplaza los actuales)
| Botón | Variante | Acción |
|---|---|---|
| IMPRIMIR | outline azul | lógica actual de iframe/ticket |
| ENVIAR POR WHATSAPP | `bg-emerald-600 hover:bg-emerald-700` | ver lógica abajo |
| CERRAR | outline slate | cierra modal |

El botón "Etiqueta" se elimina.

### Estado interno del modal
```typescript
const [phoneInput, setPhoneInput]     = useState("")  // para fallback manual
const [showPhoneInput, setShowPhoneInput] = useState(false)
```

### Función `handleSendWhatsApp(phone?: string)`
```typescript
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  return digits.startsWith("52") ? digits : `52${digits}`
}

function handleSendWhatsApp(phone?: string) {
  const resolved = phone ?? venta.cliente_telefono
  if (!resolved) {
    setShowPhoneInput(true)
    return
  }
  const nombre = venta.cliente_nombre ?? "cliente"
  const items = venta.items
    .map((i) => `  • ${i.descripcion} x${i.cantidad} — $${(i.precio_unitario * i.cantidad).toLocaleString("es-MX")}`)
    .join("\n")
  const msg = [
    `¡Hola ${nombre}! 📱 Gracias por tu compra en ${tallerNombre}.`,
    `📄 Folio: ${venta.folio ?? venta.id}`,
    `📦 Artículos:\n${items}`,
    `💰 Total: $${venta.total.toLocaleString("es-MX")}`,
    `¡Esperamos verte pronto! 🚀`,
  ].join("\n")
  const url = `https://api.whatsapp.com/send?phone=${normalizePhone(resolved)}&text=${encodeURIComponent(msg)}`
  window.open(url, "_blank")
}
```

### Fallback (Venta General)
Al presionar ENVIAR POR WHATSAPP sin teléfono, el modal muestra inline:
```
[Input: "Número de WhatsApp (10 dígitos)"] [Enviar →]
```
Al confirmar, llama `handleSendWhatsApp(phoneInput)`.

---

## 5. Archivos a modificar/crear

| Archivo | Operación |
|---|---|
| `supabase/migrations/[ts]_ventas_cliente_id_telefono.sql` | CREAR |
| `lib/actions/ventas.ts` | EDITAR — `CrearVentaInput`, `crearVenta()`, `VentaCreada` |
| `app/dashboard/ventas/page.tsx` | EDITAR — estado, ClientAutocomplete, limpieza |
| `components/dashboard/ventas/SuccessModal.tsx` | EDITAR — botones, WhatsApp, fallback |

---

## 6. Invariantes

- Ninguna venta existente se rompe (columnas nullable, sin DEFAULT).
- El botón de WhatsApp nunca envía a número vacío.
- El teléfono se normaliza antes de construir la URL (strip non-digits, prefijo 52).
- `ClientAutocomplete` en el POS no es obligatorio — la venta puede procesarse sin cliente.
