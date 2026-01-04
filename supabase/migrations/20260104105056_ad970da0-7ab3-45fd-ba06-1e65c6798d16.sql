-- Remove a constraint antiga de status dos motoristas
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_status_check;

-- Adiciona nova constraint com todos os status possíveis
ALTER TABLE public.drivers 
ADD CONSTRAINT drivers_status_check 
CHECK (status IN ('available', 'driving', 'resting', 'off', 'vacation', 'leave', 'terminated'));