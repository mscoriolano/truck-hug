import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Maintenance {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  type: 'preventive' | 'corrective';
  category: 'engine' | 'tires' | 'brakes' | 'suspension' | 'electrical' | 'general';
  description: string;
  scheduled_date: string;
  completed_date?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
  cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMaintenanceInput {
  vehicle_id: string;
  vehicle_plate: string;
  type: 'preventive' | 'corrective';
  category: 'engine' | 'tires' | 'brakes' | 'suspension' | 'electrical' | 'general';
  description: string;
  scheduled_date: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
  cost?: number;
  notes?: string;
}

export const useMaintenances = () => {
  return useQuery({
    queryKey: ['maintenances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenances')
        .select('*')
        .order('scheduled_date', { ascending: false });
      
      if (error) throw error;
      return data as Maintenance[];
    },
  });
};

export const useCreateMaintenance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateMaintenanceInput) => {
      const { data, error } = await supabase
        .from('maintenances')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      toast.success('Manutenção cadastrada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao cadastrar manutenção: ' + error.message);
    },
  });
};

export const useUpdateMaintenance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Maintenance> & { id: string }) => {
      const { data, error } = await supabase
        .from('maintenances')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      toast.success('Manutenção atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar manutenção: ' + error.message);
    },
  });
};

export const useDeleteMaintenance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenances')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      toast.success('Manutenção excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir manutenção: ' + error.message);
    },
  });
};
