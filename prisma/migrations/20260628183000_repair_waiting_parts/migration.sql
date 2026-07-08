ALTER TABLE "Reparacion"
  ADD COLUMN IF NOT EXISTS "espera_refaccion_concepto" TEXT,
  ADD COLUMN IF NOT EXISTS "espera_refaccion_eta" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "espera_refaccion_nota" TEXT;

CREATE INDEX IF NOT EXISTS "Reparacion_tenant_espera_refaccion_eta_idx"
  ON "Reparacion"("tenantId", "espera_refaccion_eta");
