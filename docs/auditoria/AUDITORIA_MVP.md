# AUDITORÍA MVP — ReparaHub SaaS
> Fecha: 2026-03-19
> Stack: Next.js 14+, TypeScript, Tailwind, Supabase (PostgreSQL + Storage + Auth), Vercel
> Metodología: Análisis estático de código + revisión de esquema de base de datos

---

## RESUMEN EJECUTIVO

| Severidad | Seguridad | Rendimiento | Total |
|-----------|-----------|-------------|-------|
| 🔴 Crítico | 5 | 5 | **10** |
| 🟠 Alto | 7 | 6 | **13** |
| 🟡 Medio | 9 | 8 | **17** |
| Total | 21 | 19 | **40** |

**Veredicto: LANZAMIENTO BLOQUEADO** hasta resolver los 10 críticos y al menos los altos de seguridad.

---

## PRIORIDAD 1 — CRÍTICOS (Bloquean lanzamiento)

### 🔴 SEC-01 · Bypass de aislamiento multi-tenant en `updateRepair()`
- **Archivo**: `lib/actions/repairs.ts` — línea ~713-732
- **Descripción**: La función actualiza registros de reparaciones **sin verificar `taller_id`**. Un usuario autenticado del Taller A puede modificar reparaciones del Taller B conociendo el `repairId`.
- **Código problemático**:
  ```typescript
  const { error } = await supabase
    .from("reparaciones")
    .update(updateData)
    .eq("id", repairId)
    // ❌ FALTA: .eq("taller_id", tallerId)
  ```
- **Solución**: Obtener `tallerId` del contexto de sesión y agregar `.eq("taller_id", tallerId)` a la query. Nunca confiar en el `repairId` como prueba de autorización.

---

### 🔴 SEC-02 · Bypass de aislamiento en `logRepairChange()` y `getRepairChangeHistory()`
- **Archivo**: `lib/actions/repairs.ts` — líneas ~773-815
- **Descripción**: Sin filtro de `taller_id` al insertar y consultar `cambios_reparaciones`. Un atacante puede contaminar el historial de auditoría de otros tenants o leer su historial.
- **Solución**: Agregar `.eq("taller_id", tallerId)` en ambas operaciones. En el insert, incluir `taller_id` en el objeto de datos.

---

### 🔴 SEC-03 · Fuga cross-tenant en `getRepairByPhone()`
- **Archivo**: `lib/actions/repairs.ts` — líneas ~858-888
- **Descripción**: Función de búsqueda pública por teléfono **sin filtro de `taller_id`**. Retorna reparaciones de cualquier taller de la base de datos. Además referencia columna `cliente_telefonico` inexistente (función rota Y peligrosa).
- **Impacto**: Enumeración de datos de clientes y reparaciones de todos los tenants con solo conocer un número de teléfono.
- **Solución**: Agregar `taller_id` al contexto de rastreo público. Si la función debe ser pública, filtrar mínimamente por un token firmado de acceso, no por teléfono directo.

---

### 🔴 SEC-04 · `.env.local` con credenciales expuesto en el repositorio
- **Archivo**: `.env.local` (raíz del proyecto)
- **Descripcion**: Contiene credenciales sensibles como `SUPABASE_SERVICE_ROLE_KEY` y `RESEND_API_KEY` en texto plano. Si el repositorio es accesible, cualquiera podria comprometer servicios criticos.
- **Impacto**: Compromiso total — bypass de RLS, acceso admin a todos los datos, capacidad de eliminar usuarios y talleres.
- **Solución inmediata**:
  1. Agregar `.env.local` a `.gitignore` **ahora**
  2. Rotar `SUPABASE_SERVICE_ROLE_KEY` en el dashboard de Supabase
  3. Rotar `RESEND_API_KEY` en el dashboard de Resend
  4. Verificar en el historial de git que el archivo no haya sido commiteado (`git log --all --full-history -- .env.local`)

---

