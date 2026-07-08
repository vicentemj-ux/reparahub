# Reporte de Auditoría de Seguridad — ReparaHub

> Fecha: 2026-05-01
> Alcance: Aplicación web completa (Next.js 16.2, React 19.2, Supabase, multi-tenant)
> Método: Revisión manual de código estático (SAST) siguiendo `guia_auditoria_seguridad.md`

---

## Resumen Ejecutivo

Se auditaron ~246 archivos distribuidos en 7 fases: configuración, autenticación, multi-tenancy/RLS, Server Actions, rutas públicas, storage/importaciones/offline, y panel admin.

| Severidad | Cantidad Original | Pendientes |
|-----------|-------------------|------------|
| Crítica | 2 | 0 |
| Alta | 9 | 4 |
| Media | 10 | 6 |
| Baja | 5 | 3 |
| **Total** | **26** | **13** |

---

## Hallazgos Críticos

### H-CRIT-001 — `ignoreBuildErrors: true` oculta fallas de seguridad en build

- **Severidad:** Crítica
- **Activo:** `next.config.mjs` (línea 35)
- **Evidencia:**
  ```js
  typescript: {
    ignoreBuildErrors: true,
  },
  ```
- **Impacto:** Permite deploys a producción con errores de TypeScript, incluyendo potenciales errores de tipado en validaciones de entrada, manejo de autenticación o acceso a datos. Un refactor futuro podría introducir una vulnerabilidad de autorización que pasaría desapercibida en CI/CD.
- **Escenario:** Un desarrollador modifica una Server Action cambiando el tipo de `taller_id` de string a object; el build pasa, pero en runtime la comparación `.eq("taller_id", tallerId)` falla silenciosamente o permite acceso cruzado.
- **Recomendación:** Eliminar `ignoreBuildErrors: true`. Corregir todos los errores de TypeScript restantes. Usar `strict: true` en `tsconfig.json` si aún no está activo.
- **Estado:** ✅ Corregido (2026-05-01)

### H-CRIT-002 — Uso generalizado de `createAdminClient()` en Server Actions de tenant (bypass de RLS)

- **Severidad:** Crítica
- **Activos:**
  - `lib/auth-server.ts` (`esUsuarioPro`)
  - `lib/auth/get-current-taller.ts` (`getCurrentTallerTrialInfo`)
  - `lib/actions/repairs.ts` (`uploadRepairPhotos`, `getTrackingPhotoUrls`, `getTrackingTallerInfo`)
  - `lib/actions/productos.ts` (`uploadProductImage`)
- **Evidencia:**
  ```ts
  // lib/auth-server.ts
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("taller_users")
    .select("plan_activo")
    .eq("id", tallerId)
  ```
  El archivo `AGENTS.md` establece la regla de oro: **"Never use `createAdminClient()` except in `/admin` routes and `/tracking` pages"**.
- **Impacto:** Bypass completo de RLS en operaciones de tenant. Si alguna de estas funciones se usa en un contexto donde `tallerId` podría ser manipulado, un atacante podría leer/modificar datos de cualquier tenant.
- **Escenario:** `uploadProductImage` usa `createAdminClient()` para subir imágenes. Si un usuario autenticado manipula el `productId` para apuntar a un producto de otro tenant, la subida `upsert: true` sobreescribiría la imagen del producto ajeno.
- **Recomendación:**
  1. Reemplazar TODOS los usos de `createAdminClient()` en Server Actions de tenant por `createCurrentTenantClient()`.
  2. Justificar por escrito cada excepción restante.
  3. Agregar regla de ESLint que prohíba `createAdminClient` en `lib/actions/*` excepto admin.
- **Estado:** ✅ Corregido (2026-05-01) — Reemplazados en `lib/auth-server.ts`, `lib/auth/get-current-taller.ts`, `lib/actions/repairs.ts` (uploadRepairPhotos, getTrackingPhotoUrls, getTrackingTallerInfo), `lib/actions/productos.ts` (uploadProductImage). Se agregó verificación de propiedad antes de uploads.

