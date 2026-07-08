# PROJECT_CONTEXT.md

> Product strategy note: see `docs/PRODUCT_STRATEGY.md` for the current ReparaHub SaaS direction, Normal/Pro plans, full Pro 30-day trial, LATAM regionalization, and separation of the Tauri/hardware side project.

> **Rol:** Principal Software Architect — Estado Maestro del Proyecto
> **Generado:** 2026-04-29
> **Propósito:** Memoria persistente de la arquitectura, módulos operativos, deuda técnica y ruta al 100% Web. Actualizar tras cada sprint significativo.

---

## Version General

- Version activa de producto: **v2.9.5**
- Fecha de actualizacion: **2026-06-20**
- Criterios y comandos: `docs/VERSIONING.md`
- Historial: `CHANGELOG.md` (actualizado por `pnpm version:bump`)

### Metodologia de incrementos (release discipline)

- Formato: `MAJOR.MINOR.PATCH`
- `MAJOR`:
  - Cambios de arquitectura o modelo de negocio que requieren migracion amplia o cambios de operacion.
  - Ejemplo: cambio de base de auth, cambio de plataforma principal, reestructura multi-tenant.
- `MINOR`:
  - Nuevas capacidades funcionales completas y listas para cliente, sin romper operacion actual.
  - Ejemplo: lanzamiento de POS Kiosko PRO, nuevo modulo core estable, flujo de caja nuevo.
- `PATCH`:
  - Correcciones, hardening, performance y ajustes UX sin cambio estructural de producto.
  - Ejemplo: fix de runtime, ajustes de copy, bugfix de tracking.

### Regla operativa de versionado

- Toda release en `main` debe dejar:
  - Version objetivo documentada en este archivo y en release notes internas.
  - Build en verde (`pnpm build`).
  - Lista corta de cambios por modulo impactado.
- Si un cambio afecta Landing y Mi Suscripcion sobre planes/comercial:
  - Se actualiza una sola fuente de verdad en codigo (`lib/plan-catalog.ts`).
  - Se valida consistencia visual y de contenido en ambos modulos.

### Registro 2.9.x reciente

- **v2.9.5**
  - shell visual del dashboard alineado al nuevo sidebar flotante
  - CTA de prueba movido al sidebar
  - `Notificaciones` y `Chat Taller` salen del sidebar y quedan reservados para versiones futuras

## 1. Arquitectura Actual

### Stack Base
| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.0 (App Router) |
| Runtime | React 19.2.4 + TypeScript 5.7.3 |
| Estilos | Tailwind CSS 4.2.0 + `tw-animate-css` |
| UI Kit | shadcn/ui (Radix UI + lucide-react) |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| Queries/ORM | Supabase JS Client v2 + Next.js Server Actions |
| Auth | JWT custom firmado con `SUPABASE_JWT_SECRET` |
| Email | Resend |
| Deploy | Vercel (auto-deploy desde `main`) |
| Gestor de paquetes | pnpm |

### Client vs Server Components
- **Server Components (default en App Router):** Layouts raíz (`app/layout.tsx`, `app/dashboard/layout.tsx`), páginas de lectura simple (tracking, garantía, print routes) y Server Actions (`lib/actions/*.ts`).
- **Client Components:** Todo lo que requiere interacción compleja lleva `"use client"` — POS (`ventas/page.tsx`), modales (`NuevoProductoModal`, `abono-modal`, etc.), firma digital (`firma-digital/[id]/page.tsx`), cámara/webcam (`camera-modal.tsx`), drag & drop (`@dnd-kit`), y formularios con `react-hook-form`.
- **Estado global:** No hay Redux/Zustand. El estado se maneja con hooks de React en client components y Server Actions para mutaciones. La persistencia offline es vía IndexedDB (`lib/offline/`).

### Multi-Tenancy & Seguridad
- Cada taller es un **tenant** aislado por `taller_id` (UUID en la mayoría de tablas; **text** en `ventas`, `caja`, `movimientos_caja`).
- **RLS activo** en todas las tablas, usando claims del JWT (no `auth.uid()` directo para tenant isolation).
- **Cookies críticas:** `tallerId` (tenant actual), `tallerName`, `isAdmin`, `reparahub_admin_verified` (2FA admin).
- **Proxy de rutas:** `proxy.ts` (antes middleware) protege `/dashboard`, `/admin`, `/onboarding` y redirige por suscripción vencida/suspendida.
- **Rate limiting:** 5 endpoints de auth protegidos (`lib/auth/rate-limit.ts`).

