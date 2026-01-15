-- Create driver_goals table for the goals/bonus system
CREATE TABLE public.driver_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  driver_name TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  target_score NUMERIC NOT NULL DEFAULT 85,
  target_consumption NUMERIC NOT NULL DEFAULT 3.5,
  target_speed_violations INTEGER NOT NULL DEFAULT 5,
  target_km NUMERIC NOT NULL DEFAULT 5000,
  bonus_amount NUMERIC NOT NULL DEFAULT 500,
  achieved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(driver_id, month, year)
);

-- Enable RLS
ALTER TABLE public.driver_goals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to view driver goals"
ON public.driver_goals
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert driver goals"
ON public.driver_goals
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update driver goals"
ON public.driver_goals
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete driver goals"
ON public.driver_goals
FOR DELETE
TO authenticated
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_driver_goals_updated_at
BEFORE UPDATE ON public.driver_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();