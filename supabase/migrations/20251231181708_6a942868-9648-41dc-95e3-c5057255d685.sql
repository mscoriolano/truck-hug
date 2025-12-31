-- Create drivers table
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  phone TEXT NOT NULL,
  license TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'driving', 'resting', 'off')),
  current_vehicle TEXT,
  journey_start TIMESTAMP WITH TIME ZONE,
  total_hours_today NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plate TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  brand TEXT NOT NULL,
  year INTEGER NOT NULL,
  mileage INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  next_maintenance TIMESTAMP WITH TIME ZONE NOT NULL,
  fuel_type TEXT NOT NULL DEFAULT 'diesel' CHECK (fuel_type IN ('diesel', 'gasoline', 'flex', 'electric')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenances table
CREATE TABLE public.maintenances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  vehicle_plate TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('preventive', 'corrective')),
  category TEXT NOT NULL CHECK (category IN ('engine', 'tires', 'brakes', 'suspension', 'electrical', 'general')),
  description TEXT NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue')),
  cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tires table
CREATE TABLE public.tires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  vehicle_plate TEXT NOT NULL,
  position TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  install_date TIMESTAMP WITH TIME ZONE NOT NULL,
  install_mileage INTEGER NOT NULL,
  current_mileage INTEGER NOT NULL,
  max_mileage INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'good' CHECK (status IN ('good', 'warning', 'critical', 'replaced')),
  last_inspection TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create journey_entries table
CREATE TABLE public.journey_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  driver_name TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  vehicle_plate TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('start', 'break_start', 'break_end', 'end')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location TEXT,
  mileage INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('maintenance', 'tire', 'journey', 'general')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false,
  related_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access for now - no auth required)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create public access policies (all operations allowed)
CREATE POLICY "Allow all operations on drivers" ON public.drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on maintenances" ON public.maintenances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tires" ON public.tires FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on journey_entries" ON public.journey_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on alerts" ON public.alerts FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenances_updated_at BEFORE UPDATE ON public.maintenances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tires_updated_at BEFORE UPDATE ON public.tires FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();