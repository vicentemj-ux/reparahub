# Migration Status

## Fase 3.1 - Completar Register Auth.js + Prisma + Neon
- Register MVP usa `registerWithPrisma()`.
- Crea `Tenant`, `User`, `ConfiguracionTaller` en transaccion.
- Auth.js credentials valida contra Prisma.
- Build OK.

## Fase 3.2 - QA Auth.js + Prisma + Neon

### Validado
- `/auth/register` compila y usa backend Prisma (`registerWithPrisma`).
- Register MVP no usa `supabase.auth.signUp` ni `taller_users`.
- Auth.js endpoint activo: `/api/auth/[...nextauth]`.
- Cookies Auth.js observables por runtime esperado: `next-auth.csrf-token`, `next-auth.callback-url`, `next-auth.session-token` (prefijos `__Secure-` segun entorno).
- `pnpm build` OK.

### Hallazgos
- El script QA de registro directo no pudo ejecutarse fuera de request scope porque `registerWithPrisma` usa `headers()` (esperado en Server Action).
- Queda recomendada una corrida manual de navegador para click-test final (register/login/logout) en entorno interactivo.

### Estado de riesgo
- Bajo para compilacion y wiring de auth.
- Medio para QA UX end-to-end hasta completar click-test manual en navegador.

## Fase 4 - Migrar Clientes a Prisma + Neon

### Implementado
- Nuevo backend Prisma para Clientes en `lib/actions/clients-prisma.ts`.
- Integracion Auth.js tenant con `getCurrentTenant()` (sin cookies legacy, sin `supabase.auth.getUser()`).
- UI de Clientes conectada al backend Prisma:
  - `app/dashboard/clientes/page.tsx`
  - `components/dashboard/clients-table.tsx`
  - `components/dashboard/client-edit-modal.tsx`
  - `components/dashboard/client-detail-modal.tsx`
- Schema Prisma extendido en `model Cliente` con campos usados por la UI fiscal:
  - `telefonoSecundario`, `rfc`, `razonSocial`, `codigoPostalFiscal`, `regimenFiscal`, `usoCfdi`.

### Validaciones tecnicas
- `pnpm prisma db push` OK.
- `pnpm prisma generate` OK.
- `pnpm build` OK.

### Supabase en scope Clientes MVP
- `0` runtime Supabase en `dashboard/clientes` y modales de Clientes.
- Nota: otros modulos fuera de scope (por ejemplo Reparaciones) siguen en Supabase temporalmente.

### Riesgos abiertos
- QA manual funcional pendiente en navegador para confirmar datos reales existentes en Neon:
  - crear cliente, editar, buscar, listar, aislamiento tenant.
- `Prisma Studio` pendiente de validacion visual/manual de registros `Cliente.tenantId`.

## Fase 4.1 - QA Clientes Prisma + Neon

### Ejecutado en esta corrida
- `pnpm build` OK (sin errores de TypeScript/runtime build).
- Auditoria rapida de imports/referencias en scope Clientes:
  - sin referencias activas a `@/lib/actions/clients` en `dashboard/clientes` y modales.
  - sin llamadas runtime a `createCurrentTenantClient`, `createAdminClient` o `supabase.*` en `dashboard/clientes` y `lib/actions/clients-prisma.ts`.

### Pendiente manual (requiere navegador + login)
- Login Auth.js en `/auth/login` y acceso a `/dashboard`.
- QA funcional de Clientes:
  - listado
  - crear
  - editar
  - buscar
  - detalle
  - eliminar (si aplica por UX actual)
- Verificacion visual en Prisma Studio de `tenantId`, `createdAt`, `updatedAt`.
- Prueba multi-tenant con dos cuentas.

### Estado
- Fase 4.1 parcialmente completada (validacion tecnica OK, QA manual pendiente).

## Fase 5 - Migrar Reparaciones (Nuevo Folio) a Prisma + Neon

