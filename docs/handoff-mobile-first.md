# Handoff: Mobile-First Review para CODEX

## Estado actual

Se aplicó el patrón Mobile-First del módulo **REPARACIONES** (baseline) a **16 módulos** del dashboard. Sin embargo, algunos módulos aún no se ven correctamente en mobile y requieren revisión.

## Patrón base (Reparaciones)

```tsx
// Contenedor principal
<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

// Header card
<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-8">
  <div className="flex items-center gap-4">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 shrink-0">
      <Icon className="h-6 w-6 text-blue-600" />
    </div>
    <div>
      <h1 className="italic font-extrabold text-xl tracking-tight text-slate-900 sm:text-2xl">TITULO</h1>
      <p className="text-[10px] tracking-widest text-slate-500 font-semibold">SUBTITULO</p>
      <p className="mt-1 text-sm tracking-tight text-slate-500">Descripcion...</p>
    </div>
  </div>
</div>

// Search input
<Input className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-8 text-base placeholder:text-slate-400 transition-colors focus:bg-white md:text-sm" />

// KPI cards
<button className={cn("group flex flex-col gap-2.5 rounded-2xl border bg-white p-4 text-left shadow-sm", "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer", isActive ? "ring-2 ring-slate-400 border-slate-300 bg-slate-50" : "border-slate-200 hover:border-slate-300")}>
  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
    <Icon className="h-4 w-4 text-slate-600 transition-transform duration-200 group-hover:scale-110" />
  </div>
  <p className="text-2xl font-bold tabular-nums tracking-tight">count</p>
  <div>
    <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 leading-none">Label</p>
    <p className="mt-0.5 text-[10px] leading-snug text-slate-400">sublabel</p>
  </div>
</button>

// Pagination
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">

// Boton primario
<Button className="h-11 shrink-0 gap-2 rounded-xl px-4 font-semibold tracking-tight btn-glow">

// Tabla wrapper
<div className="w-full overflow-x-auto">
```

## Módulos que requieren revisión prioritaria

### 1. VENTAS (POS) — `app/dashboard/ventas/page.tsx`
- **Header historial**: el back button "Punto de Venta" y el layout del historial podrian mejorarse en mobile. Verificar que el header historial se vea bien en viewport < 640px.
- **Action buttons** en POS header: 5 botones (Abrir Caja/Mi Arqueo/Historial/Corte + caja badge) se apilan con `flex-wrap`. Verificar que no desborden y tengan padding adecuado en mobile.
- **Bottom tabs** (INVENTARIO/REPARACIONES/APROBACIONES): Tienen `p-1.5` y `rounded-2xl` con `flex-1`. Verificar que las etiquetas no se corten en mobile (especialmente "REPARACIONES" y "APROBACIONES").
- **Cart panel** (lateral derecho): Cuando hay items en el carrito, en mobile se convierte en un bottom sheet. Verificar que no tenga overflow horizontal y que los botones de cantidad sean touch-friendly.
- **Product grid buttons**: Los items de producto usan `rounded-xl border px-3 py-2.5`. Verificar que tengan suficiente altura táctil en mobile (min 44px).
- **Modales**: ArqueoModal, DescuentoModal, SpecialModal, ConfirmModal, SuccessModal — verificar que sean full-width y no tengan overflow en mobile.

### 2. CONFIGURACION — `app/dashboard/configuracion/page.tsx`
- **Tabs de navegacion**: Usan `flex space-x-1 overflow-x-auto border-b`. Verificar que `overflow-x-auto` funcione correctamente y que los tabs no queden truncados en mobile. Los tabs "Flujo PRO" y "Reportes y Alertas" tienen badges PRO que podrian romper el layout.
- **Modo loading/error**: Las pantallas de carga usan `min-h-screen bg-slate-50 flex items-center justify-center` — esto las saca del flujo normal del dashboard. Verificar que el menú flotante sea visible en estos estados.
- **Empresa.tsx** (tab Taller): Contiene inputs de formulario, select de pais/estado, upload de logo, timezone selector. Verificar que los `grid-cols-2` en labels/inputs funcionen correctamente en mobile.
- **Imprenta.tsx**: Verificar que las opciones de impresión no desborden horizontalmente.
- **Hardware.tsx**: Verificar que las tarjetas de configuración de hardware se vean bien en mobile.

### 3. COMPRAS — `app/dashboard/compras/page.tsx`
- **Status filter pills**: Usan `overflow-x-auto` con `shrink-0 rounded-full`. Verificar que no causen scroll horizontal en toda la página (solo dentro del contenedor).
- **Purchase order cards**: En mobile, las ordenes se muestran en layout vertical (`flex-col`) dentro de `group flex flex-col sm:grid sm:grid-cols-[1.2fr...]`. Verificar que los datos se vean legibles sin excesivo espacio.
- **ProveedoresModal y ReporteModal**: Verificar que los modales sean responsivos en mobile.