---

## Hallazgos de Severidad Alta

### H-ALT-001 — Dependencia `xlsx` v0.18.5 vulnerable a XSS/XXE

- **Severidad:** Alta
- **Activo:** `package.json`, `lib/actions/import.ts`
- **Evidencia:** `"xlsx": "^0.18.5"` en `package.json`. El paquete `xlsx` (SheetJS) en versiones anteriores a 0.20.0 es conocido por permitir la ejecución de fórmulas maliciosas (CSV Injection / Excel Macro Injection) cuando los datos parseados se renderizan en aplicaciones sin sanitización previa.
- **Impacto:** Un archivo Excel/CSV malicioso importado por un usuario podría ejecutar código arbitrario en el cliente del administrador del taller o exfiltrar datos cuando se abra en Excel/LibreOffice.
- **Escenario:** Atacante sube CSV con fórmula `=cmd|'/C calc'!A0`. Cuando el taller descarga o abre el reporte, se ejecuta el comando.
- **Recomendación:**
  1. Actualizar `xlsx` a la última versión estable (>=0.20.0) o migrar a `exceljs`/`papaparse` con validación estricta.
  2. Sanitizar todos los campos de texto importados eliminando caracteres de inicio de fórmula (`=`, `+`, `-`, `@`, `\t`, `\r`).
  3. No permitir que los valores importados comiencen con `=` en ninguna columna.
- **Estado:** ⚠️ Parcialmente corregido (2026-05-01) — Sanitización implementada en `lib/actions/import.ts`. Actualización de `xlsx` no posible (última versión en npm sigue siendo 0.18.5).

### H-ALT-002 — `proxy.ts` falla abierta en verificación de suscripción

- **Severidad:** Alta
- **Activo:** `proxy.ts`, función `checkSubscription`
- **Evidencia:**
  ```ts
  if (!url || !key) {
    console.log("[checkSubscription] Missing env vars, allowing access")
    return "ok"
  }
  // ...
  if (!res.ok) {
    console.error("[checkSubscription] Supabase request failed:", res.status)
    return "ok"
  }
  // ...
  } catch (err) {
    console.error("[checkSubscription] Error:", err)
    return "ok"
  }
  ```
- **Impacto:** Si las variables de entorno faltan, Supabase no responde, o hay un error de red, el proxy permite el acceso a usuarios con suscripción vencida o suspendida.
- **Escenario:** Durante un incidente de red o un deploy mal configurado, usuarios suspendidos acceden al dashboard y pueden manipular datos.
- **Recomendación:** Cambiar comportamiento a **fail-closed**. Si no se puede verificar el estado de suscripción, redirigir a `/acceso-suspendido` o `/auth/login`. Solo permitir acceso cuando `checkSubscription` devuelva explícitamente `"ok"`.
- **Estado:** ✅ Corregido (2026-05-01)

### H-ALT-003 — Fuerza bruta en verificación de OTP admin sin rate limiting

- **Severidad:** Alta
- **Activo:** `lib/actions/admin-otp.ts`, función `verifyAdminOTP`
- **Evidencia:** La función `sendAdminOTP` tiene rate limiting (3 códigos / 10 min), pero `verifyAdminOTP` no tiene límite de intentos de verificación. El OTP es numérico de 6 dígitos (espacio de 1,000,000 combinaciones).
- **Impacto:** Un atacante con acceso a la cuenta de email del admin podría hacer fuerza bruta sobre el OTP sin ser bloqueado.
- **Escenario:** Atacante intercepta o adivina credenciales del admin, inicia sesión, y realiza miles de requests a `verifyAdminOTP` hasta acertar.
- **Recomendación:**
  1. Agregar rate limiting en `verifyAdminOTP` (máximo 5 intentos fallidos por ventana de 15 minutos).
  2. Considerar aumentar a OTP de 8 dígitos o usar tokens alfanuméricos de mayor entropía.
  3. Bloquear temporalmente la cuenta admin tras N intentos fallidos consecutivos.
