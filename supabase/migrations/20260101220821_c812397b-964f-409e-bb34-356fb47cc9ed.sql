-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create fuel_entries table for fuel tracking
CREATE TABLE public.fuel_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  vehicle_plate TEXT NOT NULL,
  driver_id UUID NOT NULL,
  driver_name TEXT NOT NULL,
  liters NUMERIC NOT NULL,
  price_per_liter NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  mileage INTEGER NOT NULL,
  fuel_type TEXT NOT NULL DEFAULT 'diesel',
  station TEXT,
  notes TEXT,
  entry_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on fuel_entries
ALTER TABLE public.fuel_entries ENABLE ROW LEVEL SECURITY;

-- Fuel entries policies (authenticated users only)
CREATE POLICY "Authenticated users can view fuel entries" ON public.fuel_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fuel entries" ON public.fuel_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fuel entries" ON public.fuel_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete fuel entries" ON public.fuel_entries FOR DELETE TO authenticated USING (true);

-- Create driver_scores table for gamification
CREATE TABLE public.driver_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  driver_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  fuel_efficiency_score INTEGER DEFAULT 0,
  tire_care_score INTEGER DEFAULT 0,
  maintenance_score INTEGER DEFAULT 0,
  journey_compliance_score INTEGER DEFAULT 0,
  speed_compliance_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  total_km NUMERIC DEFAULT 0,
  avg_consumption NUMERIC DEFAULT 0,
  tire_incidents INTEGER DEFAULT 0,
  corrective_maintenances INTEGER DEFAULT 0,
  journey_violations INTEGER DEFAULT 0,
  speed_violations INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on driver_scores
ALTER TABLE public.driver_scores ENABLE ROW LEVEL SECURITY;

-- Driver scores policies
CREATE POLICY "Authenticated users can view driver scores" ON public.driver_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage driver scores" ON public.driver_scores FOR ALL TO authenticated USING (true);

-- Update existing tables RLS to require authentication
DROP POLICY IF EXISTS "Allow all operations on drivers" ON public.drivers;
DROP POLICY IF EXISTS "Allow all operations on vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow all operations on maintenances" ON public.maintenances;
DROP POLICY IF EXISTS "Allow all operations on tires" ON public.tires;
DROP POLICY IF EXISTS "Allow all operations on journey_entries" ON public.journey_entries;
DROP POLICY IF EXISTS "Allow all operations on alerts" ON public.alerts;

-- New authenticated-only policies for drivers
CREATE POLICY "Authenticated users can view drivers" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert drivers" ON public.drivers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update drivers" ON public.drivers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete drivers" ON public.drivers FOR DELETE TO authenticated USING (true);

-- New authenticated-only policies for vehicles
CREATE POLICY "Authenticated users can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (true);

-- New authenticated-only policies for maintenances
CREATE POLICY "Authenticated users can view maintenances" ON public.maintenances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert maintenances" ON public.maintenances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update maintenances" ON public.maintenances FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete maintenances" ON public.maintenances FOR DELETE TO authenticated USING (true);

-- New authenticated-only policies for tires
CREATE POLICY "Authenticated users can view tires" ON public.tires FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tires" ON public.tires FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tires" ON public.tires FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete tires" ON public.tires FOR DELETE TO authenticated USING (true);

-- New authenticated-only policies for journey_entries
CREATE POLICY "Authenticated users can view journey_entries" ON public.journey_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert journey_entries" ON public.journey_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update journey_entries" ON public.journey_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete journey_entries" ON public.journey_entries FOR DELETE TO authenticated USING (true);

-- New authenticated-only policies for alerts
CREATE POLICY "Authenticated users can view alerts" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update alerts" ON public.alerts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete alerts" ON public.alerts FOR DELETE TO authenticated USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fuel_entries_updated_at BEFORE UPDATE ON public.fuel_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_driver_scores_updated_at BEFORE UPDATE ON public.driver_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();