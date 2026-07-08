-- Add icono column to inventario_categorias
ALTER TABLE "inventario_categorias" ADD COLUMN IF NOT EXISTS "icono" TEXT;
