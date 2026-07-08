# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Comandos de Desarrollo

```bash
# Desarrollo web (Next.js)
pnpm dev            # Inicia servidor Next.js en localhost:3000
pnpm build          # Build de producción Next.js
pnpm start          # Sirve el build de producción
pnpm lint           # ESLint sobre todo el proyecto


```

> No hay tests automatizados configurados en este proyecto.

---

# ReparaHub — Documento de Contexto del Proyecto

> **Última actualización:** Marzo 2026
> **Propósito:** Este documento sirve como contexto completo para que cualquier IA (Claude, Cursor, Gemini, etc.) entienda el proyecto ReparaHub sin necesidad de conversaciones previas.

---

## 1. ¿Qué es ReparaHub?

ReparaHub es un SaaS (Software as a Service) de gestión para talleres de reparación de celulares, laptops, consolas y accesorios. Está construido por **Vicente Munguia**, dueño de dos negocios físicos en Los Mochis, Sinaloa, México:

- **CDSE** (Centro De Soluciones Electrónicas) — cdse.com.mx — taller completo y venta de refacciones/equipos
- **Reparatech** — reparatech.mx — enfocado en reparación express de celulares y tablets

El sistema está disponible en **reparahub.net** y su objetivo es captar talleres similares como clientes de suscripción.

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16+ (App Router), TypeScript, Tailwind CSS |
| UI Components | shadcn/ui, lucide-react, Radix UI |
| Backend | Supabase (PostgreSQL + Auth + Storage + RLS) |
| ORM/Queries | Supabase JS Client v2, Server Actions |
| Auth | Sistema custom con JWT firmado (SUPABASE_JWT_SECRET) |
| Email | Resend (verificación de cuenta, notificaciones) |
| Deploy | Vercel (producción automática desde GitHub main) |
| Package Manager | pnpm |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| QR | qrcode.react |

---

## 3. Arquitectura Multi-Tenant

- Cada taller registrado es un **tenant** con su propio `taller_id` (UUID)
- Todas las tablas tienen columna `taller_id` para aislar datos
- **RLS (Row Level Security)** activo en todas las tablas usando JWT claims
- El JWT incluye `taller_id` en sus claims firmado con `SUPABASE_JWT_SECRET`
- Las Server Actions usan `createTenantClient()` para respetar RLS
- El panel `/admin` usa `createAdminClient()` con service role key (bypasea RLS)
- La página pública de tracking usa `createAdminClient()` por diseño (sin sesión)
- **Google OAuth:** botón «Continuar con Google» en login/registro → `signInWithOAuth` → `app/auth/callback/route.ts`. El `taller_users.id` del flujo OAuth coincide con `auth.users.id`. Si no existe fila en `taller_users`, el proxy redirige a `/onboarding` (nombre del taller + prueba 30 días). Usuarios solo-OAuth tienen `password_hash` NULL (migración `20260304000001_oauth_nullable_password.sql`).

### Variables de entorno requeridas:
```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_SUPABASE_INVENTORY_BUCKET=   # default: "inventario"
```

### Sesión y cookies:
- `tallerId` cookie → ID del tenant activo, leído por `getCurrentTallerId()` en `lib/auth/get-current-taller.ts`
- `tallerName` cookie → nombre del taller (URL-encoded)
- El JWT del tenant se firma en cada Server Action con `createTenantClient(tallerId)` — expira en 1h, no se persiste

---

## 4. Estructura de Base de Datos (Supabase)

### Tablas principales:

| Tabla | taller_id tipo | Descripción |
|---|---|---|
| `taller_users` | uuid (id) | Tabla maestra de talleres/cuentas |
| `clientes` | uuid | Clientes del taller |
| `reparaciones` | uuid | Órdenes de reparación |
| `tecnicos` | uuid | Técnicos del taller |
| `productos` | uuid | **Inventario del taller** (SKU, stock, IMEI, fotos). No usar tabla `inventario` — no forma parte del esquema de la app. |
| `ventas` | **text** | Ventas del punto de venta |
| `detalle_ventas` | (via venta_id) | Detalle de cada venta |
| `caja` | **text** | Apertura/cierre de caja |
| `movimientos_caja` | **text** | Movimientos del día |
| `configuracion_taller` | uuid | Config del taller |
| `bitacora_gastos` | uuid | Gastos operativos |
| `reparacion_gastos` | uuid | Gastos por ticket |
| `historial_reparacion` | (via reparacion_id) | Auditoría de cambios de estado con `actor_nombre` (reemplaza `cambios_reparaciones`) |
| `categorias` | uuid (user_id) | Categorías de productos |
| `roles_taller` | — (global, sin taller_id) | Catálogo de roles predefinidos (administrador, técnico_estándar, vendedor_recepción, solo_lectura) |
| `miembros_taller` | uuid | Miembros del equipo con rol asignado (MVP: máx. 5 por taller) |
| `email_pin_verification` | — | PINs temporales para verificación de email |
| `ajustes_taller` | uuid | Configuración del Flujo PRO por taller (health check, firma, fotos requeridas) |
| `firma_digital` | uuid | Firmas digitales de clientes para órdenes de reparación |

