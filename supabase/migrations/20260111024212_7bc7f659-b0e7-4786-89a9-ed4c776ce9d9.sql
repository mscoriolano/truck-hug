-- Tabela de tipos de veículos (referência)
CREATE TABLE public.vehicle_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de categorias de despesas
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('FIXO', 'VARIAVEL', 'OUTROS')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de custos mensais
CREATE TABLE public.monthly_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('FIXO', 'VARIAVEL', 'OUTROS')),
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(year, month, category_name)
);

-- Tabela de performance mensal (Insourcing vs Frete Externo)
CREATE TABLE public.monthly_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  -- Custos Insourcing
  total_insourcing_cost NUMERIC NOT NULL DEFAULT 0,
  fixed_cost NUMERIC NOT NULL DEFAULT 0,
  variable_cost NUMERIC NOT NULL DEFAULT 0,
  
  -- Comparativo com Frete Externo
  external_freight_cost NUMERIC NOT NULL DEFAULT 0,
  cost_avoided NUMERIC NOT NULL DEFAULT 0,
  
  -- Métricas de Performance
  invoiced_weight NUMERIC NOT NULL DEFAULT 0, -- Peso Faturado (toneladas)
  average_freight_per_ton NUMERIC NOT NULL DEFAULT 0, -- Frete Médio por Tonelada
  
  -- Indicadores
  availability_percentage NUMERIC DEFAULT 0, -- % Disponibilidade
  target_compliance_percentage NUMERIC DEFAULT 0, -- % Cumprimento de Meta
  
  -- Resultado
  result NUMERIC NOT NULL DEFAULT 0, -- Lucro/Prejuízo
  accumulated_result NUMERIC NOT NULL DEFAULT 0, -- Resultado Acumulado
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(year, month)
);

-- Tabela de fases operacionais
CREATE TABLE public.operational_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  target_cost_per_ton NUMERIC,
  target_availability NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_phases ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (apenas usuários autenticados)
CREATE POLICY "Authenticated users can view vehicle_types" ON public.vehicle_types FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert vehicle_types" ON public.vehicle_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update vehicle_types" ON public.vehicle_types FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete vehicle_types" ON public.vehicle_types FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view expense_categories" ON public.expense_categories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert expense_categories" ON public.expense_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update expense_categories" ON public.expense_categories FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete expense_categories" ON public.expense_categories FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view monthly_costs" ON public.monthly_costs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert monthly_costs" ON public.monthly_costs FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update monthly_costs" ON public.monthly_costs FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete monthly_costs" ON public.monthly_costs FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view monthly_performance" ON public.monthly_performance FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert monthly_performance" ON public.monthly_performance FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update monthly_performance" ON public.monthly_performance FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete monthly_performance" ON public.monthly_performance FOR DELETE USING (true);

CREATE POLICY "Authenticated users can view operational_phases" ON public.operational_phases FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert operational_phases" ON public.operational_phases FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update operational_phases" ON public.operational_phases FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete operational_phases" ON public.operational_phases FOR DELETE USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_vehicle_types_updated_at BEFORE UPDATE ON public.vehicle_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monthly_costs_updated_at BEFORE UPDATE ON public.monthly_costs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monthly_performance_updated_at BEFORE UPDATE ON public.monthly_performance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_operational_phases_updated_at BEFORE UPDATE ON public.operational_phases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir tipos de veículos padrão
INSERT INTO public.vehicle_types (name, description) VALUES
  ('Bi-trem', 'Combinação de veículo de carga com dois semirreboques'),
  ('Bi-Truck', 'Caminhão com dois eixos traseiros'),
  ('Truck', 'Caminhão convencional'),
  ('Vanderleia', 'Carreta com eixo móvel'),
  ('Carreta', 'Semirreboque padrão');

-- Inserir categorias de despesas padrão
INSERT INTO public.expense_categories (name, type, description) VALUES
  ('Pessoal', 'FIXO', 'Salários, encargos e benefícios'),
  ('Seguro', 'FIXO', 'Seguros de veículos e cargas'),
  ('IPVA', 'FIXO', 'Imposto sobre veículos'),
  ('Depreciação', 'FIXO', 'Depreciação dos veículos'),
  ('Combustível', 'VARIAVEL', 'Diesel, gasolina e outros combustíveis'),
  ('Pneus', 'VARIAVEL', 'Compra e recapagem de pneus'),
  ('Manutenção', 'VARIAVEL', 'Manutenções preventivas e corretivas'),
  ('Pedágios', 'VARIAVEL', 'Custos com pedágios'),
  ('Peças', 'VARIAVEL', 'Peças de reposição'),
  ('Lavagem', 'OUTROS', 'Lavagem de veículos'),
  ('Multas', 'OUTROS', 'Multas de trânsito'),
  ('Outros', 'OUTROS', 'Despesas diversas');