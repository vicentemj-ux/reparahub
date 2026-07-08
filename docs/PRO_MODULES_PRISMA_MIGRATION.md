# PRO Modules: Supabase → Prisma Migration

> Estrategia por fases para migrar los 7 módulos PRO de Supabase híbrido a Prisma nativo. Cada fase es independiente y debe probarse antes de continuar.

## Reglas

1. **Zero Supabase** en código activo: `createClient`, `createCurrentTenantClient`, `createAdminClient`, `createSsrClient` prohibidos en módulos migrados.
2. **Zero `$queryRawUnsafe` / `$executeRawUnsafe`**: toda query debe usar el modelo API de Prisma, no raw SQL.
3. **Cada fase**: crear modelos en `schema.prisma` → `prisma db push` → reescribir action file(s) → actualizar imports de páginas/componentes → build → test.
4. **No borrar archivos legacy** hasta que la fase esté 100% operativa. Dejar como respaldo.
5. **Mantener compatibilidad de tipos** con componentes client-side existentes.
6. **`backend` solo existe en `prisma/schema.prisma`**: no crear tablas via raw DDL nunca más.

## Tabla de Contenido

- [Fase 1 — Servicios](#fase-1--servicios)
- [Fase 2 — Control de Utilidad](#fase-2--control-de-utilidad)
- [Fase 3 — Bitácora de Visitas](#fase-3--bitacora-de-visitas)
- [Fase 4 — Reportes](#fase-4--reportes)
- [Fase 5 — Chat Taller](#fase-5--chat-taller)
- [Fase 6 — Compras](#fase-6--compras)
- [Fase 7 — Mercado](#fase-7--mercado)
- [Checklist Final](#checklist-final)

---

## Fase 1 — Servicios

**Prioridad: Alta** — módulo pequeño, ya existe `servicios-prisma.ts` con solo 2 `$queryRawUnsafe`.

### Archivos a migrar

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `lib/actions/servicios.ts` | 238 | Legacy Supabase (CRUD completo) |
| `lib/actions/servicios-prisma.ts` | 84 | Prisma-readonly con raw SQL |
| `app/dashboard/servicios/page.tsx` | 218 | Página principal CRUD |
| `components/dashboard/servicios/ServicioModal.tsx` | 155 | Modal CRUD |
| `components/dashboard/servicios/ServiceSelector.tsx` | 158 | Selector de servicios (usa `servicios-prisma`) |

### Tablas a modelar en Prisma

```prisma
model CatalogoServicio {
  id          String   @id @default(cuid())
  tenantId    String
  nombre      String
  descripcion String?
  precio      Decimal  @db.Decimal(10, 2)
  categoria   String?
  activo      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("catalogo_servicios")
  @@index([tenantId])
}

model ReparacionServicio {
  id            String   @id @default(cuid())
  tenantId      String
  reparacionId  String
  servicioId    String?
  nombreSnapshot String  @map("nombre_snapshot")
  precioSnapshot Decimal  @db.Decimal(10, 2) @map("precio_snapshot")
  cantidad      Int      @default(1)
  createdAt     DateTime @default(now())

  tenant     Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  reparacion Reparacion @relation(fields: [reparacionId], references: [id], onDelete: Cascade)

  @@map("reparacion_servicios")
  @@index([tenantId])
  @@index([reparacionId])
}
```

### Tareas

- [ ] Agregar modelos `CatalogoServicio` y `ReparacionServicio` a `schema.prisma`
- [ ] Ejecutar `prisma db push`
- [ ] Reescribir `servicios-prisma.ts`:
  - `getServicios()` → `prisma.catalogoServicio.findMany`
  - `getServiciosReparacion()` → `prisma.reparacionServicio.findMany`
  - `createServicio()` → `prisma.catalogoServicio.create`
  - `updateServicio()` → `prisma.catalogoServicio.update`
  - `deleteServicio()` → `prisma.catalogoServicio.delete`
  - `setServiciosReparacion()` → `prisma.reparacionServicio.createMany` + deleteMany
- [ ] Actualizar `app/dashboard/servicios/page.tsx` para importar de `servicios-prisma`
- [ ] Actualizar `ServicioModal.tsx` si importa de `servicios.ts`
- [ ] `pnpm build` ✅
- [ ] Test: crear/editar/eliminar servicio, asignar a reparación

---

## Fase 2 — Control de Utilidad

**Prioridad: Media** — 1 action file, 172 líneas, solo consultas.

### Archivos a migrar

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `lib/actions/utilidad.ts` | 172 | Legacy Supabase (solo lectura) |
| `app/dashboard/utilidad/page.tsx` | 297 | Página |
| `components/dashboard/monitor-utilidad-operativa.tsx` | 490 | Componente de monitoreo |

### Consultas a reescribir

La función `getUtilidadData` consulta:
- `ventas` + `detalle_ventas` (ya existen modelos Prisma)
- `reparaciones` (ya existe)
- `reparacion_gastos` → `GastoReparacion` (ya existe)
- `bitacora_gastos` → `GastoOperativo` (ya existe)

**No necesita nuevos modelos Prisma.** Solo reescribir las queries.

### Tareas

- [ ] Reescribir `utilidad.ts` como `lib/actions/utilidad-prisma.ts`:
  - Reemplazar todas las llamadas Supabase con `prisma.venta.findMany`, `prisma.gastoReparacion.findMany`, etc.
  - Usar `include` y `select` para joins relacionales
- [ ] Actualizar `app/dashboard/utilidad/page.tsx` para importar de `utilidad-prisma`
- [ ] `pnpm build` ✅
- [ ] Test: abrir página de utilidad, verificar cálculos

---

## Fase 3 — Bitácora de Visitas

**Prioridad: Media** — 1 action file, 231 líneas, 6 funciones.

### Archivos a migrar

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `lib/actions/bitacora-visitas.ts` | 231 | Legacy Supabase |
| `app/dashboard/bitacora-visitas/page.tsx` | 403 | Página |
| `components/visitas/visita-detector.tsx` | 161 | Detector SSE |
| `components/visitas/encuesta-visita-modal.tsx` | 154 | Encuesta |
| `components/visitas/visita-toast.tsx` | 64 | Toast notificaciones |
| `lib/utils/visitas.ts` | 27 | Utilidad pura (no tocar) |
| `hooks/use-visitas-sse.ts` | 100 | SSE hook (no tocar) |

### Tablas a modelar en Prisma

```prisma
model Visita {
  id               String   @id @default(cuid())
  tenantId         String
  clienteNombre    String?  @map("cliente_nombre")
  clienteTelefono  String?  @map("cliente_telefono")
  motivo           String
  descripcion      String?
  estado           String   @default("activa")
  fechaLlegada     DateTime @default(now()) @map("fecha_llegada")
  fechaSalida      DateTime? @map("fecha_salida")
  atendidoPor      String?  @map("atendido_por")
  encuestaAtendida Boolean  @default(false) @map("encuesta_atendida")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("bitacora_visitas")
  @@index([tenantId])
  @@index([tenantId, fechaLlegada])
}
```

Además, la tabla `camara_config` (usada por `getCamaraConfig` / `updateCamaraConfig`):

```prisma
model CamaraConfig {
  id        String   @id @default(cuid())
  tenantId  String   @unique
  rtspUrl   String?  @map("rtsp_url")
  tipo      String?  @default("hikvision")
  activa    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("camara_config")
}
```

### Tareas

- [ ] Agregar modelos `Visita` y `CamaraConfig` a `schema.prisma`
- [ ] Ejecutar `prisma db push`
- [ ] Reescribir `bitacora-visitas.ts` como `lib/actions/bitacora-visitas-prisma.ts`:
  - `getVisitas()` → `prisma.visita.findMany` con filtros y paginación
  - `getVisitasPendientesCount()` → `prisma.visita.count`
  - `responderEncuestaVisita()` → `prisma.visita.update`
  - `marcarVisitaSalida()` → `prisma.visita.update`
  - `verificarVisitasPendientesCierre()` → `prisma.visita.count`
  - `getCamaraConfig()` → `prisma.camaraConfig.findFirst`
  - `updateCamaraConfig()` → `prisma.camaraConfig.upsert`
- [ ] Actualizar imports en página y componentes
- [ ] `pnpm build` ✅
- [ ] Test: registrar visita, marcar salida, responder encuesta

---

## Fase 4 — Reportes

**Prioridad: Media** — 1 action file, 311 líneas, consultas complejas.

### Archivos a migrar

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `lib/actions/reportes.ts` | 311 | Legacy Supabase (solo lectura, query compleja) |
| `app/dashboard/reportes/page.tsx` | 605 | Página |

### Consultas a reescribir

La función `getReportesData` consolida datos de:
- `reparaciones` → `Reparacion` (ya existe)
- `ventas` → `Venta` (ya existe)
- `movimientos_caja` → `MovimientoCaja` (ya existe)

**No necesita nuevos modelos Prisma.**

### Tareas

- [ ] Reescribir `reportes.ts` como `lib/actions/reportes-prisma.ts`:
  - Usar `prisma.reparacion.aggregate`, `prisma.venta.aggregate`, `prisma.movimientoCaja.groupBy`
  - Para queries de rango de fechas, usar `where: { createdAt: { gte, lte } }`
- [ ] Actualizar `app/dashboard/reportes/page.tsx` para importar de `reportes-prisma`
- [ ] `pnpm build` ✅
- [ ] Test: abrir reportes, filtrar por fechas, verificar totales

---

## Fase 5 — Chat Taller

**Prioridad: Media-baja** — 1 action file, 157 líneas, usa `taller_users` y `workshop_messages`.

### Archivos a migrar

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `lib/actions/chat.ts` | 157 | Legacy Supabase |
| `app/dashboard/chat/page.tsx` | 156 | Página |
| `components/dashboard/chat/types.ts` | 20 | Tipos |
| `components/dashboard/chat/chat-shell.tsx` | 25 | Shell |
| `components/dashboard/chat/chat-sidebar.tsx` | 85 | Sidebar |
| `components/dashboard/chat/chat-header.tsx` | 40 | Header |
| `components/dashboard/chat/chat-input.tsx` | 49 | Input |
| `components/dashboard/chat/message-list.tsx` | 31 | Lista |
| `components/dashboard/chat/message-bubble.tsx` | 45 | Burbuja |
| `components/dashboard/chat/empty-state.tsx` | 20 | Empty state |

### Tablas a modelar en Prisma

```prisma
model WorkshopMessage {
  id        String   @id @default(cuid())
  tenantId  String
  senderId  String   @map("sender_id")
  content   String
  createdAt DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("workshop_messages")
  @@index([tenantId])
  @@index([tenantId, createdAt])
}
```

Nota: `taller_users` y `miembros_taller` ya están cubiertos por los modelos `User` y `Account` en Prisma.

### Tareas

- [ ] Agregar modelo `WorkshopMessage` a `schema.prisma`
- [ ] Ejecutar `prisma db push`
- [ ] Reescribir `chat.ts` como `lib/actions/chat-prisma.ts`:
  - `getChatMembers()` → `prisma.user.findMany` (ya existe en Prisma)
  - `getChatCurrentUser()` → `prisma.user.findFirst` o JWT user info
  - `getWorkshopMessages()` → `prisma.workshopMessage.findMany`
  - `sendWorkshopMessage()` → `prisma.workshopMessage.create`
  - `debugChatMembers()` → `prisma.user.findMany` + `prisma.account.findMany`
- [ ] Actualizar imports en página y componentes
- [ ] `pnpm build` ✅
- [ ] Test: enviar mensaje, ver mensajes, ver miembros

---

## Fase 6 — Compras

**Prioridad: Baja** — módulo grande, ya tiene `compras-prisma.ts` pero con 29 raw SQL calls. Requiere migrar 4+ tablas.

### Archivos a migrar

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `lib/actions/compras.ts` | 705 | Legacy Supabase |
| `lib/actions/compras-prisma.ts` | 521 | Prisma con raw SQL (20 `$queryRawUnsafe` + 9 `$executeRawUnsafe`) |
| `lib/actions/compras-usado.ts` | 142 | Legacy Supabase |
| `lib/actions/compras-usado-prisma.ts` | 156 | Prisma con raw SQL (2 + 3) |
| `app/dashboard/compras/page.tsx` | 276 | Lista |
| `app/dashboard/compras/[id]/page.tsx` | 5 | Server wrapper |
| `app/dashboard/compras/[id]/view.tsx` | 532 | Detalle |
| `app/dashboard/compras/nueva/page.tsx` | 471 | Nueva orden |
| `app/dashboard/compras/usados/page.tsx` | 250 | Usados lista |
| `app/dashboard/compras/registrar-usado/page.tsx` | 313 | Registrar usado |
| `components/dashboard/compras/ProveedoresModal.tsx` | 238 | Modal |
| `components/dashboard/compras/ReporteModal.tsx` | 106 | Reporte |

### Tablas a modelar en Prisma

```prisma
model Proveedor {
  id         String   @id @default(cuid())
  tenantId   String
  nombre     String
  telefono   String?
  email      String?
  direccion  String?
  notas      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("proveedores")
  @@index([tenantId])
}

model OrdenCompra {
  id           String         @id @default(cuid())
  tenantId     String
  folio        String
  proveedorId  String?        @map("proveedor_id")
  estado       String         @default("borrador")
  total        Decimal        @default(0) @db.Decimal(12, 2)
  notas        String?
  creadoPor    String?        @map("creado_por")
  recibidoPor  String?        @map("recibido_por")
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  tenant    Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  proveedor Proveedor?         @relation(fields: [proveedorId], references: [id])
  detalles  DetalleOrdenCompra[]

  @@map("ordenes_compra")
  @@index([tenantId])
}

model DetalleOrdenCompra {
  id          String   @id @default(cuid())
  ordenId     String   @map("orden_id")
  productoId  String?  @map("producto_id")
  descripcion String
  cantidad    Int
  precioUnitario Decimal @db.Decimal(12, 2) @map("precio_unitario")
  subtotal    Decimal  @db.Decimal(12, 2)

  orden    OrdenCompra @relation(fields: [ordenId], references: [id], onDelete: Cascade)

  @@map("detalle_orden_compra")
  @@index([ordenId])
}

model CompraUsada {
  id            String   @id @default(cuid())
  tenantId      String
  tipoEquipo    String?  @map("tipo_equipo")
  marca         String?
  modelo        String?
  imeiSerie     String?  @map("imei_serie")
  costo         Decimal  @db.Decimal(10, 2)
  proveedor     String?
  vendedor      String?
  metodoPago    String?  @map("metodo_pago")
  notas         String?
  createdAt     DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("compras_usadas")
  @@index([tenantId])
}
```

### Tareas

- [ ] Agregar modelos `Proveedor`, `OrdenCompra`, `DetalleOrdenCompra`, `CompraUsada` a `schema.prisma`
- [ ] Ejecutar `prisma db push`
- [ ] Reescribir `compras-prisma.ts`:
  - Eliminar todos los `$queryRawUnsafe`/`$executeRawUnsafe`
  - Usar `prisma.ordenCompra.findMany/create/update/delete` con `include: { detalles, proveedor }`
  - `prisma.proveedor.findMany/create/update/delete`
  - `prisma.producto.findMany` (ya existe) para selector de productos
- [ ] Reescribir `compras-usado-prisma.ts`:
  - Eliminar raw SQL, usar `prisma.compraUsada.findMany/create`
- [ ] Pages ya importan de `-prisma` → solo build y test
- [ ] `pnpm build` ✅
- [ ] Test: crear orden de compra, recibir, registrar equipo usado

---

## Fase 7 — Mercado

**Prioridad: Mínima** — módulo placeholder sin código legacy. No hay nada que migrar.

Solo existe `app/dashboard/mercado/page.tsx` (14 líneas, placeholder).

Cuando se implemente, debe hacerse directamente con Prisma.

---

## Checklist Final

Al completar todas las fases:

- [ ] Cero imports a `createCurrentTenantClient`/`createAdminClient`/`createSsrClient` en `lib/actions/`
- [ ] Cero `$queryRawUnsafe`/`$executeRawUnsafe` en `lib/actions/`
- [ ] Todos los modelos PRO en `schema.prisma`
- [ ] `pnpm build` exitoso
- [ ] Test manual de cada módulo PRO

## Notas

- `Servicios` y `Compras` ya tienen archivos `-prisma.ts` pero no son "Prisma nativos" porque usan raw SQL en vez de modelos. Cada fase reescribe esos archivos desde cero.
- `flujo-pro.ts` y `ajustes_taller` se dejarán para una fase posterior de limpieza general, ya que solo tienen 1 consulta pequeña de Supabase.
- `requireOpenCajaForFinancialOperation` en `lib/caja/guard.ts` se migrará junto con Compras Fase 6, o en limpieza independiente.
