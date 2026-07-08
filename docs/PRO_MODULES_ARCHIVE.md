# PRO Modules Archive

## Fuera del MVP (Web-first)

- Tauri runtime
- Electron runtime
- QZ Tray y cualquier impresion desktop directa
- Integraciones `@/lib/tauri/*`

## Modulos archivados

- Se archivo `app/(print)` en `_archive/print`.
- Rutas archivadas del flujo anterior:
  - `print-ticket`
  - `print-abono`
  - `print-calibration`
  - `print-corte`
  - `print-entrega`
  - `print-label`
  - (tambien quedaron fuera `print-compra` y `print-documento` al archivar el segmento completo)

## Placeholders PRO aplicados

- `components/configuracion/Hardware.tsx` ahora muestra `Hardware (PRO) / Proximamente`.
- Acciones de impresion desde dashboard/ventas/entrega muestran mensajes `Impresion directa (PRO)` y `PDF proximamente`.

## Dependencias desktop pendientes

- No quedan imports activos a `@/lib/tauri/*` en modulos del MVP.
- El flujo de WhatsApp y links externos usa `window.open(..., "_blank")`.

## Notas

- Este cleanup prioriza build estable del MVP web.
- Si se reactiva impresion, debe hacerse como modulo PRO separado y sin acoplarlo al runtime web base.

## Fase 8 - Estado PRO (sin cambios funcionales)

- Hardware permanece como placeholder `PRO / Próximamente` en Configuración.
- No se reactivó integración QZ, Tauri, Electron, Hikvision, firma digital ni automatizaciones avanzadas.
- La fase se enfocó exclusivamente en configuración básica y branding MVP.
