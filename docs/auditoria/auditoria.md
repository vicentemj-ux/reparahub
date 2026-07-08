# Auditoría — ReparaHub

> Documento generado el 2026-05-01 para identificar los activos de código que deben ser auditados.

---

## 1. Descripción de la Aplicación

**ReparaHub** es una plataforma web de gestión empresarial multi-tenant diseñada para talleres de reparación de dispositivos móviles. Permite a los talleres administrar su operación diaria desde una única interfaz moderna y responsive.

### Funcionalidades Principales

- **Reparaciones:** Recepción, seguimiento de estados, historial de auditoría, abonos, gastos por ticket, comprobantes y entregas.
- **Punto de Venta (POS):** Carrito de ventas, caja diaria, múltiples métodos de pago (incluido mixto), descuentos y decremento automático de inventario.
- **Inventario:** Gestión de productos con SKU/IMEI/Serie, fotos, importación CSV, etiquetas térmicas y control de margen de utilidad.
- **Clientes:** CRUD de clientes con historial de reparaciones integrado.
- **Gastos Operativos:** Bitácora de gastos con impacto directo en caja.
- **Configuración del Taller:** Imprenta térmica, reportes, alertas, flujo PRO (checklist, firma digital, fotos obligatorias).
- **Tracking Público:** Consulta de estado de reparación para clientes finales mediante folio y validación telefónica.
- **Garantía Pública:** Certificados de garantía accesibles vía web.
- **Firma Digital:** Captura de firma del cliente en ruta pública con token.
- **Panel Super Admin:** Gestión manual de talleres, planes, pruebas y suspensiones con 2FA OTP.
- **Soporte Offline:** IndexedDB para borradores de reparación y cola de sincronización.

### Arquitectura de Negocio

- **Modelo SaaS multi-tenant:** Cada taller es un tenant aislado por `taller_id`.
- **Autenticación:** JWT custom firmado con `SUPABASE_JWT_SECRET`, con claims de `taller_id`.
- **Seguridad:** RLS activo en todas las tablas, rate limiting en endpoints de auth, proxy de rutas para protección de acceso.
- **Impresión:** 8 formatos térmicos soportados (tickets, cortes, abonos, etiquetas, cartas, garantías) mediante método iframe.
- **Notificaciones:** Toast estilo pill oscuro vía Sonner, emails transaccionales vía Resend.

---

## 2. Tech Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.0 |
| Runtime | React | 19.2.4 |
| Lenguaje | TypeScript | 5.7.3 |
| Estilos | Tailwind CSS | 4.2.0 |
| Animaciones CSS | tw-animate-css | 1.3.3 |
| UI Kit | shadcn/ui (Radix UI + lucide-react) | — |
| Base de Datos | Supabase (PostgreSQL) | — |
| Cliente DB | @supabase/supabase-js | ^2.49.1 |
| SSR/Auth | @supabase/ssr | ^0.5.2 |
| Estado Local | React hooks (sin Redux/Zustand) | — |
| Formularios | react-hook-form + @hookform/resolvers | ^7.54.1 / ^3.9.1 |
| Validación | Zod | ^3.24.1 |
| Fechas | date-fns | 4.1.0 |
| Drag & Drop | @dnd-kit | ^6.3.1 |
| Animaciones | framer-motion | ^12.38.0 |
| Impresión | react-to-print | ^3.3.0 |
| Códigos de Barras | jsbarcode | ^3.12.3 |
| QR | qrcode.react | ^4.2.0 |
| Confetti | canvas-confetti | ^1.9.4 |
| Email | Resend | ^4.0.0 |
| Email JSX | @react-email/components (vía templates.tsx) | — |
| Excel | xlsx | ^0.18.5 |
| Offline | IndexedDB (custom) | — |
| Auth JWT | jose | ^6.2.2 |
| Hashing | bcryptjs | ^2.4.3 |
| Analytics | @vercel/analytics | 1.6.1 |
| Gestor de paquetes | pnpm | — |
| Deploy | Vercel | — |

---

## 3. Archivos a Auditar

