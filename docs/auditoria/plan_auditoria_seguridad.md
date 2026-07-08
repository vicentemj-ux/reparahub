# Plan de Auditoría de Seguridad — ReparaHub

> Generado: 2026-05-01
> Basado en: `guia_auditoria_seguridad.md`

---

## 1. PLAN DE EJECUCIÓN

La auditoría se ejecutará en 7 fases, siguiendo el orden sugerido en la guía oficial:

### Fase 1: Configuración, secretos y superficie pública
- Revisar `next.config.mjs`, `proxy.ts`, `package.json`, `app/layout.tsx`
- Validar CSP, headers de seguridad, exposición de secretos en cliente
- Verificar `ignoreBuildErrors` y configuraciones de riesgo

### Fase 2: Autenticación, JWT, onboarding y rate limiting
- Revisar `lib/actions/auth.ts`, `lib/auth-server.ts`, `lib/auth/get-current-taller.ts`
- Revisar `lib/auth/rate-limit.ts`, `lib/actions/admin-otp.ts`
- Revisar flujos de login, registro, recuperación de contraseña, verificación de email
- Revisar panel super admin (`app/admin/*`) y MFA OTP

### Fase 3: RLS, migraciones SQL y aislamiento por `taller_id`
- Revisar `lib/supabase/admin.ts`, `lib/supabase/server.ts`, `lib/supabase/tenant-client.ts`
- Auditar migraciones SQL críticas (RLS, funciones `SECURITY DEFINER`, triggers, RPC)
- Verificar consistencia de tipos de `taller_id` (UUID vs text)

### Fase 4: Server Actions críticas
- Revisar `lib/actions/repairs.ts`, `lib/actions/ventas.ts`, `lib/actions/productos.ts`
- Revisar `lib/actions/clients.ts`, `lib/actions/gastos.ts`, `lib/actions/admin.ts`
- Validar derivación de `taller_id` desde sesión, validación Zod, manejo de errores

### Fase 5: Rutas públicas y semipúblicas
- Revisar `app/track/[id]/page.tsx`, `app/garantia/[id]/page.tsx`
- Revisar `app/firma-digital/[id]/page.tsx`, `app/(print)/*`
- Validar enumeración, fuga de información, acceso sin autorización

### Fase 6: Storage, importaciones, imágenes, emails y offline
- Revisar `lib/storage.ts`, `lib/image-optimizer.ts`, `lib/actions/import.ts`
- Revisar `lib/email/send.ts`, `lib/email/templates.tsx`
- Revisar `lib/offline/*` y persistencia local de datos sensibles

### Fase 7: Revalidación y cierre
- Consolidar hallazgos con evidencia reproducible
- Priorizar por severidad (Crítica, Alta, Media, Baja)
- Proponer remediaciones verificables

---

## 2. LISTA DE TAREAS

### Fase 1 — Configuración y Superficie Pública
- [ ] Leer y analizar `next.config.mjs` (CSP, headers, ignoreBuildErrors)
- [ ] Leer y analizar `proxy.ts` (protección de rutas, redirecciones)
- [ ] Leer y analizar `package.json` (dependencias críticas, scripts)
- [ ] Leer y analizar `app/layout.tsx` (meta tags, fuentes, providers)
- [ ] Verificar que no existan secretos en variables `NEXT_PUBLIC_*`
- [ ] Verificar que no existan credenciales hardcodeadas en código cliente

### Fase 2 — Autenticación y Sesión
- [ ] Leer y analizar `lib/actions/auth.ts`
- [ ] Leer y analizar `lib/auth-server.ts`
- [ ] Leer y analizar `lib/auth/get-current-taller.ts`
- [ ] Leer y analizar `lib/auth/rate-limit.ts`
- [ ] Leer y analizar `lib/actions/admin-otp.ts`
- [ ] Leer y analizar `app/auth/super-admin/page.tsx`
- [ ] Leer y analizar `app/admin/verify/page.tsx`
- [ ] Verificar expiración y validación de JWT
- [ ] Verificar rate limiting en endpoints de auth
- [ ] Verificar que `taller_id` y claims no sean manipulables desde cliente

### Fase 3 — Multi-Tenancy y Supabase
- [ ] Leer y analizar `lib/supabase/admin.ts`
- [ ] Leer y analizar `lib/supabase/server.ts`
- [ ] Leer y analizar `lib/supabase/tenant-client.ts`
- [ ] Revisar migraciones SQL de RLS (seleccionar las más críticas)
- [ ] Verificar que `admin.ts` no se use en Server Actions de tenant
- [ ] Verificar consistencia de tipos `taller_id` en tablas críticas
- [ ] Verificar funciones RPC por seguridad (`SECURITY DEFINER`)

### Fase 4 — Server Actions Críticas
- [ ] Leer y analizar `lib/actions/repairs.ts`
- [ ] Leer y analizar `lib/actions/ventas.ts`
- [ ] Leer y analizar `lib/actions/productos.ts`
- [ ] Leer y analizar `lib/actions/clients.ts`
- [ ] Leer y analizar `lib/actions/gastos.ts`
- [ ] Leer y analizar `lib/actions/admin.ts`
- [ ] Validar que `taller_id` se derive de sesión, no de parámetros
- [ ] Validar uso de Zod en entradas sensibles
- [ ] Validar manejo de errores sin filtrado de información

### Fase 5 — Rutas Públicas
- [ ] Leer y analizar `app/track/[id]/page.tsx`
- [ ] Leer y analizar `app/garantia/[id]/page.tsx`
- [ ] Leer y analizar `app/firma-digital/[id]/page.tsx`
- [ ] Leer y analizar rutas de impresión `app/(print)/*`
- [ ] Verificar enumeración de IDs en recursos públicos
- [ ] Verificar minimización de datos expuestos públicamente

### Fase 6 — Storage, Email, Offline
- [ ] Leer y analizar `lib/storage.ts` y `lib/storage-server.ts`
- [ ] Leer y analizar `lib/image-optimizer.ts`
- [ ] Leer y analizar `lib/actions/import.ts`
- [ ] Leer y analizar `lib/email/send.ts` y `lib/email/templates.tsx`
- [ ] Leer y analizar `lib/offline/*`
- [ ] Verificar sanitización de archivos subidos
- [ ] Verificar que emails no filtren información sensible

### Fase 7 — Reporte
- [ ] Consolidar todos los hallazgos
- [ ] Clasificar por severidad (Crítica, Alta, Media, Baja)
- [ ] Documentar evidencia, impacto, escenario y recomendación por hallazgo
- [ ] Generar `reporte_auditoria_seguridad.md`

---

## 3. CRONOGRAMA ESTIMADO

| Fase | Duración Estimada |
|------|-------------------|
| Fase 1 | 15 min |
| Fase 2 | 30 min |
| Fase 3 | 30 min |
| Fase 4 | 45 min |
| Fase 5 | 30 min |
| Fase 6 | 20 min |
| Fase 7 | 20 min |
| **Total** | **~3 horas** |

---

*Este plan es un documento vivo. Se actualizará conforme avance la ejecución de la auditoría.*