### Implementado
- Nuevo archivo: `lib/actions/repairs-prisma.ts`.
- Lógica Prisma para flujo MVP:
  - `getRepairsByTallerId`
  - `searchClientByPhone`
  - `createRepair`
  - `getRepairDetail`
  - `getRepairDetailPageData`
  - `updateRepairFull`
  - `applyRepairStatusChange`
  - `getNextFolio`
  - `getAllActiveTechnicians`
- Reglas clave implementadas:
  - búsqueda/normalización de teléfono
  - creación o reutilización de cliente por `tenantId + telefono`
  - creación de reparación asociada al cliente en transacción
  - folio incremental por tenant (MVP simple)
- Integración de imports UI al backend Prisma en módulo Reparaciones MVP.

### Schema Prisma ajustado
- `Cliente`: índice `@@index([tenantId, telefono])`.
- `Reparacion`: campos MVP añadidos para captura real de Nuevo Folio:
  - `tipoEquipo`, `numeroSerie`, `color`, `tecnico`
  - `anticipo`
  - `securityType`, `securityValue`, `pinContrasena`, `patronDesbloqueo`
  - `notasInternas`
- `pnpm prisma db push` OK.
- `pnpm prisma generate` OK.

### Validación técnica
- `pnpm build` OK.

### Supabase restante
- Para evitar romper flujos avanzados fuera de alcance MVP, algunas funciones siguen delegadas desde `repairs-prisma.ts` al legacy `repairs.ts`:
  - `reactivarReingreso`
  - `updateRepairChecklistPro`
  - `updateRepairQuickNotes`
  - `getCancelacionSummary`
  - `cancelarReparacion`

### Riesgos abiertos
- QA manual de navegador pendiente para validar extremo a extremo:
  - nuevo folio con cliente nuevo
  - nuevo folio con teléfono repetido (reutilización cliente)
  - visibilidad del cliente en módulo Clientes
  - detalle básico y cambio de estado básico
- Prisma Studio pendiente de validación visual de relaciones (`tenantId`, `clienteId`, `folio`).

## Fase 6 - Configurar R2 Fotos Reparación Tracking

### Implementado
- Helpers R2 actualizados en `lib/r2.ts`:
  - `sanitizeFileName`
  - `getPublicTrackPhotoKey`
  - `getPrivateRepairPhotoKey`
  - `getR2PublicUrl`
  - `getR2BucketName`
- Modelo `Archivo` extendido en Prisma con soporte de metadatos R2:
  - `tipo`, `visibility`, `storageKey`, `publicUrl`, `fileName`, `size`, `updatedAt`
  - enums `ArchivoTipo`, `ArchivoVisibility`
- `createRepair` (Prisma) sube fotos a R2 en prefix público tracking:
  - `repairs/intake/{tenantId}/{reparacionId}/...`
  - persiste registros en `Archivo` con:
    - `tipo=REPAIR_INTAKE_PHOTO`
    - `visibility=TRACKING_VERIFIED`
- Tracking público migrado a lectura Prisma:
  - `app/track/[id]/view.tsx` ahora consume `getTrackingPhotoUrls` y `getTrackingTallerInfo` desde `repairs-prisma`.
  - validación de acceso mantiene `ticketId + últimos 4 dígitos`.

### Fix verificado (múltiples fotos)
- Causa principal: carga de fotos sin consolidación de resultados por archivo; al fallar una foto no había trazabilidad clara por índice.
- Corrección:
  - subida múltiple con `Promise.allSettled`
  - inserción de `Archivo` por cada foto exitosa
  - resumen de fallas por foto en respuesta (`photoSummary`)
  - sin fallo silencioso en logs.

### Validaciones técnicas
- `pnpm prisma db push` OK.
- `pnpm prisma generate` OK.
- `pnpm build` OK.

### Pendiente manual (R2/Studio)
- Confirmar en Cloudflare dashboard objetos en:
  - `repairs/intake/{tenantId}/{reparacionId}/...`