### 🔴 SEC-05 · Políticas RLS inefectivas — `auth.uid()` siempre es NULL
- **Archivos**: `scripts/setup-multi-tenant-rls.sql` (líneas ~38-80), todas las migraciones con `USING`
- **Descripción**: Las RLS se definen como `USING (taller_id = auth.uid())`, pero la app usa **autenticación custom con cookies**, no Supabase Auth. `auth.uid()` es siempre `NULL`, por lo que **todas las políticas RLS son inoperativas**.
- **Evidencia**: `lib/auth/check-admin.ts` y `lib/auth/get-current-taller.ts` leen `tallerId` de cookies, confirmado por comentario en `repairs.ts` líneas 8-10.
- **Impacto**: La seguridad a nivel de base de datos está completamente desactivada. Si alguna Server Action tiene un fallo, todos los datos están expuestos.
- **Solución**: Dos caminos posibles:
  - **Opción A (recomendada)**: Migrar a Supabase Auth para tener `auth.uid()` real y las RLS funcionando.
  - **Opción B (corto plazo)**: Redefinir las políticas RLS usando `current_setting('app.current_taller_id', true)` y setearlo con `SET LOCAL` en cada request vía RPC.

---

### 🔴 PERF-01 · N+1 queries en decremento de stock al crear venta
- **Archivo**: `lib/actions/ventas.ts` — líneas ~250-268
- **Descripción**: Por cada ítem vendido: 1 query para leer stock + 1 query para actualizarlo. Con 10 ítems = 20 queries secuenciales.
  ```typescript
  for (const item of input.items) {
    // Query 1: leer stock
    const { data: prod } = await supabase.from("productos").select("stock_actual")...
    // Query 2: actualizar stock
    await supabase.from("productos").update({ stock_actual: newStock })...
  }
  ```
- **Solución**: Usar una función RPC de PostgreSQL que haga el decremento atómicamente:
  ```sql
  UPDATE productos SET stock_actual = stock_actual - $cantidad
  WHERE id = $id AND taller_id = $taller_id
  RETURNING stock_actual
  ```

---

### 🔴 PERF-02 · Sin paginación en listado de reparaciones — carga total
- **Archivo**: `lib/actions/repairs.ts` — líneas ~596-637
  `app/dashboard/reparaciones/page.tsx` — línea ~59
- **Descripción**: `getRepairsByTallerId()` carga **todas las reparaciones** del taller sin `LIMIT`. Con 5,000 registros, la página colapsa: payload enorme, renderizado de miles de filas en React, filtrado client-side en cada keystroke.
- **Solución**: Implementar paginación offset o cursor:
  ```typescript
  .range(page * pageSize, (page + 1) * pageSize - 1)
  ```
  Mover el filtrado de `useMemo` a una Server Action con parámetros de búsqueda.

---

### 🔴 PERF-03 · Sin paginación en inventario — carga total de productos
- **Archivo**: `lib/actions/productos.ts` — líneas ~60-75
  `app/dashboard/inventario/page.tsx`
- **Descripción**: `getProductos()` carga **todo el catálogo** sin límite. Con 2,000+ SKUs, la página se vuelve inutilizable.
- **Solución**: Misma estrategia de paginación + búsqueda server-side.

---

### 🔴 PERF-04 · Subida secuencial de fotos en creación de reparación
- **Archivo**: `lib/actions/repairs.ts` — líneas ~83-139
- **Descripción**: Las fotos se suben una por una con `await` en loop. 4 fotos × 500ms = 2 segundos bloqueantes.
  ```typescript
  for (let i = 0; i < photoDataArray.length; i++) {
    await supabase.storage.from(BUCKETS.REPAIR_PHOTOS).upload(...)  // secuencial
  }
  ```
- **Solución**: Paralelizar con `Promise.all()`:
  ```typescript
  await Promise.all(photoDataArray.map(photo => supabase.storage...upload(...)))
  ```

---

