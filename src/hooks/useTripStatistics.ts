import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TripStatistic {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  driver_id: string | null;
  driver_name: string | null;
  trip_id: string | null;
  start_time: string;
  end_time: string | null;
  total_distance_km: number | null;
  avg_speed: number | null;
  max_speed: number | null;
  fuel_consumed_liters: number | null;
  avg_consumption_km_per_liter: number | null;
  hard_brakes_count: number | null;
  hard_accels_count: number | null;
  hard_turns_count: number | null;
  total_idle_time_minutes: number | null;
  time_over_speed_limit_minutes: number | null;
  total_stops: number | null;
  driving_score: number | null;
  created_at: string;
  updated_at: string;
}

export const useTripStatistics = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['trip_statistics', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('trip_statistics')
        .select('*')
        .order('start_time', { ascending: false });

      if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('start_time', endDate.toISOString());
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as TripStatistic[];
    },
  });
};

export const useTripStatisticsByDriver = (driverId: string, startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['trip_statistics', 'driver', driverId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('trip_statistics')
        .select('*')
        .eq('driver_id', driverId)
        .order('start_time', { ascending: false });

      if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('start_time', endDate.toISOString());
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as TripStatistic[];
    },
    enabled: !!driverId,
  });
};