- **Estado:** ✅ Corregido (2026-05-01) — Rate limiting de 5 intentos implementado. OTP aumentado a 8 dígitos.

### H-ALT-004 — Cookie `isAdmin` sin `httpOnly` es manipulable por XSS

- **Severidad:** Alta
- **Activo:** `lib/actions/auth.ts`, función `loginTaller` (líneas 214-221)
- **Evidencia:**
  ```ts
  cookieStore.set("isAdmin", "true", {
    httpOnly: true,  // CORREGIDO: sí es httpOnly en auth.ts
    // ...
  })
  ```
  **Actualización:** En `loginTaller` sí se establece `httpOnly: true`. Sin embargo, la cookie `tallerName` no usa `httpOnly`.
- **Impacto:** Si un atacante logra ejecutar XSS en la aplicación, puede leer `tallerName` y potencialmente manipular la interfaz para engañar al usuario. Aunque no es crítico por sí solo, sumado a otras vulnerabilidades XSS potenciales, amplifica el impacto.
- **Recomendación:** Establecer `httpOnly: true` en `tallerName` si no se necesita en JavaScript del cliente. Si se necesita para UI, considerar usar un token JWT firmado o almacenar solo en memoria.
- **Estado:** Abierto (reclasificado desde original)

### H-ALT-005 — `deleteTallerAccount` en admin.ts no verifica autenticación de admin

- **Severidad:** Alta
- **Activo:** `lib/actions/admin.ts`, función `deleteTallerAccount`
- **Evidencia:**
  ```ts
  export async function deleteTallerAccount(tallerId: string) {
    const supabase = await createClient() // createAdminClient alias
    // No hay verificación de que el usuario actual sea admin
    await Promise.allSettled([...])
    await supabase.from("taller_users").delete().eq("id", tallerId)
  }
  ```
- **Impacto:** Aunque el proxy (`proxy.ts`) protege las rutas `/admin/*`, si alguna Server Action de admin se importa o expone accidentalmente en una ruta no protegida, un atacante autenticado podría eliminar cualquier taller.
- **Escenario:** Error de routing o importación circular expone `deleteTallerAccount` como endpoint público.
- **Recomendación:** Agregar verificación explícita de admin al inicio de cada Server Action en `lib/actions/admin.ts`:
  ```ts
  const tallerId = await getCurrentTallerId()
  if (!await isAdmin(tallerId)) throw new Error("ADMIN_UNAUTHORIZED")
  ```
- **Estado:** ✅ Corregido (2026-05-01)

### H-ALT-006 — `uploadProductImage` permite upsert sobre archivos de otros tenants

- **Severidad:** Alta
- **Activo:** `lib/actions/productos.ts`, función `uploadProductImage` (líneas 302-447)
- **Evidencia:**
  ```ts
  const filePath = `${tallerId}/${safeProductId}.webp`
  const { error, data } = await admin.storage.from(PRODUCT_PHOTOS_BUCKET).upload(filePath, blob, {
    contentType: "image/webp",
    upsert: true,
  })
  ```
  Usa `createAdminClient()` y no verifica que el `productId` pertenezca al `tallerId` antes de subir.
- **Impacto:** Un atacante con un productId válido de otro tenant podría sobreescribir la imagen de ese producto.
- **Escenario:** Usuario A adivina o conoce el UUID del producto del usuario B. Llama a `uploadProductImage` con ese ID. La imagen del producto B se sobreescribe.
- **Recomendación:**
  1. Antes de subir, verificar que el producto existe y pertenece al taller:
     ```ts
     const { data: product } = await tenantClient.from("productos").select("id").eq("id", productId).eq("taller_id", tallerId).single()
     if (!product) return { success: false, error: "Producto no encontrado" }
     ```
  2. Usar `createCurrentTenantClient()` en lugar de `createAdminClient()` para la subida (si las políticas RLS de storage lo permiten).
- **Estado:** ✅ Corregido (2026-05-01)

