# Fase 7 - Tracking público verificado y detalle folio

Fecha de ejecución: 2026-05-25
Responsable: Codex

## Objetivo
Cerrar flujo MVP real: nuevo folio -> fotos -> WhatsApp -> tracking verificado.

## Cambios implementados
1. WhatsApp de bienvenida usa base local cuando la app corre en localhost.
- Archivo: `lib/whatsapp-repair-welcome.ts`
- Resultado: si la sesión está en `localhost` o `127.0.0.1`, el link de tracking enviado por WhatsApp usa origen local.

2. WhatsApp de cambio de estado usa base local cuando la app corre en localhost.
- Archivo: `lib/whatsapp-repair-status.ts`
- Resultado: el mensaje de estado evita forzar dominio productivo en pruebas locales.

## Verificación técnica realizada
1. Tracking público con verificación de últimos 4 dígitos.
- Ruta: `app/track/[id]/view.tsx`
- Evidencia: usa RPC `get_tracking_info` con `p_ticket_id` + `p_last4`.

2. Tracking muestra folio, estado y evidencia de fotos.
- Ruta: `app/track/[id]/view.tsx`
- Evidencia: renderiza `folio`, timeline de estado y carrusel/zoom de `photoUrls`.

3. Fotos tracking con visibilidad verificada.
- Ruta: `lib/actions/repairs-prisma.ts`
- Evidencia: `getTrackingPhotoUrls()` filtra `visibility = TRACKING_VERIFIED` y `tipo = REPAIR_INTAKE_PHOTO`.

4. Persistencia de intake en objetos y modelo de datos.
- Ruta: `lib/actions/repairs-prisma.ts`
- Evidencia: `createRepair()` sube a R2 (`repairs/intake/...`) y crea registros en `Archivo`.

## QA manual requerido (no automatizable desde CLI)
1. Crear folio nuevo con 1, 2 y 3 fotos desde UI y validar tracking.
2. Confirmar en Prisma Studio relaciones Cliente/Reparacion/Archivo.
3. Verificar en dashboard que el detalle por folio/orden abre correctamente.
4. Revisar en R2 que existan objetos bajo prefijo `repairs/intake/...` del tenant.

## Criterio de éxito - estado actual
- Detalle folio abre: Pendiente validación manual en UI.
- Tracking verificado funciona: Implementado en código y listo para QA manual.
- Fotos múltiples funcionan: Implementado en código y listo para QA manual (1/2/3 fotos).
- WhatsApp correcto: Ajustado para localhost en entorno local.
- Build OK: Ver sección de build.

## Build
Comando ejecutado:
- `pnpm build`

Resultado:`n- OK. Compilacion completada correctamente con Next.js 16.2.0 (sin errores de TypeScript ni build).

