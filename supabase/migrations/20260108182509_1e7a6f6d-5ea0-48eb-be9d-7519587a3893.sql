
-- Criar bucket para uploads de arquivos
INSERT INTO storage.buckets (id, name, public) VALUES ('driver-uploads', 'driver-uploads', false);

-- Políticas de storage para motoristas
CREATE POLICY "Motoristas podem ver seus próprios arquivos"
ON storage.objects FOR SELECT
USING (bucket_id = 'driver-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Motoristas podem fazer upload de arquivos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'driver-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Motoristas podem deletar seus próprios arquivos"
ON storage.objects FOR DELETE
USING (bucket_id = 'driver-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins podem ver todos os arquivos
CREATE POLICY "Admins podem ver todos os arquivos"
ON storage.objects FOR SELECT
USING (bucket_id = 'driver-uploads' AND public.has_role(auth.uid(), 'admin'));

-- Tabela de relatórios de pneus pelos motoristas
CREATE TABLE public.driver_tire_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  vehicle_id UUID NOT NULL,
  vehicle_plate TEXT NOT NULL,
  tire_position TEXT NOT NULL,
  condition TEXT NOT NULL, -- 'good', 'warning', 'critical'
  description TEXT,
  photos TEXT[], -- Array de URLs dos arquivos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_tire_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Motoristas podem ver seus próprios relatórios de pneus"
ON public.driver_tire_reports FOR SELECT
USING (auth.uid() = driver_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Motoristas podem criar relatórios de pneus"
ON public.driver_tire_reports FOR INSERT
WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Motoristas podem editar seus próprios relatórios"
ON public.driver_tire_reports FOR UPDATE
USING (auth.uid() = driver_id);

-- Tabela de solicitações de manutenção pelos motoristas
CREATE TABLE public.driver_maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  vehicle_id UUID NOT NULL,
  vehicle_plate TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  category TEXT NOT NULL, -- 'engine', 'tires', 'brakes', 'suspension', 'electrical', 'general'
  description TEXT NOT NULL,
  photos TEXT[],
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'in_progress', 'completed', 'rejected'
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Motoristas podem ver suas próprias solicitações de manutenção"
ON public.driver_maintenance_requests FOR SELECT
USING (auth.uid() = driver_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Motoristas podem criar solicitações de manutenção"
ON public.driver_maintenance_requests FOR INSERT
WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Motoristas podem editar suas próprias solicitações"
ON public.driver_maintenance_requests FOR UPDATE
USING (auth.uid() = driver_id OR public.has_role(auth.uid(), 'admin'));

-- Tabela de custos para reembolso
CREATE TABLE public.driver_expense_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  vehicle_id UUID,
  vehicle_plate TEXT,
  trip_id UUID,
  expense_type TEXT NOT NULL, -- 'fuel', 'toll', 'food', 'lodging', 'repair', 'other'
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipts TEXT[], -- Array de URLs dos comprovantes
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'paid'
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_expense_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Motoristas podem ver seus próprios pedidos de reembolso"
ON public.driver_expense_claims FOR SELECT
USING (auth.uid() = driver_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Motoristas podem criar pedidos de reembolso"
ON public.driver_expense_claims FOR INSERT
WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Motoristas podem editar seus próprios pedidos"
ON public.driver_expense_claims FOR UPDATE
USING (auth.uid() = driver_id OR public.has_role(auth.uid(), 'admin'));

-- Tabela de comprovantes de entrega
CREATE TABLE public.delivery_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  trip_id UUID NOT NULL,
  vehicle_plate TEXT NOT NULL,
  delivery_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recipient_name TEXT,
  notes TEXT,
  files TEXT[], -- Array de URLs dos comprovantes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Motoristas podem ver seus próprios comprovantes"
ON public.delivery_receipts FOR SELECT
USING (auth.uid() = driver_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Motoristas podem criar comprovantes"
ON public.delivery_receipts FOR INSERT
WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Motoristas podem editar seus próprios comprovantes"
ON public.delivery_receipts FOR UPDATE
USING (auth.uid() = driver_id);

-- Triggers para updated_at
CREATE TRIGGER update_driver_tire_reports_updated_at
BEFORE UPDATE ON public.driver_tire_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_maintenance_requests_updated_at
BEFORE UPDATE ON public.driver_maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_expense_claims_updated_at
BEFORE UPDATE ON public.driver_expense_claims
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_receipts_updated_at
BEFORE UPDATE ON public.delivery_receipts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