> ⚠️ **IMPORTANTE:** Las tablas `ventas`, `caja` y `movimientos_caja` tienen `taller_id` como **text**, no uuid. Las políticas RLS para estas tablas NO usan `::uuid` cast.

> ⚠️ **Tabla `inventario` NO existe** — el inventario está en `productos`. Nunca usar `from("inventario")` en queries.

### Buckets de Supabase Storage:

| Bucket | Tipo | Uso |
|---|---|---|
| `repair-photos` | Privado | Fotos de evidencia de reparaciones |
| `inventario` *(default)* o `productos` | Privado | Fotos de **`productos.imagen_url`** — el nombre real del bucket se configura con `NEXT_PUBLIC_SUPABASE_INVENTORY_BUCKET` (por defecto `inventario`). |
| `catalogo` | Público | Fotos de equipos en venta |
| `taller` | Público | Logos e imágenes del taller |

---

## 5. Módulos del Sistema

### MVP Activo (funcional):

| Módulo | Estado | Notas |
|---|---|---|
| Vista General | ✅ Funcional | Dashboard con 4 métricas via RPC `get_dashboard_stats` |
| Reparaciones | ✅ Funcional | Tracking WhatsApp, abonos, comprobante, gastos por ticket |
| Clientes | ✅ Funcional | Tarjetas con historial de reparaciones |
| Ventas (POS) | ✅ Funcional | Caja, carrito, 4 métodos de pago, ticket térmico |
| Inventario | ✅ Funcional | IMEI/serie, importar CSV, margen de utilidad |
| Bitácora de Gastos | ✅ Funcional | Gastos operativos con impacto en caja |
| Configuración | ✅ Funcional | Pestañas Taller / Mi Cuenta / Reportes y Alertas |
| Panel Admin `/admin` | ✅ Funcional | Gestión de talleres, planes, cortes |

### V1.1 — Próximamente (frontend parcial, sin lógica):

- Compras
- Historial de Ventas
- Reportes
- Servicios
- Control de Utilidad
- Facturación → renombrado a "Plan Pro" (página de upgrade)

### Módulos con lógica parcial (DB lista, UI en progreso):

| Módulo | Estado | Notas |
|---|---|---|
| Mi Equipo | 🔄 En progreso | DB lista: `roles_taller` + `miembros_taller`. MVP 5 miembros por taller. Acciones en `lib/actions/roles.ts` y `lib/actions/empleados.ts` |

### V2.0 — Futuro:

- Dispositivos
- Mercado
- Chat Taller

---

## 6. Flujos Críticos del Sistema

### Registro y onboarding:
1. Taller accede a reparahub.net → click "Comenzar prueba gratuita"
2. Formulario: nombre propietario, nombre taller, email, contraseña
3. Verificación por email via Resend
4. 30 días de prueba gratuita automáticos
5. Al vencer → página de suscripción vencida con contacto WhatsApp

### Tracking público de reparación:
1. Técnico crea orden → sistema genera folio (ej: CDS001)
2. Botón WhatsApp envía link: `https://reparahub.net/tracking/[folio]`
3. Cliente abre link → ingresa últimos 4 dígitos de su teléfono
4. Ve estado, fotos de evidencia y QR
5. Link de WhatsApp usa `api.whatsapp.com/send` (compatible con WA Business)

### Ciclo de venta (POS):
1. Abrir caja con fondo inicial del día
2. Buscar producto del inventario o crear venta rápida
3. Seleccionar método de pago (único o mixto)
4. Confirmar venta → descuenta stock automáticamente
5. Modal "¡Venta Exitosa!" → imprimir ticket térmico
6. Al final del día → Corte de caja con resumen completo

### Ciclo de reparación:
1. Crear orden → capturar cliente, equipo, falla, folio auto
2. Registrar anticipo (opcional) → genera comprobante de pago
3. Actualizar estado: Recibido → Diagnóstico → En Reparación → Listo → Entregado
4. Agregar gastos internos (mano de obra, refacciones) → calcula utilidad
5. Liquidar al entregar → genera comprobante final
6. Imprimir ticket de reparación con QR de tracking

