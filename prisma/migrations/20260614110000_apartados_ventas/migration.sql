CREATE TABLE IF NOT EXISTS "apartados" (
  "id" TEXT NOT NULL,
  "taller_id" TEXT NOT NULL,
  "cliente_id" TEXT NOT NULL,
  "producto_id" TEXT NOT NULL,
  "caja_id" TEXT,
  "venta_final_id" TEXT,
  "folio" TEXT NOT NULL,
  "producto_nombre" TEXT NOT NULL,
  "producto_sku" TEXT,
  "cantidad" INTEGER NOT NULL DEFAULT 1,
  "precio_acordado" DECIMAL(12,2) NOT NULL,
  "total_abonado" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "saldo" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "estado" TEXT NOT NULL DEFAULT 'activo',
  "fecha_limite" DATE NOT NULL,
  "fecha_liquidacion" TIMESTAMP(3),
  "fecha_cancelacion" TIMESTAMP(3),
  "motivo_cancelacion" TEXT,
  "vendedor_nombre" TEXT,
  "notas" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "apartados_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "apartado_abonos" (
  "id" TEXT NOT NULL,
  "taller_id" TEXT NOT NULL,
  "apartado_id" TEXT NOT NULL,
  "caja_id" TEXT,
  "monto" DECIMAL(12,2) NOT NULL,
  "metodo_pago" TEXT NOT NULL,
  "referencia_pago" TEXT,
  "vendedor_nombre" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "apartado_abonos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "apartados_taller_id_folio_key" ON "apartados"("taller_id", "folio");
CREATE INDEX IF NOT EXISTS "apartados_taller_id_idx" ON "apartados"("taller_id");
CREATE INDEX IF NOT EXISTS "apartados_taller_id_estado_idx" ON "apartados"("taller_id", "estado");
CREATE INDEX IF NOT EXISTS "apartados_taller_id_fecha_limite_idx" ON "apartados"("taller_id", "fecha_limite");
CREATE INDEX IF NOT EXISTS "apartados_cliente_id_idx" ON "apartados"("cliente_id");
CREATE INDEX IF NOT EXISTS "apartados_producto_id_idx" ON "apartados"("producto_id");
CREATE INDEX IF NOT EXISTS "apartados_caja_id_idx" ON "apartados"("caja_id");
CREATE INDEX IF NOT EXISTS "apartado_abonos_taller_id_idx" ON "apartado_abonos"("taller_id");
CREATE INDEX IF NOT EXISTS "apartado_abonos_apartado_id_idx" ON "apartado_abonos"("apartado_id");
CREATE INDEX IF NOT EXISTS "apartado_abonos_caja_id_idx" ON "apartado_abonos"("caja_id");

DO $$ BEGIN
  ALTER TABLE "apartados" ADD CONSTRAINT "apartados_taller_id_fkey" FOREIGN KEY ("taller_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "apartados" ADD CONSTRAINT "apartados_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "apartados" ADD CONSTRAINT "apartados_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "apartados" ADD CONSTRAINT "apartados_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "apartados" ADD CONSTRAINT "apartados_venta_final_id_fkey" FOREIGN KEY ("venta_final_id") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "apartado_abonos" ADD CONSTRAINT "apartado_abonos_taller_id_fkey" FOREIGN KEY ("taller_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "apartado_abonos" ADD CONSTRAINT "apartado_abonos_apartado_id_fkey" FOREIGN KEY ("apartado_id") REFERENCES "apartados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "apartado_abonos" ADD CONSTRAINT "apartado_abonos_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
