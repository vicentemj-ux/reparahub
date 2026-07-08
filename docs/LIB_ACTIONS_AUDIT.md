# LIB_ACTIONS_AUDIT

## Resumen
- Total archivos en `lib/actions`: **31**
- Archivos con Supabase (DB/Auth/Storage o tenant client): **25**
- Archivos Prisma oficiales MVP: **6**

## Tabla de auditoría

| Archivo | Funciones (resumen) | Supabase | Prisma | Usado por | Clasificación | Acción recomendada |
|---|---|---:|---:|---|---|---|
| `admin-otp.ts` | OTP admin | Sí | No | Admin | PRO_ARCHIVE | Mantener legacy |
| `admin.ts` | Admin global | Sí | No | Admin | PRO_ARCHIVE | Mantener legacy |
| `auth-prisma.ts` | register/login cuenta owner | No | Sí | `/auth/register`, `/dashboard/configuracion` | MVP_MIGRADO | Oficial MVP |
| `auth.ts` | auth legacy + email/reset | Sí | Parcial | legacy/admin | LEGACY_SUPABASE | No usar en MVP |
| `bitacora-visitas.ts` | visitas | Sí | No | PRO visitas | PRO_ARCHIVE | Mantener legacy |
| `chat.ts` | chat taller | Sí | No | PRO chat | PRO_ARCHIVE | Mantener legacy |
| `clients-prisma.ts` | CRUD clientes MVP | No | Sí | `/dashboard/clientes` | MVP_MIGRADO | Oficial MVP |
| `clients.ts` | clientes legacy | Sí | No | legacy | LEGACY_SUPABASE | No usar en MVP |
| `compras-usado.ts` | compras usado | Sí | No | Compras | PRO_ARCHIVE | Mantener legacy |
| `compras.ts` | compras | Sí | No | Compras | PRO_ARCHIVE | Mantener legacy |
| `cotizaciones.ts` | cotizaciones | Sí | No | Cotizaciones | PRO_ARCHIVE | Mantener legacy |
| `dashboard-prisma.ts` | métricas y órdenes dashboard | No | Sí | `/dashboard` | MVP_MIGRADO | Oficial MVP |
| `email-verification.ts` | verificación email | Sí | No | auth legacy | LEGACY_SUPABASE | Pendiente migración |
| `empleados.ts` | equipo/miembros | Sí | No | Equipo | PRO_ARCHIVE | Mantener legacy |
| `firma-digital.ts` | firma digital | Sí | No | Garantía/firma | PRO_ARCHIVE | Mantener legacy |
| `flujo-pro.ts` | reglas flujo pro | Sí | No | `/dashboard/configuracion` (tab PRO) | PRO_ARCHIVE | Mantener separado |
| `gastos.ts` | gastos ticket/operativos | Sí | No | `/dashboard/reparaciones/[id]` | MVP_PENDIENTE | Migrar a prisma por fases |
| `historial-ventas.ts` | historial ventas | Sí | No | Ventas | PRO_ARCHIVE | Mantener legacy |
| `import.ts` | importación masiva | Sí | No | Importación | PRO_ARCHIVE | Mantener legacy |
| `onboarding.ts` | alta onboarding | No | Sí | `/onboarding` | MVP_MIGRADO | Oficial MVP |
| `productos.ts` | inventario/productos | Sí | No | Inventario | PRO_ARCHIVE | Mantener legacy |
| `repairs-prisma.ts` | reparaciones/tracking/detalle | No | Sí | `/dashboard/reparaciones*`, tracking | MVP_MIGRADO | Oficial MVP |
| `repairs.ts` | reparaciones legacy supabase | Sí | No | legacy diversos | LEGACY_SUPABASE | No usar en MVP |
| `reportes.ts` | reportes | Sí | No | Reportes | PRO_ARCHIVE | Mantener legacy |
| `roles.ts` | roles | Sí | No | Equipo/roles | PRO_ARCHIVE | Mantener legacy |
| `servicios.ts` | servicios catálogo | Sí | No | Servicios/reparación | PRO_ARCHIVE | Mantener legacy |
| `settings-prisma.ts` | config taller y plan | No | Sí | `/dashboard`, `/dashboard/configuracion` | MVP_MIGRADO | Oficial MVP |
| `settings.ts` | settings legacy mixto | Sí | Sí | legacy/pro | LEGACY_SUPABASE | No usar en MVP |
| `tracking-prisma.ts` | wrapper tracking prisma | No | Sí | tracking MVP | MVP_MIGRADO | Oficial MVP |
| `utilidad.ts` | utilidad | Sí | No | Utilidad | PRO_ARCHIVE | Mantener legacy |
| `ventas.ts` | POS/ventas/caja | Sí | No | Ventas | PRO_ARCHIVE | Mantener legacy |

## Nota de estado
Se añadieron banners `LEGACY SUPABASE ACTIONS` en:
- `lib/actions/auth.ts`
- `lib/actions/clients.ts`
- `lib/actions/repairs.ts`
- `lib/actions/settings.ts`


## Nota dashboard runtime (post Fase 9)
- `lib/actions/dashboard-prisma.ts` quedó endurecido con `try/catch` y fallback seguro (`stats` en cero + `orders: []`).
- `app/dashboard/page.tsx` también captura errores y evita crash en render con defaults.
