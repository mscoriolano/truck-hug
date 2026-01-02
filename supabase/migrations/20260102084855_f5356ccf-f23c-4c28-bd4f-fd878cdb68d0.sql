-- Adicionar novos campos na tabela de motoristas
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS cnh_expiry date,
ADD COLUMN IF NOT EXISTS cnh_category text,
ADD COLUMN IF NOT EXISTS r3 text,
ADD COLUMN IF NOT EXISTS ac text;

-- Adicionar meta de consumo na tabela de veículos
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS consumption_target numeric DEFAULT 2.5;

-- Criar tabela de viagens/ciclos
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_plate text NOT NULL,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  driver_name text NOT NULL,
  trip_type text NOT NULL CHECK (trip_type IN ('escoamento', 'abastecimento')),
  departure_date timestamp with time zone NOT NULL,
  weight numeric NOT NULL DEFAULT 0,
  cycle_value numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS na tabela trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para trips
CREATE POLICY "Authenticated users can view trips" ON public.trips
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert trips" ON public.trips
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update trips" ON public.trips
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete trips" ON public.trips
  FOR DELETE TO authenticated USING (true);

-- Trigger para atualizar updated_at em trips
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar enum para roles (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'viewer', 'driver');
  END IF;
END $$;

-- Criar tabela de user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função security definer para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Política para user_roles (apenas admins podem gerenciar)
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para criar role padrão quando novo usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'viewer');
  RETURN new;
END;
$$;

-- Trigger para criar role quando usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();