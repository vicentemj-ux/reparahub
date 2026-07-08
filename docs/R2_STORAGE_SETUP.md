# R2 Storage Setup (Fase 6)

## Bucket único
- Bucket: `reparahub-v1-3`

## Prefijos implementados
- Ingreso de reparación (tracking verificado):
  - `repairs/intake/{tenantId}/{reparacionId}/{archivoId}-{safeFileName}`
- Privado reparación (reservado/implementado helper):
  - `private/repairs/{tenantId}/{reparacionId}/{archivoId}-{safeFileName}`

## Variables de entorno requeridas
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET=reparahub-v1-3`
- `R2_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev`

Notas:
- `R2_PUBLIC_BASE_URL` sin slash final.
- Nunca exponer `R2_SECRET_ACCESS_KEY` ni `R2_ACCESS_KEY_ID` en frontend.

## Helpers de R2
Archivo: `lib/r2.ts`

- `sanitizeFileName(fileName)`
- `getPublicTrackPhotoKey({ tenantId, reparacionId, archivoId, fileName })`
- `getPrivateRepairPhotoKey({ tenantId, reparacionId, archivoId, fileName })`
- `getR2PublicUrl(storageKey)`
- `getR2BucketName()`
- `uploadFileToR2({ key, body, contentType })`

## Flujo implementado (Nuevo Folio)
Archivo: `lib/actions/repairs-prisma.ts`

1. Crear/reutilizar cliente por teléfono.
2. Crear reparación.
3. Subir fotos (data URL) a R2 en `repairs/intake/...`.
4. Guardar metadatos en tabla `Archivo` con:
   - `tipo=REPAIR_INTAKE_PHOTO`
   - `visibility=TRACKING_VERIFIED`
   - `bucket`, `storageKey`, `publicUrl`, `mimeType`, `size`

## Tracking público
Archivo: `app/track/[id]/view.tsx`

- Usa `getTrackingPhotoUrls(ticketId, last4)` desde `lib/actions/repairs-prisma.ts`.
- Valida ticket + últimos 4 dígitos del teléfono.
- Lee `Archivo` filtrando `visibility=TRACKING_VERIFIED` + `tipo=REPAIR_INTAKE_PHOTO`.
- Muestra desde `publicUrl` si existe o construye URL desde `storageKey`.

## Qué queda para fase posterior
- Firmas, Hikvision, visitas y hardware en prefijos `private-pro/*`.
- Separar en fases futuras `repairs/evidence` (PRIVATE) con endpoint firmado/proxy interno.

## Fix tracking 4 dígitos + render de fotos R2 (Fase 7.1)

- Tracking validado por endpoint interno `POST /api/tracking/verify`.
- Normalización centralizada en `lib/phone.ts`:
  - `onlyDigits(phone)`
  - `last4(phone)`
- Render de imagen consolidado en `lib/archivo-url.ts` con regla:
  1. usar `publicUrl` si es URL HTTP absoluta;
  2. si no, construir `${R2_PUBLIC_BASE_URL}/${storageKey|key}`;
  3. si no hay URL válida, no renderizar imagen rota.

Este fix elimina placeholders con `src` inválido en detalle/tracking y asegura que el bloqueo por 4 dígitos sea determinista.

## Fase 8 - Branding logo del taller

- Nuevo prefijo de branding público:
  - `tenants/{tenantId}/branding/logo-{timestamp}.{ext}`
- Persistencia en Prisma:
  - `ConfiguracionTaller.logoUrl`
  - `ConfiguracionTaller.logoStorageKey`
- Fuente de upload:
  - `lib/actions/settings-prisma.ts` (`updateTallerLogo` / `updateTallerSettings`).

## Fase 8.1 QA (logo branding)

- Upload/logo branding sigue en flujo MVP vía `settings-prisma`.
- Prefijo esperado en R2: `tenants/{tenantId}/branding/logo-{timestamp}.{ext}`.
- Verificación visual de objeto y render final: pendiente de QA manual en navegador/dashboard R2.
