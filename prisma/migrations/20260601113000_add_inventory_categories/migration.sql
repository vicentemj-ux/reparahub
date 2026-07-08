CREATE TABLE IF NOT EXISTS "inventario_categorias" (
  "id" TEXT NOT NULL,
  "taller_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'custom',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 100,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventario_categorias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventario_categoria_aliases" (
  "id" TEXT NOT NULL,
  "taller_id" TEXT NOT NULL,
  "categoria_id" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "alias_slug" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventario_categoria_aliases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventario_categorias_taller_id_activo_sort_order_idx"
  ON "inventario_categorias"("taller_id", "activo", "sort_order");
CREATE UNIQUE INDEX IF NOT EXISTS "inventario_categorias_taller_id_slug_key"
  ON "inventario_categorias"("taller_id", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "inventario_categorias_taller_id_nombre_key"
  ON "inventario_categorias"("taller_id", "nombre");

CREATE INDEX IF NOT EXISTS "inventario_categoria_aliases_taller_id_idx"
  ON "inventario_categoria_aliases"("taller_id");
CREATE INDEX IF NOT EXISTS "inventario_categoria_aliases_taller_id_alias_slug_idx"
  ON "inventario_categoria_aliases"("taller_id", "alias_slug");
CREATE UNIQUE INDEX IF NOT EXISTS "inventario_categoria_aliases_taller_id_alias_slug_key"
  ON "inventario_categoria_aliases"("taller_id", "alias_slug");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventario_categorias_taller_id_fkey'
  ) THEN
    ALTER TABLE "inventario_categorias"
      ADD CONSTRAINT "inventario_categorias_taller_id_fkey"
      FOREIGN KEY ("taller_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventario_categoria_aliases_taller_id_fkey'
  ) THEN
    ALTER TABLE "inventario_categoria_aliases"
      ADD CONSTRAINT "inventario_categoria_aliases_taller_id_fkey"
      FOREIGN KEY ("taller_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventario_categoria_aliases_categoria_id_fkey'
  ) THEN
    ALTER TABLE "inventario_categoria_aliases"
      ADD CONSTRAINT "inventario_categoria_aliases_categoria_id_fkey"
      FOREIGN KEY ("categoria_id") REFERENCES "inventario_categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
