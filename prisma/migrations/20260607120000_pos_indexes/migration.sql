-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ventas_taller_id_folio_key" ON "ventas"("taller_id", "folio");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "productos_taller_id_created_at_idx" ON "productos"("taller_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "movimientos_caja_caja_id_tipo_metodo_pago_idx" ON "movimientos_caja"("caja_id", "tipo", "metodo_pago");
