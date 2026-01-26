-- Tabela para custos de manutenção (lançamentos manuais)
CREATE TABLE IF NOT EXISTS public.maintenance_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_plate TEXT NOT NULL,
  cost_type TEXT NOT NULL, -- 'preventive', 'corrective', 'parts', 'labor', 'other'
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para gestão de pneus
CREATE TABLE IF NOT EXISTS public.tire_management (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_plate TEXT NOT NULL,
  position TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT,
  install_date DATE NOT NULL DEFAULT CURRENT_DATE,
  install_mileage INTEGER NOT NULL DEFAULT 0,
  current_mileage INTEGER NOT NULL DEFAULT 0,
  max_mileage INTEGER NOT NULL DEFAULT 80000,
  tread_depth NUMERIC DEFAULT 8.0,
  min_tread_depth NUMERIC DEFAULT 1.6,
  warning_tread_depth NUMERIC DEFAULT 3.0,
  status TEXT NOT NULL DEFAULT 'good', -- 'good', 'warning', 'critical', 'replaced'
  last_inspection DATE DEFAULT CURRENT_DATE,
  recapped_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para eventos de jornada (macros CAN)
CREATE TABLE IF NOT EXISTS public.driver_journey (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  driver_name TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_plate TEXT,
  event_type TEXT NOT NULL, -- 'journey_start', 'meal', 'rest', 'overnight', 'journey_end'
  tfr_id TEXT, -- ID do formulário de macro do TrucksControl
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  latitude NUMERIC,
  longitude NUMERIC,
  mileage INTEGER,
  source TEXT DEFAULT 'telemetry', -- 'telemetry' ou 'manual'
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para dados CAN / Perfil de Condução
CREATE TABLE IF NOT EXISTS public.vehicle_can_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_plate TEXT NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  driver_name TEXT,
  data_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rpm INTEGER, -- Rotação do motor
  speed INTEGER, -- Velocidade
  fuel_level NUMERIC, -- Litros no tanque (lt)
  odometer INTEGER, -- Hodômetro
  -- Eventos de condução
  speed_violation BOOLEAN DEFAULT FALSE, -- evt34
  rpm_violation BOOLEAN DEFAULT FALSE, -- evt35
  harsh_braking BOOLEAN DEFAULT FALSE,
  harsh_acceleration BOOLEAN DEFAULT FALSE,
  harsh_cornering BOOLEAN DEFAULT FALSE,
  -- G-Force
  g_force_x NUMERIC,
  g_force_y NUMERIC,
  g_force_z NUMERIC,
  -- Dados brutos
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.maintenance_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_can_data ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para maintenance_costs
CREATE POLICY "Authenticated users can view maintenance_costs"
  ON public.maintenance_costs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert maintenance_costs"
  ON public.maintenance_costs FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update maintenance_costs"
  ON public.maintenance_costs FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete maintenance_costs"
  ON public.maintenance_costs FOR DELETE USING (true);

-- Políticas RLS para tire_management
CREATE POLICY "Authenticated users can view tire_management"
  ON public.tire_management FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert tire_management"
  ON public.tire_management FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update tire_management"
  ON public.tire_management FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete tire_management"
  ON public.tire_management FOR DELETE USING (true);

-- Políticas RLS para driver_journey
CREATE POLICY "Authenticated users can view driver_journey"
  ON public.driver_journey FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert driver_journey"
  ON public.driver_journey FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update driver_journey"
  ON public.driver_journey FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete driver_journey"
  ON public.driver_journey FOR DELETE USING (true);

-- Políticas RLS para vehicle_can_data
CREATE POLICY "Authenticated users can view vehicle_can_data"
  ON public.vehicle_can_data FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert vehicle_can_data"
  ON public.vehicle_can_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update vehicle_can_data"
  ON public.vehicle_can_data FOR UPDATE USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_maintenance_costs_updated_at
  BEFORE UPDATE ON public.maintenance_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tire_management_updated_at
  BEFORE UPDATE ON public.tire_management
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();