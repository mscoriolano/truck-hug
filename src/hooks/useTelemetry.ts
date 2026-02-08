import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VehicleTelemetry {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  truckscontrol_id?: string;
  latitude?: number;
  longitude?: number;
  speed: number;
  heading: number;
  ignition_on: boolean;
  odometer: number;
  fuel_level?: number;
  rpm?: number;
  events?: string[];
  engine_hours?: number;
  g_force_x?: number;
  g_force_y?: number;
  g_force_z?: number;
  gps_timestamp?: string;
  received_at: string;
  created_at: string;
  // Campos estendidos para facilitar o uso no mapa
  model?: string;
  brand?: string;
}

export interface TelemetryHistory {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  driver_id?: string;
  driver_name?: string;
  trip_id?: string;
  latitude?: number;
  longitude?: number;
  speed: number;
  heading: number;
  ignition_on: boolean;
  g_force_x: number;
  g_force_y: number;
  g_force_z: number;
  event_type?: string;
  event_severity?: string;
  gps_timestamp?: string;
  created_at: string;
}

export interface TelemetryAlert {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  driver_id?: string;
  driver_name?: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  speed?: number;
  speed_limit?: number;
  g_force?: number;
  idle_duration?: number;
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  event_timestamp: string;
  created_at: string;
}

export interface TripStatistics {
  id: string;
  trip_id?: string;
  vehicle_id: string;
  vehicle_plate: string;
  driver_id?: string;
  driver_name?: string;
  start_time: string;
  end_time?: string;
  total_distance_km: number;
  fuel_consumed_liters: number;
  avg_consumption_km_per_liter: number;
  avg_speed: number;
  max_speed: number;
  time_over_speed_limit_minutes: number;
  total_stops: number;
  total_idle_time_minutes: number;
  hard_brakes_count: number;
  hard_accels_count: number;
  hard_turns_count: number;
  driving_score: number;
  created_at: string;
  updated_at: string;
}

export interface TelemetrySettings {
  id: string;
  speed_limit_highway: number;
  speed_limit_urban: number;
  hard_brake_threshold: number;
  hard_accel_threshold: number;
  hard_turn_threshold: number;
  idle_warning_minutes: number;
  idle_critical_minutes: number;
  operation_start_time: string;
  operation_end_time: string;
  expected_consumption: number;
  created_at: string;
  updated_at: string;
}

// Hook para telemetria em tempo real dos veículos
export const useVehicleTelemetry = () => {
  return useQuery({
    queryKey: ['vehicle_telemetry'],
    queryFn: async () => {
      // Tenta buscar fazendo JOIN com a tabela vehicles para já trazer o modelo/marca
      // Se der erro de relação no Supabase, ele ignora a parte do join
      const { data, error } = await supabase
        .from('vehicle_telemetry')
        .select(`
          *,
          vehicles (
            model,
            brand
          )
        `)
        .order('received_at', { ascending: false });
      
      if (error) throw error;
      
      // FILTRAGEM INTELIGENTE NO FRONTEND:
      const uniqueVehicles = new Map();
      (data as any[]).forEach(item => {
        // Normaliza o item para incluir modelo e marca no nível raiz
        const enrichedItem: VehicleTelemetry = {
            ...item,
            model: item.vehicles?.model,
            brand: item.vehicles?.brand
        };

        if (!uniqueVehicles.has(item.vehicle_plate)) {
          uniqueVehicles.set(item.vehicle_plate, enrichedItem);
        }
      });
      
      return Array.from(uniqueVehicles.values()) as VehicleTelemetry[];
    },
    refetchInterval: 30000, // Ajustado para 30 segundos conforme solicitado
  });
};

// Hook para histórico de telemetria
export const useTelemetryHistory = (vehicleId?: string, limit = 100) => {
  return useQuery({
    queryKey: ['telemetry_history', vehicleId, limit],
    queryFn: async () => {
      let query = supabase
        .from('telemetry_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TelemetryHistory[];
    },
  });
};

// Hook para alertas de telemetria
export const useTelemetryAlerts = (acknowledged?: boolean) => {
  return useQuery({
    queryKey: ['telemetry_alerts', acknowledged],
    queryFn: async () => {
      let query = supabase
        .from('telemetry_alerts')
        .select('*')
        .order('event_timestamp', { ascending: false });
      
      if (acknowledged !== undefined) {
        query = query.eq('acknowledged', acknowledged);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TelemetryAlert[];
    },
  });
};

// Hook para estatísticas de viagem
export const useTripStatistics = (vehicleId?: string, driverId?: string) => {
  return useQuery({
    queryKey: ['trip_statistics', vehicleId, driverId],
    queryFn: async () => {
      let query = supabase
        .from('trip_statistics')
        .select('*')
        .order('start_time', { ascending: false });
      
      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }
      if (driverId) {
        query = query.eq('driver_id', driverId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TripStatistics[];
    },
  });
};

// Hook para configurações de telemetria
export const useTelemetrySettings = () => {
  return useQuery({
    queryKey: ['telemetry_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telemetry_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as TelemetrySettings;
    },
  });
};

// Hook para atualizar configurações
export const useUpdateTelemetrySettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Partial<TelemetrySettings>) => {
      const { data: existing } = await supabase
        .from('telemetry_settings')
        .select('id')
        .limit(1)
        .single();
      
      if (!existing) throw new Error('Settings not found');
      
      const { data, error } = await supabase
        .from('telemetry_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemetry_settings'] });
      toast.success('Configurações salvas!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar configurações: ' + error.message);
    },
  });
};

// Hook para reconhecer alerta
export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ alertId, acknowledgedBy }: { alertId: string; acknowledgedBy: string }) => {
      const { data, error } = await supabase
        .from('telemetry_alerts')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: acknowledgedBy,
        })
        .eq('id', alertId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemetry_alerts'] });
      toast.success('Alerta reconhecido!');
    },
    onError: (error) => {
      toast.error('Erro ao reconhecer alerta: ' + error.message);
    },
  });
};

// Hook para sincronizar telemetria
export const useSyncTelemetry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (options?: { veiID?: string; debug?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('truckscontrol-telemetry', {
        body: options || {},
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // --- AQUI ESTÁ A MÁGICA DA AUTOMAÇÃO ---
      // Atualiza os pontos no mapa
      queryClient.invalidateQueries({ queryKey: ['vehicle_telemetry'] });
      
      // Atualiza os alertas
      queryClient.invalidateQueries({ queryKey: ['telemetry_alerts'] });
      
      // *** NOVO *** Atualiza a lista de veículos (Modelos, Marcas, Hodômetro)
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      if (data.success) {
        toast.success(`Sincronização concluída: Dados da frota atualizados.`);
      }
    },
    onError: (error) => {
      toast.error('Erro ao sincronizar telemetria: ' + error.message);
    },
  });
};