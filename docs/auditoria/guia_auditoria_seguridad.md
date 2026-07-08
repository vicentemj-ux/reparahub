# Guía de Auditoría de Seguridad — ReparaHub

## Propósito

Esta guía define un método práctico para auditar la seguridad de ReparaHub, una plataforma SaaS multi-tenant para talleres de reparación de dispositivos móviles con autenticación JWT, RLS en Supabase, panel administrativo, rutas públicas de seguimiento y firma digital, además de capacidades offline.[file:1]

El objetivo es evaluar exposición, impacto y probabilidad de fallas de seguridad en los componentes críticos identificados previamente, priorizando autenticación, aislamiento entre tenants, acceso a datos, acciones del servidor, rutas públicas, impresión de documentos, almacenamiento y flujos administrativos.[file:1]

## Alcance

La auditoría debe cubrir, como mínimo, los componentes de configuración y entrada, autenticación y onboarding, dashboard, reparaciones, clientes, POS, inventario, compras, servicios, gastos, reportes, configuración del taller, equipo y roles, facturación, impresión, panel admin, clientes Supabase, soporte offline, utilidades y API routes.[file:1]

Los activos más sensibles son los datos multi-tenant ligados a `taller_id`, los JWT firmados con `SUPABASE_JWT_SECRET`, los clientes con privilegios elevados, las rutas públicas de tracking, garantía y firma digital, y los procesos administrativos con OTP.[file:1]

## Objetivos de control

- Confirmar que ningún usuario pueda leer, modificar o eliminar datos de otro tenant.[file:1]
- Verificar que toda operación sensible requiera autenticación, autorización y validación de contexto.[file:1]
- Detectar exposición de secretos, service roles, tokens de firma, URLs firmadas y datos personales.[file:1]
- Revisar que las rutas públicas no permitan enumeración, fuga de información ni bypass de validaciones.[file:1]
- Comprobar que los flujos offline, impresión y exportación no rompan las garantías de seguridad del sistema.[file:1]

## Metodología

### 1. Preparación

- Reunir variables de entorno, configuración de despliegue, acceso a Supabase, políticas RLS, migraciones y configuración de Vercel/Next.js.[file:1]
- Identificar dependencias críticas del proyecto, incluyendo Next.js 16.2.0, React 19.2.4, TypeScript 5.7.3, Supabase, jose, bcryptjs, Resend y xlsx.[file:1]
- Clasificar datos por sensibilidad: credenciales, PII de clientes, teléfonos, órdenes de reparación, firmas digitales, garantías, ventas, caja, inventario y archivos subidos.[file:1]

### 2. Descubrimiento

- Mapear superficies de ataque: páginas públicas, rutas de autenticación, Server Actions, API routes, cron jobs, impresión, generación de posters, panel admin, storage y sincronización offline.[file:1]
- Trazar flujos de identidad y sesión desde login hasta acceso a dashboard, acciones mutantes, panel super admin y rutas públicas con token.[file:1]
- Localizar dónde se construye, lee o deriva `taller_id` para validar que el aislamiento esté reforzado en backend y base de datos.[file:1]

### 3. Validación técnica

- Revisar controles en código, configuraciones y SQL para detectar autorización rota, validación insuficiente, lógica insegura y dependencias peligrosas.[file:1]
- Ejecutar pruebas manuales y automatizadas de acceso horizontal, acceso vertical, manipulación de tokens, enumeración de IDs y saltos de tenant.[file:1]
- Confirmar que cada hallazgo incluya evidencia, impacto, escenario de explotación, severidad y recomendación verificable.[file:1]

### 4. Priorización

Usar una escala simple de criticidad:

| Severidad | Criterio |
|---|---|
| Crítica | Compromete tenants, credenciales, panel admin, service role o ejecución de acciones sensibles sin control. |
| Alta | Expone PII, permite alterar ventas, reparaciones, caja, inventario o saltarse controles de autorización. |
| Media | Debilita validaciones, endurecimiento, rate limiting o logging sin compromiso inmediato total. |
| Baja | Problemas de higiene, headers, mensajes de error, deuda técnica o configuraciones mejorables. |

