# Current MVP Runtime Map

## Auth MVP
- Login: `signIn("credentials")` con Auth.js.
- Register: `registerWithPrisma()` (Prisma/Neon).
- Logout: `signOut()` Auth.js + limpieza cookies legacy.
- Guard: `proxy.ts` con JWT Auth.js (`tenantId`, `role`, `sessionVersion`).

## QA 3.2
- Register backend confirmado en Prisma (sin uso de `supabase.auth.signUp` ni `taller_users` en ruta MVP de register).
- Endpoint auth activo: `/api/auth/[...nextauth]`.
- Build final OK.

## Supabase restante (legacy/pro)
- Siguen flujos legacy en `lib/actions/auth.ts` (verify/reset/admin) y modulos no-migrados.
- No bloquean el register MVP ya migrado.

## Clientes MVP (Fase 4)
- `app/dashboard/clientes/page.tsx` y modales de Clientes ahora consumen `lib/actions/clients-prisma.ts`.
- Runtime de Clientes MVP usa Prisma + Neon y `getCurrentTenant()` (Auth.js) para aislamiento multi-tenant por `tenantId`.
- Operaciones migradas en Clientes MVP:
  - listado (`getClientes` / alias `getAllClients`)
  - busqueda (`searchClientes` / alias `searchClients`)
  - detalle (`getClienteById` / alias `getClientDetail`)
  - edicion (`updateCliente` / alias `updateClient`)
  - eliminacion (`deleteCliente` / alias `deleteClient`)
  - alta backend lista (`createCliente`) para flujos que lo consuman.
- Campos Cliente usados por la UI actual:
  - `id`, `tenantId`, `nombre`, `telefono`, `telefono_secundario`, `correo(email)`, `notas`
  - fiscales: `rfc`, `razon_social`, `codigo_postal_fiscal`, `regimen_fiscal`, `uso_cfdi`
  - `createdAt`, `updatedAt`
- Resultado auditoria Supabase en scope Clientes MVP: `0` llamadas runtime a Supabase en `app/dashboard/clientes` y modales asociados.

## QA Clientes 4.1 (estado)
- Validacion tecnica automatizada:
  - `pnpm build` OK.
  - Scope Clientes mantiene backend Prisma (`lib/actions/clients-prisma.ts`) sin runtime Supabase.
- Validacion manual pendiente:
  - flujo navegador de login + operaciones CRUD en `/dashboard/clientes`
  - confirmacion visual Prisma Studio para `tenantId` y timestamps
  - prueba de aislamiento multi-tenant con dos cuentas.

## Reparaciones MVP (Fase 5)
- Flujo migrado a Prisma/Neon para Nuevo Folio MVP:
  - listado: `getRepairsByTallerId` en `lib/actions/repairs-prisma.ts`
  - cliente por telefono: `searchClientByPhone` en `lib/actions/repairs-prisma.ts`
  - crear ticket: `createRepair` en `lib/actions/repairs-prisma.ts`
  - detalle basico: `getRepairDetail` y `getRepairDetailPageData` en `lib/actions/repairs-prisma.ts`
  - editar basico: `updateRepairFull` en `lib/actions/repairs-prisma.ts`
  - cambio de estado basico: `applyRepairStatusChange` en `lib/actions/repairs-prisma.ts`
  - folio por tenant: `getNextFolio` en `lib/actions/repairs-prisma.ts`
- Integrado en UI:
  - `app/dashboard/reparaciones/page.tsx`
  - `components/dashboard/client-autocomplete.tsx`
  - `components/dashboard/reparacion-edit-dialog.tsx`
  - `components/dashboard/nueva-reparacion-form.tsx`
  - `app/dashboard/reparaciones/[id]/view.tsx`
  - `components/dashboard/repair-detail-view.tsx`
  - `components/dashboard/bitacora-table.tsx`
- Runtime Supabase restante (fuera de Nuevo Folio/Listado/Detalle basico):
  - funciones avanzadas en `repairs-prisma.ts` delegadas a `lib/actions/repairs.ts` legacy (cancelaciones, reingreso, health-check persist, quick notes avanzadas).

## R2 Fotos Tracking (Fase 6)
- Upload de fotos del Nuevo Folio en server-side (`createRepair` de `lib/actions/repairs-prisma.ts`):
  - sube a R2 con `uploadFileToR2`
  - prefix activo: `repairs/intake/{tenantId}/{reparacionId}/...`
  - guarda metadata en tabla `Archivo` (Prisma/Neon)
- Tracking público (`/track/[id]`) ahora resuelve fotos desde `Archivo`:
  - filtro por `visibility=TRACKING_VERIFIED` + `tipo=REPAIR_INTAKE_PHOTO`
  - URL desde `publicUrl` o construida por `R2_PUBLIC_BASE_URL + storageKey`
- Secrets R2 se mantienen solo server-side:
  - `R2_SECRET_ACCESS_KEY` y `R2_ACCESS_KEY_ID` no se exponen al cliente.

## Fix R2 múltiple (verificado)
- Causa detectada de asociación incompleta con 2+ fotos: manejo best-effort sin trazabilidad por foto.
- Corrección aplicada:
  - procesamiento por foto con `Promise.allSettled`
  - registro `Archivo` por cada foto exitosa
  - reporte de fallas por índice de foto (`photoSummary.failures`) sin error silencioso
  - `visibility` migrada a `TRACKING_VERIFIED` para flujo con verificación de últimos 4 dígitos.

## Runtime fix - Tracking verificado + fotos R2 (Fase 7.1)

- Tracking público ya no depende de RPC legacy para validar acceso.
- Flujo activo:
  1. `app/track/[id]/view.tsx` envia `ticketId + last4` a `POST /api/tracking/verify`.
  2. Endpoint busca por `Reparacion.id`, incluye `cliente` y `archivos` (`TRACKING_VERIFIED`, `REPAIR_INTAKE_PHOTO`).
  3. Valida `last4(cliente.telefono)` con helper único.
  4. Devuelve reparación + fotos resueltas para render.

- URL de fotos centralizada con `getArchivoDisplayUrl(archivo)`:
  - `publicUrl` HTTP -> uso directo.
  - fallback -> `R2_PUBLIC_BASE_URL + storageKey/key`.
  - sin URL válida -> no se renderiza `<img>` rota.

## Fase 8 - Configuración MVP + Branding (Prisma)

### Clasificación por módulo
- MVP:
  - Tab Taller (datos base, zona horaria, folio, garantía, logo).
  - Tab Mi Cuenta (redes sociales del taller).
  - Tab Imprenta (persistencia básica de `impresion_config` + `mensaje_despedida`).
- PRO / Placeholder:
  - Hardware (placeholder "PRO / Próximamente").
  - Flujos avanzados (QZ/Tauri/Electron/Hikvision/firma digital).
- Legacy:
  - `lib/actions/settings.ts` (Supabase) permanece para compatibilidad fuera de scope MVP.

### Fuente de verdad actual (MVP)
- `lib/actions/settings-prisma.ts`.
- Tabla Prisma: `ConfiguracionTaller`.
- Logo público de branding: R2 (`tenants/{tenantId}/branding/*`).

## Fase 8.1 QA (estado)

- Configuración MVP ya corre sobre `settings-prisma` en runtime.
- Branding para tracking se entrega desde `api/tracking/verify` con nombre comercial + logo.
- QA visual final (navegador + Prisma Studio) pendiente para cerrar checklists funcionales.
