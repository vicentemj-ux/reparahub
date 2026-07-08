-- Cotizacion: agregar columna origen (reemplaza el parseo desde observaciones)
ALTER TABLE "cotizaciones"
  ADD COLUMN IF NOT EXISTS "origen" VARCHAR(20) NOT NULL DEFAULT 'Mostrador';

CREATE INDEX IF NOT EXISTS "cotizaciones_taller_id_origen_idx"
  ON "cotizaciones"("taller_id", "origen");

-- Backfill: extraer origen de observaciones cuando matchea el patron "Origen: X"
-- Solo si la columna aun tiene el default 'Mostrador' (no sobreescribe valores explicitos).
UPDATE "cotizaciones" AS c
   SET "origen" = COALESCE(
         (SELECT
            CASE
              WHEN observaciones ~* '^Origen:\s*Mostrador' THEN 'Mostrador'
              WHEN observaciones ~* '^Origen:\s*WhatsApp' THEN 'WhatsApp'
              WHEN observaciones ~* '^Origen:\s*Telefono' THEN 'Telefono'
              WHEN observaciones ~* '^Origen:\s*Internet' THEN 'Internet'
              ELSE NULL
            END
            ),
         'Mostrador')
 WHERE c."origen" = 'Mostrador'
   AND c."observaciones" IS NOT NULL
   AND c."observaciones" ~* '^Origen:\s*(Mostrador|WhatsApp|Telefono|Internet)';

-- CotizacionItem: agregar columna orden (0 = item principal mostrado en WhatsApp)
ALTER TABLE "cotizacion_items"
  ADD COLUMN IF NOT EXISTS "orden" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "cotizacion_items_cotizacion_id_orden_idx"
  ON "cotizacion_items"("cotizacion_id", "orden");

-- Backfill: asignar orden 0 al primer item de cada cotizacion y 1,2,... al resto,
-- respetando el orden de creacion (created_at, id).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY cotizacion_id ORDER BY created_at, id) - 1 AS new_orden
  FROM "cotizacion_items"
  WHERE orden = 0
)
UPDATE "cotizacion_items" ci
   SET "orden" = ranked.new_orden
  FROM ranked
 WHERE ci.id = ranked.id
   AND ranked.new_orden > 0;
