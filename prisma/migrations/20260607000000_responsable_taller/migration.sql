-- Responsable del local: persona a la que se envian los resumenes
-- operativos (corte de caja por WhatsApp/correo, alertas diarias).
-- Dato PRIVADO: NO se imprime en tickets ni en el reporte en carta.
-- Migracion idempotente (IF NOT EXISTS) para tolerar re-aplicaciones.

ALTER TABLE "ConfiguracionTaller"
  ADD COLUMN IF NOT EXISTS "responsable_nombre"   TEXT,
  ADD COLUMN IF NOT EXISTS "responsable_cargo"    TEXT,
  ADD COLUMN IF NOT EXISTS "responsable_telefono" TEXT,
  ADD COLUMN IF NOT EXISTS "responsable_email"    TEXT;
