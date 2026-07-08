ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "telefono" TEXT,
  ADD COLUMN IF NOT EXISTS "telefono_pais" TEXT;

ALTER TABLE "colaboradores_operativos"
  ADD COLUMN IF NOT EXISTS "telefono" TEXT,
  ADD COLUMN IF NOT EXISTS "telefono_pais" TEXT;