Los siguientes archivos representan los activos críticos del proyecto que deben ser auditados por seguridad, calidad de código, consistencia de patrones y deuda técnica.

### 3.1 Configuración y Entrada

| Archivo | Descripción |
|---------|-------------|
| `package.json` | Dependencias y scripts del proyecto |
| `next.config.mjs` | Configuración de Next.js (CSP, headers, ignoreBuildErrors) |
| `postcss.config.mjs` | Configuración de PostCSS |
| `tsconfig.json` | Configuración de TypeScript |
| `app/globals.css` | Estilos globales, paleta corporativa, glow effects |
| `app/layout.tsx` | Layout raíz de la aplicación |
| `app/page.tsx` | Landing page pública |
| `components.json` | Configuración de shadcn/ui |
| `proxy.ts` | Proxy de rutas (antes middleware) para protección de acceso |

### 3.2 Autenticación y Onboarding

| Archivo | Descripción |
|---------|-------------|
| `app/auth/layout.tsx` | Layout de rutas de autenticación |
| `app/auth/login/page.tsx` | Página de inicio de sesión |
| `app/auth/register/page.tsx` | Página de registro |
| `app/auth/callback/route.ts` | Callback de OAuth |
| `app/auth/verify-email/page.tsx` | Verificación de email con PIN |
| `app/auth/forgot-password/page.tsx` | Recuperación de contraseña |
| `app/auth/reset-password/page.tsx` | Reset de contraseña |
| `app/auth/super-admin/page.tsx` | Login de super admin |
| `app/onboarding/page.tsx` | Flujo de onboarding post-registro |
| `app/onboarding/onboarding-form.tsx` | Formulario de onboarding |
| `lib/actions/auth.ts` | Server Actions de autenticación |
| `lib/actions/onboarding.ts` | Server Actions de onboarding |
| `lib/actions/email-verification.ts` | Server Actions de verificación de email |
| `lib/auth/rate-limit.ts` | Rate limiting en endpoints de auth |
| `lib/auth/get-current-taller.ts` | Obtención del taller actual desde JWT/cookies |
| `lib/auth/actor-display-name.ts` | Display name del actor autenticado |
| `lib/auth-server.ts` | Utilidades de auth del lado del servidor |
| `lib/email/send.ts` | Envío de emails vía Resend |
| `lib/email/templates.tsx` | Templates JSX de emails (bienvenida, vencimiento) |
| `components/emails/WelcomeEmail.tsx` | Template de email de bienvenida |
| `components/emails/TrialExpiringEmail.tsx` | Template de email de vencimiento de prueba |
| `hooks/use-toast.ts` | Wrapper legacy-compat de Sonner |
| `components/ui/sonner.tsx` | Configuración global de Sonner (estilo pill oscuro) |

