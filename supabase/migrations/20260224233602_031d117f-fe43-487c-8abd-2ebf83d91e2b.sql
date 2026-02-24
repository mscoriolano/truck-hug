
-- 1. Add battery_level to vehicle_telemetry
ALTER TABLE public.vehicle_telemetry ADD COLUMN IF NOT EXISTS battery_level integer;

-- 2. Add location fields to vehicle_telemetry
ALTER TABLE public.vehicle_telemetry ADD COLUMN IF NOT EXISTS location_name text;
ALTER TABLE public.vehicle_telemetry ADD COLUMN IF NOT EXISTS municipality text;
ALTER TABLE public.vehicle_telemetry ADD COLUMN IF NOT EXISTS state text;

-- 3. Create geofence_zones table for smart geofencing
CREATE TABLE IF NOT EXISTS public.geofence_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  radius_meters integer NOT NULL DEFAULT 5000,
  zone_type text NOT NULL DEFAULT 'allowed', -- 'allowed', 'restricted', 'point_of_interest'
  is_active boolean NOT NULL DEFAULT true,
  alert_on_enter boolean DEFAULT false,
  alert_on_exit boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.geofence_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view geofence_zones" ON public.geofence_zones FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert geofence_zones" ON public.geofence_zones FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update geofence_zones" ON public.geofence_zones FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete geofence_zones" ON public.geofence_zones FOR DELETE USING (true);

CREATE TRIGGER update_geofence_zones_updated_at BEFORE UPDATE ON public.geofence_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create driving_behavior_events for detailed behavior tracking
CREATE TABLE IF NOT EXISTS public.driving_behavior_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id),
  vehicle_plate text NOT NULL,
  driver_id uuid REFERENCES public.drivers(id),
  driver_name text,
  event_type text NOT NULL, -- 'harsh_brake', 'harsh_accel', 'speeding', 'high_rpm', 'excessive_idle', 'geofence_exit'
  severity text NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  latitude numeric,
  longitude numeric,
  location_name text,
  speed integer,
  rpm integer,
  battery_level integer,
  details jsonb,
  event_timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driving_behavior_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view driving_behavior_events" ON public.driving_behavior_events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert driving_behavior_events" ON public.driving_behavior_events FOR INSERT WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_driving_behavior_vehicle ON public.driving_behavior_events(vehicle_id, event_timestamp DESC);
CREATE INDEX idx_driving_behavior_driver ON public.driving_behavior_events(driver_id, event_timestamp DESC);
CREATE INDEX idx_driving_behavior_type ON public.driving_behavior_events(event_type, event_timestamp DESC);

-- Enable realtime for driving_behavior_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.driving_behavior_events;