### 🔴 PERF-05 · Eliminación secuencial de fotos en `updateRepairFull()`
- **Archivo**: `lib/actions/repairs.ts` — líneas ~1106-1120
- **Descripción**: Mismo patrón: fotos eliminadas una a una en loop secuencial.
- **Solución**: `await Promise.all(input.removedPhotos.map(url => supabase.storage...remove([path])))`

---

## PRIORIDAD 2 — ALTOS (Resolver esta semana)

### 🟠 SEC-06 · RLS no habilitado en tablas críticas
- **Tablas afectadas**: `productos`, `ventas`, `caja`, `movimientos_caja`
- **Descripción**: Migraciones revisadas no muestran `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` ni políticas para estas tablas. Son el core del negocio.
- **Solución**: Habilitar RLS + agregar políticas (ver SEC-05 para la estrategia correcta dado el auth custom).

---

### 🟠 SEC-07 · `updateRepairFull()` no valida que el nuevo `clienteId` pertenezca al taller
- **Archivo**: `lib/actions/repairs.ts` — líneas ~1086-1093
- **Descripción**: Aunque verifica el `taller_id` de la reparación, si se pasa un `clienteId` de otro taller, el update procede vinculando datos cross-tenant.
- **Solución**: Agregar verificación:
  ```typescript
  const { data: client } = await supabase.from("clientes")
    .select("id").eq("id", clienteId).eq("taller_id", tallerId).single()
  if (!client) throw new Error("Cliente no pertenece a este taller")
  ```

---

### 🟠 SEC-08 · Creación de empleados sin verificar permisos de admin del taller
- **Archivo**: `lib/actions/empleados.ts` — línea ~52
- **Descripción**: `admin.auth.admin.createUser()` crea cuentas en Supabase Auth sin verificar que el usuario que llama tenga rol admin del taller.
- **Solución**: Verificar `isAdmin(tallerId)` antes de llamar a la función de creación.

---

### 🟠 SEC-09 · Sin rate limiting en endpoints de autenticación
- **Archivo**: `lib/actions/auth.ts`
- **Funciones afectadas**: `loginTaller()`, `registerTaller()`, `requestPasswordReset()`, `verifyEmailToken()`
- **Descripción**: Sin límite de intentos — vulnerable a fuerza bruta.
- **Solución**: Implementar rate limiting con Upstash Ratelimit (integra con Vercel Edge):
  ```typescript
  import { Ratelimit } from "@upstash/ratelimit"
  const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1m") })
  ```

---

### 🟠 SEC-10 · Sin headers de seguridad HTTP
- **Archivo**: `next.config.mjs`
- **Descripción**: Faltan headers críticos de seguridad.
- **Solución**: Agregar en `next.config.mjs`:
  ```javascript
  headers: async () => [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      // CSP requiere análisis previo de dependencias
    ]
  }]
  ```

---

### 🟠 SEC-11 · Sin validación con Zod en Server Actions críticas
- **Archivos**: Múltiples Server Actions
- **Descripción**: Inputs como `monto` en `registrarAbono()` se convierten con `Number()` sin validar rango, tipo o sanitización. Riesgo de datos corruptos o manipulación de inventario/precios.
- **Solución**: Implementar schemas Zod en todas las Server Actions que reciben datos de usuario.

---

### 🟠 SEC-12 · Tokens de verificación en URL (query params)
- **Archivo**: `lib/email/send.ts` — líneas ~14, 41
- **Descripción**: Tokens de reset y verificación en `?token=...` quedan expuestos en historial del navegador, logs de servidor y referrer headers.
- **Solución**: Usar tokens de un solo uso (OTP numérico de 6 dígitos enviado por email, ingresado en formulario).

---

### 🟠 SEC-13 · Sin auditoría de operaciones administrativas sensibles
- **Archivos**: Múltiples
- **Descripción**: Acciones como eliminar cuentas, cambiar suscripciones o crear empleados no dejan traza de auditoría.
- **Solución**: Tabla `audit_log` con `(taller_id, usuario_id, accion, entidad, entidad_id, timestamp, ip)`.

