ALTER TABLE "Reparacion"
  ADD COLUMN IF NOT EXISTS "fecha_promesa_entrega" DATE;

UPDATE "Reparacion"
SET "fecha_promesa_entrega" = COALESCE("fecha_promesa_entrega", "createdAt"::date);

ALTER TABLE "Reparacion"
  ALTER COLUMN "fecha_promesa_entrega" SET DEFAULT CURRENT_DATE,
  ALTER COLUMN "fecha_promesa_entrega" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Reparacion_tenant_fecha_promesa_entrega_idx"
  ON "Reparacion"("tenantId", "fecha_promesa_entrega");