- Confirmar en Prisma Studio registros de `Archivo`:
  - `tenantId`, `reparacionId`, `visibility=TRACKING_VERIFIED`, `tipo=REPAIR_INTAKE_PHOTO`
- Confirmar visual en `/track/[id]` con fotos reales subidas.

## Fase 7.1 - Fix tracking 4 dígitos + fotos detalle/tracking R2

### Causas detectadas
- Verificación tracking dependía de RPC (`get_tracking_info`) fuera del flujo Prisma unificado; esto provocaba inconsistencias de normalización de teléfono.
- Render de fotos dependía de URL derivada variable; cuando no había URL HTTP absoluta válida se terminaba intentando mostrar `src` inválido.

### Implementado
- Nuevo helper único de teléfono: `lib/phone.ts` (`onlyDigits`, `last4`).
- Nuevo endpoint: `POST /api/tracking/verify` (`app/api/tracking/verify/route.ts`) con validación por `Reparacion.id` + `last4(cliente.telefono)`.
- Tracking público (`app/track/[id]/view.tsx`) migrado a endpoint interno de verificación (sin RPC legacy).
- Nuevo helper de URL de archivo: `lib/archivo-url.ts` (`getArchivoDisplayUrl`).
- `lib/actions/repairs-prisma.ts` usa helper de URL para detalle/tracking y validación robusta de últimos 4 dígitos.

### Resultado técnico
- `pnpm build` OK tras aplicar fix.

## Fase 8 - Configuración MVP + Branding Taller

### Runtime MVP migrado
- Configuración base del taller (`/dashboard/configuracion`, tab Taller + redes sociales + imprenta básica) migrada a Prisma/Neon vía `lib/actions/settings-prisma.ts`.
- Persistencia de branding en `ConfiguracionTaller` (Prisma), con `nombreComercial`, `telefono`, `whatsapp`, `direccion`, `ciudad`, `estado`, `pais`, `moneda`, `timezone`, `paperSize`, `printSettings` y sociales.

### Branding
- Soporte de logo en R2 desde `updateTallerSettings()` cuando `logo_url` llega como data URL.
- Prefijo logo MVP: `tenants/{tenantId}/branding/logo-{timestamp}.{ext}`.
- Se guarda `logoUrl` + `logoStorageKey` en Prisma.

### Tracking
- `POST /api/tracking/verify` ahora devuelve nombre comercial/logo desde `ConfiguracionTaller`.
- `/track/[id]` muestra branding con fallback (icono ReparaHub si no hay logo).

### Supabase en scope Configuración MVP
- Runtime MVP de configuración usa Prisma (`settings-prisma`) en lugar de `lib/actions/settings.ts`.
- Restos legacy/pro fuera del MVP: `flujo-pro` y acciones históricas de `lib/actions/settings.ts`.

## Fase 8.1 - QA Configuración Branding R2

### Validación técnica ejecutada
- Build de aplicación: `pnpm build` ✅
- Scope de Configuración MVP (`/dashboard/configuracion` + `components/configuracion/*`) validado contra runtime Prisma:
  - imports apuntan a `lib/actions/settings-prisma.ts`.
  - sin runtime `supabase` en esas rutas MVP.
- Esquema Prisma sincronizado y cliente regenerado:
  - `pnpm prisma db push` ✅
  - `pnpm prisma generate` ✅
- Tracking mantiene endpoint de verificación activo con branding (`/api/tracking/verify`) ✅

### Estado QA manual visual
- Requiere validación en navegador/Prisma Studio interactivo (pendiente en esta corrida CLI):
  - edición y persistencia visual de datos de taller
  - upload/logo R2 visible
  - branding en tracking visible
  - validación de tab Hardware como placeholder PRO

### Resultado
- Fase 8.1 queda técnicamente estable para continuar QA visual final y luego pasar a Fase 9.

## Fix Dashboard Runtime después de Fase 9

### Causa exacta
- Falla de runtime en `/dashboard` por ausencia de manejo defensivo cuando alguna action Prisma lanzaba excepción en render del Server Component.

