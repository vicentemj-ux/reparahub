-- Preferencias visuales por taller/local (sidebar, layout futuro, etc.).
ALTER TABLE "ConfiguracionTaller"
ADD COLUMN "ui_preferences" JSONB;
