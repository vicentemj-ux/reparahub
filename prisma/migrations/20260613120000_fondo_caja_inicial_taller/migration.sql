-- Fondo inicial sugerido por taller/local para apertura de caja.
ALTER TABLE "ConfiguracionTaller"
ADD COLUMN "fondo_caja_inicial" DECIMAL(12, 2) NOT NULL DEFAULT 500;
