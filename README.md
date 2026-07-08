# ReparaHub.net

> SaaS multitenant para talleres de reparación, tiendas de accesorios, equipos y servicios técnicos. Combina gestión de reparaciones, punto de venta (POS), inventario, clientes, bitácora de gastos, caja y reportería en una sola plataforma mobile-first.

**Versión actual:** 2.3.5 (SaaS web en producción)
**Sitio público:** [reparahub.net](https://reparahub.net)
**Audiencia objetivo:** Reparadoras de celulares, computación, consolas, electrónica, refacciones y servicios en LATAM.

---

## Tabla de contenidos

1. [Visión general del producto](#visión-general-del-producto)
2. [Stack tecnológico](#stack-tecnológico)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Instalación y configuración local](#instalación-y-configuración-local)
5. [Arquitectura de datos](#arquitectura-de-datos)
6. [Decisiones arquitectónicas relevantes para auditoría](#decisiones-arquitectónicas-relevantes-para-auditoría)
7. [Áreas de atención para el equipo auditor](#áreas-de-atención-para-el-equipo-auditor)
8. [Scripts disponibles](#scripts-disponibles)
9. [Variables de entorno](#variables-de-entorno)
10. [Licencia y contacto](#licencia-y-contacto)

---

## Visión general del producto

ReparaHub centraliza la operación diaria de un taller:

| Módulo | Propósito | Plan |
|--------|-----------|------|
| **Vista general** | KPIs del día, alertas operativas | Normal / Pro |
| **Ventas (POS)** | Punto de venta con búsqueda unificada, cobros mixtos, arqueo | Normal / Pro |
| **Reparaciones** | Tickets, estados, IMEI/Serie, historial por cliente | Normal / Pro |
| **Historial de ventas** | Anulación, reimpresión de tickets, filtros | Normal / Pro |
| **Inventario** | Productos, IMEI únicos, categorías, importación CSV | Normal / Pro |
| **Clientes** | Base de datos, vinculaciones a ventas y reparaciones | Normal / Pro |
| **Caja (corte)** | Arqueo, cierre maestro, movimientos auditables | Normal / Pro |
| **Bitácora de gastos** | Gastos operativos y de reparación | Normal / Pro |
| **Mi equipo** | Usuarios del taller y roles | Normal / Pro |
| **Configuración** | Datos del taller, impresoras, WhatsApp, planes | Normal / Pro |
| **Bitácora de visitas** | Registro de atención al público (Pro) | Pro |
| **Chat de taller** | Mensajería interna (Pro) | Pro |
| **Compras** | Compras a proveedores y de usado (Pro) | Pro |
| **Control de utilidad** | Margen por venta/reparación (Pro) | Pro |
| **Mercado, Reportes, Servicios** | Marketplace/reportería/servicios (Pro) | Pro |

**Modelo de negocio:** Suscripción mensual con prueba gratuita de 30 días (Pro completo). Mercado inicial: México, expansión LATAM.

---

## Stack tecnológico

### Frontend
- **Next.js 16.2** (App Router, RSC, Server Actions)
- **React 19.2**
- **TypeScript 5.7** (modo estricto)
- **Tailwind CSS 4.2** + `tailwind-merge` + `clsx`
- **Radix UI** (composables accesibles sin estilos) + componentes propios
- **lucide-react** para iconografía
- **framer-motion** para animaciones declarativas
- **Sonner** para toasts
- **react-to-print** para impresión de tickets 80mm

### Backend / Datos
- **Supabase** como BaaS: Postgres, Auth, Storage, Realtime
- **Prisma 7.8** como ORM (driver `pg` directo para queries pesados, `@prisma/adapter-pg`)
- **Zod** para validación de payloads en Server Actions
- **jose** para firma/verificación de JWT
- **bcryptjs** para hashing de credenciales locales
- **Resend** para email transaccional

### Autenticación
- **NextAuth 4.24** + `@auth/prisma-adapter` (credenciales + Google OAuth vía Supabase)
- **JWT propio** firmado con `SUPABASE_JWT_SECRET` que lleva `taller_id` (tenant) como claim

### Desktop (roadmap, version standalone)
- **Tauri 2** + shell Rust. La version desktop es **standalone**, no para uso publico; vive fuera de este repo y esta pensada para talleres seleccionados del dueno. Ver `AGENTS.md` → "Versionado y Roadmap Tauri" para los puntos de integracion y arquitectura objetivo.

### Despliegue
- **Vercel** (web)
- Variables de entorno centralizadas (ver sección [Variables de entorno](#variables-de-entorno))

---

## Estructura del proyecto

```
reparahub/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Rutas públicas: login, registro, recuperación
│   ├── dashboard/                # Rutas privadas post-login
│   │   ├── ventas/               # POS
│   │   ├── reparaciones/         # Tickets
│   │   ├── inventario/           # Productos
│   │   ├── corte/                # Cierre de caja
│   │   ├── clientes/             # Base de clientes
│   │   ├── historial-ventas/
│   │   ├── bitacora-gastos/
│   │   ├── bitacora-visitas/     # Pro
│   │   ├── reportes/             # Pro
│   │   ├── mercado/              # Pro
│   │   └── configuracion/
│   ├── api/                      # Route handlers (webhooks, auth callbacks)
│   ├── track/[id]/               # Tracking público de reparaciones
│   ├── print-ticket/[id]/        # Render server-side de tickets
│   ├── print-label/              # Render de etiquetas
│   ├── privacidad/               # Páginas legales
│   └── layout.tsx                # Layout raíz
│
├── components/
│   ├── ui/                       # Primitivas: Button, Input, Dialog, etc.
│   ├── dashboard/                # Componentes por módulo
│   │   ├── ventas/
│   │   ├── reparaciones/
│   │   ├── inventario/
│   │   ├── corte/
│   │   └── .../
│   ├── print-templates/          # Plantillas de tickets (ESC/POS)
│   └── auth/                     # Wrappers de sesión
│
├── lib/
│   ├── actions/                  # Server Actions por dominio
│   │   ├── ventas-prisma.ts
│   │   ├── repairs-prisma.ts
│   │   ├── productos-prisma.ts
│   │   ├── gastos-prisma.ts
│   │   ├── caja-prisma.ts
│   │   └── .../
│   ├── auth/                     # Helpers de sesión y tenant
│   ├── offline/                  # IndexedDB para borradores offline
│   ├── print/                    # Lógica de impresión
│   ├── validators/               # Schemas Zod reutilizables
│   ├── image-optimizer.ts        # Compresión client-side
│   └── whatsapp-utils.ts
│
├── hooks/                        # Hooks React reutilizables
│
├── prisma/
│   ├── schema.prisma             # Modelo de datos
│   └── migrations/               # Historial de migraciones
│
├── scripts/                      # Scripts administrativos (seed, maintenance)
│
├── types/                        # Tipos TypeScript compartidos
│
├── docs/                         # Documentación interna
│
├── public/                       # Assets estáticos
│
├── .env.local                    # Variables de entorno (no commiteado)
├── next.config.mjs
├── prisma.config.ts
├── tailwind.config.* (vía PostCSS)
├── tsconfig.json
└── package.json
```

### Convenciones clave

- **Server Actions** centralizadas en `lib/actions/*-prisma.ts`. Un archivo por dominio.
- **Componentes de módulo** en `components/dashboard/<modulo>/`. Los modales grandes son dumb (reciben props) y la lógica vive en `app/dashboard/<modulo>/page.tsx`.
- **Aislamiento por tenant**: todo query a base de datos filtra por `taller_id` (obtenido del JWT).
- **Multi-tenant por row-level**: una sola base de datos, RLS en Supabase para reforzar la frontera.
- **Mobile-first**: las páginas se diseñan desde el breakpoint más pequeño y se expanden con `sm:` / `md:` / `lg:`.

---

## Instalación y configuración local

### Requisitos previos

| Herramienta | Versión recomendada |
|-------------|---------------------|
| Node.js | 20 LTS o superior |
| pnpm | 9.x (gestor de paquetes elegido) |
| Git | 2.40+ |
| PostgreSQL local o cuenta Supabase | 15+ |

### 1. Clonar el repositorio

```bash
git clone https://github.com/<org>/reparahub.git
cd reparahub
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Crear un archivo `.env.local` en la raíz con las siguientes variables (los valores reales los entrega el equipo de plataforma):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# Auth
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Prisma / DB (cadena de conexión a Postgres de Supabase)
DATABASE_URL=
DIRECT_URL=

# Email transaccional
RESEND_API_KEY=

# Storage público
NEXT_PUBLIC_SUPABASE_INVENTORY_BUCKET=inventario
```

> Nunca commitear `.env.local`. El repositorio incluye `.env.example` con todas las claves esperadas.

### 4. Levantar Prisma

```bash
# Genera el cliente (necesario antes del primer build)
pnpm prisma generate

# Aplica las migraciones a la base de datos local/remota
pnpm prisma migrate deploy

# (Opcional) Cargar datos de demostración
pnpm prisma db seed
```

### 5. Levantar el servidor de desarrollo

```bash
pnpm dev
```

La aplicación quedará disponible en `http://localhost:3000`.

### 6. Build de producción

```bash
pnpm build     # ejecuta prisma generate && next build
pnpm start
```

### Solución de problemas comunes

| Problema | Solución |
|----------|----------|
| Error `PrismaClient is not generated` | `pnpm prisma generate` |
| Error de conexión a Supabase | Verificar `DATABASE_URL` y que la IP esté permitida en el dashboard |
| Build falla por RLS | Las políticas RLS están en `prisma/migrations/*/migration.sql`. Aplicar con `pnpm prisma migrate deploy` |
| ESLint v10 vs `.eslintrc` | El proyecto aún usa config legacy; usar `pnpm lint` para invocarlo correctamente |

---

## Arquitectura de datos

El modelo de datos es **multi-tenant por filas** (single-database, multi-tenant). Cada tabla relevante lleva un campo `taller_id` y las políticas de **Row Level Security (RLS)** en Postgres refuerzan la frontera a nivel de base de datos.

### Convenciones Prisma del proyecto

- Identificadores: `cuid()` para legibilidad, `uuid()` cuando se requiere interoperabilidad con Postgres nativo.
- Decimales monetarios: `Decimal @db.Decimal(12, 2)`.
- Índices: todo campo usado en `where` o `orderBy` frecuente tiene índice explícito en el schema.
- Relaciones: nombres en singular (`reparacion`, `cliente`) para legibilidad.

### Schema Prisma

> El bloque siguiente es el lugar para pegar el contenido de `prisma/schema.prisma`. Se deja vacío intencionalmente para esta entrega.

```prisma
// >>> PEGAR AQUÍ EL CONTENIDO DE prisma/schema.prisma <<<


```

### Tablas núcleo (referencia rápida)

| Tabla | Propósito | Notas |
|-------|-----------|-------|
| `Tenant` (taller) | Un taller = un cliente SaaS | Plan, trial, suscripción |
| `User` | Usuarios del taller (staff) | Rol, permisos |
| `Cliente` | Clientes finales | Vinculados a ventas/reparaciones |
| `Producto` | Catálogo + inventario | `es_equipo`, IMEI, marca, modelo |
| `Venta` | Cabecera de venta POS | Estado `activa` / `anulada` |
| `DetalleVenta` | Ítems de la venta | Especail o producto |
| `Reparacion` | Ticket de reparación | Estados: `recibido`, `diagnostico`, `presupuesto`, `en_reparacion`, `listo`, `entregado`, `no_exitosa`, `cancelado` |
| `ReparacionAbono` | Anticipos / liquidaciones | `anticipo_reparacion`, `liquidacion_reparacion` |
| `ReparacionGasto` | Inversión del taller en la reparación | Tipo, monto, IMEI/parte |
| `Caja` | Sesión de caja | `monto_inicial`, `total_efectivo`, `total_tarjeta`, `total_transferencia`, `total_gastos`, `monto_cierre` |
| `MovimientoCaja` | Bitácora inmutable de cada movimiento de caja | `venta_pdv`, `anticipo_reparacion`, `gasto`, `gasto_reparacion`, `devolucion_cancelacion`, `liquidacion` |
| `GastoOperativo` | Gastos del taller no ligados a reparación | Categoría, fecha |
| `Visita` (Pro) | Bitácora de visitas al taller | Bloquea cierre de caja si hay pendientes |
| `ConfiguracionTaller` | Datos del taller + preferencias | 1:1 con `Tenant` |

### Decisiones de modelado críticas

- **`Caja.total_efectivo` representa el total BRUTO de ventas POS en efectivo.** Los gastos se registran en `MovimientoCaja` y se restan en el momento del corte, no antes. Esta convención evita la doble resta y mantiene la auditoría consistente.
- **`MovimientoCaja` es append-only.** Las anulaciones crean un movimiento inverso en lugar de borrar el original.
- **Las cancelaciones de reparación no reembolsan inmediatamente.** El reembolso se hace al momento de la entrega sin reparación, cuando el efectivo sale de la caja.

---

## Decisiones arquitectónicas relevantes para auditoría

### Aislamiento de tenant

Todas las Server Actions obtienen `tallerId` desde el JWT firmado (`getCurrentTallerId()`). Este ID se inyecta en **todos** los `where` de Prisma. El `createAdminClient()` (Supabase service role) **solo** se usa en rutas `/admin` y `/tracking`; el resto del código usa clientes tenant-scoped.

### Manejo de la caja (transaccionalidad)

El cierre de caja sigue este flujo:

1. Calcular totales desde `MovimientoCaja` (fuente de verdad).
2. Comparar contra `monto_inicial` + ventas + abonos − gastos.
3. Bloquear si `BitacoraVisitas` tiene registros pendientes desde la apertura.
4. Transacción Prisma: marcar `Caja.estado = 'cerrada'`, setear `monto_cierre` y `fecha_cierre`.
5. Disparar evento `caja:cerrada` para invalidar caches de cliente.

### Performance POS

- Las consultas de carga inicial del POS se consolidan en un único Server Action (`loadPosMountData`) que ejecuta múltiples queries en `Promise.all` server-side.
- El modo `dynamic_best_sellers` para "Acceso rápido" se deprecó por缺乏 de índice compuesto en `DetalleVenta`; se reemplaza por `latest_added` que usa el índice existente en `Producto(createdAt)`.
- Imágenes: compresión client-side con `browser-image-compression` antes de subir, almacenamiento en Supabase Storage con bucket `inventario`.

### Mobile-first

- Layout containers: `max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6`.
- POS: `flex flex-col lg:flex-row` con carrusel debajo del catálogo en mobile.
- Tablas: contenedor con `w-full overflow-x-auto` para scroll horizontal en pantallas pequeñas.
- Acciones primarias con efecto `btn-glow` (radial-gradient + blur en `::before`).

### Impresión

- Web (SaaS): `react-to-print` con iframe (compatibilidad universal).
- Desktop (fork standalone futuro): bytes ESC/POS generados en Rust y enviados por `WritePrinter` (API Windows) — máxima calidad, sin diálogos.
- Dos impresoras configurables: `impresora_ticket` (80mm) y `impresora_etiqueta` (2x1") en `ConfiguracionTaller`.

### Seguridad

- JWT firmado con `SUPABASE_JWT_SECRET`, expiración 1h, regenerado por request.
- Rate limiting en 5 endpoints de auth.
- Todas las queries tenant-scoped filtran por `taller_id`.
- Google OAuth auto-aprovisiona `Tenant + User + ConfiguracionTaller` en el callback (`lib/auth.ts`).

---

## Áreas de atención para el equipo auditor

Estas son las zonas que el equipo interno considera prioritarias para revisión externa:

### Escalabilidad
- [ ] Índices en Prisma: confirmar que todo `where` y `orderBy` frecuente está cubierto.
- [ ] N+1 en listas: revisar `lib/actions/*-prisma.ts` buscando loops con queries internas.
- [ ] Server Actions: ¿están agrupando queries relacionadas en `Promise.all`?
- [ ] Caché: uso de `unstable_cache` y `revalidatePath` en mutaciones críticas.

### Mobile-first
- [ ] Todas las páginas tienen layout mobile verificable en 360px de ancho.
- [ ] Tablas con scroll horizontal explícito (`overflow-x-auto`).
- [ ] Toasts no tapan CTAs primarios en mobile.
- [ ] Inputs numéricos en campos monetarios tienen `inputMode="decimal"` y `pattern`.

### Transacciones de base de datos
- [ ] Cierre de caja: ¿la lectura de movimientos + escritura de cierre están en una sola transacción Prisma?
- [ ] Venta POS: ¿el incremento de `Caja.total_efectivo`, `stockActual` e inserción de `DetalleVenta` son atómicos? Hoy se hacen en 3 queries separadas.
- [ ] Cancelación de reparación: ¿se crean los movimientos inversos correctos (abonos, gastos)?
- [ ] Multi-tenant: ¿algún path omite el filtro `taller_id`?
- [ ] RLS: ¿las políticas de Supabase cubren todas las tablas tenant-scoped?

### Offline / Resiliencia
- IndexedDB en `lib/offline/` guarda borradores de reparación y cola de sync. Falla silenciosamente si no está disponible. Revisar: ¿qué pasa si el sync falla a mitad de transacción?

### Impresión / Hardware
- El fork Tauri standalone (fuera de este repo) debera reemplazar los 4 stubs (`isTauriAvailable = async () => false`) en `app/print-ticket/[id]/page.tsx`, `components/dashboard/nueva-reparacion-form.tsx`, `components/dashboard/abono-modal.tsx` y `components/dashboard/ventas/SuccessModal.tsx`. El patron de fallback (Tauri primero, web via iframe si falla) ya esta implementado en `lib/printing/repair-print-service.ts`.

---

## Scripts disponibles

```bash
pnpm dev                 # Next.js dev server (localhost:3000)
pnpm build               # prisma generate && next build
pnpm start               # Producción
pnpm lint                # ESLint
pnpm prisma generate     # Regenerar cliente Prisma
pnpm prisma migrate dev  # Crear/aplicar migración en desarrollo
pnpm prisma studio       # UI para inspeccionar la base de datos
```

---

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (solo server) | ✅ |
| `SUPABASE_JWT_SECRET` | Secreto para firmar JWT tenant-aware | ✅ |
| `RESEND_API_KEY` | API key de Resend para emails | ✅ |
| `NEXT_PUBLIC_SUPABASE_INVENTORY_BUCKET` | Bucket de Storage (default: `inventario`) | ✅ |
| `AUTH_GOOGLE_ID` | OAuth Google client ID | Opcional |
| `AUTH_GOOGLE_SECRET` | OAuth Google client secret | Opcional |
| `DATABASE_URL` | Cadena de conexión Prisma | ✅ |
| `DIRECT_URL` | Conexión directa (sin pooler) para migraciones | ✅ |
| `NEXTAUTH_SECRET` | Secreto NextAuth | ✅ |
| `NEXTAUTH_URL` | URL base de la app | ✅ |

---

## Licencia y contacto

**Licencia:** Propietaria. Todos los derechos reservados.

**Equipo:** ReparaHub (reparahub.net)
**Mantenido por:** Equipo de desarrollo interno.
**Para reportar issues de seguridad:** `security@reparahub.net`

---

> Documento vivo. Si encuentras información desactualizada, abrir un PR contra `main` con la corrección.