### H-ALT-007 — `uploadRepairPhotos` usa admin client sin verificar propiedad de reparación

- **Severidad:** Alta
- **Activo:** `lib/actions/repairs.ts`, función `uploadRepairPhotos` (líneas 163-221)
- **Evidencia:** Usa `createAdminClient()` para subir fotos. Recibe `repairId` y `tallerId` pero no verifica que la reparación pertenezca al taller antes de subir.
- **Impacto:** Similar a H-ALT-006. Podría sobreescribir fotos de reparaciones ajenas si se conoce el UUID.
- **Recomendación:** Verificar propiedad de la reparación con tenant client antes de usar admin client para storage. O mejor: usar signed upload URLs con RLS.
- **Estado:** ✅ Corregido (2026-05-01)

### H-ALT-008 — `getTrackingPhotoUrls` usa admin client innecesariamente

- **Severidad:** Alta
- **Activo:** `lib/actions/repairs.ts`, función `getTrackingPhotoUrls` (líneas 595-646)
- **Evidencia:**
  ```ts
  const supabase = await createAdminClient()
  const { data: repair } = await supabase
    .from("reparaciones")
    .select("fotos, clientes(telefono)")
    .eq("id", ticketId)
    .maybeSingle()
  ```
  Usa admin client para una operación de lectura que debería hacerse mediante RPC pública o RLS con token de tracking.
- **Impacto:** Si la validación de `last4` tiene un bug, el admin client expondría todas las fotos de todas las reparaciones.
- **Recomendación:** Usar la RPC `get_tracking_info` (que ya existe y valida `last4`) para obtener las fotos, o crear una RPC dedicada `get_tracking_photos` que valide `last4` internamente y devuelva signed URLs. Nunca usar admin client desde rutas públicas.
- **Estado:** ✅ Corregido (2026-05-01) — Reemplazado por RPC pública `get_tracking_info`.

### H-ALT-009 — No hay invalidación de sesiones al cambiar contraseña

- **Severidad:** Alta
- **Activo:** `lib/actions/auth.ts`, función `changeOwnerPassword` (líneas 365-411)
- **Evidencia:** Tras actualizar `password_hash` en la base de datos, no se invalidan las cookies existentes ni las sesiones activas en otros dispositivos.
- **Impacto:** Si una cuenta es comprometida y el usuario legítimo cambia su contraseña, el atacante mantiene el acceso indefinidamente (hasta que expire la cookie en 30 días).
- **Escenario:** Usuario cambia contraseña desde su dispositivo. El atacante que robó la sesión en otro dispositivo sigue teniendo acceso al dashboard.
- **Recomendación:**
  1. Implementar un campo `session_version` o `password_changed_at` en `taller_users`.
  2. Validar esta marca en `proxy.ts` y en `getCurrentTallerId()`.
  3. Al cambiar contraseña, rotar el valor y forzar re-login en todos los dispositivos.
- **Estado:** Abierto

---

## Hallazgos de Severidad Media

### H-MED-001 — `bcryptjs` v2.4.3 susceptible a timing attacks

- **Severidad:** Media
- **Activo:** `package.json`
- **Evidencia:** `"bcryptjs": "^2.4.3"`. Esta versión usa comparación de strings estándar en lugar de comparación constant-time para hashes.
- **Impacto:** Un atacante con capacidad de medir tiempos de respuesta podría inferir información sobre el hash almacenado.
- **Recomendación:** Migrar a `bcrypt` (nativo) o actualizar a una versión de `bcryptjs` que use comparación constant-time, o preferir `argon2`.
- **Estado:** Abierto

### H-MED-002 — Rate limiting falla abierta

- **Severidad:** Media
- **Activo:** `lib/auth/rate-limit.ts`
- **Evidencia:**
  ```ts
  if (error) {
    console.error("[rate-limit] Error checking rate limit:", error.message)
    return { allowed: true }
  }
  ```
- **Impacto:** Si la tabla `auth_rate_limits` no existe o hay error de conexión, no hay protección contra fuerza bruta.
- **Recomendación:** Cambiar a fail-closed. Si hay error, bloquear el acceso y notificar al administrador.
- **Estado:** ✅ Corregido (2026-05-01)

