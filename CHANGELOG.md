## [v2.9.5] - 2026-06-20

### Features
- nuevo shell lateral premium con panel flotante, modo compacto y barra superior de cliente activo
- integra la gestion de trial dentro del sidebar para reducir ruido en Vista General

### Fixes
- retira Notificaciones y Chat Taller del sidebar para reservarlos a futuras versiones
- ajusta el fondo compartido del dashboard para que sidebar, top bar y contenido usen el mismo lienzo visual

### Docs
- inicia el registro consecutivo de cambios sobre la linea 2.9.x en PROJECT_CONTEXT y CHANGELOG

## [v2.9.0] - 2026-06-12

### Features
- cliente unico por telefono para Reparaciones, Ventas/POS y Bitacora de Visitas
- expediente de cliente con compras POS y visitas vinculadas
- ticket digital POS vincula telefono capturado al final antes de enviar WhatsApp
- documentacion del futuro modulo Recompensas PRO + Trial en reparahub29.md

### Database
- agrega cliente_id opcional a bitacora_visitas e indices/FK defensivas para ventas y visitas

## [v2.7.0] — 2026-06-04

### Features
- refactor 2x1 EQUIPO a barcode EAN-13 con SKU/PRICE


## [v2.6.0] — 2026-06-04

### Features
- agregar fecha de ingreso del equipo en fila del cliente


## [v2.5.1] — 2026-06-04

### Fixes
- max-h 90vh y scroll vertical para tickets largos
- preview del ticket sin server action + escalado 2x1 visible


## [v2.5.0] — 2026-06-04

### Features
- vista previa antes de imprimir ticket y etiqueta
- soporte QR + auto-zoom Samsung y boton flotante de zoom
### Fixes
- quitar export a REPORTES_ALERTAS_DEFAULTS (use server forbids object exports)
- extraer tipos de email a lib/email/types.ts (use server forbids type exports)


## [v2.4.0] — 2026-06-04

### Features
- formato 2x1 con QR para productos EQUIPO de venta
- motor diario de reportes y alertas automaticas con UI y dedup
### Infra
- cleanup tauri deps/scritps/docs, .gitignore, y untrack .npm-cache-tauri/ (987 stale)


## [v2.3.5] — 2026-06-03

### Refactors
- unify Identidad+Redes and remove horario / sitio web


## [v2.3.4] — 2026-06-03

### Refactors
- simplify public header and trim footer to compliance bar


## [v2.3.3] — 2026-06-03

### Features
- aggressive ReparaHub branding on public shops


## [v2.3.2] — 2026-06-03

### Features
- add publish toggle in edit product modal
### Fixes
- make mi_tienda migration idempotent and fix Tenant table name


## [v2.3.1] — 2026-06-03

### Features
- integrar rate limit /t/* en proxy.ts (Next 16)
- sidebar card 'Crea tu tienda gratis' (NORMAL only)
- rate limit 60req/min en /t/* + compliance docs
- sitemap dinamico + robots con /t/* permitido
- detalle publico /t/[slug]/p/[productoId] con WhatsApp CTA
- ruta publica /t/[slug] catalogo + footer watermark
- server actions publicos (getTiendaPorSlug, getProductoPublicoPorId, registrarVistaTienda)
- badge 'Mi Tienda' en inventario y publicado_en_tienda en ProductoRow
- UI Mi Tienda con gestion de productos y configuracion
- renombrar Mercado -> Mi Tienda y quitar badge PRO
- server actions privados + email activacion Resend
- limites por plan y bullets Mi Tienda en PLAN_CORE/PRO
- schema y migracion para Mi Tienda v1
### Fixes
- incluir /dashboard/mercado en DEFAULT_MAIN_ORDER + mejor error en actions
### Docs
- actualizar AGENTS, PROJECT_CONTEXT, PRODUCT_STRATEGY, handoff
### Infra
- v2.3.0
- migrar middleware.ts a proxy.ts para Next 16


## [v2.3.0] — 2026-06-03

### Features
- integrar rate limit /t/* en proxy.ts (Next 16)
- sidebar card 'Crea tu tienda gratis' (NORMAL only)
- rate limit 60req/min en /t/* + compliance docs
- sitemap dinamico + robots con /t/* permitido
- detalle publico /t/[slug]/p/[productoId] con WhatsApp CTA
- ruta publica /t/[slug] catalogo + footer watermark
- server actions publicos (getTiendaPorSlug, getProductoPublicoPorId, registrarVistaTienda)
- badge 'Mi Tienda' en inventario y publicado_en_tienda en ProductoRow
- UI Mi Tienda con gestion de productos y configuracion
- renombrar Mercado -> Mi Tienda y quitar badge PRO
- server actions privados + email activacion Resend
- limites por plan y bullets Mi Tienda en PLAN_CORE/PRO
- schema y migracion para Mi Tienda v1
### Docs
- actualizar AGENTS, PROJECT_CONTEXT, PRODUCT_STRATEGY, handoff
### Infra
- migrar middleware.ts a proxy.ts para Next 16


## [v2.2.6] — 2026-06-03

### Fixes
- mobile responsive con patron lista/conversacion


## [v2.2.5] — 2026-06-03

### Fixes
- envio de corte de caja por correo via Resend


## [v2.2.4] — 2026-06-03

### Fixes
- control de devoluciones por cancelacion con caja y bitacora


## [v2.2.3] — 2026-06-02

### Fixes
- Re-enfocar button + tap-to-focus + enumerateDevices


## [v2.2.2] — 2026-06-02

### Fixes
- estados intermedios md: para tablet (iPad 8)


## [v2.2.1] — 2026-06-02

### Fixes
- forzar focusMode continuous en Samsung Galaxy
### Infra
- remover fix-encoding.mjs (one-time)


## [v2.2.0] — 2026-06-02

### Features
- integrar en busqueda POS + indice en codigo_barras
- integrar ProBarcodeButton en NuevoProductoModal (Inventario)
- ProBarcodeButton con badge PRO, tooltip y upsell CTA
- foundation del escaner de codigos con gate PRO y kill-switch
### Fixes
- restaurar encoding UTF-8 box-drawing + em dash
- escapar format string para Windows cmd
- soportar array en run() y shell:true para Windows
### Performance
- indice en producto(taller_id, codigo_barras) para busqueda O(log n)
### Infra
- sync package.json a v2.1.0 antes del bump v2.2.0


# CHANGELOG — ReparaHub

> Historial cronológico de releases. Generado automáticamente por `pnpm version:bump`.
> Metodología y criterios: `docs/VERSIONING.md`.
> Estado actual del producto: ver `docs/PROJECT_CONTEXT.md` (versión sincronizada por el script).

---

