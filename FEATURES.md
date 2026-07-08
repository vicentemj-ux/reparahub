# FEATURES · ReparaHub

Arquitectura transversal, reglas de negocio críticas y garantías transaccionales del core contable y multi-tenant.

> **Audiencia:** equipo Full Stack externo.  
> **Propósito:** auditar seguridad, consistencia ACID, aislamiento entre tenants y correctitud del motor contable.

---

## 1. Arquitectura Multi-Tenant y Aislamiento de Datos

### 1.1 Modelo

Single-Database PostgreSQL con aislamiento a nivel de fila **implementado exclusivamente en código de aplicación** (no hay RLS en las tablas de Prisma).

Cada tabla del dominio lleva el campo `tenantId` (mapeado a columna SQL `taller_id`). Ninguna consulta puede omitir este filtro sin exponer datos cruzados entre talleres.

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  NextAuth    │     │  JWT (stateless) │     │  Prisma       │
│  Credentials │────>│  tenantId claim  │────>│  WHERE clause │
│  Google OAuth│     │  role, isAdmin   │     │  tenantId=?   │
└─────────────┘     └──────────────────┘     └──────────────┘
```

### 1.2 Flujo de Autenticación y Extracción del Tenant

#### 1.2.1 JWT de NextAuth (sesión web)

- **Origen:** `lib/auth.ts:197-227` — callback `jwt()` copia `tenantId`, `tenantName`, `isAdmin`, `role`, `sessionVersion` del objeto `user` (populado por `CredentialsProvider.authorize` o el callback `signIn` de Google OAuth) hacia el token JWT.
- **Sesión:** el callback `session()` (line 229) expone esos campos en `session.user`.
- **Fallback por email:** si el provider no trae `tenantId`, el callback `jwt()` busca el usuario en la DB por email (`prisma.user.findFirst`) y extrae `tenantId` desde la relación `User.tenant`.

#### 1.2.2 JWT de Supabase (stack dual legacy)

- **Firma:** `lib/supabase/tenant-client.ts:20-55` usa `jose.SignJWT` con `SUPABASE_JWT_SECRET`.
- **Payload:** `{ iss: "supabase", role: "authenticated", taller_id }`.
- **Expiración:** 1 hora, regenerado por petición.
- **Propósito:** alimentar el cliente Supabase para consultas a buckets de storage y endpoints legacy que aún no migraron a Prisma.

#### 1.2.3 Obtención del Tenant en Server Actions

| Función | Archivo | Comportamiento |
|---|---|---|
| `getCurrentTallerId()` | `lib/auth/get-current-taller.ts:7-35` | Lee cookie `tallerId` (30 días). Si no existe, llama `getCurrentTenant()`, persiste en cookie y retorna. Si no hay tenant, redirige a `/auth/login`. |
| `getTenantIdOrThrow()` | `lib/auth/tenant-utils.ts:6-33` | Mismo patrón pero **lanza** `Error("Sesion invalida")` en lugar de redirigir. Uso exclusivo en Server Actions. |
| `createCurrentTenantClient()` | `lib/supabase/tenant-client.ts:68-72` | Combina `getCurrentTallerId()` + `createTenantClient(tallerId)`. Retorna un cliente Supabase scoped al tenant. |

### 1.3 Prohibición de `createAdminClient()`

- **Definición:** `lib/supabase/admin.ts:10-23` — crea un cliente Supabase con `service_role` key.
- **Regla:** Su uso está estrictamente prohibido fuera de:
  - Rutas `/admin/*` (super-admin dashboard).
  - Endpoints públicos sin sesión (ej. `/api/visitas/detect` para detección de kiosco).
- **Consecuencia de violación:** bypassea todo aislamiento entre tenants y expone datos cruzados.

### 1.4 Garantías y Brechas de Aislamiento

| Aspecto | Estado | Detalle |
|---|---|---|
| **Filtro obligatorio en queries** | ✅ Implementado | ~40+ cláusulas `where: { tenantId: tallerId }` por archivo de acciones. Verificación visual en code review. |
| **Middleware global de Prisma** | ❌ No implementado | No existe un `prisma.$use` o `$extends` que inyecte `tenantId` automáticamente. Cada Server Action debe hacerlo explícitamente. |
| **Validación en updates/deletes** | ⚠️ Parcial | `updateMany` sin filtro de tenant podría actualizar registros de otro taller (ej. `prisma.caja.updateMany` en `ventas-prisma.ts:470`). |
| **RLS en PostgreSQL** | ❌ Eliminado | Se migró de Supabase a Prisma. No existen `CREATE POLICY` en las migraciones SQL. |
| **Cookies vs JWT** | ✅ Dual | La cookie `tallerId` cachea 30 días. El JWT expira según la sesión de NextAuth. El código verifica ambos. |

> **Recomendación para auditoría:** Implementar un middleware Prisma (`$extends`) que inyecte `where: { tenantId }` en todas las queries del modelo, con opción de bypass explícito para operaciones admin (`{ bypassTenantScope: true }`). Esto eliminaría el riesgo de filtros olvidados.

---

## 2. Lógica Contable de Caja y Consistencia Append-Only

### 2.1 Principios Rectores

1. **Inmutabilidad:** Ninguna operación financiera ejecuta `DELETE` físico. Las ventas, reparaciones y gastos anulados cambian su estado a `"anulado"`/`"cancelado"` y generan MovimientoCaja compensatorio cuando corresponde.
2. **Append-Only en Caja:** `caja.total_efectivo` almacena el **bruto histórico** de ingresos POS en efectivo. Los gastos operativos y de reparación **NO decrementan** este campo sobre la marcha (commit `cec2fd6` corrigió esta doble resta).
3. **Diferimiento del cálculo real:** Los gastos y abonos se registran como `MovimientoCaja` con montos positivos o negativos. El saldo final se computa **en vivo** al momento del corte mediante agregación de movimientos.

### 2.2 Modelo de Datos

```prisma
model Caja {
  id                 String   @id @default(cuid())
  tenantId           String   @map("taller_id")
  montoInicial       Decimal  @default(0)         // Efectivo físico al abrir
  montoCierre        Decimal?                     // Conteo físico al cerrar
  totalEfectivo      Decimal  @default(0)         // INCREMENTAL. Neto acumulado de ventas PDV en efectivo
  totalTarjeta       Decimal  @default(0)         // Acumulado de ventas con tarjeta
  totalTransferencia Decimal  @default(0)         // Acumulado de ventas por transferencia
  totalVentas        Int      @default(0)         // Contador de transacciones PDV
  estado             String   @default("abierta") // "abierta" | "cerrada"
  fechaApertura      DateTime @default(now())
  fechaCierre        DateTime?
  numeroCorte        Int?     // Secuencial por tenant
  @@map("caja")
}

model MovimientoCaja {
  id             String   @id @default(cuid())
  tenantId       String   @map("taller_id")
  cajaId         String?  @map("caja_id")
  tipo           String   // enum: venta_pdv | gasto | gasto_reparacion
                          //       | anticipo_reparacion | liquidacion_reparacion
                          //       | devolucion_cancelacion | liquidacion
  referenciaId   String?  // ID de la entidad origen (venta, reparación, gasto)
  descripcion    String?
  monto          Decimal  // POSITIVO para ingresos. NEGATIVO para gastos/devoluciones.
  metodoPago     String?  // efectivo | tarjeta | transferencia
  fecha          DateTime @default(now())
  folio          String?
  vendedorNombre String?  @map("vendedor_nombre")
  @@map("movimientos_caja")
}
```

### 2.3 Operaciones y su Impacto Contable

| Operación | Archivo | `caja.*` | `movimientos_caja` | Stock |
|---|---|---|---|---|
| **CrearVenta** (POS) | `ventas-prisma.ts:808-890` | `totalEfectivo += (montoEfectivo - cambio)`; `totalTarjeta += montoTarjeta`; `totalTransferencia += montoTransferencia`; `totalVentas++` | Insert `tipo: "venta_pdv"`, `monto: total` | `producto.stockActual -= cantidad` (loop) |
| **AnularVenta** | `ventas-prisma.ts:1260-1282` | **NO toca caja** | **NO inserta** | **NO restaura** |
| **AddGastoOperativo** (efectivo) | `gastos-prisma.ts:279-294` | **NO toca caja** | Insert `tipo: "gasto"`, `monto: -|monto|` | N/A |
| **AddGastoReparacion** (efectivo) | `gastos-prisma.ts:155-173` | **NO toca caja** | Insert `tipo: "gasto_reparacion"`, `monto: -|monto|` | N/A |
| **RegistrarAbono** | `repairs-prisma.ts:1110-1181` | **NO toca caja** | Insert `tipo: "anticipo_reparacion"`, `monto: +monto` | N/A |
| **CancelarReparacion** | `repairs-prisma.ts:1450-1568` | **NO toca caja** | **NO inserta** (los gastos previos quedan) | Restaura 1 unidad por gasto refacción |
| **CerrarCaja** | `ventas-prisma.ts:465-477` | Setea `estado="cerrada"`, `montoCierre`, `fechaCierre` | Solo lectura para cálculo de saldo | N/A |

### 2.4 Fórmula del Saldo Final (Corte)

```text
saldo_final = monto_inicial
            + caja.total_efectivo
            + SUM(movimientos WHERE tipo IN ('anticipo_reparacion','liquidacion_reparacion','liquidacion')
                   AND metodo_pago = 'efectivo')
            - SUM(ABS(monto) FROM movimientos WHERE tipo IN ('gasto','gasto_reparacion'))
```

Implementada en:
- **Vista previa del corte:** `ventas-prisma.ts:1059-1118` (`getCajaConDetalle()`).
- **UI de corte:** `app/dashboard/corte/page.tsx:75` (misma fórmula duplicada).
- **WhatsApp al dueño:** `lib/corte-owner-whatsapp.ts:42-46` (consume `corte.saldo_final`).

#### 2.4.1 Inconsistencia conocida

El listado histórico de cortes (`mapHistorialCajaItem` en `ventas-prisma.ts:321-323`) usa una fórmula simplificada:

```ts
saldo_final: montoInicial + totalEfectivo  // OMITE abonos y gastos
```

Esto hace que el `saldo_final` histórico **no coincida** con el `saldo_final` del corte en vivo. Impacta reportes retrospectivos.

### 2.5 Brechas de Atomicidad

| Brecha | Archivo | Riesgo |
|---|---|---|
| `crearVenta()` no usa `prisma.$transaction` | `ventas-prisma.ts:808-890` | Una falla entre la venta y el movimiento de caja deja la DB inconsistente. |
| Stock decrement sin guard `stockActual >= cantidad` | `ventas-prisma.ts:853-858` | Dos ventas concurrentes sobre el mismo producto pueden vender última unidad duplicada (stock negativo silencioso). |
| `anularVenta` no genera reversa contable | `ventas-prisma.ts:1260-1282` | El efectivo contabilizado en `caja.totalEfectivo` nunca se descuenta. La caja queda inflada hasta el cierre (si el usuario hace ajuste manual). |
| `cancelarReparacion` no reversa MovimientoCaja de gastos | `repairs-prisma.ts:1450-1568` | Los gastos de refacción quedan en el corte como costo sin beneficio. |

> **Recomendación para auditoría:**
> 1. Envolver `crearVenta` en `prisma.$transaction([...])` con isolation level `Serializable` para garantizar atomicidad.
> 2. Agregar `stockActual: { gte: item.cantidad }` en el `where` del `update` de producto para evitar sobreventa.
> 3. Implementar `anularVentaConReversa()` que cree un MovimientoCaja con `monto: -original` y restaure stock atómicamente.

---

## 3. Feature de Caja Rápida (Modo Fast-Checkout / Kiosco)

### 3.1 Arquitectura del Flujo

El modo Kiosco/POS rápido está diseñado para operación en tablet (iPad 8, Safari) con mínimos toques:

```
[Carrito] --> [Seleccionar método de pago] --> [Tapear billetes rápidos]
                                                --> [Confirmar venta]
                                                --> [Éxito: imprimir / WhatsApp opcional]
```

### 3.2 Presets de Billetes (CashPresetConfig)

Definidos en `lib/actions/settings-prisma.ts:53-56`:

```ts
interface CashPresetConfig {
  moneda: string    // "MXN" | "UYU"
  valores: number[] // ej. [20, 50, 100, 200, 500, 1000]
}
```

**Valores por defecto:**
- `MXN`: `[20, 50, 100, 200, 500, 1000]`
- `UYU`: `[20, 50, 100, 200, 500, 1000, 2000]`

Almacenados dentro de `configuracionTaller.printSettings.posKiosco.cash_presets`.

**Comportamiento actual:**  
La función `applyCashPreset(value)` en `app/dashboard/ventas/page.tsx:563-569` realiza una **suma acumulativa** (`current + value`). El cajero tapea los billetes que el cliente entrega y el sistema acumula el total recibido. No existe un algoritmo greedy que sugiera denominaciones óptimas para alcanzar el total del carrito.

```ts
function applyCashPreset(value: number) {
  const current = parseFloat(montoEfectivo.replace(",", ".")) || 0
  const next = Math.round((current + value) * 100) / 100
  setMetodoPago("efectivo")
  setMontoEfectivo(String(next))
}
```

**Rendering condicional:**  
`components/dashboard/ventas/CartPanel.tsx:287-302` — aparece solo cuando `kioskMode === true && metodoPago === "efectivo"`. Grid de 3 columnas, cada preset es un botón.

### 3.3 Persistencia de Venta (Flujo Atómico Actual)

El flujo `handleConfirmSale()` en `app/dashboard/ventas/page.tsx:652-726` es **secuencial síncrono** (no hay fire-and-forget ni async no bloqueante):

```ts
// PASO 1: Servidor — crear venta con descuento de stock
const { venta, error: err } = await crearVenta({ ... })   // AWAIT

// PASO 2: Refrescar datos locales
refresh()                   // caja totals
refreshProductos()          // stock

// PASO 3: Abrir modal de éxito (render condicional)
setVentaCreada(venta)
clearCart()
```

**Después del modal** (interacción del usuario):
- **WhatsApp:** `SuccessModal.tsx:110-168` — `window.open(url, "_blank")` solo cuando el usuario hace clic en el botón.
- **Impresión:** `SuccessModal.tsx:63-68` — `useReactToPrint` sobre iframe, activado por clic del usuario.
- **Tauri:** `printTicketRasterDirecto` y `printTicketDirecto` son stubs no operativos (reservados para v1.2 desktop).

### 3.4 Brechas y Optimizaciones Pendientes

| Aspecto | Estado Actual | Recomendación |
|---|---|---|
| **Denominación automática** | ❌ No implementada | Incorporar algoritmo greedy que compute `cambio = recibido - total` y sugiera denominaciones de vuelto. |
| **Cobro en un solo tap** | ⚠️ Parcial | El preset acelera el ingreso pero no resuelve `cambio`. El cajero debe calcular mentalmente. |
| **WhatsApp automático** | ❌ No implementado | Sería útil un flag `kiosco_whatsapp_step: "final"` que dispare envío asíncrono (`void sendWhatsApp()`) tras confirmar venta. |
| **Impresión automática** | ❌ No implementado | Similar a WhatsApp, podría dispararse tras confirmación si hay impresora configurada. |
| **Atomicidad transaccional** | ❌ Sin $transaction | Ver sección 2.5. |

### 3.5 Diagrama de Secuencia (Estado Deseado)

```
 Cajero                    Frontend                      Servidor (Prisma)              Cliente
    |                          |                               |                            |
    |-- [Tapea producto] ----->|                               |                            |
    |                          |-- [Agrega al carrito] ------->|                            |
    |                          |                               |                            |
    |-- [Tapea Efectivo] ----->|                               |                            |
    |                          |-- applyCashPreset(value) ---->| (todo local)               |
    |                          |   (acumula recibido)          |                            |
    |                          |                               |                            |
    |-- [Tapea Confirmar] ---->|                               |                            |
    |                          |-- await crearVenta() -------->|                            |
    |                          |                               |-- VENTA INSERT             |
    |                          |                               |-- STOCK DECREMENT (loop)   |
    |                          |                               |-- CAJA INCREMENT            |
    |                          |                               |-- MOVIMIENTO_CAJA INSERT    |
    |                          |<-- { venta, error } ---------|                            |
    |                          |                               |                            |
    |                          |-- [SuccessModal]              |                            |
    |                          |   (opcional: void sendWA())   |                            |
    |                          |   (opcional: void print())    |                            |
    |                          |                               |                            |
    |<-- [Modal Éxito] -------|                               |                            |
```

---

## Apéndice A: Resumen de Riesgos para Auditoría

| # | Riesgo | Severidad | Archivo(s) Afectados |
|---|---|---|---|
| 1 | Falta de middleware tenant-scope en Prisma | Alta | Todos los `*-prisma.ts` |
| 2 | `crearVenta` sin transacción atómica | Alta | `ventas-prisma.ts:808-890` |
| 3 | Stock decrement sin guard condicional | Alta | `ventas-prisma.ts:853-858` |
| 4 | Anulación de venta sin reversa contable | Media | `ventas-prisma.ts:1260-1282` |
| 5 | Cancelación de reparación sin reversa de gastos | Media | `repairs-prisma.ts:1450-1568` |
| 6 | Fórmula de saldo_final inconsistente (histórico vs vivo) | Baja | `ventas-prisma.ts:321-323` vs `1059-1118` |
| 7 | `createAdminClient()` sin logging de uso | Media | `lib/supabase/admin.ts` |
| 8 | Ausencia de auto-denominación en fast-checkout | Baja | `app/dashboard/ventas/page.tsx:563-569` |
