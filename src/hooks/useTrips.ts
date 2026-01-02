import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Trip {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  driver_id: string;
  driver_name: string;
  trip_type: 'escoamento' | 'abastecimento';
  departure_date: string;
  weight: number;
  cycle_value: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTripInput {
  vehicle_id: string;
  vehicle_plate: string;
  driver_id: string;
  driver_name: string;
  trip_type: 'escoamento' | 'abastecimento';
  departure_date: string;
  weight: number;
  notes?: string;
}

export const useTrips = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['trips', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('trips')
        .select('*')
        .order('departure_date', { ascending: false });
      
      if (startDate) {
        query = query.gte('departure_date', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('departure_date', endDate.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Trip[];
    },
  });
};

export const useCreateTrip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTripInput) => {
      // Calcular cycle_value baseado no peso
      const cycle_value = input.weight > 0 ? 0.5 : 0;
      
      const { data, error } = await supabase
        .from('trips')
        .insert({ ...input, cycle_value })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Viagem registrada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar viagem: ' + error.message);
    },
  });
};

export const useUpdateTrip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Trip> & { id: string }) => {
      // Recalcular cycle_value se weight foi alterado
      const updateData = { ...input };
      if (input.weight !== undefined) {
        updateData.cycle_value = input.weight > 0 ? 0.5 : 0;
      }
      
      const { data, error } = await supabase
        .from('trips')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Viagem atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar viagem: ' + error.message);
    },
  });
};

export const useDeleteTrip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Viagem excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir viagem: ' + error.message);
    },
  });
};