### 3.3 Dashboard y Layouts

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/layout.tsx` | Layout del dashboard (sidebar, navegación) |
| `app/dashboard/page.tsx` | Vista general (KPIs vía RPC) |
| `components/dashboard/sidebar-content.tsx` | Contenido del sidebar de navegación |
| `components/header.tsx` | Header global |
| `components/footer.tsx` | Footer global |
| `components/register-modal.tsx` | Modal de registro |

### 3.4 Reparaciones

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/reparaciones/page.tsx` | Listado de reparaciones |
| `app/dashboard/reparaciones/[id]/page.tsx` | Detalle de reparación |
| `lib/actions/repairs.ts` | Server Actions de reparaciones (CRUD, estados, abonos) |
| `lib/reparaciones/checklist-ingreso.ts` | Checklist de ingreso de dispositivo |
| `lib/reparaciones/checklist-pro.ts` | Checklist PRO configurable |
| `lib/reparaciones/security.ts` | Utilidades de seguridad de reparaciones |
| `lib/reparaciones/pattern.ts` | Patrones de seguridad (unlock pattern) |
| `lib/reparaciones/firma-digital-url.ts` | Generación de URLs de firma digital |
| `lib/actions/flujo-pro.ts` | Server Actions de flujo PRO |
| `lib/actions/firma-digital.ts` | Server Actions de firma digital |
| `components/dashboard/nueva-reparacion-form.tsx` | Formulario de nueva reparación |
| `components/dashboard/repair-detail-view.tsx` | Vista detalle de reparación |
| `components/dashboard/orders-table.tsx` | Tabla de órdenes de reparación |
| `components/dashboard/modal-entrega-reparacion.tsx` | Modal de entrega de reparación |
| `components/dashboard/modal-exito-entrega.tsx` | Modal de éxito de entrega |
| `components/dashboard/reparacion-edit-dialog.tsx` | Diálogo de edición de reparación |
| `components/dashboard/reparacion-no-exitosa-modal.tsx` | Modal de reparación no exitosa |
| `components/dashboard/presupuesto-edit-modal.tsx` | Modal de edición de presupuesto |
| `components/dashboard/new-repair-button.tsx` | Botón de nueva reparación |
| `components/dashboard/status-change-confirm-dialog.tsx` | Diálogo de confirmación de cambio de estado |
| `components/dashboard/print-menu-dropdown.tsx` | Menú desplegable de impresión |
| `components/dashboard/ticket-salida-garantia.tsx` | Ticket de salida con garantía |
| `components/dashboard/repair-success-whatsapp-button.tsx` | Botón de WhatsApp post-reparación |
| `components/reparaciones/SecurityInputV2.tsx` | Input de seguridad v2 |
| `components/reparaciones/ModalPatronSeguridad.tsx` | Modal de patrón de seguridad |
| `components/dashboard/unlock-pattern-grid.tsx` | Grid de patrón de desbloqueo |
| `app/firma-digital/[id]/page.tsx` | Página pública de firma digital |
| `app/firma-digital/layout.tsx` | Layout de firma digital |
| `app/track/[id]/page.tsx` | Tracking público de reparación |
| `app/garantia/[id]/page.tsx` | Garantía pública |
| `app/garantia/layout.tsx` | Layout de garantía |
| `components/public/tracking-validation.tsx` | Validación de tracking |
| `components/public/tracking-details.tsx` | Detalles de tracking público |
| `lib/validations/repair-create.ts` | Validaciones Zod de creación de reparación |
| `lib/repair-status.ts` | Utilidades de estados de reparación |
| `lib/whatsapp-repair-status.ts` | Mensajes de WhatsApp por estado de reparación |
| `lib/whatsapp-repair-welcome.ts` | Mensaje de bienvenida de reparación |

### 3.5 Clientes

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/clientes/page.tsx` | Listado de clientes |
| `lib/actions/clients.ts` | Server Actions de clientes (CRUD) |
| `components/dashboard/clients-table.tsx` | Tabla de clientes |
| `components/dashboard/clients-search-filter.tsx` | Búsqueda y filtros de clientes |
| `components/dashboard/client-detail-modal.tsx` | Modal de detalle de cliente |
| `components/dashboard/client-edit-modal.tsx` | Modal de edición de cliente |
| `components/dashboard/client-autocomplete.tsx` | Autocompletado de clientes |

### 3.6 Ventas (POS)

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/ventas/page.tsx` | Punto de venta principal |
| `lib/actions/ventas.ts` | Server Actions de ventas (carrito, pago, stock) |
| `lib/context/caja-context.tsx` | Contexto de estado de caja |
| `lib/ventas-en-espera.ts` | Gestión de ventas en espera |
| `components/dashboard/ventas/CartPanel.tsx` | Panel del carrito de ventas |
| `components/dashboard/ventas/ConfirmModal.tsx` | Modal de confirmación de venta |
| `components/dashboard/ventas/DescuentoModal.tsx` | Modal de descuento |
| `components/dashboard/ventas/SuccessModal.tsx` | Modal de éxito de venta |
| `components/dashboard/ventas/VentasEnEsperaModal.tsx` | Modal de ventas en espera |
| `components/dashboard/ventas/VentaEnEsperaConfirm.tsx` | Confirmación de venta en espera |
| `components/dashboard/ventas/ArqueoModal.tsx` | Modal de arqueo de caja |
| `components/dashboard/ventas/SpecialModal.tsx` | Modal especial de ventas |
| `components/dashboard/ventas/CorteModal.tsx` | Modal de corte de caja |
| `components/dashboard/ventas/CorteCajaSummary.tsx` | Resumen de corte de caja |
| `components/dashboard/venta-label.tsx` | Etiqueta de venta |
| `components/dashboard/status-badge-financial.tsx` | Badge de estado financiero |
| `app/dashboard/corte/page.tsx` | Página de corte de caja |
| `app/dashboard/historial-ventas/page.tsx` | Historial de ventas |
| `lib/actions/historial-ventas.ts` | Server Actions de historial de ventas |
| `components/dashboard/historial-ventas/ReporteVentasPeriodoLetter.tsx` | Reporte de ventas en formato carta |
| `lib/corte-owner-whatsapp.ts` | Notificación de corte vía WhatsApp |