---

### 🟠 PERF-06 · Índices de base de datos críticos faltantes
- **Archivos**: Migraciones en `supabase/migrations/`
- **Descripción**: Columnas frecuentemente filtradas sin índice compuesto:

  | Tabla | Columnas | Usado en |
  |-------|----------|----------|
  | `reparaciones` | `(taller_id, estatus)` | Dashboard stats, filtros |
  | `reparaciones` | `(taller_id, created_at DESC)` | Listados ordenados |
  | `reparaciones` | `(taller_id, cliente_id)` | Detalle de cliente |
  | `ventas` | `(taller_id, created_at)` | Métricas mensuales |
  | `movimientos_caja` | `(taller_id, tipo, fecha)` | Dashboard financiero |
  | `clientes` | `(taller_id, nombre)` | Búsqueda ILIKE |

- **Solución**: Migración con los índices compuestos. Para búsqueda por nombre:
  ```sql
  CREATE INDEX idx_clientes_taller_nombre ON clientes USING gin(taller_id, nombre gin_trgm_ops);
  ```

---

### 🟠 PERF-07 · `getDashboardStats()` carga todos los registros en lugar de agregar en DB
- **Archivo**: `lib/actions/repairs.ts` — líneas ~486-558
- **Descripción**: Descarga todos los movimientos del mes para sumarlos en JavaScript. Con 10,000 transacciones mensuales, el payload es masivo.
- **Solución**: Usar agregación server-side:
  ```typescript
  .select("total.sum()")  // Supabase PostgREST syntax
  // o via RPC:
  supabase.rpc("get_dashboard_stats", { taller_id: tallerId, mes: firstOfMonth })
  ```

---

### 🟠 PERF-08 · Sin paginación en historial de caja
- **Archivo**: `lib/actions/ventas.ts` — líneas ~370-407
- **Descripción**: Carga todos los cierres de caja históricos. 2+ años = 700+ registros en una sola query.
- **Solución**: `.range(0, 29)` con paginación en UI + botón "cargar más".

---

### 🟠 PERF-09 · Generación de folio por escaneo completo de tabla
- **Archivo**: `lib/actions/repairs.ts` — líneas ~24-60
- **Descripción**: Carga todos los folios del taller para calcular el `MAX()` en JavaScript. Con 10,000 reparaciones, fetcha 10,000 strings.
- **Solución**:
  ```typescript
  const { data } = await supabase.rpc("get_next_folio_number", {
    p_taller_id: tallerId, p_prefix: prefix
  })
  ```
  Con función SQL que use `MAX(CAST(SUBSTRING(folio, length($prefix)+1) AS INT))`.

---

### 🟠 PERF-10 · Imágenes de reparaciones servidas sin optimización
- **Archivo**: `lib/actions/repairs.ts` — línea ~408
- **Descripción**: Fotos servidas a resolución original (2-4MB cada una). 4 fotos por reparación = 8-16MB de payload. Sin compresión en upload ni `next/image` en visualización.
- **Solución**:
  1. Comprimir antes de subir (ya está importado `browser-image-compression` en inventario, reutilizar)
  2. Usar Supabase Image Transformation en las URLs: `?width=800&quality=80`
  3. Cambiar `<img>` por `<Image>` de `next/image` con `sizes` apropiado

---

### 🟠 PERF-11 · `updateRepairFull()` ejecuta 5-8 queries secuenciales
- **Archivo**: `lib/actions/repairs.ts` — líneas ~1064-1154
- **Descripción**: Editar una reparación dispara: fetch repair → upsert cliente → upload fotos (N queries) → delete fotos (N queries) → update repair.
- **Solución**: Agrupar con transacción RPC, paralelizar fotos (ver PERF-04/05), y consolidar el upsert de cliente + repair en una sola operación.

---

## PRIORIDAD 3 — MEDIOS (Resolver este mes)