---

## 2. Módulos Listos (100% Operativos)

> Criterio: tiene UI funcional, Server Actions completas, flujo de usuario validado y se usa en producción.

| # | Módulo | Ruta(s) Clave | Notas Técnicas |
|---|---|---|---|
| 1 | **Autenticación & Onboarding** | `/auth/*`, `/onboarding` | Login/registro propio + Google OAuth. Verificación email vía PIN (Resend). Flujo OAuth redirige a onboarding si no existe perfil. |
| 2 | **Vista General (Dashboard)** | `/dashboard` | 4 KPIs vía RPC `get_dashboard_stats`. Layout corporativo alineado. |
| 3 | **Reparaciones** | `/dashboard/reparaciones`, `/dashboard/reparaciones/[id]` | CRUD completo, estados con historial (`historial_reparacion`), abonos, gastos por ticket, comprobantes. |
| 4 | **Clientes** | `/dashboard/clientes` | CRUD + tarjetas con historial de reparaciones integrado. |
| 5 | **Ventas (POS)** | `/dashboard/ventas` | Caja diaria, carrito, 4 métodos de pago (incluido mixto), descuento automático de stock vía `batch_decrement_stock`. |
| 6 | **Inventario** | `/dashboard/inventario` | Productos con SKU/IMEI/Serie, fotos (bucket `inventario`), importación CSV, etiquetas 2x1", margen de utilidad. |
| 7 | **Bitácora de Gastos** | `/dashboard/bitacora-gastos` | Gastos operativos con impacto directo en caja. |
| 8 | **Configuración del Taller** | `/dashboard/configuracion` | Pestañas: Taller, Mi Cuenta, Reportes y Alertas, Imprenta, Importación, Flujo PRO. |
| 9 | **Impresión Térmica / Documentos** | `/dashboard/configuracion/imprenta`, `/(print)/*` | 8 formatos soportados (ticket venta/reparación, corte, abono, etiquetas, carta, garantía). Método iframe (`lib/print.ts`). Tamaño papel configurable (`80mm`/`58mm`). |
| 10 | **Tracking Público** | `/track/[id]` (redirect desde `/tracking`) | Cliente consulta estado con últimos 4 dígitos de teléfono. Fotos de evidencia y QR. |
| 11 | **Garantía Pública** | `/garantia/[id]` | Certificado de garantía vía RPC `get_garantia_ticket`. |
| 12 | **Firma Digital** | `/firma-digital/[id]` | Captura de firma del cliente en ruta pública con token, almacenada en tabla `firma_digital`. |
| 13 | **Flujo PRO (Reparaciones Avanzado)** | `/dashboard/configuracion/flujo-pro` | Configurable por taller: checklist de diagnóstico obligatorio, firma digital requerida, fotos obligatorias. |
| 14 | **Panel Super Admin** | `/admin/*` | Gestión manual de talleres, planes, pruebas, suspensiones. Protegido con 2FA OTP (`admin-otp.ts`). |
| 15 | **Webcam / Cámara** | Integrada en flujo PRO y nueva reparación | Componente `camera-modal.tsx`. Soporte offline de fotos vía `lib/offline/photo-data-url.ts`. |

### Módulos con UI Esqueleto pero Lógica Incompleta (No 100%)
| Módulo | Ruta | Estado |
|---|---|---|
| Compras | `/dashboard/compras/*` | Páginas existentes (lista, detalle, nueva, usados), pero sin flujo de negocio completo alineado al MVP. |
| Servicios | `/dashboard/servicios` | Esqueleto visible; no integrado como catálogo de servicios en el POS. |
| Historial de Ventas | `/dashboard/historial-ventas` | UI básica; requiere filtros, exportación y detalle completo. |
| Reportes | `/dashboard/reportes` | Esqueleto; sin generación dinámica ni descarga. |
| Control de Utilidad | `/dashboard/utilidad` | Vista parcial; KPIs operativos no conectados a todas las fuentes. |
| Mi Equipo | `/dashboard/equipo` | DB lista (`roles_taller`, `miembros_taller`), acciones en `lib/actions/roles.ts` y `empleados.ts`, pero permisos aún no aplicados en toda la UI. |
| Facturación / Plan Pro | `/dashboard/facturacion` | Actualmente página de upgrade; Stripe no integrado. |

