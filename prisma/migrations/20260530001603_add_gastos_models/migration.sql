-- CreateTable: bitacora_gastos
CREATE TABLE IF NOT EXISTS "bitacora_gastos" (
    "id" TEXT NOT NULL,
    "taller_id" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'general',
    "monto" DECIMAL(10,2) NOT NULL,
    "metodo_pago" TEXT NOT NULL DEFAULT 'efectivo',
    "fecha" TIMESTAMP(3) NOT NULL,
    "notas" TEXT,
    "caja_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable: reparacion_gastos
CREATE TABLE IF NOT EXISTS "reparacion_gastos" (
    "id" TEXT NOT NULL,
    "taller_id" TEXT NOT NULL,
    "reparacion_id" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "tipo" TEXT NOT NULL,
    "producto_id" TEXT,
    "mostrar_cliente" BOOLEAN NOT NULL DEFAULT false,
    "creado_por_nombre" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reparacion_gastos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: bitacora_gastos_taller_id_idx
CREATE INDEX IF NOT EXISTS "bitacora_gastos_taller_id_idx" ON "bitacora_gastos"("taller_id");

-- CreateIndex: bitacora_gastos_taller_id_fecha_idx
CREATE INDEX IF NOT EXISTS "bitacora_gastos_taller_id_fecha_idx" ON "bitacora_gastos"("taller_id", "fecha");

-- CreateIndex: reparacion_gastos_taller_id_idx
CREATE INDEX IF NOT EXISTS "reparacion_gastos_taller_id_idx" ON "reparacion_gastos"("taller_id");

-- CreateIndex: reparacion_gastos_taller_id_reparacion_id_idx
CREATE INDEX IF NOT EXISTS "reparacion_gastos_taller_id_reparacion_id_idx" ON "reparacion_gastos"("taller_id", "reparacion_id");

-- AddForeignKey: bitacora_gastos_taller_id_fkey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bitacora_gastos_taller_id_fkey') THEN
    ALTER TABLE "bitacora_gastos" ADD CONSTRAINT "bitacora_gastos_taller_id_fkey" FOREIGN KEY ("taller_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: reparacion_gastos_taller_id_fkey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reparacion_gastos_taller_id_fkey') THEN
    ALTER TABLE "reparacion_gastos" ADD CONSTRAINT "reparacion_gastos_taller_id_fkey" FOREIGN KEY ("taller_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: reparacion_gastos_reparacion_id_fkey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reparacion_gastos_reparacion_id_fkey') THEN
    ALTER TABLE "reparacion_gastos" ADD CONSTRAINT "reparacion_gastos_reparacion_id_fkey" FOREIGN KEY ("reparacion_id") REFERENCES "Reparacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
