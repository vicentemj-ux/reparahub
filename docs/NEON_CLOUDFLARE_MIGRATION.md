# Migración ReparaHub a Neon + Cloudflare

## Entregables generados

- SQL único: `C:\Users\Vincent\Desktop\reparahub\database\neon-clean-schema.sql`
- Este documento: `C:\Users\Vincent\Desktop\reparahub\docs\NEON_CLOUDFLARE_MIGRATION.md`

## Qué contiene el SQL

`neon-clean-schema.sql` se generó desde `supabase/migrations/*.sql` en orden cronológico, removiendo bloques específicos de Supabase:

- Políticas `CREATE/ALTER/DROP POLICY`
- `ENABLE ROW LEVEL SECURITY`
- ACL (`GRANT/REVOKE`)
- referencias directas a `auth.*` dentro de SQL
- referencias directas a `storage.*`
- referencias a `supabase_realtime`

Además incluye:

- `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

## Cómo ejecutarlo en Neon

1. Crear una base PostgreSQL nueva en Neon.
2. Abrir SQL Editor.
3. Ejecutar completo:
   - `C:\Users\Vincent\Desktop\reparahub\database\neon-clean-schema.sql`
4. Validar objetos clave:
   - tablas críticas (`productos`, `reparaciones`, `ventas`, `caja`, `movimientos_caja`, `taller_users`)
   - RPC usadas por app (`get_next_folio`, `get_dashboard_stats`, `batch_decrement_stock`, etc.)

## Dependencias actuales de Supabase (a reemplazar para Cloudflare+Neon puro)

## 1) Supabase Auth

El proyecto depende de:

- `supabase.auth.getUser()`
- OAuth (`signInWithOAuth`, `exchangeCodeForSession`)
- Admin API (`auth.admin.createUser`, `updateUserById`, `deleteUser`, `getUserById`)

Archivos representativos:

- `C:\Users\Vincent\Desktop\reparahub\lib\actions\empleados.ts`
- `C:\Users\Vincent\Desktop\reparahub\lib\actions\onboarding.ts`
- `C:\Users\Vincent\Desktop\reparahub\app\auth\callback\route.ts`
- `C:\Users\Vincent\Desktop\reparahub\components\auth\google-sign-in-button.tsx`

Reemplazo sugerido:

- Auth.js/NextAuth o Clerk + tabla local de identidades.
- Adaptar `createCurrentTenantClient()` para resolver `taller_id` desde sesión/JWT propio.

## 2) Supabase Storage

Uso activo de upload/remove/public URL en:

- `C:\Users\Vincent\Desktop\reparahub\lib\actions\productos.ts`
- `C:\Users\Vincent\Desktop\reparahub\lib\actions\repairs.ts`
- `C:\Users\Vincent\Desktop\reparahub\app\api\visitas\detect\route.ts`
- `C:\Users\Vincent\Desktop\reparahub\app\api\alarms\hikvision\[tallerId]\route.ts`

Reemplazo sugerido:

- Cloudflare R2 (S3 API) + URLs firmadas/public URLs.
- Sustituir `lib/storage.ts` y `lib/storage-server.ts` por adapter R2.

## 3) Supabase RPC

RPC detectadas en uso:

- `get_next_folio`
- `recibir_orden_compra`
- `verificar_pin`
- `get_tracking_info`
- `get_tracking_taller_info`
- `get_dashboard_stats`
- `registrar_abono_atomico`
- `registrar_liquidacion_atomica`
- `finalizar_entrega_reparacion`
- `batch_increment_stock`
- `get_inventory_operational_kpis`
- `get_next_venta_folio`
- `batch_decrement_stock`
- `anular_venta_pdv`
- `get_garantia_ticket`
- `list_urgent_reparaciones_for_email`

Estas funciones deben existir en Neon (incluidas en SQL cuando estaban presentes en migraciones locales).

## Multi-tenant

Se conserva enfoque multi-tenant por `taller_id`.

Punto importante ya conocido en proyecto:

- `ventas`, `caja`, `movimientos_caja` usan `taller_id` **text**
- otras tablas típicamente usan `taller_id` **uuid**

## Validación específica solicitada

- No se detectó consulta a tabla `inventario` como tabla SQL real.
- El inventario operativo sigue basado en tabla `productos`.

## Riesgos (reporte)

## Riesgo Alto: historial de migraciones base incompleto en repo

Al reconstruir desde `supabase/migrations`, varias migraciones hacen `ALTER TABLE` sobre tablas base que no aparecen creadas en archivos tempranos del repositorio actual (por ejemplo `taller_users`, `reparaciones`, `ventas`, `caja`, `movimientos_caja`, `clientes`, etc.).

Impacto:

- En una DB Neon totalmente vacía, el script puede requerir un baseline adicional previo.

Mitigación:

1. Extraer baseline completo desde instancia Supabase actual (schema dump real).
2. Re-generar `neon-clean-schema.sql` sobre ese baseline.
3. Reaplicar filtros Supabase-only (RLS/Auth/Storage).

## Riesgo Medio: lógica de Auth y Storage acoplada

Sin reemplazo de Auth/Storage, la app no funcionará end-to-end fuera de Supabase, aunque el SQL compile.

## Riesgo Medio: tipos mixtos de `taller_id`

Hay mezcla `text/uuid` por diseño histórico. En migración a stack nuevo conviene unificar a mediano plazo.