---

## 3. Reglas de Diseño (Paleta Institucional Light)

> **Obligatorio en TODO módulo nuevo o refactor.**

### Contenedor Base por Página
```tsx
<div className="min-h-screen bg-slate-50">
  <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
    {/* contenido */}
  </div>
</div>
```

### Paleta Corporativa (Estricta)
- **Fondos principales:** `bg-white`, `bg-slate-50`
- **Bordes:** `border-slate-200` / `border-gray-200`
- **Texto:** `text-slate-900`, `text-slate-700`, `text-slate-500`
- **Acentos y CTA:** `text-blue-600`, `bg-blue-600`, `hover:bg-blue-700`
- **Prohibido:** fondos oscuros (`bg-slate-900`, `bg-black`) en vistas operativas.

### Patrones Responsivos por Tipo de Módulo
- **Tablas (Reparaciones, Inventario, Bitácoras):** envolver en `w-full overflow-x-auto`.
- **POS (Ventas):** layout principal con `flex flex-col lg:flex-row gap-6`.
- **Tarjetas KPI/Resumen:** grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.

### Toast Notifications (Sonner)
- Estilo oscuro pill global: fondo `slate-900/95`, bordes redondeados `9999px`, título en `uppercase tracking-widest`.
- Iconos custom: `CheckCircle2` (emerald) para success, `XCircle` (red) para error.
- No usar `richColors`. El estilo se controla vía `toastOptions.classNames`.
- Import desde `@/hooks/use-toast` (wrapper legacy-compat).

### Botones Primarios (Glow Effect)
- Los botones de acción principal deben incluir la clase **`btn-glow`**.
- Definición en `app/globals.css` (sección "Glow premium en botones primarios").
- Ejemplo:
  ```tsx
  <Button className="bg-blue-600 hover:bg-blue-700 text-white btn-glow">Guardar</Button>
  ```

---

## 4. Deuda Técnica

### ADN Electron (Análisis de Supervivencia)
- **Resultado:** NINGÚN código de Electron sobrevive en el repositorio fuente.
- La única coincidencia de la palabra "electron" es la dependencia transitiva **`electron-to-chromium`** dentro de `pnpm-lock.yaml` y `estructura.txt` (árbol de `node_modules`).
- **Veredicto:** El runtime es 100% Web. No hay `ipcRenderer`, `ipcMain`, `contextBridge` ni referencias a procesos nativos.

### Archivos Huérfanos / Importaciones Muertas
- **`estructura.txt`:** Volcado masivo antiguo del filesystem (posiblemente generado con `tree`). No se importa en ningún lado. **Candidato a eliminación.**
- **`find-dead.js`:** Script casero para detectar archivos `.ts/.tsx` no importados. No está integrado en CI ni se ejecuta automáticamente.
- **Módulos esqueleto sin lógica de negocio:** Las páginas de `compras`, `servicios`, `reportes`, `utilidad`, `historial-ventas`, `chat` pueden contener componentes importados que solo renderizan mock data. `mercado` (Mi Tienda) ya tiene UI completa y rutas publicas en v2.3.0.
- **Meta tag `generator="v0.app"`:** Aún presente en el build/HTML. Pendiente de eliminar.

### Bases de Datos & Esquema
- **Tabla `inventario` NO existe.** El inventario vive en `productos`. Nunca usar `from("inventario")`.
- **`ventas`, `caja`, `movimientos_caja`** tienen `taller_id` como **text**, no UUID. Las políticas RLS para estas tablas NO usan `::uuid`.
- `ignoreBuildErrors: true` en `next.config.mjs`. Permite deploys con errores de TypeScript. **Deuda crítica a revertir** cuando el proyecto alcance estabilidad total.

### Seguridad & Performance Pendientes
- **CSP + Headers:** Implementados (`next.config.mjs`), pero `unsafe-inline`/`unsafe-eval` son necesarios por Next.js App Router.
- **Stripe:** No integrado. Suscripciones se gestionan manualmente desde `/admin`.
- **Tests:** No hay tests automatizados configurados.
- **Emails transaccionales:** Bienvenida y aviso de vencimiento (3 días antes) aún no implementados en producción.
- **SPF DNS:** Pendiente para Resend (afecta entregabilidad).

