ALTER TABLE public.vehicle_can_data
  ADD COLUMN IF NOT EXISTS fuel_used_total numeric,
  ADD COLUMN IF NOT EXISTS onboard_consumption_kml numeric,
  ADD COLUMN IF NOT EXISTS ignition_on boolean;
CREATE INDEX IF NOT EXISTS idx_can_data_plate_ts ON public.vehicle_can_data (vehicle_plate, data_timestamp);