## Checklist por dominio

### Configuración y entrada

Revisar `package.json`, `next.config.mjs`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx` y `proxy.ts` para validar headers, CSP, exposición de variables públicas, errores ignorados en build y protección de rutas.[file:1]

Checklist:
- No usar `ignoreBuildErrors` o configuraciones equivalentes para ocultar fallas de seguridad sin control compensatorio.[file:1]
- Confirmar CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y política de `Content-Type` cuando aplique.
- Revisar que no existan secretos en variables `NEXT_PUBLIC_*` ni en código cliente.
- Verificar que `proxy.ts` aplique correctamente redirección y protección de acceso en rutas privadas.[file:1]

### Autenticación y onboarding

El proyecto usa JWT custom firmado con `SUPABASE_JWT_SECRET`, rate limiting en auth, verificación por email, recuperación de contraseña y login de super admin.[file:1]

Checklist:
- Validar expiración, issuer, audience, firma y revocación práctica de JWT.
- Confirmar que `taller_id`, rol y claims no puedan ser manipulados del lado cliente para elevar privilegios.[file:1]
- Revisar `lib/actions/auth.ts`, `lib/auth-server.ts`, `lib/auth/get-current-taller.ts` y `lib/auth/rate-limit.ts` para evitar bypass de autenticación o rate limiting débil.[file:1]
- Probar fuerza bruta, credential stuffing, reuso de tokens, recuperación de contraseña y verificación de email por enumeración de cuentas.[file:1]
- Examinar el flujo de `app/auth/super-admin/page.tsx`, `app/admin/verify/page.tsx` y `lib/actions/admin-otp.ts` para asegurar MFA efectiva y bloqueo por intentos.[file:1]

### Multi-tenancy y Supabase

La arquitectura declara aislamiento por `taller_id`, uso de RLS en todas las tablas y clientes diferenciados para servidor, cliente, admin y tenant scope.[file:1]

Checklist:
- Confirmar que cada tabla crítica tenga RLS activa y políticas restrictivas por operación (`select`, `insert`, `update`, `delete`).[file:1]
- Validar que `lib/supabase/admin.ts` solo se use en rutas estrictamente justificadas y nunca llegue al cliente.[file:1]
- Revisar migraciones SQL para funciones `SECURITY DEFINER`, vistas, RPC y triggers que puedan saltarse RLS.[file:1]
- Probar acceso cruzado modificando `taller_id`, IDs secuenciales, filtros y payloads en Server Actions.[file:1]
- Verificar que logs, reportes, métricas y búsquedas también estén aislados por tenant.[file:1]

### Server Actions y mutaciones

Gran parte del sistema opera mediante `lib/actions/*` para auth, reparaciones, ventas, clientes, inventario, compras, gastos, reportes, configuración, empleados, roles y admin.[file:1]

Checklist:
- Asegurar autenticación y autorización al inicio de cada acción sensible.
- Exigir validación de entrada con Zod o controles equivalentes antes de tocar base de datos; el proyecto ya usa Zod en validaciones de reparación.[file:1]
- Verificar que el `taller_id` se derive de la sesión del servidor y no de parámetros manipulables.[file:1]
- Buscar mass assignment, overposting, IDOR, cambios de estado inseguros y acciones no idempotentes.
- Confirmar manejo seguro de errores para no filtrar stack traces, SQL o secretos.

### Reparaciones, tracking y firma digital

El módulo de reparaciones concentra datos operativos, checklist, patrón de seguridad, firma digital, tracking público y garantías públicas.[file:1]

Checklist:
- Probar si `app/track/[id]/page.tsx`, `app/garantia/[id]/page.tsx` y `app/firma-digital/[id]/page.tsx` permiten enumeración o acceso sin validaciones suficientes.[file:1]
- Revisar `lib/reparaciones/firma-digital-url.ts` y `lib/actions/firma-digital.ts` para asegurar expiración, aleatoriedad y un solo uso cuando corresponda.[file:1]
- Confirmar que datos mostrados públicamente estén minimizados y no expongan PII, costos internos o notas privadas.[file:1]
- Revisar `lib/reparaciones/security.ts`, `pattern.ts` y componentes de patrón para evitar almacenamiento inseguro de secretos o patrones de desbloqueo.[file:1]
- Verificar que cambios de estado, entregas, abonos y presupuestos requieran permisos consistentes.[file:1]

### Clientes, POS e inventario

Estas áreas manejan PII, transacciones, stock, descuentos, arqueos y documentos imprimibles.[file:1]

Checklist:
- Confirmar autorización por rol para CRUD de clientes, ventas, arqueos, cortes y ajustes de inventario.[file:1]
- Validar integridad transaccional en decremento de stock, ventas mixtas, descuentos y ventas en espera.[file:1]
- Revisar importación CSV y manejo de Excel mediante `xlsx` para prevenir fórmulas maliciosas, inyección de celdas y archivos no confiables.[file:1]
- Auditar subida y renderizado de imágenes de inventario, optimización y almacenamiento para evitar XSS almacenado o archivos peligrosos.[file:1]

### Impresión y documentos

El sistema soporta múltiples formatos térmicos, páginas de impresión y documentos públicos o semipúblicos.[file:1]

Checklist:
- Revisar si las páginas `app/(print)/*` requieren sesión y autorización por recurso antes de renderizar documentos.[file:1]
- Confirmar que tickets, garantías, etiquetas y comprobantes no revelen datos de otros tenants ni datos excesivos.[file:1]
- Validar sanitización de contenido dinámico impreso para evitar inyección HTML/JS en plantillas.
- Verificar que utilidades de impresión no abran ventanas o iframes con contenido manipulable por terceros.[file:1]

### Panel admin y super admin

El panel admin es uno de los activos de mayor riesgo porque gestiona talleres, planes, pruebas y suspensiones mediante OTP.[file:1]

Checklist:
- Exigir separación estricta entre usuarios de tenant y cuentas administrativas.[file:1]
- Revisar hashes, secretos, OTP, expiración de códigos, anti-replay y rate limiting en login admin.[file:1]
- Verificar que ninguna ruta admin sea indexable, pública o accesible por usuarios autenticados estándar.
- Revisar acciones de suspensión, cambio de plan y gestión de tenants por trazabilidad y control de privilegios.[file:1]

### API routes y cron jobs

Existen rutas para generación de posters y cron jobs para verificar trials y reportes urgentes.[file:1]

Checklist:
- Confirmar autenticación o secretos de invocación en `app/api/cron/*`.[file:1]
- Revisar que `app/api/generate-poster/route.ts` valide entrada, tamaño, tipo de contenido y abuso computacional.[file:1]
- Verificar rate limiting, timeouts y protección contra SSRF, abuso de recursos o colas no controladas.

### Email, WhatsApp y mensajería externa

El sistema usa Resend para emails transaccionales y genera mensajes/URLs de WhatsApp.[file:1]

Checklist:
- Comprobar que plantillas de email no expongan tokens reutilizables o información sensible innecesaria.[file:1]
- Revisar que links de verificación, bienvenida, vencimiento y recuperación tengan expiración y firma adecuadas.[file:1]
- Confirmar que los mensajes de WhatsApp no filtren estados sensibles ni identificadores internos.[file:1]

### Soporte offline

El sistema usa IndexedDB para borradores, fotos en data URL y cola de sincronización.[file:1]

Checklist:
- Revisar si PII, firmas, patrones o fotos quedan persistidos sin cifrado o sin política de limpieza local.[file:1]
- Validar conflictos de sincronización, duplicados y replay de operaciones offline.
- Confirmar que el proceso de reconexión revalide permisos del usuario antes de sincronizar cambios.[file:1]

## Pruebas recomendadas

### Pruebas manuales

- IDOR entre tenants cambiando IDs de reparación, cliente, venta, compra, garantía, impresión o tracking.[file:1]
- Elevación de privilegios cambiando claims, cookies, parámetros ocultos o payloads en Server Actions.[file:1]
- Enumeración de recursos públicos y tokens de firma digital o garantía.[file:1]
- Carga de archivos o imágenes con contenido activo, extensiones dobles o MIME inconsistente.[file:1]
- Omisión de validaciones en descuentos, arqueos, abonos, cambios de estado y acciones administrativas.[file:1]

### Pruebas semiautomatizadas

- SAST sobre TypeScript/Next.js para detectar secretos, `eval`, uso inseguro de `dangerouslySetInnerHTML`, fetches inseguros y validaciones ausentes.
- DAST autenticado sobre rutas públicas, dashboard y endpoints mutantes.
- Revisión de dependencias para CVEs y paquetes abandonados; la superficie incluye librerías de auth, impresión, email, Excel y UI.[file:1]
- Análisis de migraciones Supabase para políticas débiles y funciones con privilegios elevados.[file:1]

## Evidencia y reporte

Cada hallazgo debe registrarse con esta estructura:

| Campo | Contenido esperado |
|---|---|
| ID | Clave única del hallazgo |
| Título | Descripción corta del problema |
| Severidad | Crítica, Alta, Media o Baja |
| Activo afectado | Archivo, ruta, tabla o flujo |
| Evidencia | Request, respuesta, captura, fragmento de código o política |
| Impacto | Qué puede lograr un atacante |
| Escenario | Cómo se explota paso a paso |
| Recomendación | Cambio específico y verificable |
| Estado | Abierto, mitigado, aceptado o corregido |

### Plantilla de hallazgo

```md
#### H-001 — IDOR en tracking público

- Severidad: Alta
- Activo afectado: `app/track/[id]/page.tsx`
- Evidencia: el sistema devuelve datos válidos al cambiar el identificador sin un control adicional suficiente.
- Impacto: exposición de información operativa y posible fuga de datos de clientes.
- Escenario: un atacante enumera IDs y recupera estados de reparación ajenos.
- Recomendación: reemplazar IDs predecibles por identificadores aleatorios no enumerables, exigir validación adicional y minimizar respuesta pública.
- Estado: Abierto
```

## Criterios de salida

La auditoría se considera completa cuando se revisan los dominios críticos, se prueban los flujos de autenticación y aislamiento multi-tenant, se inspeccionan RLS y clientes Supabase, se cubren rutas públicas y administrativas, y cada hallazgo tiene evidencia reproducible y remediación propuesta.[file:1]

Además, antes de cerrar el trabajo deben repetirse las pruebas sobre los hallazgos corregidos y confirmarse que los cambios no rompan controles en POS, reparaciones, impresión, inventario, email y sincronización offline.[file:1]

## Orden sugerido de ejecución

1. Configuración, secretos y superficie pública.[file:1]
2. Autenticación, JWT, onboarding y rate limiting.[file:1]
3. RLS, migraciones SQL y aislamiento por `taller_id`.[file:1]
4. Server Actions críticas de reparaciones, ventas, inventario y admin.[file:1]
5. Rutas públicas de tracking, garantía, firma e impresión.[file:1]
6. Storage, importaciones, imágenes, emails y offline.[file:1]
7. Revalidación y cierre de hallazgos.[file:1]

## Uso práctico

Esta guía puede utilizarse como base para una auditoría manual, una revisión por pares o la preparación de un pentest orientado a lógica de negocio. También sirve como checklist vivo para acompañar cambios en módulos de alto riesgo, especialmente auth, admin, reparaciones, POS, impresión y Supabase.[file:1]