### H-MED-003 — OTP admin de 6 dígitos numéricos tiene entropía limitada

- **Severidad:** Media
- **Activo:** `lib/actions/admin-otp.ts`
- **Evidencia:** `const code = String(randomInt(0, 1_000_000)).padStart(6, "0")` → 1 millón de combinaciones.
- **Impacto:** Con suficientes intentos (y sin rate limiting en verificación, ver H-ALT-003), es factible adivinar el código.
- **Recomendación:** Aumentar a 8 dígitos o usar tokens alfanuméricos de 32+ caracteres para flujos de recuperación.
- **Estado:** ✅ Corregido (2026-05-01) — OTP aumentado a 8 dígitos.

### H-MED-004 — `proxy.ts` expone `SUPABASE_SERVICE_ROLE_KEY` en strings de fetch

- **Severidad:** Media
- **Activo:** `proxy.ts`
- **Evidencia:** El proxy construye manualmente requests HTTP con `SUPABASE_SERVICE_ROLE_KEY` en headers en lugar de usar `createAdminClient()`.
- **Impacto:** Menor encapsulamiento. Si el proxy se loggea o hay un error que expone la URL construida, la service role key podría filtrarse en logs.
- **Recomendación:** Refactorizar `checkSubscription`, `hasTallerProfile` y `fetchTallerNombre` para usar `createAdminClient()` en lugar de fetch manual.
- **Estado:** Abierto

### H-MED-005 — Importación masiva no sanitiza fórmulas maliciosas

- **Severidad:** Media
- **Activo:** `lib/actions/import.ts`
- **Evidencia:** Los campos de texto (`cliente_nombre`, `marca`, `modelo`, `falla`) se insertan directamente desde el Excel sin sanitización de caracteres de fórmula.
- **Impacto:** Si los datos importados se exportan posteriormente como CSV/Excel, las fórmulas maliciosas se ejecutarán en el cliente del usuario.
- **Recomendación:** Sanitizar todos los campos de texto eliminando prefijos `=`, `+`, `-`, `@` al inicio de los valores.
- **Estado:** ✅ Corregido (2026-05-01) — Función `sanitizeImportField` agregada a `lib/actions/import.ts`.

### H-MED-006 — Datos sensibles persistidos en IndexedDB sin cifrado

- **Severidad:** Media
- **Activo:** `lib/offline/idb-offline.ts`, `lib/offline/nueva-reparacion-draft.ts`, `lib/offline/photo-data-url.ts`
- **Evidencia:** Borradores de reparaciones, fotos en base64, y datos de clientes se almacenan en IndexedDB sin encriptación.
- **Impacto:** Si el dispositivo es compartido o comprometido, un atacante con acceso físico al navegador puede extraer PII, fotos de dispositivos, y potencialmente patrones de desbloqueo.
- **Recomendación:**
  1. Cifrar datos sensibles en IndexedDB usando una clave derivada de la sesión del usuario.
  2. Implementar limpieza automática de borradores antiguos (>7 días).
  3. No persistir `pin_contrasena`, `patron_desbloqueo`, ni `security_value` en modo offline.
- **Estado:** Abierto

### H-MED-007 — `crearVenta` no valida que `caja_id` pertenezca al tenant

- **Severidad:** Media
- **Activo:** `lib/actions/ventas.ts`
- **Evidencia:** `crearVenta` recibe `caja_id` en el input y lo usa directamente para insertar en `ventas` y actualizar `caja`.
- **Impacto:** Un atacante podría registrar ventas en la caja de otro taller si conoce su `caja_id`.
- **Recomendación:** Validar que `caja_id` pertenezca al `tallerId` actual antes de usarlo:
  ```ts
  const { data: caja } = await supabase.from("caja").select("id").eq("id", input.caja_id).eq("taller_id", tallerId).single()
  if (!caja) return { venta: null, error: "Caja no válida" }
  ```
