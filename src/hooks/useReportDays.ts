import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StatDay } from '@/lib/fleetStats';

/** Official D-1 onboard report rows in a date range (yyyy-mm-dd). */
export function useReportDays(from: string, to: string) {
  return useQuery({
    queryKey: ['report_days', from, to],
    queryFn: async (): Promise<StatDay[]> => {
      const { data, error } = await supabase.from('vehicle_can_data')
        .select('vehicle_plate, driver_name, data_timestamp, onboard_consumption_kml, raw_data')
        .contains('raw_data', { source: 'telemetria_relatorio' })
        .gte('data_timestamp', `${from}T00:00:00-03:00`).lte('data_timestamp', `${to}T23:59:59-03:00`)
        .limit(5000);
      if (error) throw error;
      return (data || []).map((r: any) => {
        const d = r.raw_data || {};
        const km = d.odmIni != null && d.odmFim != null && d.odmFim >= d.odmIni ? d.odmFim - d.odmIni : d.distanciaKm ?? null;
        return {
          plate: r.vehicle_plate, driver: r.driver_name || 'Sem motorista',
          day: d.report_date || String(r.data_timestamp).slice(0, 10),
          km, kml: r.onboard_consumption_kml ?? d.mediaConsumo ?? null, velMedia: d.velMedia ?? null,
          odmFim: d.odmFim ?? null, consHoraMotor: d.consHoraMotor ?? null,
          minutesOn: d.totalMotorLig ?? null, minutesMoving: d.totalMotorLigMov ?? d.utilizacao ?? null, minutesIdle: d.totalMotorLigPar ?? null,
        };
      });
    },
  });
}

export function useBehaviorCounts(from: string, to: string) {
  return useQuery({
    queryKey: ['behavior_counts', from, to],
    queryFn: async () => {
      const { data, error } = await supabase.from('driving_behavior_events')
        .select('vehicle_plate, driver_name, event_type')
        .gte('event_timestamp', `${from}T00:00:00-03:00`).lte('event_timestamp', `${to}T23:59:59-03:00`).limit(20000);
      if (error) throw error;
      return data || [];
    },
  });
}