### 3.7 Inventario

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/inventario/page.tsx` | Gestión de inventario |
| `lib/actions/productos.ts` | Server Actions de productos (CRUD, importación) |
| `lib/actions/import.ts` | Server Actions de importación CSV |
| `lib/image-optimizer.ts` | Optimización de imágenes |
| `lib/storage.ts` | Utilidades de almacenamiento (cliente) |
| `lib/storage-server.ts` | Utilidades de almacenamiento (servidor) |
| `components/dashboard/inventario/NuevoProductoModal.tsx` | Modal de nuevo producto |
| `components/dashboard/inventario/NuevoProductoModalWrapper.tsx` | Wrapper del modal de producto |
| `components/dashboard/inventory-standard-label.tsx` | Etiqueta estándar de inventario |
| `components/dashboard/inventory-exhibition-label.tsx` | Etiqueta de exhibición |
| `components/dashboard/inventory-product-image.tsx` | Imagen de producto en inventario |
| `components/dashboard/inventory-publicidad-menu.tsx` | Menú de publicidad de inventario |
| `components/dashboard/print-cartel-exhibicion.tsx` | Impresión de cartel de exhibición |
| `components/dashboard/inventory-label-utils.ts` | Utilidades de etiquetas de inventario |
| `lib/inventory/inventory-form-labels.ts` | Labels del formulario de inventario |
| `lib/inventory/inventory-label-print-html.ts` | HTML de impresión de etiquetas |
| `lib/print/poster-exhibicion-satori.tsx` | Poster de exhibición con Satori |
| `lib/print/poster-exhibicion-utils.ts` | Utilidades de poster de exhibición |
| `lib/print/poster-satori-fonts.ts` | Fuentes para Satori |
| `components/print-templates/PosterExhibicion.tsx` | Template de poster de exhibición |
| `components/print-templates/CartelExhibicionTemplate.tsx` | Template de cartel de exhibición |
| `app/api/generate-poster/route.ts` | API route para generación de posters |

### 3.8 Compras

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/compras/page.tsx` | Listado de compras |
| `app/dashboard/compras/nueva/page.tsx` | Nueva compra |
| `app/dashboard/compras/[id]/page.tsx` | Detalle de compra |
| `app/dashboard/compras/usados/page.tsx` | Compras de equipos usados |
| `app/dashboard/compras/registrar-usado/page.tsx` | Registrar equipo usado |
| `lib/actions/compras.ts` | Server Actions de compras |
| `lib/actions/compras-usado.ts` | Server Actions de compras de usados |
| `app/(print)/print-compra/page.tsx` | Impresión de ticket de compra |
| `components/print-templates/TicketCompraTemplate.tsx` | Template de ticket de compra |

### 3.9 Servicios

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/servicios/page.tsx` | Catálogo de servicios |
| `lib/actions/servicios.ts` | Server Actions de servicios |
| `components/dashboard/servicios/ServiceSelector.tsx` | Selector de servicios |
| `components/dashboard/servicios/ServicioModal.tsx` | Modal de servicio |

### 3.10 Gastos y Utilidad

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/bitacora-gastos/page.tsx` | Bitácora de gastos operativos |
| `lib/actions/gastos.ts` | Server Actions de gastos |
| `app/dashboard/utilidad/page.tsx` | Control de utilidad |
| `lib/actions/utilidad.ts` | Server Actions de utilidad |
| `components/dashboard/monitor-utilidad-operativa.tsx` | Monitor de utilidad operativa |