### 🟡 SEC-14 · `getRepairForTracking()` — validación débil de acceso público
- **Archivo**: `lib/actions/repairs.ts` — líneas ~891-953
- **Descripción**: El único control de acceso para el tracking público es verificar los últimos 4 dígitos del teléfono. Si el teléfono puede enumerarse, el acceso es trivial.
- **Solución**: Agregar un token de rastreo único (UUID) generado al crear la reparación, incluido en el SMS/email al cliente.

---

### 🟡 SEC-15 · Mensajes de error exponen información de enumeración
- **Archivo**: `lib/actions/auth.ts` — línea ~57
- **Descripción**: Diferentes mensajes para "usuario no existe" vs "contraseña incorrecta" permiten enumerar emails registrados.
- **Solución**: Usar siempre el mismo mensaje genérico: "Credenciales incorrectas".

---

### 🟡 SEC-16 · Sin CSRF explícito (verificar Next.js built-in)
- **Descripción**: Next.js 14 incluye protección CSRF para Server Actions, pero confirmar que no hay endpoints API Route custom que la omitan.
- **Solución**: Auditar `app/api/**` y verificar que Server Actions usen el patrón estándar.

---

### 🟡 SEC-17 · Sin transacciones en operaciones multi-paso
- **Archivos**: Múltiples (`ventas.ts`, `repairs.ts`)
- **Descripción**: `crearVenta()` inserta la venta y luego actualiza stock en queries separadas. Si el stock falla, la venta queda sin descuento.
- **Solución**: Encapsular operaciones relacionadas en funciones RPC de PostgreSQL con `BEGIN/COMMIT`.

---

### 🟡 SEC-18 · `registrarAbono()` sin validación de rangos
- **Archivo**: Inferido desde `lib/actions/repairs.ts` o `ventas.ts`
- **Descripción**: `monto` se convierte con `Number()` sin validar que sea positivo y no supere la deuda pendiente.
- **Solución**: Zod schema + verificación de deuda máxima en DB.

---

### 🟡 PERF-12 · Bundle pesado en inventario — imports síncronos de librerías pesadas
- **Archivo**: `app/dashboard/inventario/page.tsx` — líneas ~1-82
- **Imports problemáticos**:
  ```typescript
  import JsBarcode from "jsbarcode"              // ~25KB
  import imageCompression from "browser-image-compression"  // ~15KB
  import Barcode from "react-barcode"            // + deps
  ```
- **Descripción**: Librerías de generación de códigos de barra y compresión de imagen se cargan en el bundle inicial aunque solo se usen en modales.
- **Solución**:
  ```typescript
  const BarcodeModal = dynamic(() => import('./BarcodeModal'), { ssr: false })
  ```

---

### 🟡 PERF-13 · Filtrado de reparaciones client-side en `useMemo`
- **Archivo**: `app/dashboard/reparaciones/page.tsx` — líneas ~72-86
- **Descripción**: Con 5,000 reparaciones cargadas, el `useMemo` recalcula en cada keystroke del buscador.
- **Solución**: Debounce en búsqueda + mover lógica a Server Action con parámetros.

---

### 🟡 PERF-14 · `getTallerSettings()` cargado innecesariamente en inventario
- **Archivo**: `app/dashboard/inventario/page.tsx` — líneas ~168-172
- **Descripción**: Settings del taller cargados al montar la página aunque solo se usan para imprimir etiquetas.
- **Solución**: Cargar settings solo al abrir el modal de etiqueta.

---

### 🟡 PERF-15 · Sin caching layer — cada navegación refresca todo desde DB
- **Archivos**: Múltiples páginas del dashboard
- **Descripción**: Sin SWR, React Query ni `unstable_cache` de Next.js. Cada visita a la página dispara todas las queries.
- **Solución**: Implementar `unstable_cache` de Next.js para datos poco cambiantes (settings, lista de empleados), y SWR para listados con revalidación.

---

