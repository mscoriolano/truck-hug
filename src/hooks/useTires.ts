import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Tire {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  position: string;
  brand: string;
  model: string;
  install_date: string;
  install_mileage: number;
  current_mileage: number;
  max_mileage: number;
  status: 'good' | 'warning' | 'critical' | 'replaced';
  last_inspection: string;
  created_at: string;
  updated_at: string;
  tread_depth: number | null;
  min_tread_depth: number | null;
  warning_tread_depth: number | null;
  good_tread_depth: number | null;
}

export interface CreateTireInput {
  vehicle_id: string;
  vehicle_plate: string;
  position: string;
  brand: string;
  model: string;
  install_date: string;
  install_mileage: number;
  current_mileage: number;
  max_mileage: number;
  status?: 'good' | 'warning' | 'critical' | 'replaced';
  tread_depth?: number | null;
  min_tread_depth?: number;
  warning_tread_depth?: number;
  good_tread_depth?: number;
}

export const useTires = () => {
  return useQuery({
    queryKey: ['tires'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tires')
        .select('*')
        .order('vehicle_plate');
      
      if (error) throw error;
      return data as Tire[];
    },
  });
};

export const useCreateTire = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTireInput) => {
      const { data, error } = await supabase
        .from('tires')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tires'] });
      toast.success('Pneu cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao cadastrar pneu: ' + error.message);
    },
  });
};

export const useUpdateTire = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Tire> & { id: string }) => {
      const { data, error } = await supabase
        .from('tires')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tires'] });
      toast.success('Pneu atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar pneu: ' + error.message);
    },
  });
};

export const useDeleteTire = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tires')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tires'] });
      toast.success('Pneu excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir pneu: ' + error.message);
    },
  });
};