### 3.11 Reportes

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/reportes/page.tsx` | Módulo de reportes |
| `lib/actions/reportes.ts` | Server Actions de reportes |

### 3.12 Configuración del Taller

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/configuracion/page.tsx` | Configuración general del taller |
| `app/dashboard/configuracion/importacion/page.tsx` | Importación de datos |
| `app/dashboard/configuracion/flujo-pro/page.tsx` | Configuración de flujo PRO |
| `lib/actions/settings.ts` | Server Actions de configuración |
| `lib/actions/flujo-pro.ts` | Server Actions de flujo PRO |
| `components/configuracion/imprenta-types.ts` | Tipos de configuración de imprenta |
| `components/ui/accordion.tsx` | Componente Accordion de shadcn |
| `components/ui/switch.tsx` | Componente Switch de shadcn |
| `components/ui/select.tsx` | Componente Select de shadcn |
| `components/ui/tabs.tsx` | Componente Tabs de shadcn |
| `components/ui/scroll-area.tsx` | Componente ScrollArea de shadcn |

### 3.13 Equipo y Roles

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/equipo/page.tsx` | Gestión de equipo/miembros |
| `lib/actions/empleados.ts` | Server Actions de empleados |
| `lib/actions/roles.ts` | Server Actions de roles |

### 3.14 Facturación y Planes

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/facturacion/page.tsx` | Página de facturación/upgrade |
| `app/dashboard/facturacion/layout.tsx` | Layout de facturación |
| `lib/utils/subscription.ts` | Utilidades de suscripción |

### 3.15 Impresión Térmica / Documentos

| Archivo | Descripción |
|---------|-------------|
| `lib/print.ts` | Utilidades centrales de impresión (iframe method) |
| `lib/print/demo-data.ts` | Datos de demo para impresión |
| `lib/print-calibration-brand.ts` | Calibración de marca para impresión |
| `app/dashboard/configuracion/imprenta` | Configuración de imprenta térmica |
| `app/(print)/print-ticket/page.tsx` | Impresión de ticket de venta |
| `app/(print)/print-ticket/[id]/page.tsx` | Impresión de ticket por ID |
| `app/(print)/print-abono/page.tsx` | Impresión de ticket de abono |
| `app/(print)/print-abono/[id]/page.tsx` | Impresión de abono por ID |
| `app/(print)/print-corte/[id]/page.tsx` | Impresión de corte de caja |
| `app/(print)/print-label/page.tsx` | Impresión de etiquetas |
| `app/(print)/print-label/[id]/page.tsx` | Impresión de etiqueta por ID |
| `app/(print)/print-documento/[id]/page.tsx` | Impresión de documento |
| `app/(print)/print-entrega/[id]/page.tsx` | Impresión de ticket de entrega |
| `app/(print)/print-calibration/page.tsx` | Página de calibración de impresión |
| `app/(print)/print-calibration/calibration-client.tsx` | Cliente de calibración |
| `app/dashboard/print-label/page.tsx` | Página de impresión de etiquetas desde dashboard |
| `components/print-templates/index.ts` | Exportaciones de templates de impresión |
| `components/print-templates/TicketVentaTemplate.tsx` | Template de ticket de venta |
| `components/print-templates/TicketVentaEquipoTemplate.tsx` | Template de venta de equipo |
| `components/print-templates/TicketCobroReparacionTemplate.tsx` | Template de cobro de reparación |
| `components/print-templates/TicketRecepcionTemplate.tsx` | Template de recepción |
| `components/print-templates/TicketCorteTemplate.tsx` | Template de corte de caja |
| `components/print-templates/TicketDocumentoTemplate.tsx` | Template de documento |
| `components/print-templates/TicketGarantiaTemplate.tsx` | Template de garantía |
| `components/print-templates/ProductSaleLabelTemplate.tsx` | Template de etiqueta de producto |
| `components/print-templates/LabelRepairTemplate.tsx` | Template de etiqueta de reparación |
| `components/print-templates/TicketVentaDispatcher.tsx` | Dispatcher de templates de venta |
| `components/print-templates/TicketCompraTemplate.tsx` | Template de ticket de compra |
| `components/dashboard/receipt-ticket.tsx` | Recibo de ticket |
| `components/dashboard/poliza-garantia.tsx` | Póliza de garantía |
| `hooks/use-print-window-close.ts` | Hook para cierre de ventana de impresión |