---

## 6.1 Estándar de Layout UI (MVP → V1.1 → V2.0)

Para mantener consistencia visual en todas las pantallas del dashboard, este patrón es obligatorio en módulos existentes y nuevos:

### Contenedor base por página

```tsx
<div className="min-h-screen bg-slate-50">
  <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
    {/* contenido del módulo */}
  </div>
</div>
```

### Paleta corporativa (estricta)

- **Fondos principales:** `bg-white`, `bg-slate-50`
- **Bordes:** `border-slate-200` / `border-gray-200`
- **Texto:** `text-slate-900`, `text-slate-700`, `text-slate-500`
- **Acentos y CTA:** `text-blue-600`, `bg-blue-600`, `hover:bg-blue-700`
- **No usar** fondos oscuros en vistas operativas (`bg-slate-900`, `bg-black`, etc.)

### Patrones responsivos por tipo de módulo

- **Tablas (Reparaciones, Inventario, Bitácoras):**
  envolver en `w-full overflow-x-auto` para scroll horizontal en móvil.
- **POS (Ventas):**
  layout principal con `flex flex-col lg:flex-row gap-6`.
  En móvil, carrito abajo; en desktop, dos columnas.
- **Tarjetas KPI/Resumen:**
  usar grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` según densidad.

### Módulos MVP ya alineados

- `app/dashboard/page.tsx`
- `app/dashboard/reparaciones/page.tsx`
- `app/dashboard/ventas/page.tsx`
- `app/dashboard/inventario/page.tsx`
- `app/dashboard/bitacora/page.tsx`
- `app/dashboard/bitacora-gastos/page.tsx`
- `app/dashboard/configuracion/page.tsx`
- `app/dashboard/clientes/page.tsx`

### Rutas públicas adicionales

| Ruta | Descripción |
|---|---|
| `app/garantia/[id]/` | Certificado de garantía público (usa `get_garantia_ticket` RPC) |
| `app/firma-digital/[id]/` | Captura de firma digital del cliente |
| `app/seguimiento/` | Alias de tracking (redirect a `/tracking`) |
| `app/(print)/` | Grupo de rutas de impresión: `print-ticket`, `print-abono`, `print-corte`, `print-label`, `print-documento`, `print-calibration` |
| `app/api/cron/check-trials/` | Cron job para verificar pruebas vencidas |
| `app/api/cron/urgent-equipment-report/` | Cron job para reporte de equipos urgentes |
| `app/api/generate-poster/` | Genera poster de exhibición (usa Satori para render) |

---

## 7. Sistema de Impresión

Todos los tickets usan el método de **iframe oculto** para compatibilidad con impresoras térmicas USB.

El tamaño del papel se configura globalmente en **Configuración del Taller** (`configuracion_taller.tamano_papel`): `80mm` o `58mm`.

### Formatos disponibles:

| Formato | Tamaño | Estado |
|---|---|---|
| Ticket de reparación | 80mm o 58mm | ✅ Funcional |
| Ticket de venta | 80mm o 58mm | ✅ Funcional |
| Corte de caja | 80mm o 58mm | ✅ Funcional |
| Comprobante de abono | 80mm o 58mm | ✅ Funcional |
| Etiqueta de reparación | 2x1" (50x25mm) | ✅ Funcional |
| Etiqueta de venta | 2x1" (50x25mm) | ✅ Funcional |
| Formato Carta | Carta | ✅ Funcional |
| Certificado de Garantía | Carta | ✅ Funcional |

---

## 8. Seguridad — Auditoría Completada

| ID | Issue | Estado |
|---|---|---|
| SEC-01 | updateRepair() sin taller_id | ✅ Corregido |
| SEC-02 | logRepairChange sin tenant isolation | ✅ Corregido |
| SEC-03 | getRepairByPhone() fuga cross-tenant | ✅ Deshabilitada |
| SEC-04 | .env.local en repo | ✅ Nunca commiteado |
| SEC-05 | RLS inefectivo (auth.uid() = NULL) | ✅ JWT claims + migration |
| SEC-06 | Tablas sin RLS | ✅ Todas las tablas cubiertas |
| SEC-07 | updateRepairFull() cross-tenant | ✅ Corregido |
| SEC-08 | createMiembro() sin verificar propietario | ✅ Corregido |
| SEC-09 | Sin rate limiting en auth | ✅ 5 endpoints protegidos |
| SEC-10 | Sin headers de seguridad | ✅ CSP + HSTS + X-Frame + más |
| SEC-11 | Sin validación Zod | ✅ Endpoints principales validados |
| SEC-12 | Tokens en URL | 📋 Documentado — post-MVP |
| SEC-13 | Sin audit log | 📋 Documentado — post-MVP |

**Score de seguridad:** A- (89/100) en provibecoding.app

---

## 9. Rendimiento — Optimizaciones Aplicadas

| ID | Optimización | Impacto |
|---|---|---|
| PERF-01 | batch_decrement_stock RPC | N queries → 1 en ventas |
| PERF-02 | Paginación reparaciones | 50 registros por página |
| PERF-03 | Paginación inventario + búsqueda server-side | 50 productos por página |
| PERF-04 | Uploads paralelos con Promise.allSettled() | 4 fotos: 2s → 500ms |
| PERF-05 | Eliminación de fotos en batch | N calls → 1 call |
| PERF-06 | 14 índices compuestos en DB | Queries más rápidas |
| PERF-07 | get_dashboard_stats RPC | 5 queries → 1 RPC |
| PERF-08 | Paginación historial de caja | 30 cortes por página |
| PERF-09 | get_next_folio MAX() en DB | ~100ms → <5ms |
| PERF-10 | next/image con remotePatterns | Imágenes optimizadas |

### Funciones RPC en Supabase:
- `get_dashboard_stats(p_taller_id TEXT)` → stats del dashboard con cálculo interno por zona horaria del taller
- `get_next_folio(p_taller_id UUID, p_prefix TEXT)` → siguiente número de folio (respaldado por trigger DB en `20260324000001_folio_sequence_trigger.sql`)
- `batch_decrement_stock(items)` → descuento masivo de stock
- `get_garantia_ticket(p_folio TEXT)` → datos para certificado de garantía
- `get_inventory_operational_kpis(p_taller_id UUID)` → KPIs operativos del inventario

### Triggers en DB:
- `reparaciones_sync_costos` — sincroniza `costo_total` y `restante` (= `costo_total - anticipo`) en cada INSERT/UPDATE de `reparaciones`
- `historial_reparacion_on_insert` — inserta fila inicial en `historial_reparacion` al crear una reparación

---

## 10. Modelo de Negocio

| Concepto | Detalle |
|---|---|
| Precio mensual | $189 MXN/mes |
| Precio anual | $1,699 MXN/año (ahorro ~25%) |
| Prueba gratuita | 30 días sin tarjeta |
| Gestión de planes | Manual desde panel `/admin` |
| Pagos automáticos | Stripe — pendiente V1.1 |
| Mercado principal | Los Mochis, Sinaloa, México |
| Expansión | Territorio nacional a mediano plazo |
| Contacto/soporte | WhatsApp 6681227393 |

### Panel de Admin (`/admin`):
- URL: `reparahub.net/admin`
- Acceso exclusivo para Vicente (super_admin)
- Funciones: ver talleres, cambiar plan, extender prueba, suspender, eliminar cuenta
- Gestión manual de suscripciones hasta V1.1 con Stripe

---

## 11. Pendientes para Cerrar MVP

### Críticos:
- [ ] Prueba física completa de todos los formatos de impresión en local
- [ ] Configurar SPF en DNS para Resend (entregabilidad de emails)
- [ ] Eliminar meta tag `generator="v0.app"` del código

### Importantes:
- [ ] Email de bienvenida al registrarse (Resend)
- [ ] Email de aviso 3 días antes de vencer prueba (Resend)
- [ ] Verificar página de suscripción vencida funciona correctamente
- [x] Migración aplicada: `20260319000003_perf_batch_decrement_stock.sql`

### Post-MVP (V1.1):
- Stripe para cobros automáticos
- Mi Equipo con permisos reales por rol
- Compras y Historial de Ventas
- Reportes y Control de Utilidad
- Facturación (módulo "Plan Pro")

---

## 11.1 Flujo PRO (Módulo de Reparaciones Avanzado)

El **Flujo PRO** es una capa opcional sobre el ciclo estándar de reparaciones, configurable por taller en `ajustes_taller`:

| Campo | Descripción |
|---|---|
| `health_check_required` | Checklist de diagnóstico obligatorio (`checklist_pro` en `reparaciones`) |
| `firma_required` | Captura de firma digital del cliente (tabla `firma_digital`) |
| `fotos_required` | Fotos de evidencia obligatorias antes de avanzar estado |

- Lógica en `lib/actions/flujo-pro.ts` y `lib/reparaciones/checklist-pro.ts`
- El checklist usa estado ternario: `pass | fail | na` por ítem
- La firma digital se captura en `app/firma-digital/[id]/` (ruta pública con token)
- Permisos por rol definidos en `lib/equipo/permissions.ts` → `ROLE_PERMISSIONS`

### Offline Support (IndexedDB)

La pantalla de nueva reparación tiene soporte offline básico via IndexedDB (`lib/offline/`):
- `nueva_reparacion_draft` — persiste el borrador del formulario
- `repair_queue` — cola de reparaciones pendientes de sincronizar (sync queue)
- Solo activo en el cliente; si `indexedDB` no está disponible, falla silenciosamente

---

## 12. Estructura de Archivos Clave

```
reparahub/
├── app/
│   ├── dashboard/           # Módulos del SaaS
│   │   ├── page.tsx         # Vista General
│   │   ├── reparaciones/    # Módulo de reparaciones
│   │   ├── ventas/          # Punto de venta
│   │   ├── inventario/      # Inventario
│   │   ├── clientes/        # Clientes
│   │   ├── bitacora/        # Gastos operativos
│   │   └── configuracion/   # Configuración del taller
│   ├── admin/               # Panel super admin
│   ├── tracking/[folio]/    # Página pública de tracking
│   └── layout.tsx           # Layout raíz
├── components/
│   └── dashboard/           # Componentes del dashboard
├── lib/
│   ├── actions/             # Server Actions: repairs.ts, ventas.ts, productos.ts, clients.ts, gastos.ts, roles.ts, empleados.ts, settings.ts, auth.ts, onboarding.ts, email-verification.ts, admin.ts, flujo-pro.ts, firma-digital.ts, historial-ventas.ts
│   ├── supabase/
│   │   ├── tenant-client.ts # Cliente con JWT taller_id (createTenantClient / createCurrentTenantClient)
│   │   └── admin.ts         # Cliente con service role key (createAdminClient)
│   ├── auth/
│   │   ├── get-current-taller.ts  # getCurrentTallerId() — lee cookie tallerId
│   │   ├── actor-display-name.ts  # Nombre del actor para historial
│   │   └── rate-limit.ts          # Rate limiting para auth endpoints
│   ├── reparaciones/        # Helpers de reparaciones: pattern.ts, security.ts, checklist-ingreso.ts, checklist-pro.ts, firma-digital-url.ts
│   ├── offline/             # IndexedDB: idb-offline.ts, nueva-reparacion-draft.ts, repair-sync-queue.ts
│   ├── equipo/
│   │   └── permissions.ts   # ROLE_PERMISSIONS por slug (administrador, tecnico_estandar, vendedor_recepcion, reparador)
│   ├── validations/         # Schemas Zod: repair-create.ts
│   ├── print/               # poster-exhibicion-satori.tsx, poster-satori-fonts.ts
│   └── print.ts             # Función imprimirTicket() con iframe
├── supabase/
│   └── migrations/          # Scripts SQL de migraciones
├── proxy.ts                 # Protección de rutas (antes middleware.ts)
└── next.config.mjs          # Config Next.js con remotePatterns Supabase
```

---

## 13. Convenciones de Código

- **Server Actions:** Usar `createCurrentTenantClient()` (lee `tallerId` de cookie automáticamente) o `createTenantClient(tallerId)` si ya tienes el ID. Nunca `createAdminClient()` salvo admin/tracking
- **Admin routes:** Siempre usan `createAdminClient()` de `lib/supabase/admin.ts`
- **Impresión:** Siempre usar `imprimirTicket()` de `lib/print.ts` con iframe
- **WhatsApp links:** Siempre usar `api.whatsapp.com/send?phone=52XXXXXXXXXX` (compatible con WA Business)
- **Imágenes:** Usar `next/image` con `width` y `height` explícitos
- **Paginación:** 50 registros por página en tablas, 30 en historial de caja
- **Folios:** Generados con `get_next_folio()` RPC en Supabase

---

## 14. Competencia de Referencia

El sistema de referencia principal es **ReparaCel / Reparacel.pro** — un SaaS similar del mercado mexicano. Se ha usado como referencia de diseño y funcionalidad para los módulos de:
- Dashboard (Vista General)
- Punto de Venta
- Tracking público
- Tickets e impresión
- Módulo de Dispositivos (descartado — redundante con Reparaciones)

---

## 15. Contacto y Acceso

| Recurso | URL/Dato |
|---|---|
| SaaS producción | reparahub.net |
| Landing page | reparahub.net (raíz) |
| Panel admin | reparahub.net/admin |
| Repositorio | github.com/vicentemj-ux/reparahub (privado) |
| Deploy | Vercel (auto-deploy desde main) |
| Supabase proyecto | reparahub |
| Email negocio | contacto@cdse.com.mx |
| WhatsApp | 6681227393 |
| Ubicación | Los Mochis, Sinaloa, México |
