-- Tabela para controle de jornada legal dos motoristas
CREATE TABLE public.driver_journey_compliance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  
  -- Data da jornada
  journey_date DATE NOT NULL,
  
  -- Horários da jornada
  journey_start TIMESTAMP WITH TIME ZONE,
  journey_end TIMESTAMP WITH TIME ZONE,
  
  -- Pausas/Intervalos
  break_start TIMESTAMP WITH TIME ZONE,
  break_end TIMESTAMP WITH TIME ZONE,
  total_break_minutes INTEGER DEFAULT 0,
  
  -- Horas trabalhadas
  total_worked_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  
  -- Descanso interjornada (desde o fim da jornada anterior)
  inter_journey_rest_minutes INTEGER,
  
  -- Status de conformidade
  is_overtime_compliant BOOLEAN DEFAULT true, -- <= 2h extra
  is_inter_journey_compliant BOOLEAN DEFAULT true, -- >= 11h descanso
  is_weekly_rest_compliant BOOLEAN DEFAULT true, -- 35h a cada 6 dias
  
  -- Fonte do registro (manual, macro, telemetria)
  source TEXT DEFAULT 'manual',
  
  -- Metadados
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(driver_id, journey_date)
);

-- Tabela para eventos de macro do rastreador
CREATE TABLE public.driver_journey_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  vehicle_plate TEXT,
  
  -- Tipo de evento
  event_type TEXT NOT NULL, -- 'journey_start', 'journey_end', 'break_start', 'break_end', 'macro_received'
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Dados do rastreador
  macro_code TEXT, -- Código da macro recebida
  latitude NUMERIC,
  longitude NUMERIC,
  location_name TEXT,
  mileage INTEGER,
  
  -- Metadados
  source TEXT DEFAULT 'manual', -- 'manual', 'telemetry', 'macro'
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para configurações de jornada legal
CREATE TABLE public.journey_legal_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Limites legais
  max_daily_hours NUMERIC DEFAULT 8,
  max_overtime_hours NUMERIC DEFAULT 2,
  min_inter_journey_hours NUMERIC DEFAULT 11,
  min_weekly_rest_hours NUMERIC DEFAULT 35,
  max_consecutive_work_days INTEGER DEFAULT 6,
  
  -- Configuração de macros
  macro_journey_start TEXT, -- Código da macro para início de jornada
  macro_journey_end TEXT, -- Código da macro para fim de jornada
  macro_break_start TEXT, -- Código da macro para início de pausa
  macro_break_end TEXT, -- Código da macro para fim de pausa
  
  -- Alertas
  alert_overtime_warning_minutes INTEGER DEFAULT 90, -- Alertar 30min antes do limite
  alert_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.journey_legal_settings (
  max_daily_hours,
  max_overtime_hours,
  min_inter_journey_hours,
  min_weekly_rest_hours,
  max_consecutive_work_days,
  macro_journey_start,
  macro_journey_end,
  macro_break_start,
  macro_break_end
) VALUES (
  8,
  2,
  11,
  35,
  6,
  'M1', -- Macro padrão para início
  'M2', -- Macro padrão para fim
  'M3', -- Macro padrão para início de pausa
  'M4'  -- Macro padrão para fim de pausa
);

-- Índices para performance
CREATE INDEX idx_journey_compliance_driver_date ON public.driver_journey_compliance(driver_id, journey_date);
CREATE INDEX idx_journey_events_driver_timestamp ON public.driver_journey_events(driver_id, event_timestamp);
CREATE INDEX idx_journey_events_type ON public.driver_journey_events(event_type);

-- Enable RLS
ALTER TABLE public.driver_journey_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_journey_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_legal_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view journey compliance"
  ON public.driver_journey_compliance FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert journey compliance"
  ON public.driver_journey_compliance FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update journey compliance"
  ON public.driver_journey_compliance FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete journey compliance"
  ON public.driver_journey_compliance FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view journey events"
  ON public.driver_journey_events FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert journey events"
  ON public.driver_journey_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view journey settings"
  ON public.journey_legal_settings FOR SELECT USING (true);

CREATE POLICY "Admins can update journey settings"
  ON public.journey_legal_settings FOR UPDATE USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_journey_compliance_updated_at
  BEFORE UPDATE ON public.driver_journey_compliance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journey_settings_updated_at
  BEFORE UPDATE ON public.journey_legal_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();