### 3.16 Admin y Super Admin

| Archivo | Descripción |
|---------|-------------|
| `app/admin/page.tsx` | Página de login de admin |
| `app/admin/layout.tsx` | Layout de panel admin |
| `app/admin/dashboard/page.tsx` | Dashboard de super admin |
| `app/admin/verify/page.tsx` | Verificación OTP de admin |
| `lib/actions/admin.ts` | Server Actions de administración |
| `lib/actions/admin-otp.ts` | Server Actions de OTP admin |
| `scripts/generate-admin-hash.mjs` | Script de generación de hash de admin |

### 3.17 Supabase / Base de Datos

| Archivo | Descripción |
|---------|-------------|
| `lib/supabase/client.ts` | Cliente Supabase del lado del cliente |
| `lib/supabase/server.ts` | Cliente Supabase del lado del servidor |
| `lib/supabase/admin.ts` | Cliente Supabase con service role (admin) |
| `lib/supabase/tenant-client.ts` | Cliente tenant-scoped para multi-tenancy |
| `supabase/migrations/` | Directorio completo de migraciones SQL |

### 3.18 Offline y Soporte

| Archivo | Descripción |
|---------|-------------|
| `lib/offline/idb-offline.ts` | Conexión a IndexedDB |
| `lib/offline/nueva-reparacion-draft.ts` | Borradores de nueva reparación |
| `lib/offline/repair-sync-queue.ts` | Cola de sincronización offline |
| `lib/offline/photo-data-url.ts` | Fotos offline en data URL |
| `components/dashboard/offline-banner.tsx` | Banner de modo offline |
| `components/dashboard/offline-sync-listener.tsx` | Listener de sincronización offline |

### 3.19 UI Components (shadcn/ui)

| Archivo | Descripción |
|---------|-------------|
| `components/ui/button.tsx` | Botón con variantes (incluye soporte para btn-glow) |
| `components/ui/dialog.tsx` | Diálogo modal |
| `components/ui/sheet.tsx` | Sheet lateral |
| `components/ui/alert-dialog.tsx` | Diálogo de alerta |
| `components/ui/card.tsx` | Tarjeta contenedora |
| `components/ui/badge.tsx` | Badge/etiqueta |
| `components/ui/avatar.tsx` | Avatar de usuario |
| `components/ui/input.tsx` | Campo de texto |
| `components/ui/textarea.tsx` | Área de texto |
| `components/ui/label.tsx` | Etiqueta de formulario |
| `components/ui/checkbox.tsx` | Casilla de verificación |
| `components/ui/radio-group.tsx` | Grupo de radio buttons |
| `components/ui/select.tsx` | Selector desplegable |
| `components/ui/dropdown-menu.tsx` | Menú desplegable |
| `components/ui/table.tsx` | Tabla de datos |
| `components/ui/separator.tsx` | Separador visual |
| `components/ui/skeleton.tsx` | Esqueleto de carga |
| `components/ui/tabs.tsx` | Pestañas |
| `components/ui/tooltip.tsx` | Tooltip |
| `components/ui/scroll-area.tsx` | Área con scroll |
| `components/ui/accordion.tsx` | Acordeón |
| `components/ui/switch.tsx` | Interruptor |

### 3.20 Utilidades y Helpers

| Archivo | Descripción |
|---------|-------------|
| `lib/utils.ts` | Utilidades generales (cn, etc.) |
| `lib/utils/date.ts` | Utilidades de fecha |
| `lib/utils/currency.ts` | Utilidades de moneda |
| `lib/constants.ts` | Constantes globales |
| `lib/whatsapp-send-url.ts` | Generación de URLs de WhatsApp |
| `lib/app-public.ts` | Configuración de rutas públicas |
| `lib/victory-launch.ts` | Utilidades de lanzamiento (victory) |
| `lib/hooks/use-taller-negocio-nombre.ts` | Hook de nombre de negocio del taller |
| `hooks/use-mobile.ts` | Hook de detección mobile |
| `hooks/use-data-fetch-perf.ts` | Hook de performance de fetching |
| `lib/perf/data-fetch-perf.ts` | Utilidades de performance de datos |