### 4. BITACORA DE VISITAS — `app/dashboard/bitacora-visitas/page.tsx`
- **Tabla desktop vs mobile**: Actualmente la tabla usa `<table>` HTML nativo sin vista mobile (cards). Agregar mobile card view similar a `orders-table.tsx`.
- **Stat badges**: Los badges (Pendientes/Atendidos/Se fueron) se renderizan con `StatBadge` en el header. Verificar que no se apilen mal en mobile.
- **QuickRegisterModal y CompletarAtencionModal**: Verificar que los modales tengan padding adecuado y inputs touch-friendly en mobile.

### 5. CHAT — `app/dashboard/chat/page.tsx`
- **Layout general**: Usa `h-[calc(100vh-4rem)]`. Verificar que en mobile no haya problemas con la altura del viewport (usar `100dvh` en lugar de `100vh`).
- **ChatSidebar**: Verificar que el sidebar ocupe el ancho completo en mobile y tenga buen scroll.
- **ChatInput**: Verificar que el input no quede oculto detras del teclado virtual en mobile.
- **MessageList**: Verificar que los mensajes no tengan overflow horizontal.

### 6. MI TIENDA — `app/dashboard/mercado/page.tsx`
- Header: ModuleHeader con 3 stats (publicados, disponibles, plan). Verificar en mobile que las stats se vean en 1 columna o 2 columnas segun ancho.
- Configuracion: dos tarjetas (Identidad / Redes) con inputs. Verificar que los campos no se corten en mobile.
- Lista de productos: cada row con imagen, nombre, precio, boton Publicar/Quitar. Verificar tap targets >=44px.
- Toggle de activacion: switch grande en la parte superior. Verificar que el switch sea tocable.
- Version publica `/t/[slug]` y `/t/[slug]/p/[productoId]`: mobile-first con `aspect-square` para imagen, grid 1 col mobile / 2-3 cols desktop.

### 7. REPORTES — `app/dashboard/reportes/page.tsx`
- **Header**: Tiene search + period tabs + action buttons en la misma fila. Verificar que en mobile se apilen correctamente y no desborden.
- **KPI cards**: Grid `sm:grid-cols-2 lg:grid-cols-4`. Verificar que en mobile (1 columna) los cards tengan buen espaciado y legibilidad.
- **Grafico de barras**: Los SVG tienen alturas fijas. Verificar que el grafico no desborde en mobile.
- **Search**: El placeholder "Buscar falla o tecnico..." y el Input con `pl-8 h-9 text-xs` — deberia actualizarse al patron estandar `h-11 rounded-xl bg-slate-50 pl-9` para consistencia.

### 8. SERVICIOS — `app/dashboard/servicios/page.tsx`
- **Card grid**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. Verificar espaciado en mobile.
- **Search input**: Usa `h-10` en lugar de `h-11` — deberia actualizarse a `h-11` para consistencia (linea 102).
- **Empty state**: Usa `rounded-2xl border border-dashed` — verificar centrado en mobile.

### 9. HISTORIAL DE VENTAS — `app/dashboard/historial-ventas/page.tsx`
- **Date range filters**: Los inputs de fecha tienen `min-w-[10rem]`. Verificar que no causen overflow en mobile muy pequeño.
- **Summary cards**: Grid `sm:grid-cols-2 lg:grid-cols-4` — en mobile 1 columna. Verificar espaciado.
- **Sales list mobile cards**: Ya tiene `sm:hidden` con `HistorialVentaRowCard variant="card"`. Verificar que las cards se vean bien.

## Checklist de verificacion rapida

Para CADA modulo revisar:

- [ ] ¿Tiene el contenedor `mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10`?
- [ ] ¿Header usa `rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-8`?
- [ ] ¿Titulo usa `italic font-extrabold text-xl tracking-tight text-slate-900 sm:text-2xl`?
- [ ] ¿Search usa `h-11 rounded-xl border-slate-200 bg-slate-50 pl-9` con `focus:bg-white`?
- [ ] ¿KPI cards usan `rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5`?
- [ ] ¿Botones primarios tienen `h-11 shrink-0 gap-2 rounded-xl px-4 font-semibold tracking-tight` + `btn-glow`?
- [ ] ¿Paginacion usa `rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex-col sm:flex-row`?
- [ ] ¿Tablas/scroll horizontal estan contenidos dentro de `w-full overflow-x-auto`?
- [ ] ¿Modales son full-width en mobile y no tienen overflow?
- [ ] ¿Botones/inputs touch-friendly (min 44px altura)?
- [ ] ¿No hay scroll horizontal en toda la pagina en viewport 375px?
- [ ] ¿Menú flotante hamburguesa visible en mobile (bottom-4 left-4)?
