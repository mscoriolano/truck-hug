import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface JourneyEntry {
  id: string;
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  vehicle_plate: string;
  type: 'start' | 'break_start' | 'break_end' | 'end';
  timestamp: string;
  location?: string;
  mileage?: number;
  created_at: string;
}

export interface CreateJourneyEntryInput {
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  vehicle_plate: string;
  type: 'start' | 'break_start' | 'break_end' | 'end';
  location?: string;
  mileage?: number;
}

export const useJourneyEntries = () => {
  return useQuery({
    queryKey: ['journey_entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journey_entries')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data as JourneyEntry[];
    },
  });
};

export const useCreateJourneyEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateJourneyEntryInput) => {
      const { data, error } = await supabase
        .from('journey_entries')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey_entries'] });
      toast.success('Registro de jornada salvo!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar jornada: ' + error.message);
    },
  });
};

export const useDeleteJourneyEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('journey_entries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey_entries'] });
      toast.success('Registro excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir registro: ' + error.message);
    },
  });
};
