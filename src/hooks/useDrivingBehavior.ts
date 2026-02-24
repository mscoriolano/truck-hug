import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DrivingBehaviorEvent {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  driver_id?: string;
  driver_name?: string;
  event_type: string;
  severity: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  speed?: number;
  rpm?: number;
  battery_level?: number;
  details?: any;
  event_timestamp: string;
  created_at: string;
}

export interface GeofenceZone {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  zone_type: string;
  is_active: boolean;
  alert_on_enter: boolean;
  alert_on_exit: boolean;
  created_at: string;
  updated_at: string;
}

export interface DrivingScore {
  vehiclePlate: string;
  driverName: string | null;
  speedScore: number;
  rpmScore: number;
  idleScore: number;
  overallScore: number;
  totalEvents: number;
  criticalEvents: number;
}

export const useDrivingBehaviorEvents = (limit = 200) => {
  return useQuery({
    queryKey: ['driving_behavior_events', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driving_behavior_events')
        .select('*')
        .order('event_timestamp', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as DrivingBehaviorEvent[];
    },
    refetchInterval: 30000,
  });
};

export const useGeofenceZones = () => {
  return useQuery({
    queryKey: ['geofence_zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofence_zones')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as GeofenceZone[];
    },
  });
};

// Calculate driving scores from behavior events
export const useDrivingScores = () => {
  return useQuery({
    queryKey: ['driving_scores_calculated'],
    queryFn: async () => {
      // Get events from last 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events, error } = await supabase
        .from('driving_behavior_events')
        .select('*')
        .gte('event_timestamp', weekAgo)
        .order('event_timestamp', { ascending: false });
      
      if (error) throw error;
      if (!events?.length) return [];

      // Group by vehicle
      const byVehicle = new Map<string, DrivingBehaviorEvent[]>();
      for (const evt of events) {
        const arr = byVehicle.get(evt.vehicle_plate) || [];
        arr.push(evt);
        byVehicle.set(evt.vehicle_plate, arr);
      }

      const scores: DrivingScore[] = [];
      for (const [plate, evts] of byVehicle) {
        const speedEvents = evts.filter(e => e.event_type === 'speeding').length;
        const rpmEvents = evts.filter(e => e.event_type === 'high_rpm').length;
        const idleEvents = evts.filter(e => e.event_type === 'excessive_idle').length;
        const criticalEvents = evts.filter(e => e.severity === 'critical').length;

        // Score: 100 - penalties (each event penalizes)
        const speedScore = Math.max(0, 100 - speedEvents * 10);
        const rpmScore = Math.max(0, 100 - rpmEvents * 5);
        const idleScore = Math.max(0, 100 - idleEvents * 3);
        const overallScore = Math.round((speedScore * 0.4 + rpmScore * 0.35 + idleScore * 0.25));

        const driverName = evts.find(e => e.driver_name)?.driver_name || null;

        scores.push({
          vehiclePlate: plate,
          driverName,
          speedScore,
          rpmScore,
          idleScore,
          overallScore,
          totalEvents: evts.length,
          criticalEvents,
        });
      }

      return scores.sort((a, b) => a.overallScore - b.overallScore);
    },
    refetchInterval: 60000,
  });
};
