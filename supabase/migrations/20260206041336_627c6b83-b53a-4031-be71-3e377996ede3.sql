-- Adicionar truckscontrol_id na tabela drivers para amarração
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS truckscontrol_id TEXT;

-- Adicionar coluna fuel_level na tabela vehicle_telemetry para armazenar litros do tanque
ALTER TABLE public.vehicle_telemetry ADD COLUMN IF NOT EXISTS fuel_level NUMERIC;

-- Adicionar coluna rpm na tabela vehicle_telemetry
ALTER TABLE public.vehicle_telemetry ADD COLUMN IF NOT EXISTS rpm INTEGER;

-- Adicionar coluna para eventos de telemetria
ALTER TABLE public.vehicle_telemetry ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]'::jsonb;

-- Adicionar colunas de horário permitido de jornada nos drivers
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS allowed_journey_start TIME DEFAULT '06:00';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS allowed_journey_end TIME DEFAULT '22:00';

-- Criar tabela para armazenar registros offline do motorista (PWA)
CREATE TABLE IF NOT EXISTS public.offline_journey_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  vehicle_id UUID,
  vehicle_plate TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  location_name TEXT,
  mileage INTEGER,
  synced BOOLEAN DEFAULT FALSE,
  sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- RLS para offline_journey_queue
ALTER TABLE public.offline_journey_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own offline queue"
ON public.offline_journey_queue FOR ALL
USING (driver_id = auth.uid());

-- Habilitar realtime para offline_journey_queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.offline_journey_queue;

-- Criar índice para busca eficiente
CREATE INDEX IF NOT EXISTS idx_offline_queue_driver_synced ON public.offline_journey_queue(driver_id, synced);
CREATE INDEX IF NOT EXISTS idx_vehicles_truckscontrol ON public.vehicles(truckscontrol_id);
CREATE INDEX IF NOT EXISTS idx_drivers_truckscontrol ON public.drivers(truckscontrol_id);