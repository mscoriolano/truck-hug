-- Add last_error_debug column to telemetry_settings for IP and error diagnostics
ALTER TABLE public.telemetry_settings 
ADD COLUMN IF NOT EXISTS last_error_debug jsonb NULL;

-- Add total_time_minutes column to vehicle_can_data for storing <tt> data
ALTER TABLE public.vehicle_can_data 
ADD COLUMN IF NOT EXISTS total_time_minutes integer NULL;

COMMENT ON COLUMN public.telemetry_settings.last_error_debug IS 'JSON with last error info including outbound IP';
COMMENT ON COLUMN public.vehicle_can_data.total_time_minutes IS 'Total time in minutes from TrucksControl <tt> field';