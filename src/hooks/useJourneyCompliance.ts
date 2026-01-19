import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface JourneyCompliance {
  id: string;
  driver_id: string;
  driver_name: string;
  journey_date: string;
  journey_start: string | null;
  journey_end: string | null;
  break_start: string | null;
  break_end: string | null;
  total_break_minutes: number;
  total_worked_minutes: number;
  overtime_minutes: number;
  inter_journey_rest_minutes: number | null;
  is_overtime_compliant: boolean;
  is_inter_journey_compliant: boolean;
  is_weekly_rest_compliant: boolean;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface JourneyEvent {
  id: string;
  driver_id: string;
  driver_name: string;
  vehicle_id: string | null;
  vehicle_plate: string | null;
  event_type: 'journey_start' | 'journey_end' | 'break_start' | 'break_end' | 'macro_received';
  event_timestamp: string;
  macro_code: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  mileage: number | null;
  source: string;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

export interface JourneyLegalSettings {
  id: string;
  max_daily_hours: number;
  max_overtime_hours: number;
  min_inter_journey_hours: number;
  min_weekly_rest_hours: number;
  max_consecutive_work_days: number;
  macro_journey_start: string | null;
  macro_journey_end: string | null;
  macro_break_start: string | null;
  macro_break_end: string | null;
  alert_overtime_warning_minutes: number;
  alert_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateJourneyEventInput {
  driver_id: string;
  driver_name: string;
  vehicle_id?: string;
  vehicle_plate?: string;
  event_type: 'journey_start' | 'journey_end' | 'break_start' | 'break_end';
  event_timestamp?: string;
  location_name?: string;
  mileage?: number;
  source?: string;
}

// Hook para buscar conformidade de jornada
export const useJourneyCompliance = (driverId?: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['journey_compliance', driverId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('driver_journey_compliance')
        .select('*')
        .order('journey_date', { ascending: false });
      
      if (driverId) {
        query = query.eq('driver_id', driverId);
      }
      if (startDate) {
        query = query.gte('journey_date', startDate);
      }
      if (endDate) {
        query = query.lte('journey_date', endDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as JourneyCompliance[];
    },
  });
};

// Hook para buscar eventos de jornada
export const useJourneyEvents = (driverId?: string, limit = 50) => {
  return useQuery({
    queryKey: ['journey_events', driverId, limit],
    queryFn: async () => {
      let query = supabase
        .from('driver_journey_events')
        .select('*')
        .order('event_timestamp', { ascending: false })
        .limit(limit);
      
      if (driverId) {
        query = query.eq('driver_id', driverId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as JourneyEvent[];
    },
  });
};

// Hook para buscar configurações legais
export const useJourneyLegalSettings = () => {
  return useQuery({
    queryKey: ['journey_legal_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journey_legal_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as JourneyLegalSettings;
    },
  });
};

// Hook para criar evento de jornada
export const useCreateJourneyEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateJourneyEventInput) => {
      const { data, error } = await supabase
        .from('driver_journey_events')
        .insert({
          ...input,
          event_timestamp: input.event_timestamp || new Date().toISOString(),
          source: input.source || 'manual',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Atualizar conformidade de jornada automaticamente
      await updateJourneyComplianceFromEvent(input);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey_events'] });
      queryClient.invalidateQueries({ queryKey: ['journey_compliance'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Evento de jornada registrado!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar evento: ' + error.message);
    },
  });
};

// Função para atualizar conformidade baseada em eventos
async function updateJourneyComplianceFromEvent(event: CreateJourneyEventInput) {
  const today = new Date().toISOString().split('T')[0];
  const eventTime = event.event_timestamp || new Date().toISOString();
  
  // Buscar registro existente para hoje
  const { data: existing } = await supabase
    .from('driver_journey_compliance')
    .select('*')
    .eq('driver_id', event.driver_id)
    .eq('journey_date', today)
    .single();
  
  // Buscar configurações legais
  const { data: settings } = await supabase
    .from('journey_legal_settings')
    .select('*')
    .single();
  
  const maxDailyMinutes = (settings?.max_daily_hours || 8) * 60;
  const maxOvertimeMinutes = (settings?.max_overtime_hours || 2) * 60;
  const minInterJourneyMinutes = (settings?.min_inter_journey_hours || 11) * 60;
  
  if (existing) {
    // Atualizar registro existente
    const updates: Partial<JourneyCompliance> = {};
    
    if (event.event_type === 'journey_start' && !existing.journey_start) {
      updates.journey_start = eventTime;
      
      // Calcular descanso interjornada
      const { data: lastJourney } = await supabase
        .from('driver_journey_compliance')
        .select('journey_end')
        .eq('driver_id', event.driver_id)
        .lt('journey_date', today)
        .order('journey_date', { ascending: false })
        .limit(1)
        .single();
      
      if (lastJourney?.journey_end) {
        const restMinutes = Math.floor(
          (new Date(eventTime).getTime() - new Date(lastJourney.journey_end).getTime()) / 60000
        );
        updates.inter_journey_rest_minutes = restMinutes;
        updates.is_inter_journey_compliant = restMinutes >= minInterJourneyMinutes;
      }
    }
    
    if (event.event_type === 'journey_end') {
      updates.journey_end = eventTime;
      
      // Calcular tempo trabalhado
      if (existing.journey_start) {
        const workedMinutes = Math.floor(
          (new Date(eventTime).getTime() - new Date(existing.journey_start).getTime()) / 60000
        ) - (existing.total_break_minutes || 0);
        
        updates.total_worked_minutes = workedMinutes;
        updates.overtime_minutes = Math.max(0, workedMinutes - maxDailyMinutes);
        updates.is_overtime_compliant = updates.overtime_minutes <= maxOvertimeMinutes;
      }
    }
    
    if (event.event_type === 'break_start') {
      updates.break_start = eventTime;
    }
    
    if (event.event_type === 'break_end' && existing.break_start) {
      updates.break_end = eventTime;
      const breakMinutes = Math.floor(
        (new Date(eventTime).getTime() - new Date(existing.break_start).getTime()) / 60000
      );
      updates.total_break_minutes = (existing.total_break_minutes || 0) + breakMinutes;
    }
    
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('driver_journey_compliance')
        .update(updates)
        .eq('id', existing.id);
    }
  } else if (event.event_type === 'journey_start') {
    // Criar novo registro
    const newCompliance = {
      driver_id: event.driver_id,
      driver_name: event.driver_name,
      journey_date: today,
      journey_start: eventTime,
      source: event.source || 'manual',
    };
    
    // Calcular descanso interjornada
    const { data: lastJourney } = await supabase
      .from('driver_journey_compliance')
      .select('journey_end')
      .eq('driver_id', event.driver_id)
      .order('journey_date', { ascending: false })
      .limit(1)
      .single();
    
    if (lastJourney?.journey_end) {
      const restMinutes = Math.floor(
        (new Date(eventTime).getTime() - new Date(lastJourney.journey_end).getTime()) / 60000
      );
      Object.assign(newCompliance, {
        inter_journey_rest_minutes: restMinutes,
        is_inter_journey_compliant: restMinutes >= minInterJourneyMinutes,
      });
    }
    
    await supabase
      .from('driver_journey_compliance')
      .insert(newCompliance);
  }
  
  // Atualizar status do motorista
  const statusMap: Record<string, string> = {
    journey_start: 'driving',
    journey_end: 'available',
    break_start: 'resting',
    break_end: 'driving',
  };
  
  if (statusMap[event.event_type]) {
    await supabase
      .from('drivers')
      .update({ 
        status: statusMap[event.event_type],
        journey_start: event.event_type === 'journey_start' ? eventTime : undefined,
      })
      .eq('id', event.driver_id);
  }
}

// Hook para atualizar configurações legais
export const useUpdateJourneyLegalSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: Partial<JourneyLegalSettings>) => {
      const { data, error } = await supabase
        .from('journey_legal_settings')
        .update(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey_legal_settings'] });
      toast.success('Configurações de jornada atualizadas!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar configurações: ' + error.message);
    },
  });
};

// Hook para calcular estatísticas de conformidade
export const useJourneyStats = (driverId?: string) => {
  return useQuery({
    queryKey: ['journey_stats', driverId],
    queryFn: async () => {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 6);
      
      let query = supabase
        .from('driver_journey_compliance')
        .select('*')
        .gte('journey_date', startOfWeek.toISOString().split('T')[0]);
      
      if (driverId) {
        query = query.eq('driver_id', driverId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const records = data as JourneyCompliance[];
      
      return {
        totalRecords: records.length,
        overtimeViolations: records.filter(r => !r.is_overtime_compliant).length,
        interJourneyViolations: records.filter(r => !r.is_inter_journey_compliant).length,
        weeklyRestViolations: records.filter(r => !r.is_weekly_rest_compliant).length,
        totalWorkedMinutes: records.reduce((sum, r) => sum + (r.total_worked_minutes || 0), 0),
        totalOvertimeMinutes: records.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0),
        avgDailyHours: records.length > 0 
          ? records.reduce((sum, r) => sum + (r.total_worked_minutes || 0), 0) / records.length / 60 
          : 0,
      };
    },
  });
};
