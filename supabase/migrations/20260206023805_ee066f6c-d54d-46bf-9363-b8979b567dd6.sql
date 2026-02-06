-- Ensure vehicle_telemetry can upsert by vehicle_id
-- The edge function uses onConflict: 'vehicle_id', which requires a UNIQUE constraint or index.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'vehicle_telemetry'
      AND c.contype = 'u'
      AND c.conname = 'vehicle_telemetry_vehicle_id_key'
  ) THEN
    ALTER TABLE public.vehicle_telemetry
      ADD CONSTRAINT vehicle_telemetry_vehicle_id_key UNIQUE (vehicle_id);
  END IF;
END $$;