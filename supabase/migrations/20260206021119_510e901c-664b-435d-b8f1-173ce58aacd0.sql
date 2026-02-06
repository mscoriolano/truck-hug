-- Adicionar coluna truckscontrol_id em vehicles se não existir
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS truckscontrol_id TEXT;

-- Criar índice para lookup rápido pelo id da TrucksControl
CREATE INDEX IF NOT EXISTS idx_vehicles_truckscontrol_id ON public.vehicles(truckscontrol_id);

-- Habilitar Realtime nas tabelas vehicles e telemetry_history (vehicle_telemetry e telemetry_alerts já estão)
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_history;