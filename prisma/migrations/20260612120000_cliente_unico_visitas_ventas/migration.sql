-- Cliente unico por telefono: enlaza ventas y visitas con Cliente sin forzar
-- unique sobre telefono hasta auditar duplicados historicos por tenant.

ALTER TABLE "bitacora_visitas"
  ADD COLUMN IF NOT EXISTS "cliente_id" TEXT;

CREATE INDEX IF NOT EXISTS "bitacora_visitas_taller_id_cliente_id_idx"
  ON "bitacora_visitas"("taller_id", "cliente_id");

CREATE INDEX IF NOT EXISTS "ventas_taller_id_cliente_id_idx"
  ON "ventas"("taller_id", "cliente_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bitacora_visitas_cliente_id_fkey'
  ) THEN
    ALTER TABLE "bitacora_visitas"
      ADD CONSTRAINT "bitacora_visitas_cliente_id_fkey"
      FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ventas_cliente_id_fkey'
  ) THEN
    ALTER TABLE "ventas"
      ADD CONSTRAINT "ventas_cliente_id_fkey"
      FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
      NOT VALID;
  END IF;
END $$;
