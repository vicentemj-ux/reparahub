-- Motor de "Reportes y Alertas" v2.3.0
-- - Defaults: activar los 3 toggles (alertasStockBajo, reportesCierreCaja,
--   alertaUrgentes) por default `true` para que Pro/Trial arranquen con
--   las alertas prendidas. Los usuarios pueden apagarlas manualmente.
-- - last_daily_alerts_at: dedupe diario de `runDailyAlertsCheck`.
-- - alertas_enviadas: bitacora de emails enviados por el motor.
-- Migracion idempotente (IF NOT EXISTS / DO blocks) para tolerar re-aplicaciones.

-- 1) Cambiar defaults de los 3 toggles a TRUE.
ALTER TABLE "ConfiguracionTaller"
  ALTER COLUMN "alertasStockBajo" SET DEFAULT true;
ALTER TABLE "ConfiguracionTaller"
  ALTER COLUMN "reportesCierreCaja" SET DEFAULT true;
ALTER TABLE "ConfiguracionTaller"
  ALTER COLUMN "alertaUrgentes" SET DEFAULT true;

-- 2) Backfill: para tenants PRO o en trial, forzar los 3 toggles a true.
--    El `lastDailyAlertsAt` se queda en null; el motor lo actualizara la
--    primera vez que corra hoy.
UPDATE "ConfiguracionTaller" ct
SET
  "alertasStockBajo"   = true,
  "alertaUrgentes"     = true,
  "reportesCierreCaja" = COALESCE(ct."reportesCierreCaja", true)
FROM "Tenant" t
WHERE ct."tenantId" = t.id
  AND (
    t.plan = 'PRO'
    OR (t."trialEndsAt" IS NOT NULL AND t."trialEndsAt" > NOW())
  );

-- 3) Agregar columna de dedupe.
ALTER TABLE "ConfiguracionTaller"
  ADD COLUMN IF NOT EXISTS "last_daily_alerts_at" TIMESTAMP(3);

-- 4) Crear tabla bitacora.
CREATE TABLE IF NOT EXISTS "alertas_enviadas" (
    "id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "resumen" TEXT,
    "resend_message_ids" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ok',
    "detalle_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_enviadas_pkey" PRIMARY KEY ("id")
);

-- 5) Indices.
CREATE INDEX IF NOT EXISTS "alertas_enviadas_config_id_created_at_idx"
  ON "alertas_enviadas"("config_id", "created_at");
CREATE INDEX IF NOT EXISTS "alertas_enviadas_config_id_tipo_created_at_idx"
  ON "alertas_enviadas"("config_id", "tipo", "created_at");

-- 6) FK con idempotencia.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alertas_enviadas_config_id_fkey'
  ) THEN
    ALTER TABLE "alertas_enviadas"
      ADD CONSTRAINT "alertas_enviadas_config_id_fkey"
      FOREIGN KEY ("config_id") REFERENCES "ConfiguracionTaller"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
