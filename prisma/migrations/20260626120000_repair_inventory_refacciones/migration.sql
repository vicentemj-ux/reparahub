-- CreateTable: reparacion_refacciones
CREATE TABLE IF NOT EXISTS "reparacion_refacciones" (
    "id" TEXT NOT NULL,
    "taller_id" TEXT NOT NULL,
    "reparacion_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "concepto_snapshot" TEXT NOT NULL,
    "sku_snapshot" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "costo_unitario" DECIMAL(12,2) NOT NULL,
    "precio_venta_snapshot" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "precio_cliente" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "price_mode" TEXT NOT NULL DEFAULT 'included_in_service',
    "estado" TEXT NOT NULL DEFAULT 'consumed',
    "mostrar_cliente" BOOLEAN NOT NULL DEFAULT false,
    "creado_por_nombre" TEXT,
    "motivo_cancelacion" TEXT,
    "consumed_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "returned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reparacion_refacciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable: inventario_movimientos
CREATE TABLE IF NOT EXISTS "inventario_movimientos" (
    "id" TEXT NOT NULL,
    "taller_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "referencia_tipo" TEXT,
    "referencia_id" TEXT,
    "cantidad" INTEGER NOT NULL,
    "stock_antes" INTEGER NOT NULL,
    "stock_despues" INTEGER NOT NULL,
    "costo_unitario" DECIMAL(12,2),
    "nota" TEXT,
    "actor_nombre" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventario_movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reparacion_refacciones_taller_id_idx" ON "reparacion_refacciones"("taller_id");
CREATE INDEX IF NOT EXISTS "reparacion_refacciones_taller_id_reparacion_id_idx" ON "reparacion_refacciones"("taller_id", "reparacion_id");
CREATE INDEX IF NOT EXISTS "reparacion_refacciones_taller_id_producto_id_idx" ON "reparacion_refacciones"("taller_id", "producto_id");
CREATE INDEX IF NOT EXISTS "reparacion_refacciones_taller_id_estado_idx" ON "reparacion_refacciones"("taller_id", "estado");
CREATE INDEX IF NOT EXISTS "inventario_movimientos_taller_id_idx" ON "inventario_movimientos"("taller_id");
CREATE INDEX IF NOT EXISTS "inventario_movimientos_taller_id_producto_id_idx" ON "inventario_movimientos"("taller_id", "producto_id");
CREATE INDEX IF NOT EXISTS "inventario_movimientos_taller_id_tipo_created_at_idx" ON "inventario_movimientos"("taller_id", "tipo", "created_at");
CREATE INDEX IF NOT EXISTS "inventario_movimientos_referencia_tipo_referencia_id_idx" ON "inventario_movimientos"("referencia_tipo", "referencia_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reparacion_refacciones_taller_id_fkey') THEN
    ALTER TABLE "reparacion_refacciones" ADD CONSTRAINT "reparacion_refacciones_taller_id_fkey" FOREIGN KEY ("taller_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reparacion_refacciones_reparacion_id_fkey') THEN
    ALTER TABLE "reparacion_refacciones" ADD CONSTRAINT "reparacion_refacciones_reparacion_id_fkey" FOREIGN KEY ("reparacion_id") REFERENCES "Reparacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reparacion_refacciones_producto_id_fkey') THEN
    ALTER TABLE "reparacion_refacciones" ADD CONSTRAINT "reparacion_refacciones_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventario_movimientos_taller_id_fkey') THEN
    ALTER TABLE "inventario_movimientos" ADD CONSTRAINT "inventario_movimientos_taller_id_fkey" FOREIGN KEY ("taller_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventario_movimientos_producto_id_fkey') THEN
    ALTER TABLE "inventario_movimientos" ADD CONSTRAINT "inventario_movimientos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
