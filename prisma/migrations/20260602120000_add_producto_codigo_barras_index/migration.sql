-- CreateIndex
CREATE INDEX IF NOT EXISTS "productos_taller_id_codigo_barras_idx" ON "productos"("taller_id", "codigo_barras");
