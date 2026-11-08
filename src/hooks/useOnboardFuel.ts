import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { onboardConsumptionAvailability, type FuelSignal } from '@/lib/onboardFuel';

export function useOnboardFuel({ plate, driver, from, to }: { plate: string; driver: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ['onboard-fuel', plate, driver, from, to],
    queryFn: async () => {
      const signals: FuelSignal[] = [];
      for (let offset = 0; ; offset += 1000) {
        let query = supabase.from('vehicle_can_data')
          .select('id,vehicle_plate,driver_id,driver_name,data_timestamp')
          .order('data_timestamp', { ascending: false }).order('id')
          .range(offset, offset + 999);
        if (plate !== 'all') query = query.eq('vehicle_plate', plate);
        if (driver === 'unknown') query = query.is('driver_id', null);
        else if (driver !== 'all') query = query.eq('driver_id', driver);
        if (from) query = query.gte('data_timestamp', from);
        if (to) query = query.lt('data_timestamp', to);
        const { data, error } = await query;
        if (error) throw error;
        signals.push(...data);
        if (data.length < 1000) break;
      }
      return { days: onboardConsumptionAvailability(signals), readings: signals.length };
    },
  });
}