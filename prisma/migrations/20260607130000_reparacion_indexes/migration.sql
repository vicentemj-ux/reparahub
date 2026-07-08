-- CreateIndex
CREATE INDEX IF NOT EXISTS "Reparacion_taller_id_estatus_idx" ON "Reparacion"("tenantId", "estatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Reparacion_taller_id_created_at_idx" ON "Reparacion"("tenantId", "createdAt");