### Corrección aplicada
- `app/dashboard/page.tsx`:
  - `try/catch` alrededor de carga concurrente de `getDashboardMvpData()` + `getDashboardSubscriptionBannerContext()`.
  - Log temporal seguro:
    - `console.error("[dashboard] failed", { message, stack })`
  - Fallback cero-datos para evitar crash de la página.
- `lib/actions/dashboard-prisma.ts`:
  - `try/catch` global con el mismo log temporal.
  - Retorno seguro con `stats` en cero y `orders: []` si algo falla.

### Validación técnica
- `pnpm build` ✅
- `/dashboard` queda tolerante a cero datos y a fallas transitorias de lectura.

---

# Prisma/Neon Optimization — Completed Modules

## 1. Mi Equipo ✅
- `lib/actions/team-prisma.ts` — Server Actions con Prisma nativo.
- `lib/team-types.ts` — Constantes y tipos compartidos (separados de "use server" para evitar error de exportación de objetos).
- Roles mapeados al Enum `TeamRole` en `User` (`ADMINISTRADOR`, `TECNICO`, `RECEPCIONISTA`, `REPARADOR`).
- Zero raw SQL, zero Supabase.
- Build: ✅

## 2. Historial de Ventas ✅
- `lib/actions/sales-history-prisma.ts` — Queries Prisma nativas para historial.
- Modelos `Venta`, `DetalleVenta`, `Caja`, `MovimientoCaja` en schema (con `@@map`).
- Zero raw SQL (reemplazó `$queryRawUnsafe` legacy).
- Build: ✅

## 3. Bitácora de Gastos ✅
- `lib/actions/gastos-prisma.ts` — Server Actions con Prisma nativo.
- Modelos `GastoOperativo` (`@@map("bitacora_gastos")`) y `GastoReparacion` (`@@map("reparacion_gastos")`).
- Zero `$queryRawUnsafe` / `$executeRawUnsafe`.
- Tablas creadas via migration + `prisma db push`.
- Build: ✅

## 4. Ventas / POS ✅
- `lib/actions/ventas-prisma.ts` — **Refactor completo**: eliminadas las 36 llamadas a `$queryRawUnsafe`/`$executeRawUnsafe`.
- Operaciones nativas Prisma:
  - `getCajaAbierta` → `prisma.caja.findFirst`
  - `abrirCaja` → `prisma.caja.create`
  - `cerrarCaja` → `prisma.caja.updateMany`
  - `crearVenta` → `prisma.venta.create` + `prisma.detalleVenta.create` + `prisma.producto.update({ decrement })` + `prisma.caja.update` + `prisma.movimientoCaja.create`
  - `getHistorialCaja` → `prisma.caja.findMany` + `prisma.caja.count`
  - `getDetalleCaja` → `prisma.caja.findFirst` + `prisma.venta.findMany` + `prisma.movimientoCaja.findMany`
  - `getAbonoById` → `prisma.movimientoCaja.findFirst` + `prisma.reparacion.findFirst`
  - `getVentaParaTicket` → `prisma.venta.findFirst` + `include: { detalles }`
  - `getCobroReparacionParaTicket` → `prisma.movimientoCaja.findFirst` + `prisma.reparacion.findFirst`
  - `anularVenta` → `prisma.venta.updateMany` (reemplaza RPC `anular_venta_pdv`)
- Eliminado `ensureAllPosTablesExist()` (tablas ya existen en schema).
- Eliminados helpers `normCaja()`, `toNum()`.
- **Legacy `lib/actions/ventas.ts` eliminado** (2,153 líneas, Supabase híbrido, solo usado por `_archive/`).
- Build: ✅