- **Estado:** ✅ Corregido (2026-05-01)

### H-MED-008 — Generación de folios por count no es atómica

- **Severidad:** Media
- **Activo:** `lib/actions/ventas.ts`, función `crearVenta` (línea 977-982)
- **Evidencia:**
  ```ts
  const { count } = await supabase.from("ventas").select("id", { count: "exact", head: true }).eq("taller_id", tallerId)
  const folio = `V-${String((count ?? 0) + 1).padStart(5, "0")}`
  ```
- **Impacto:** Bajo alta concurrencia, dos ventas simultáneas podrían obtener el mismo folio.
- **Recomendación:** Usar una secuencia de PostgreSQL por tenant, o un UUID como folio, o implementar un mecanismo de bloqueo optimista.
- **Estado:** Abierto

### H-MED-009 — `updateRepair` permite cambios sin validación de permisos

- **Severidad:** Media
- **Activo:** `lib/actions/repairs.ts`, función `updateRepair` (líneas 1406-1429)
- **Evidencia:** Cualquier usuario autenticado del taller puede cambiar el presupuesto o estado de cualquier reparación del mismo taller. No hay validación de rol (técnico vs propietario).
- **Impacto:** Un técnico podría modificar presupuestos o estados sin autorización.
- **Recomendación:** Implementar y verificar `ROLE_PERMISSIONS` antes de permitir mutaciones críticas. Reutilizar el sistema de roles de `lib/actions/roles.ts`.
- **Estado:** Abierto

### H-MED-010 — Emails de verificación no tienen firma criptográfica adicional

