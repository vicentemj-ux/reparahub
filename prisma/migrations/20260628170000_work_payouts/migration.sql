-- Operational collaborators without login.
CREATE TABLE IF NOT EXISTS "colaboradores_operativos" (
  "id" TEXT NOT NULL,
  "taller_id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'tecnico',
  "tarifa_default" DECIMAL(12,2),
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "notas" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "colaboradores_operativos_pkey" PRIMARY KEY ("id")
);

-- Payout header for weekly technician/maquila settlements.
CREATE TABLE IF NOT EXISTS "liquidaciones_trabajo" (
  "id" TEXT NOT NULL,
  "taller_id" TEXT NOT NULL,
  "colaborador_id" TEXT,
  "colaborador_nombre" TEXT NOT NULL,
  "colaborador_key" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "metodo_pago" TEXT NOT NULL,
  "periodo_desde" TIMESTAMP(3) NOT NULL,
  "periodo_hasta" TIMESTAMP(3) NOT NULL,
  "monto_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "estado" TEXT NOT NULL DEFAULT 'confirmada',
  "creado_por_nombre" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "liquidaciones_trabajo_pkey" PRIMARY KEY ("id")
);

-- Payout items. The unique index prevents paying the same folio/person/type twice.
CREATE TABLE IF NOT EXISTS "liquidacion_trabajo_items" (
  "id" TEXT NOT NULL,
  "taller_id" TEXT NOT NULL,
  "liquidacion_id" TEXT NOT NULL,
  "reparacion_id" TEXT NOT NULL,
  "colaborador_key" TEXT NOT NULL,
  "colaborador_nombre" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "dedupe_key" TEXT NOT NULL DEFAULT 'principal',
  "motivo_excepcion" TEXT,
  "concepto" TEXT NOT NULL,
  "monto" DECIMAL(12,2) NOT NULL,
  "fecha_terminado" TIMESTAMP(3) NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'confirmada',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "liquidacion_trabajo_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "reparacion_gastos"
  ADD COLUMN IF NOT EXISTS "liquidacion_item_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "colab_oper_tenant_nombre_tipo_key"
  ON "colaboradores_operativos"("taller_id", "nombre", "tipo");
CREATE INDEX IF NOT EXISTS "colab_oper_tenant_idx"
  ON "colaboradores_operativos"("taller_id");
CREATE INDEX IF NOT EXISTS "colab_oper_tenant_tipo_activo_idx"
  ON "colaboradores_operativos"("taller_id", "tipo", "activo");

CREATE INDEX IF NOT EXISTS "liq_trabajo_tenant_idx"
  ON "liquidaciones_trabajo"("taller_id");
CREATE INDEX IF NOT EXISTS "liq_trabajo_tenant_colab_created_idx"
  ON "liquidaciones_trabajo"("taller_id", "colaborador_key", "created_at");
CREATE INDEX IF NOT EXISTS "liq_trabajo_tenant_periodo_idx"
  ON "liquidaciones_trabajo"("taller_id", "periodo_desde", "periodo_hasta");

CREATE UNIQUE INDEX IF NOT EXISTS "liq_item_dedupe_key"
  ON "liquidacion_trabajo_items"("taller_id", "reparacion_id", "colaborador_key", "tipo", "dedupe_key");
CREATE INDEX IF NOT EXISTS "liq_item_tenant_idx"
  ON "liquidacion_trabajo_items"("taller_id");
CREATE INDEX IF NOT EXISTS "liq_item_tenant_liq_idx"
  ON "liquidacion_trabajo_items"("taller_id", "liquidacion_id");
CREATE INDEX IF NOT EXISTS "liq_item_tenant_colab_tipo_idx"
  ON "liquidacion_trabajo_items"("taller_id", "colaborador_key", "tipo");

CREATE UNIQUE INDEX IF NOT EXISTS "reparacion_gastos_liquidacion_item_id_key"
  ON "reparacion_gastos"("liquidacion_item_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'colaboradores_operativos_taller_id_fkey') THEN
    ALTER TABLE "colaboradores_operativos" ADD CONSTRAINT "colaboradores_operativos_taller_id_fkey"
      FOREIGN KEY ("taller_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'liquidaciones_trabajo_taller_id_fkey') THEN
    ALTER TABLE "liquidaciones_trabajo" ADD CONSTRAINT "liquidaciones_trabajo_taller_id_fkey"
      FOREIGN KEY ("taller_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'liquidaciones_trabajo_colaborador_id_fkey') THEN
    ALTER TABLE "liquidaciones_trabajo" ADD CONSTRAINT "liquidaciones_trabajo_colaborador_id_fkey"
      FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores_operativos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'liquidacion_trabajo_items_taller_id_fkey') THEN
    ALTER TABLE "liquidacion_trabajo_items" ADD CONSTRAINT "liquidacion_trabajo_items_taller_id_fkey"
      FOREIGN KEY ("taller_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'liquidacion_trabajo_items_liquidacion_id_fkey') THEN
    ALTER TABLE "liquidacion_trabajo_items" ADD CONSTRAINT "liquidacion_trabajo_items_liquidacion_id_fkey"
      FOREIGN KEY ("liquidacion_id") REFERENCES "liquidaciones_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'liquidacion_trabajo_items_reparacion_id_fkey') THEN
    ALTER TABLE "liquidacion_trabajo_items" ADD CONSTRAINT "liquidacion_trabajo_items_reparacion_id_fkey"
      FOREIGN KEY ("reparacion_id") REFERENCES "Reparacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reparacion_gastos_liquidacion_item_id_fkey') THEN
    ALTER TABLE "reparacion_gastos" ADD CONSTRAINT "reparacion_gastos_liquidacion_item_id_fkey"
      FOREIGN KEY ("liquidacion_item_id") REFERENCES "liquidacion_trabajo_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
