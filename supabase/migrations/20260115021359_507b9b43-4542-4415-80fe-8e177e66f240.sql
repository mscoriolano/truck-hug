-- ============================================
-- EXTENSÃO DO BANCO PARA TELEMETRIA COMPLETA
-- ============================================

-- Tabela para armazenar telemetria em tempo real dos veículos
CREATE TABLE public.vehicle_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_plate TEXT NOT NULL,
  truckscontrol_id TEXT,
  
  -- Localização
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Velocidade e movimento
  speed INTEGER DEFAULT 0,
  heading INTEGER DEFAULT 0, -- direção em graus
  
  -- Ignição e motor
  ignition_on BOOLEAN DEFAULT false,
  engine_hours DECIMAL(10, 2) DEFAULT 0,
  
  -- Odômetro
  odometer INTEGER DEFAULT 0,
  
  -- Força G (aceleração/frenagem)
  g_force_x DECIMAL(5, 3) DEFAULT 0, -- aceleração lateral
  g_force_y DECIMAL(5, 3) DEFAULT 0, -- aceleração frontal (frenagem/aceleração)
  g_force_z DECIMAL(5, 3) DEFAULT 0, -- aceleração vertical
  
  -- Timestamps
  gps_timestamp TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_vehicle_telemetry_vehicle ON public.vehicle_telemetry(vehicle_id);
CREATE INDEX idx_vehicle_telemetry_timestamp ON public.vehicle_telemetry(received_at DESC);
CREATE INDEX idx_vehicle_telemetry_plate ON public.vehicle_telemetry(vehicle_plate);