- **Severidad:** Media
- **Activo:** `lib/email/send.ts`
- **Evidencia:** Los links de verificación usan solo un token aleatorio en query param: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`
- **Impacto:** Si el token se filtra (logs, historial de navegador, referrer), cualquiera puede verificar el email.
- **Recomendación:**
  1. Agregar un parámetro de firma HMAC (`?token=X&sig=HMAC(token, secret)`) para validar integridad.
  2. O usar JWT de corta duración (15 min) para verificación.
  3. Marcar los tokens como usados (single-use) y no reutilizables.
- **Estado:** Abierto

---

## Hallazgos de Severidad Baja

### H-BAJ-001 — No hay paginación en `getAllTalleres` del admin

- **Severidad:** Baja
- **Activo:** `lib/actions/admin.ts`
- **Evidencia:** `getAllTalleres` carga todos los talleres en memoria.
- **Impacto:** Degradación de performance con muchos tenants. No es un riesgo de seguridad directo pero puede usarse para DoS de memoria.
- **Recomendación:** Agregar paginación server-side.
- **Estado:** Abierto

### H-BAJ-002 — `tallerName` cookie sin `httpOnly`

- **Severidad:** Baja
- **Activo:** `lib/actions/auth.ts`
- **Evidencia:** `tallerName` se establece sin `httpOnly: true`.
- **Impacto:** Si hay XSS, el nombre del taller podría ser leído. Impacto limitado.
- **Recomendación:** Usar `httpOnly: true` o no usar cookie para el nombre del taller (obtenerlo del API).
- **Estado:** Abierto

### H-BAJ-003 — No hay logging de auditoría en acciones admin

- **Severidad:** Baja
- **Activo:** `lib/actions/admin.ts`
- **Evidencia:** `extendSuscripcion`, `cambiarEstatus`, `deleteTallerAccount` no registran quién ejecutó la acción.
- **Impacto:** Dificulta la investigación de incidentes.
- **Recomendación:** Crear tabla `admin_audit_log` e insertar registro en cada acción administrativa.
- **Estado:** Abierto

### H-BAJ-004 — `getTrackingTallerInfo` usa admin client sin justificación

- **Severidad:** Baja
- **Activo:** `lib/actions/repairs.ts`
- **Evidencia:** Usa `createAdminClient()` para leer `nombre_taller` de una reparación pública.
- **Impacto:** Exposición innecesaria de service role en rutas públicas.
- **Recomendación:** Mover esta lógica a una RPC pública (`get_tracking_taller_info`) que valide el ticketId.
- **Estado:** ✅ Corregido (2026-05-01) — Reemplazado por RPC pública `get_tracking_taller_info` con cliente anónimo.

### H-BAJ-005 — `next.config.mjs` hardcodea hostname de Supabase

- **Severidad:** Baja
- **Activo:** `next.config.mjs`
- **Evidencia:** `const supabaseHost = "utgitflefsybbreqcnpq.supabase.co"`
- **Impacto:** Información del tenant de infraestructura expuesta en código fuente. No es un secreto crítico pero facilita reconocimiento.
- **Recomendación:** Usar `process.env.NEXT_PUBLIC_SUPABASE_URL` para derivar el hostname.
- **Estado:** Abierto

---

## Matriz de Riesgo por Dominio

| Dominio | Crítica | Alta | Media | Baja |
|---------|---------|------|-------|------|
| Configuración / Build | 1 | 0 | 0 | 0 |
| Auth / Sesión | 0 | 2 | 1 | 1 |
| Multi-tenancy / RLS | 1 | 4 | 1 | 1 |
| Server Actions (POS, Reparaciones, Inventario) | 0 | 2 | 4 | 0 |
| Rutas Públicas (tracking, garantía) | 0 | 1 | 0 | 1 |
| Storage / Imágenes | 0 | 2 | 1 | 0 |
| Admin / Super Admin | 0 | 1 | 1 | 1 |
| Email / Notificaciones | 0 | 0 | 1 | 0 |
| Offline / IndexedDB | 0 | 0 | 1 | 0 |
| Importaciones / CSV | 0 | 1 | 1 | 0 |

---

## Recomendaciones Prioritarias (Top 10)

1. **Eliminar `ignoreBuildErrors: true`** y corregir errores TypeScript (H-CRIT-001).
2. **Auditar y reemplazar todos los `createAdminClient()`** en Server Actions de tenant por `createCurrentTenantClient()` (H-CRIT-002).
3. **Implementar fail-closed** en `proxy.ts` y `rate-limit.ts` (H-ALT-002, H-MED-002).
4. **Agregar rate limiting en `verifyAdminOTP`** y aumentar entropía del OTP (H-ALT-003).
5. **Actualizar `xlsx`** y sanitizar campos de importación contra fórmulas maliciosas (H-ALT-001, H-MED-005).
6. **Invalidar sesiones existentes** al cambiar contraseña (H-ALT-009).
7. **Verificar propiedad de recursos** (`caja_id`, `productId`, `repairId`) antes de mutaciones (H-ALT-006, H-ALT-007, H-MED-007).
8. **Cifrar datos sensibles en IndexedDB** o no persistir secretos offline (H-MED-006).
9. **Hacer atómicos los folios** usando secuencias de PostgreSQL (H-MED-008).
10. **Agregar verificación de admin** explícita en cada Server Action de `lib/actions/admin.ts` (H-ALT-005).

---

## Checklist de Cierre

- [x] Todos los hallazgos Críticos corregidos y re-auditados
- [ ] Todos los hallazgos Altos corregidos o mitigados con control compensatorio
- [ ] Pruebas manuales de IDOR entre tenants ejecutadas sin éxito (no se encontró bypass)
- [ ] Pruebas de rate limiting en auth ejecutadas (login, register, reset, admin OTP)
- [ ] Pruebas de rutas públicas ejecutadas (enumeración, fuga de información)
- [ ] Revisión de migraciones SQL para `SECURITY DEFINER` completada (no se encontraron funciones sin validación de `taller_id` en el análisis manual, pero se recomienda auditoría profunda de cada RPC)
- [ ] Dependencias críticas auditadas por CVEs
- [x] Reporte actualizado con estado "Corregido" en hallazgos resueltos

---

*Reporte generado automáticamente a partir de la ejecución de la auditoría de seguridad basada en `guia_auditoria_seguridad.md`.*
