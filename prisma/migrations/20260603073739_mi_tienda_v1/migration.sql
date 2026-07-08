-- Mi Tienda v2.3.0: campos para tienda publica por tenant.
-- NOTA: La tabla Tenant NO tiene @@map, por lo tanto se llama "Tenant" (con mayuscula), no "tenants".
-- Esta migracion es idempotente (IF NOT EXISTS) para tolerar re-aplicaciones parciales.

-- AlterTable productos
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "publicado_en_tienda" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "orden_tienda" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "descripcion_publica" TEXT;

-- AlterTable Tenant (con mayuscula, sin @@map)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "tienda_publica_activa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "tienda_slogan" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "tienda_redes" JSONB;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "tienda_horarios" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "tienda_activada_en" TIMESTAMP(3);

-- CreateTable tienda_eventos
CREATE TABLE IF NOT EXISTS "tienda_eventos" (
    "id" TEXT NOT NULL,
    "taller_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "producto_id" TEXT,
    "referrer" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tienda_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "productos_taller_id_publicado_en_tienda_idx" ON "productos"("taller_id", "publicado_en_tienda");
CREATE INDEX IF NOT EXISTS "productos_taller_id_publicado_en_tienda_orden_tienda_idx" ON "productos"("taller_id", "publicado_en_tienda", "orden_tienda");
CREATE INDEX IF NOT EXISTS "tienda_eventos_taller_id_created_at_idx" ON "tienda_eventos"("taller_id", "created_at");
CREATE INDEX IF NOT EXISTS "tienda_eventos_taller_id_tipo_idx" ON "tienda_eventos"("taller_id", "tipo");
CREATE INDEX IF NOT EXISTS "tienda_eventos_taller_id_producto_id_idx" ON "tienda_eventos"("taller_id", "producto_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tienda_eventos_taller_id_fkey'
  ) THEN
    ALTER TABLE "tienda_eventos"
      ADD CONSTRAINT "tienda_eventos_taller_id_fkey"
      FOREIGN KEY ("taller_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
