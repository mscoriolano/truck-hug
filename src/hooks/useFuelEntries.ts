import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FuelEntry {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  driver_id: string;
  driver_name: string;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  mileage: number;
  fuel_type: string;
  station?: string;
  notes?: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFuelEntryInput {
  vehicle_id: string;
  vehicle_plate: string;
  driver_id: string;
  driver_name: string;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  mileage: number;
  fuel_type?: string;
  station?: string;
  notes?: string;
  entry_date?: string;
}

export const useFuelEntries = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['fuel_entries', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('fuel_entries')
        .select('*')
        .order('entry_date', { ascending: false });
      
      if (startDate) {
        query = query.gte('entry_date', startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('entry_date', endOfDay.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as FuelEntry[];
    },
  });
};

export const useCreateFuelEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateFuelEntryInput) => {
      const { data, error } = await supabase
        .from('fuel_entries')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel_entries'] });
      toast.success('Abastecimento registrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar abastecimento: ' + error.message);
    },
  });
};

export const useUpdateFuelEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<FuelEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('fuel_entries')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel_entries'] });
      toast.success('Abastecimento atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar abastecimento: ' + error.message);
    },
  });
};

export const useDeleteFuelEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fuel_entries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel_entries'] });
      toast.success('Abastecimento excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir abastecimento: ' + error.message);
    },
  });
};
