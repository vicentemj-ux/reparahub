# MODULES.md — Plan Core

> Documento funcional y técnico de los módulos que componen el **plan Core** de ReparaHub.net.
> Alcance: comportamiento esperado, reglas de negocio, funciones clave y estado de optimización móvil.
> Audiencia: equipo de desarrollo Full Stack externo encargado de la auditoría funcional, técnica y de UX.

---

## Tabla de contenidos

1. [Resumen del plan Core](#resumen-del-plan-core)
2. [Módulos cubiertos](#módulos-cubiertos)
3. [Vista General](#1-vista-general)
4. [Mi Suscripción](#2-mi-suscripción)
5. [Ventas (POS)](#3-ventas-pos)
6. [Reparaciones](#4-reparaciones)
7. [Historial de Ventas](#5-historial-de-ventas)
8. [Inventario](#6-inventario)
9. [Clientes](#7-clientes)
10. [Bitácora de Gastos](#8-bitácora-de-gastos)
11. [Mi Equipo](#9-mi-equipo)
12. [Configuración](#10-configuración)
13. [Convenciones transversales](#convenciones-transversales)
14. [Glosario técnico](#glosario-técnico)

---

## Resumen del plan Core

El **plan Core** cubre la operación completa de un taller o tienda de tecnología: desde la venta directa en mostrador (POS) hasta la gestión de órdenes de servicio, inventario, clientes, gastos y configuración del negocio. Está diseñado para talleres de 1 a 5 usuarios con un volumen moderado de operaciones (≈ 50 tickets/día, 30 ventas/día).

**Capacidades diferenciadoras frente al plan Pro:**

| Capacidad | Core | Pro |
|-----------|:----:|:---:|
| Operación básica (POS, reparaciones, inventario, clientes, caja) | ✅ | ✅ |
| Bitácora de Visitas | ❌ | ✅ |
| Chat interno | ❌ | ✅ |
| Compras / Control de utilidad | ❌ | ✅ |
| Mercado, Reportes, Servicios avanzados | ❌ | ✅ |
| Suscripción | Incluida en plan | Incluida en plan |

---

## Módulos cubiertos

| # | Módulo | Ruta interna | Estado funcional | Optimización móvil |
|---|--------|--------------|------------------|:------------------:|
| 1 | Vista General | `/dashboard` | Estable | 🟢 Mobile-first |
| 2 | Mi Suscripción | `/dashboard/suscripcion` | Estable | 🟢 Mobile-first |
| 3 | Ventas (POS) | `/dashboard/ventas` | Estable | 🟡 En refactor |
| 4 | Reparaciones | `/dashboard/reparaciones` | Estable | 🟢 Mobile-first |
| 5 | Historial de Ventas | `/dashboard/historial-ventas` | Estable | 🟢 Mobile-first |
| 6 | Inventario | `/dashboard/inventario` | Estable | 🟢 Mobile-first |
| 7 | Clientes | `/dashboard/clientes` | Estable | 🟢 Mobile-first |
| 8 | Bitácora de Gastos | `/dashboard/bitacora-gastos` | Estable | 🟢 Mobile-first |
| 9 | Mi Equipo | `/dashboard/equipo` | Estable | 🟢 Mobile-first |
| 10 | Configuración | `/dashboard/configuracion` | Estable | 🟢 Mobile-first |

Leyenda:
- 🟢 **Mobile-first**: layout responsivo estable, validado en breakpoint 360px.
- 🟡 **En refactor**: funcionalidad operativa pero con mejoras de UI/UX en curso.
- 🔴 **Pendiente**: requiere intervención antes de auditoría visual.

---

## 1. Vista General

### Descripción general
Panel de control principal al que el usuario aterriza tras autenticarse. Consolida los indicadores clave de operación (KPIs) del día en curso y acceso rápido a las acciones más frecuentes. Su objetivo es **reducir el tiempo de orientación** del operario al iniciar la jornada.

### Alcances y reglas de negocio

- **Alcance de lectura:** muestra únicamente datos del tenant activo (`taller_id` del JWT). No agrega datos entre talleres.
- **Indicadores mostrados (snapshots en tiempo real):**
  - Ventas del día (monto y número de operaciones).
  - Reparaciones activas (recibidas + en diagnóstico + en reparación + listas).
  - Reparaciones pendientes de entrega.
  - Stock crítico (productos con `stock_actual <= stock_minimo`).
  - Estado de caja (abierta/cerrada, monto inicial si está abierta).
- **Acciones rápidas:** botones contextuales según el estado (ej. "Cerrar caja" si hay caja abierta).
- **Visibilidad por rol:** usuarios con rol `viewer` ven solo KPIs; roles `admin`/`owner` ven además atajos a módulos sensibles.

### Funciones clave
- Render server-side de KPIs con cache de 30 segundos (`unstable_cache` + `revalidatePath`).
- Suscripción a cambios en caja: re-fetch automático al recibir evento `caja:cerrada`.
- Suscripción a nuevas ventas: actualización optimista del KPI en cliente.
- Drill-down: cada KPI es clickeable y filtra la vista del módulo correspondiente.
- Banner de estado de suscripción si el trial está por vencer (≤ 7 días).

### Estado de optimización móvil
- 🟢 **Mobile-first** validado.
- KPIs apilados verticalmente en < 640px, grid 2×2 en `sm:`, grid 4×N en `lg:`.
- Acciones rápidas reorganizadas en bottom-sheet en mobile.

---

## 2. Mi Suscripción

### Descripción general
Módulo de autogestión de la suscripción SaaS: plan actual, ciclo de facturación, consumo, método de pago, cambio de plan (Normal ↔ Pro) y cancelación. Es la única superficie donde el tenant interactúa con el ciclo de vida comercial del producto.

### Alcances y reglas de negocio

- **Planes disponibles:** `Normal` y `Pro`. El trial inicial de 30 días ofrece acceso Pro completo.
- **Cambio de plan:** inmutable durante el ciclo activo; el cambio aplica al inicio del siguiente ciclo.
- **Downgrade Pro → Normal:** módulos Pro se vuelven de solo lectura (no se borran datos, se oculta la entrada de menú).
- **Cancelación:** efectiva al final del ciclo en curso; el tenant sigue accediendo hasta esa fecha.
- **Reactivación:** permitida en cualquier momento antes o después de la fecha efectiva.
- **Webhook de pago:** actualización asíncrona del estado de suscripción vía Supabase Database Webhooks.

### Funciones clave
- Visualización de plan, fecha de renovación, método de pago, cargos previos.
- Flujo de upgrade Pro con prorrateo automático.
- Flujo de cancelación con confirmación de doble paso.
- Descarga de facturas / comprobantes en PDF.
- Historial de cambios de plan (auditoría).

### Estado de optimización móvil
- 🟢 **Mobile-first** validado.
- Flujo de upgrade en pasos (stepper) optimizado para una mano.
- Botones CTA primarios con `btn-glow` y tamaño mínimo 48px.

---

## 3. Ventas (POS)

### Descripción general
Punto de venta de mostrador. Permite registrar ventas de accesorios, equipos y servicios con cobros mixtos (efectivo + tarjeta + transferencia), aplicar descuentos, asociar cliente, generar ticket térmico (80mm) y notificar al cliente por WhatsApp. Es el módulo de mayor carga transaccional del Core.

### Alcances y reglas de negocio

- **Venta de mostrador:** ítems de catálogo, ítems especiales (descripción libre + precio manual), cantidades variables.
- **Cobros mixtos:** una sola venta puede distribuir el total entre efectivo, tarjeta y transferencia.
- **Cálculo de cambio:** automático; `monto_efectivo_recibido - cambio = monto_efectivo_cobrado`.
- **Vincular cliente:** opcional pero recomendado; si el cliente existe se autocompleta nombre/teléfono.
- **Stock:** decremento atómico por Server Action; rechazo si `stock_actual < cantidad_solicitada`.
- **Caja abierta obligatoria:** el POS bloquea ventas si no hay caja abierta (excepto modo admin).
- **Persistencia:** una venta confirmada es inmutable; correcciones se hacen vía anulación + nueva venta.
- **Estado de venta:** `activa` o `anulada`. La anulación crea movimiento inverso en caja.

### Funciones clave
- Búsqueda unificada por SKU, código de barras, nombre, categoría.
- Catálogo de productos con paginación infinita server-driven.
- "Acceso rápido" configurable (últimos productos agregados, top ventas o lista manual).
- Modal de arqueo rápido desde el POS.
- Modal de selección de cliente con autocompletado.
- Generación e impresión de ticket 80mm (`react-to-print` en web, ESC/POS nativo en Tauri).
- Envío del ticket por WhatsApp con PDF o texto formateado.
- Server Action `loadPosMountData()` que consolida la carga inicial en un único round-trip con `Promise.all` server-side.

### Estado de optimización móvil
- 🟡 **En refactor activo** — implementación del **"Modo Fast-Checkout" táctil**.
- Pendientes identificados:
  - Resolver desbordamiento horizontal (overflow-x) en selectores con chips de métodos de pago.
  - Reorganizar la barra de acciones del carrito para operación con pulgar (thumb zone).
  - Reemplazar modales anchos por bottom-sheets en mobile.
  - Aumentar tamaño de hit-targets de ítems a mínimo 56px en pantallas < 640px.
- Layout actual: `flex flex-col lg:flex-row` con catálogo arriba y carrito abajo en mobile.

---

## 4. Reparaciones

### Descripción general
Centro de gestión de órdenes de servicio (tickets de reparación). Cubre el ciclo completo: recepción del equipo, diagnóstico técnico, presupuesto, autorización, ejecución, pruebas, entrega y, opcionalmente, cancelación. Es el módulo con mayor densidad de estados del Core.

### Alcances y reglas de negocio

- **Estados canónicos del ticket:**
  - `RECIBIDO` — ingreso del equipo, sin diagnóstico aún.
  - `DIAGNOSTICO` — técnico evaluando, se genera presupuesto.
  - `PRESUPUESTO` — presupuesto enviado al cliente, pendiente de autorización.
  - `EN_REPARACION` — cliente autorizó, técnico ejecutando.
  - `LISTO` — reparación finalizada, pendiente de entrega.
  - `ENTREGADO` — cliente recogió el equipo, ticket cerrado.
  - `NO_EXITOSA` — no se pudo reparar, entregado al cliente.
  - `CANCELADO` — ticket cancelado con motivo registrado.
- **Identificadores únicos:** para categoría `EQUIPOS`, el IMEI o número de serie es obligatorio y único.
- **Anticipos:** se registran en `MovimientoCaja` (tipo `anticipo_reparacion`) sin tocar `Caja.total_efectivo`.
- **Gastos de reparación:** mano de obra externa, refacciones, maquila. Se registran como `MovimientoCaja` (tipo `gasto_reparacion`) y como ítems en `ReparacionGasto` para costeo.
- **Cancelación:** requiere motivo (catálogo cerrado de 11 razones + texto libre). El reembolso de anticipos se ejecuta al momento de la entrega, no al cancelar.
- **Transiciones permitidas:** matriz de transiciones validada en Server Action (no se salta de `RECIBIDO` a `ENTREGADO`).
- **Notificaciones automáticas:** WhatsApp al cliente en cambios de estado relevantes (PRESUPUESTO, LISTO).
- **Persistencia offline:** borradores nuevos se guardan en IndexedDB (`lib/offline/`) y se sincronizan al recuperar conexión.

### Funciones clave
- Wizard de recepción con captura de fotos (cámara nativa + adjuntar).
- Vista detalle con timeline cronológico de eventos del ticket.
- Bitácora de abonos visibles para el cliente.
- Modal de cancelación con advertencia de abonos pendientes.
- Impresión de ticket de recepción (80mm) y etiqueta de identificación (2×1").
- Tracking público del estado vía URL firmada (`/track/[id]`).
- Búsqueda por folio, cliente, IMEI, estado.
- KPIs por estado en el header del módulo.

### Estado de optimización móvil
- 🟢 **Mobile-first** validado.
- Menú flotante de acciones rápidas adaptado a operación con una mano.
- Wizard de recepción reorganizado en pasos compactos para mobile.
- Timeline de eventos en formato vertical con timestamps relativos ("hace 2 h").
- Captura de foto desde cámara nativa con fallback a `getUserMedia`.

---

## 5. Historial de Ventas

### Descripción general
Listado paginado y filtrable de todas las ventas generadas por el taller. Permite reimprimir tickets, anular ventas, generar facturas y exportar a CSV/Excel.

### Alcances y reglas de negocio

- **Anulación:** permitida solo para ventas del día en curso o, como máximo, dentro del ciclo de caja abierto. Crea movimiento inverso de caja y restaura stock.
- **Reimpresión:** genera el ticket con la marca "REIMPRESIÓN" visible y fecha/hora de la reimpresión.
- **Exportación:** CSV y XLSX con el conjunto filtrado (no toda la base).
- **Filtros combinables:** rango de fechas, método de pago, vendedor, cliente, folio, estado (`activa` / `anulada`).
- **Persistencia:** las ventas anuladas **no se eliminan** físicamente; el campo `estado` cambia y se genera fila de auditoría en `MovimientoCaja`.
- **Visibilidad:** usuarios con rol `cajero` solo ven sus propias ventas; `admin` y `owner` ven todas.

### Funciones clave
- Tabla virtualizada para grandes volúmenes (`react-virtual` o equivalente).
- Filtros persistentes en URL (`useSearchParams`).
- Acciones en lote: reimprimir hasta N tickets seleccionados.
- Detalle de venta con desglose de pagos mixtos.
- Anulación con motivo y selección de cuenta contable inversa.

### Estado de optimización móvil
- 🟢 **Mobile-first** validado.
- Tabla con scroll horizontal explícito (`overflow-x-auto`).
- Filtros en bottom-sheet en mobile.
- Acciones agrupadas en menú de tres puntos por fila.

---

## 6. Inventario

### Descripción general
Gestión del catálogo de productos, control de stock, IMEI/Serie para equipos, categorías personalizadas, importación masiva por CSV y exportación. Es la fuente de verdad para el stock que consume el POS y para los IMEI que se asocian a las reparaciones.

### Alcances y reglas de negocio

- **Categorías base:** predefinidas (`EQUIPOS`, `REFACCIONES`, `PANTALLAS`, `BATERIAS`, `ACCESORIOS`, `SERVICIOS`). El usuario puede crear categorías personalizadas.
- **Categoría `EQUIPOS`:** exige IMEI/Serie válido. Validación: 15 dígitos numéricos para IMEI, mínimo 8 caracteres alfanuméricos para serie.
- **Stock:** controlado por `stock_actual` y `stock_minimo`. Alerta visual cuando `stock_actual <= stock_minimo`.
- **Stock único por IMEI:** un producto con identificador único tiene `stock_actual = 1` forzado.
- **Importación CSV:** validación por filas con Zod; reporte de errores por línea; no se aplica ninguna fila si hay errores críticos.
- **Persistencia:** borradores con foto pero sin nombre se persisten para tener `draftProductId` estable al subir la imagen.
- **Soft-delete recomendado** para auditoría: estado `activo` / `inactivo` (sin eliminación física).

### Funciones clave
- CRUD de productos con modal unificado (nuevo + edición).
- Captura de foto por dropzone, file picker o cámara nativa (`CameraModal`).
- Vista de inventario con búsqueda full-text y filtros por categoría, estado, stock.
- Importación CSV con preview y validación.
- Exportación CSV/XLSX del inventario actual.
- Etiquetas de código de barras generadas in-app (`jsbarcode`).
- Generación de código de barras interno (EAN-13) cuando el producto no trae uno.

### Estado de optimización móvil
- 🟢 **Mobile-first** validado.
- Modal de producto reorganizado: campos principales arriba, secundarios colapsables.
- Captura de foto con botón dedicado "Abrir Cámara" además del dropzone.
- Tabla de inventario con scroll horizontal y filtros en bottom-sheet.
- Sección "Hardware" del formulario retirada temporalmente — características de equipo se capturan en el campo `descripción`.

---

## 7. Clientes

### Descripción general
Base de datos de clientes finales del taller. Permite registrar clientes nuevos, vincularlos a ventas y reparaciones, ver su historial consolidado y gestionar consentimientos de contacto (WhatsApp, email).

### Alcances y reglas de negocio

- **Datos mínimos:** nombre + (teléfono o email). El teléfono es el identificador de uso principal para WhatsApp.
- **Normalización de teléfono:** se almacena en formato E.164; el código de país se infiere de la configuración del taller (default `52` para México) pero **nunca se hardcodea** entre tenants.
- **Historial unificado:** vista 360° del cliente: ventas, reparaciones, abonos, tickets.
- **Consentimiento:** flags separados para WhatsApp y email; necesarios antes de enviar comunicaciones.
- **Búsqueda:** por nombre, teléfono, email, folio de venta/reparación asociado.
- **Deduplicación:** detección heurística por similitud de nombre + teléfono parcial; advertencia al intentar crear duplicado.
- **Persistencia:** soft-delete recomendado para mantener integridad referencial con ventas/reparaciones.

### Funciones clave
- CRUD de clientes con autocompletado al registrar ventas/reparaciones.
- Vista detalle 360° con pestañas: Ventas / Reparaciones / Datos / Consentimientos.
- Búsqueda full-text server-side con debounce.
- Exportación CSV consentida para fines de marketing.
- Etiquetas y notas libres por cliente.
- Historial de consentimientos (auditoría LGPD/GDPR).

### Estado de optimización móvil
- 🟢 **Mobile-first** validado.
- Vista detalle con tabs scrollables horizontalmente en mobile.
- Acciones rápidas (llamar, WhatsApp, email) como botones sticky en la parte inferior.
- Formulario de alta con campos apilados y CTAs al final.

---

## 8. Bitácora de Gastos

### Descripción general
Registro de gastos operativos del taller y de gastos asociados a reparaciones específicas. Permite categorizar, asignar cuenta contable y reportar flujo de caja negativo. Es el complemento del módulo de Caja para explicar salidas de efectivo.

### Alcances y reglas de negocio

- **Dos tipos de gasto:**
  - **Gastos operativos** — gastos generales del taller (renta, luz, sueldos, marketing).
  - **Gastos de reparación** — inversiones hechas en una reparación específica (refacciones, mano de obra externa, maquila).
- **Método de pago:** efectivo, tarjeta, transferencia. Si es efectivo y la caja está abierta, se descuenta del monto esperado en el cierre.
- **Aislamiento del cálculo de caja:** los gastos **no** decrementan `Caja.total_efectivo` directamente; se registran como `MovimientoCaja` y se restan en el momento del corte. Esto evita doble resta.
- **Categorización:** taxonomía configurable por el tenant (categorías personalizadas).
- **Adjuntar comprobante:** foto o PDF del ticket/factura.
- **Persistencia:** gastos no se eliminan; se marcan como `anulado` con motivo.

### Funciones clave
- CRUD de gastos operativos con filtros por fecha, categoría, método de pago.
- Registro de gastos de reparación vinculados al ticket (impactan costeo).
- Adjuntar comprobante con foto o PDF.
- Reporte mensual de gastos por categoría (exportable).
- Integración con Control de Utilidad (Pro) para cálculo de margen.

### Estado de optimización móvil
- 🟢 **Mobile-first** validado.
- Formulario de gasto en una sola pantalla con scroll.
- Lista con scroll infinito y filtros en bottom-sheet.
- Acciones de "Adjuntar foto" + "Abrir Cámara" ambas disponibles en mobile.

---

## 9. Mi Equipo

### Descripción general
Gestión de los usuarios del taller: invitaciones, roles, permisos, estado activo/inactivo y auditoría de accesos. Es el módulo de control de acceso interno (no confundir con autenticación, que es del lado del cliente).

### Alcances y reglas de negocio

- **Roles canónicos:**
  - `owner` — acceso total, único rol que puede cambiar el plan o eliminar el tenant.
  - `admin` — gestión operativa completa, excepto facturación.
  - `tecnico` — acceso a reparaciones y consultas de inventario.
  - `cajero` — POS, caja y consultas.
  - `viewer` — solo lectura, sin acciones de escritura.
- **Invitación:** flujo de magic link por email o enlace con expiración de 7 días.
- **Desactivación:** soft-delete (`activo = false`); el usuario no puede autenticarse pero su historial se preserva.
- **Auditoría:** cada acción crítica (crear/eliminar usuario, cambiar rol) genera entrada inmutable en log.
- **Límites por plan:** el plan Core permite hasta 5 usuarios activos simultáneos.

### Funciones clave
- Listado de miembros del equipo con rol, estado, último acceso.
- Invitación por email con plantilla editable.
- Cambio de rol con confirmación de doble paso.
- Desactivación/reactivación de usuarios.
- Log de auditoría de accesos y cambios de permisos.
- Restablecimiento de contraseña asistido.

### Estado de optimización móvil
- 🟢 **Mobile-first** validado.
- Lista de miembros con cards apiladas en mobile.
- Acciones agrupadas en bottom-sheet por miembro.
- Formulario de invitación en modal compacto.

---

## 10. Configuración

### Descripción general
Configuración global del taller: datos fiscales, datos de contacto, preferencias de impresión, integraciones (WhatsApp, email, facturación), módulos Pro opcionales y ajustes de notificaciones.

### Alcances y reglas de negocio

- **Datos del taller:** nombre comercial, razón social, RFC/tax ID, dirección, teléfono, email, logo.
- **Impresoras:** configuración de hasta 2 impresoras (`impresora_ticket` 80mm, `impresora_etiqueta` 2×1") con sus drivers Windows requeridos.
- **WhatsApp Business:** asociación de cuenta y plantillas de mensaje predeterminadas.
- **Plantillas de tickets:** editor visual limitado a texto plano y placeholders (`{{cliente}}`, `{{total}}`, `{{folio}}`).
- **Módulos Pro:** switch para activar/desactivar individualmente (cobro proporcional al ciclo).
- **Moneda y locale:** configuración regional con default `es-MX` y `MXN`.
- **Persistencia:** cambios aplican al tenant completo; algunos requieren confirmación por impacto (ej. cambio de moneda).

### Funciones clave
- Editor de datos del taller con validación en tiempo real.
- Subida de logo con crop y previsualización.
- Configuración de impresoras con test page.
- Catálogo de plantillas de mensaje WhatsApp.
- Switch de módulos Pro con impacto en ciclo de facturación.
- Reset de configuración (soft, con confirmación).

### Estado de optimización móvil
- 🟢 **Mobile-first** validado.
- Configuración agrupada en secciones colapsables (acordeón).
- Logo y datos principales editables desde la parte superior sin scroll.
- Bottom-sheet para selección de moneda y locale.

---

## Convenciones transversales

Estas convenciones aplican a **todos los módulos** del plan Core y son candidatas a validación en auditoría:

### Aislamiento de tenant
- **Nunca** se invoca `createAdminClient()` fuera de `/admin` y `/tracking`. El resto del código usa clientes tenant-scoped (`createTenantClient(tallerId)` o `createCurrentTenantClient()`).
- **Toda** query a base de datos filtra por `taller_id`. Las acciones del servidor lo obtienen del JWT firmado.

### Persistencia e inmutabilidad
- **Anulación ≠ eliminación:** ventas, gastos y reparaciones se marcan con un campo de estado (`anulada`, `cancelado`); nunca se borran físicamente.
- **Movimientos de caja** son append-only. Las correcciones crean movimientos inversos.

### Validación
- **Zod** en el boundary de Server Actions. Ninguna Server Action acepta un payload sin validar.
- Mensajes de error en español, retornados al cliente para mostrar via toast.

### Transacciones de base de datos
- Mutaciones complejas (cierre de caja, anulación de venta) usan `prisma.$transaction([])` para garantizar atomicidad.
- Auditoría pendiente: confirmar que **toda mutación multi-tabla** está dentro de una transacción.

### Mobile-first
- **Breakpoints:** `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`. Diseño desde el más pequeño.
- **Hit-targets:** mínimo 44×44px (Apple HIG) / 48×48dp (Material Design) en acciones táctiles.
- **Inputs numéricos monetarios:** `inputMode="decimal"`, `pattern="[0-9.,]*"`, sin botones +/-.
- **Toasts:** no deben tapar CTAs primarios; posición inferior en mobile, superior en desktop.

### Accesibilidad
- Roles ARIA en componentes interactivos.
- Focus visible en todos los elementos focusables.
- Contraste mínimo AA en texto y CTAs.
- Labels asociados a inputs (`<label htmlFor>` o wrapping).

---

## Glosario técnico

| Término | Definición |
|---------|------------|
| **Atomicidad** | Propiedad que garantiza que una operación de base de datos se ejecuta completamente o no se ejecuta. En Prisma se logra con `$transaction`. |
| **Append-only** | Patrón de persistencia donde las filas nunca se modifican ni eliminan; toda corrección se registra como una fila nueva. |
| **Bottom-sheet** | Modal que se desliza desde la parte inferior de la pantalla, optimizado para operación con pulgar en mobile. |
| **Caja (caja registradora virtual)** | Sesión contable de un día con monto inicial, movimientos y cierre. Una caja por tenant por día (típicamente). |
| **Cierre maestro** | Proceso transaccional que cierra la caja: bloquea nuevas ventas, calcula diferencia, persiste `monto_cierre` y `fecha_cierre`. |
| **Cobro mixto** | Distribución del total de una venta entre múltiples métodos de pago (ej. $50 efectivo + $200 tarjeta). |
| **Draft product** | Producto persistido sin nombre para tener ID estable al subir imagen; se completa antes del guardado final. |
| **Fast-Checkout** | Modo táctil del POS en mobile con botones grandes y un solo paso de confirmación. |
| **IMEI** | International Mobile Equipment Identity — 15 dígitos que identifican un dispositivo móvil. Validado en categoría EQUIPOS. |
| **Movimiento de caja** | Registro atómico e inmutable de un evento que afecta el efectivo de la caja (venta, gasto, anticipo, devolución). |
| **Multi-tenant por filas** | Estrategia donde una sola base de datos sirve a múltiples clientes (talleres), aislados por un campo `taller_id` y reforzados por RLS. |
| **RLS (Row Level Security)** | Política de PostgreSQL que restringe el acceso a filas según el rol/contexto del usuario, independiente del ORM. |
| **Server Action** | Función asíncrona ejecutada en el servidor invocable desde el cliente (Next.js App Router). |
| **Tenant** | Cliente SaaS (en este caso, un taller). |
| **Tracking público** | Vista de solo lectura de un ticket de reparación accesible vía URL firmada, sin requerir login. |
| **Trial** | Período de prueba gratuito (30 días) con acceso Pro completo. |

---

> Documento vivo. Mantenido por el equipo de producto y arquitectura de ReparaHub.
> Última actualización: junio 2026.
