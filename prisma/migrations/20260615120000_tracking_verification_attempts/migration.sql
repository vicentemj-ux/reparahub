CREATE TABLE IF NOT EXISTS "tracking_verification_attempts" (
  "id" TEXT NOT NULL,
  "taller_id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "ip" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tracking_verification_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "tracking_verification_attempts_ticket_id_attempted_at_idx" ON "tracking_verification_attempts"("ticket_id", "attempted_at");
CREATE INDEX IF NOT EXISTS "tracking_verification_attempts_taller_id_attempted_at_idx" ON "tracking_verification_attempts"("taller_id", "attempted_at");

DO $$ BEGIN
  ALTER TABLE "tracking_verification_attempts" ADD CONSTRAINT "tracking_verification_attempts_taller_id_fkey" FOREIGN KEY ("taller_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