---

## 5. Próximos Pasos — Ruta al 100% Web (MVP Cerrado → V1.1)

### Fase A: Cierre de MVP (Hotfixes)
1. Eliminar meta tag `generator="v0.app"`.
2. Configurar registro SPF en DNS para dominio de Resend.
3. Implementar emails: bienvenida post-registro y aviso de vencimiento de prueba.
4. Prueba física completa de todos los formatos de impresión en impresora térmica real.
5. Verificar flujo de página `acceso-suspendido` con redirecciones correctas desde `/dashboard`.

### Fase B: V1.1 — Módulos con Lógica Parcial
6. **Compras:** Completar flujo de compra a proveedores, usados y registro de entrada a inventario.
7. **Historial de Ventas:** Filtros por fecha/método de pago, detalle de ticket, exportación.
8. **Reportes:** Generación dinámica (PDF/Excel) y descarga de reportes operativos.
9. **Control de Utilidad:** Conectar KPIs con costos reales de reparaciones y ventas.
10. **Servicios:** Crear catálogo de servicios y permitir agregarlos al carrito del POS.
11. **Mi Equipo:** Terminar UI de invitación/roles y aplicar `ROLE_PERMISSIONS` en Server Actions y UI (ocultar botones, proteger rutas).

### Fase C: V1.1 — Monetización & Robustez
12. **Stripe:** Integrar checkout para suscripción mensual/anual ($189 MXN / $1,699 MXN anual) y reemplazar gestión manual en `/admin`.
13. **Type Safety:** Quitar `ignoreBuildErrors: true` de `next.config.mjs` y corregir todos los errores de TypeScript restantes.
14. **Dead Code Cleanup:** Ejecutar `find-dead.js`, auditar resultados y eliminar archivos realmente huérfanos.
15. **Testing:** Agregar tests mínimos críticos (auth, flujo de venta, flujo de reparación, corte de caja).

### Fase D: V2.0 — Futuro
16. **Mi Tienda** (release v2.3.0, antes `Mercado`) — tienda publica por tenant en `/t/<slug>` y `/t/<slug>/p/<productoId>`. Limites 5/50 productos (NORMAL/PRO), branding "Hecho con ReparaHub" en NORMAL, sin comisiones ni pasarela. Ver `docs/COMPLIANCE_TIENDA.md`.
17. **Chat Taller** (`/dashboard/chat`).
18. **Dispositivos** (módulo de catálogo de equipos, descartado temporalmente por redundancia con Reparaciones).

---

## 6. Referencias Rápidas de Desarrollo

### Comandos
```bash
pnpm dev     # localhost:3000
pnpm build   # producción
pnpm lint    # ESLint
```

### Clientes Supabase (Reglas de Oro)
- **Tenant (99% de casos):** `createCurrentTenantClient()` o `createTenantClient(tallerId)`.
- **Admin / Tracking público:** `createAdminClient()` (única excepción permitida).
- **Nunca usar `createAdminClient()`** en Server Actions de tenant.

### Impresión
- Siempre usar `imprimirTicket()` desde `lib/print.ts` (método iframe para impresoras térmicas USB).

### WhatsApp
- Links deben usar: `https://api.whatsapp.com/send?phone=52XXXXXXXXXX` (compatible con WA Business).
- Todo mensaje o plantilla de WhatsApp dirigido a un cliente debe terminar con la firma exacta `_Organizado por ReparaHub.net_`.
- Usar `buildCustomerWhatsAppUrl()` o `withReparaHubWhatsAppSignature()` desde `lib/whatsapp-utils.ts` para que la firma sea consistente e idempotente.
- No aplicar esta firma a reportes internos, cortes al responsable, soporte de ReparaHub ni mensajes que el cliente envia al taller desde tracking.

### Offline
- IndexedDB en `lib/offline/` almacena borradores de reparación y cola de sync. Falla silenciosamente si no está disponible.

---

*Documento generado automáticamente a partir del análisis del Filesystem MCP, `package.json`, App Router y reglas del proyecto definidas en `AGENTS.md` y `CLAUDE.md`.*