### 3.21 API Routes y Cron Jobs

| Archivo | Descripción |
|---------|-------------|
| `app/api/cron/check-trials/route.ts` | Cron job: verificación de trials |
| `app/api/cron/urgent-equipment-report/route.ts` | Cron job: reporte de equipos urgentes |
| `app/api/generate-poster/route.ts` | API route: generación de posters |

### 3.22 Páginas Públicas y Legales

| Archivo | Descripción |
|---------|-------------|
| `app/terminos/page.tsx` | Términos de servicio |
| `app/privacidad/page.tsx` | Política de privacidad |
| `app/acceso-suspendido/page.tsx` | Página de acceso suspendido |
| `app/seguimiento/page.tsx` | Página de seguimiento |
| `app/herramientas/page.tsx` | Herramientas públicas |
| `app/herramientas/marketplace/page.tsx` | Marketplace de herramientas |

### 3.23 Marketplace y Chat (Esqueleto)

| Archivo | Descripción |
|---------|-------------|
| `app/dashboard/mercado/page.tsx` | Marketplace interno (esqueleto) |
| `app/dashboard/chat/page.tsx` | Chat del taller (esqueleto) |
| `components/marketplace/product-form.tsx` | Formulario de producto marketplace |
| `components/marketplace/post-generator.tsx` | Generador de posts |
| `components/marketplace/image-uploader.tsx` | Subida de imágenes marketplace |
| `components/marketplace/export-section.tsx` | Sección de exportación |

### 3.24 Landing Page

| Archivo | Descripción |
|---------|-------------|
| `components/pricing-section.tsx` | Sección de precios |
| `components/features-section.tsx` | Sección de características |
| `components/dashboard/victory-launch-success-dialog.tsx` | Diálogo de éxito de lanzamiento |

---

## 4. Archivos Excluidos de la Auditoría

Los siguientes archivos/directorios se consideran no críticos o generados automáticamente y se excluyen de la auditoría de código:

- `node_modules/` — Dependencias gestionadas por pnpm
- `.next/` — Build output de Next.js
- `public/` — Assets estáticos (imágenes, fuentes)
- `pnpm-lock.yaml` — Lockfile de dependencias
- `estructura.txt` — Volcado antiguo del filesystem (candidato a eliminación)
- `find-dead.js` — Script casero para detectar código muerto
- `report.html` — Reporte generado externamente
- `docs/` — Documentación de planes y especificaciones
- `.agents/` — Skills de agentes IA
- `Descargas - Acceso directo.lnk` — Acceso directo del sistema operativo

---

## 5. Resumen de Métricas

| Categoría | Archivos a Auditar |
|-----------|-------------------|
| Configuración y Entrada | 9 |
| Autenticación y Onboarding | 25 |
| Dashboard y Layouts | 4 |
| Reparaciones | 39 |
| Clientes | 7 |
| Ventas (POS) | 17 |
| Inventario | 18 |
| Compras | 8 |
| Servicios | 4 |
| Gastos y Utilidad | 5 |
| Reportes | 2 |
| Configuración del Taller | 8 |
| Equipo y Roles | 3 |
| Facturación y Planes | 3 |
| Impresión Térmica | 26 |
| Admin y Super Admin | 7 |
| Supabase / Base de Datos | 5 |
| Offline y Soporte | 6 |
| UI Components (shadcn/ui) | 22 |
| Utilidades y Helpers | 10 |
| API Routes y Cron Jobs | 3 |
| Páginas Públicas y Legales | 6 |
| Marketplace y Chat | 6 |
| Landing Page | 3 |
| **Total** | **~246** |

---

*Documento generado automáticamente a partir del análisis del filesystem y `PROJECT_CONTEXT.md`.*