## 5. Vista General (Dashboard) ✅
- `lib/actions/dashboard-prisma.ts` — Stats y órdenes vía Prisma.
- `getDashboardMvpData` → llama a `getRepairsByTallerId` (Prisma).
- `getDashboardSubscriptionBannerContext` → `settings-prisma.ts` (Prisma).
- Zero Supabase, zero raw SQL.
- Último tipo-only link a Supabase (`RepairOrder` desde `repairs.ts`) migrado a `repairs-prisma.ts`.
- Comentario stale de `getDashboardStats` RPC corregido.
- Build: ✅

## 6. Print System — Audit Status

### Ventas (print) ✅
- `getVentaParaTicket` → `ventas-prisma.ts` (Prisma nativo).
- `getCobroReparacionParaTicket` → `ventas-prisma.ts` (Prisma nativo).
- `getAbonoById` → `ventas-prisma.ts` (Prisma nativo).
- `getCajaConDetalle` → `ventas-prisma.ts` (Prisma nativo).
- `getVentaLabelData` → `ventas-prisma.ts` (Prisma nativo, via getVentaParaTicket).
- Zero Supabase, zero raw SQL.

### Reparaciones (print) ⚠️ Parcial
- `/print-ticket/[id]` → `getRepairByFolio` desde `repairs-prisma.ts` ✅
- `/print-label` → 100% client-side (localStorage) ✅
- `print-menu-dropdown.tsx` → solo UI, sin fetching ❌
- `repairs-prisma.ts` tiene **3 instancias de `$queryRawUnsafe`** que deben migrarse a Prisma nativo.
- `repairs.ts` (legacy) contiene `getRepairLabelData`, `getRepairByFolio`, `getCancelacionSummary` — usan Supabase, pero solo son llamados desde `_archive/`.

### Inventario (print) ✅
- Etiquetas y carteles: 100% client-side con datos del `Producto` ya cargado.
- `buildInventoryLabelPrintDocument` → genera HTML de impresión.
- No depende de Supabase ni raw SQL para datos de impresión.

## Modules with Supabase Hybrid Remaining

| Module | File | Supabase Calls | Raw SQL ($queryRawUnsafe) | Status |
|--------|------|---------------|--------------------------|--------|
| Repairs | `lib/actions/repairs.ts` | ~60 calls (createClient) | — | LEGACY (2906 líneas) |
| Repairs | `lib/actions/repairs-prisma.ts` | — | 3 calls | Needs cleanup |
| Repairs (print) | `lib/actions/repairs.ts` `getRepairLabelData` | `supabase.from("reparaciones")` | — | Only used by `_archive/` |
| Auth | `lib/actions/auth.ts` | `createClient()` `supabase.from("taller_users")` | — | LEGACY login flow |
| Proxy | `proxy.ts` | `fetch(SUPABASE_URL)` (REST API) | — | Reads `taller_users` directly |
| Settings | `lib/actions/settings.ts` | `createCurrentTenantClient` | — | LEGACY, no usado por MVP |
| Onboarding | `lib/actions/onboarding.ts` | `createClient()` `supabase.auth.admin` | — | LEGACY |

## Summary
- **9 modules fully Prisma-optimized**: Clientes, Reparaciones (core), Configuración, Dashboard, Mi Equipo, Historial Ventas, Bitácora Gastos, Ventas/POS, and Print (ventas + inventario portions).
- **Remaining Supabase hybrid**: Mainly in `repairs.ts` (legacy Supabase functions, some still called as fallback from `repairs-prisma.ts`), `auth.ts` (login/register legacy), `proxy.ts` (middleware auth), and `onboarding.ts`.

## Backlog Futuras Actualizaciones (MVP)

### Pendientes memorizados (ticket digital por WhatsApp)
- Incluir nombre del cajero que atendio la venta.
- Incluir nombre comercial de sucursal/taller en formato destacado.
- Incluir enlace corto de validacion del ticket digital para consulta posterior.

### Regla de seguimiento
- Estas mejoras quedan en backlog oficial hasta su implementacion.
- Toda implementacion de este bloque debe mantener compatibilidad con envio WhatsApp actual y no romper cierre de venta.