### 🟡 PERF-16 · Validación de códigos de barras en importación masiva sin batch
- **Archivo**: `lib/actions/productos.ts` — líneas ~202-304
- **Descripción**: Validación de unicidad de códigos de barra dentro del loop de importación, en lugar de pre-cargar todos los existentes.
- **Solución**: `SELECT codigo_barras FROM productos WHERE taller_id = $1` una vez, luego validar en memoria.

---

### 🟡 PERF-17 · Sin feedback de progreso en subida de fotos
- **Archivo**: `lib/actions/repairs.ts` — líneas ~83-139
- **Descripción**: El usuario ve un spinner sin información durante N segundos de subida.
- **Solución** (junto con PERF-04): Usar `Promise.allSettled()` con callbacks de progreso por archivo.

---

### 🟡 PERF-18 · Sin índices en claves foráneas
- **Descripción**: Queries con relaciones embebidas como `.select("*, clientes(nombre, telefono)")` pueden hacer full table scans si las FK no tienen índices.
- **Solución**: Verificar que todas las FK (`cliente_id`, `taller_id`, `empleado_id`, etc.) tengan índices en las tablas hijas.

---

## PLAN DE ACCIÓN ORDENADO

### Esta semana (Día 1-2: Bloqueos críticos de seguridad)
1. **Rotar credenciales expuestas** (SEC-04) — 30 minutos
2. **Agregar `.env.local` a `.gitignore`** y verificar historial git — 15 minutos
3. **Agregar `taller_id` a `updateRepair()`** (SEC-01) — 30 minutos
4. **Corregir `logRepairChange()` y `getRepairChangeHistory()`** (SEC-02) — 30 minutos
5. **Deshabilitar o proteger `getRepairByPhone()`** (SEC-03) — 1 hora
6. **Verificar y agregar `taller_id` a todos los Server Actions** — auditoría sistemática

### Esta semana (Día 3-4: Rendimiento crítico — quick wins)
7. **Paralelizar uploads/deletes de fotos** con `Promise.all()` (PERF-04, PERF-05) — 1 hora
8. **Agregar `.limit(50)`** a repairs y productos como medida temporal (PERF-02, PERF-03) — 30 minutos
9. **Crear migración de índices** compuestos faltantes (PERF-06) — 2 horas
10. **Rate limiting en auth** con Upstash (SEC-09) — 2 horas

### Esta semana (Día 5: Seguridad arquitectural)
11. **Agregar headers de seguridad** en `next.config.mjs` (SEC-10) — 1 hora
12. **Estrategia RLS** — decidir Opción A (migrar a Supabase Auth) o Opción B (custom setting) (SEC-05) — diseño

### Este mes (Semana 2)
13. Paginación real con UI en reparaciones, inventario y caja
14. Refactorizar `getDashboardStats()` con agregación server-side
15. Optimizar folio generation con MAX() en DB
16. Validación Zod en todas las Server Actions

### Este mes (Semana 3)
17. Compresión de imágenes antes de upload + Supabase Image Transformation
18. Lazy loading de componentes pesados con `next/dynamic`
19. Búsqueda server-side para reparaciones e inventario
20. Transacciones RPC para operaciones multi-paso

### Ongoing
21. Implementar audit log de operaciones administrativas
22. Monitoreo de queries lentas en Supabase Dashboard
23. SWR o React Query para caching client-side

---

## COMANDOS ÚTILES PARA VERIFICACIÓN

```bash
# Verificar si .env.local está en git history
git log --all --full-history -- .env.local

# Buscar todos los usos de SERVICE_ROLE_KEY
grep -r "SERVICE_ROLE" --include="*.ts" --include="*.tsx" .

# Buscar Server Actions sin verificación de taller_id
grep -n "supabase.from(" lib/actions/*.ts | grep -v "taller_id"

# Verificar tablas sin RLS en Supabase SQL Editor
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```

---

*Reporte generado por análisis estático automatizado + revisión manual. Todos los números de línea son aproximados y pueden variar por ediciones posteriores.*