-- Tabela para histórico de telemetria (para análises)
CREATE TABLE public.telemetry_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_plate TEXT NOT NULL,
  driver_id UUID REFERENCES public.drivers(id),
  driver_name TEXT,
  trip_id UUID,
  
  -- Dados do ponto
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  speed INTEGER DEFAULT 0,
  heading INTEGER DEFAULT 0,
  ignition_on BOOLEAN DEFAULT false,
  
  -- Força G
  g_force_x DECIMAL(5, 3) DEFAULT 0,
  g_force_y DECIMAL(5, 3) DEFAULT 0,
  g_force_z DECIMAL(5, 3) DEFAULT 0,
  
  -- Eventos detectados
  event_type TEXT, -- 'hard_brake', 'hard_accel', 'hard_turn', 'speeding', 'idle'
  event_severity TEXT CHECK (event_severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Timestamps
  gps_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_telemetry_history_vehicle ON public.telemetry_history(vehicle_id);
CREATE INDEX idx_telemetry_history_driver ON public.telemetry_history(driver_id);
CREATE INDEX idx_telemetry_history_trip ON public.telemetry_history(trip_id);
CREATE INDEX idx_telemetry_history_timestamp ON public.telemetry_history(created_at DESC);
CREATE INDEX idx_telemetry_history_event ON public.telemetry_history(event_type);

-- Tabela para alertas de telemetria
CREATE TABLE public.telemetry_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_plate TEXT NOT NULL,
  driver_id UUID REFERENCES public.drivers(id),
  driver_name TEXT,
  
  -- Tipo e severidade
  alert_type TEXT NOT NULL, -- 'speeding', 'hard_brake', 'hard_accel', 'idle_warning', 'irregular_stop', 'geofence'
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- Detalhes
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Localização do evento
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_name TEXT,
  
  -- Valores relacionados
  speed INTEGER,
  speed_limit INTEGER,
  g_force DECIMAL(5, 3),
  idle_duration INTEGER, -- em minutos
  
  -- Status
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by TEXT,
  
  -- Timestamps
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_telemetry_alerts_vehicle ON public.telemetry_alerts(vehicle_id);
CREATE INDEX idx_telemetry_alerts_driver ON public.telemetry_alerts(driver_id);
CREATE INDEX idx_telemetry_alerts_type ON public.telemetry_alerts(alert_type);
CREATE INDEX idx_telemetry_alerts_severity ON public.telemetry_alerts(severity);
CREATE INDEX idx_telemetry_alerts_acknowledged ON public.telemetry_alerts(acknowledged);

-- Tabela para vinculação motorista-veículo por viagem
CREATE TABLE public.driver_vehicle_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_plate TEXT NOT NULL,
  
  -- Código de identificação (para tablet do rastreador)
  assignment_code TEXT UNIQUE,
  
  -- Período de vinculação
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Viagem relacionada
  trip_id UUID REFERENCES public.trips(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_driver_vehicle_active ON public.driver_vehicle_assignments(is_active);
CREATE INDEX idx_driver_vehicle_driver ON public.driver_vehicle_assignments(driver_id);
CREATE INDEX idx_driver_vehicle_vehicle ON public.driver_vehicle_assignments(vehicle_id);
CREATE INDEX idx_driver_vehicle_code ON public.driver_vehicle_assignments(assignment_code);

-- Tabela para estatísticas de viagem (velocidade média, consumo, etc)
CREATE TABLE public.trip_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_plate TEXT NOT NULL,
  driver_id UUID REFERENCES public.drivers(id),
  driver_name TEXT,
  
  -- Período
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  
  -- Distância e consumo
  total_distance_km DECIMAL(10, 2) DEFAULT 0,
  fuel_consumed_liters DECIMAL(10, 2) DEFAULT 0,
  avg_consumption_km_per_liter DECIMAL(5, 2) DEFAULT 0,
  
  -- Velocidade
  avg_speed INTEGER DEFAULT 0,
  max_speed INTEGER DEFAULT 0,
  time_over_speed_limit_minutes INTEGER DEFAULT 0,
  
  -- Paradas
  total_stops INTEGER DEFAULT 0,
  total_idle_time_minutes INTEGER DEFAULT 0,
  
  -- Força G - contadores de eventos
  hard_brakes_count INTEGER DEFAULT 0,
  hard_accels_count INTEGER DEFAULT 0,
  hard_turns_count INTEGER DEFAULT 0,
  
  -- Score de direção (0-100)
  driving_score INTEGER DEFAULT 100,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_trip_statistics_trip ON public.trip_statistics(trip_id);
CREATE INDEX idx_trip_statistics_vehicle ON public.trip_statistics(vehicle_id);
CREATE INDEX idx_trip_statistics_driver ON public.trip_statistics(driver_id);
CREATE INDEX idx_trip_statistics_period ON public.trip_statistics(start_time, end_time);

-- Tabela para configurações de limites e alertas
CREATE TABLE public.telemetry_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Limites de velocidade
  speed_limit_highway INTEGER DEFAULT 80, -- km/h
  speed_limit_urban INTEGER DEFAULT 60,
  
  -- Limites de Força G
  hard_brake_threshold DECIMAL(5, 3) DEFAULT 0.4, -- g
  hard_accel_threshold DECIMAL(5, 3) DEFAULT 0.35,
  hard_turn_threshold DECIMAL(5, 3) DEFAULT 0.3,
  
  -- Limites de tempo parado
  idle_warning_minutes INTEGER DEFAULT 30,
  idle_critical_minutes INTEGER DEFAULT 60,
  
  -- Horários de operação (para alertas de parada irregular)
  operation_start_time TIME DEFAULT '06:00',
  operation_end_time TIME DEFAULT '22:00',
  
  -- Consumo esperado (km/l)
  expected_consumption DECIMAL(4, 2) DEFAULT 2.5,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configurações padrão
INSERT INTO public.telemetry_settings (id) VALUES (gen_random_uuid());

-- Habilitar RLS
ALTER TABLE public.vehicle_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS (acesso para usuários autenticados)
CREATE POLICY "Authenticated users can view vehicle_telemetry" ON public.vehicle_telemetry FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert vehicle_telemetry" ON public.vehicle_telemetry FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update vehicle_telemetry" ON public.vehicle_telemetry FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete vehicle_telemetry" ON public.vehicle_telemetry FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view telemetry_history" ON public.telemetry_history FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert telemetry_history" ON public.telemetry_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view telemetry_alerts" ON public.telemetry_alerts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert telemetry_alerts" ON public.telemetry_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update telemetry_alerts" ON public.telemetry_alerts FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can view driver_vehicle_assignments" ON public.driver_vehicle_assignments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert driver_vehicle_assignments" ON public.driver_vehicle_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update driver_vehicle_assignments" ON public.driver_vehicle_assignments FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete driver_vehicle_assignments" ON public.driver_vehicle_assignments FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view trip_statistics" ON public.trip_statistics FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert trip_statistics" ON public.trip_statistics FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update trip_statistics" ON public.trip_statistics FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can view telemetry_settings" ON public.telemetry_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update telemetry_settings" ON public.telemetry_settings FOR UPDATE USING (true);

-- Habilitar realtime para telemetria
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_telemetry;
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_alerts;