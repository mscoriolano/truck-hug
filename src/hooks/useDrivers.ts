import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DriverStatus = 'available' | 'driving' | 'resting' | 'off' | 'vacation' | 'leave' | 'terminated';

export interface Driver {
  id: string;
  name: string;
  avatar?: string;
  phone: string;
  license: string;
  status: DriverStatus;
  current_vehicle?: string;
  journey_start?: string;
  total_hours_today: number;
  cnh_expiry?: string | null;
  cnh_category?: string | null;
  r3?: string | null;
  ac?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDriverInput {
  name: string;
  phone: string;
  license: string;
  status?: DriverStatus;
  avatar?: string;
  cnh_expiry?: string | null;
  cnh_category?: string | null;
  r3?: string | null;
  ac?: string | null;
}

export const useDrivers = () => {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Driver[];
    },
  });
};

export const useCreateDriver = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateDriverInput) => {
      const { data, error } = await supabase
        .from('drivers')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Motorista cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao cadastrar motorista: ' + error.message);
    },
  });
};

export const useUpdateDriver = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Driver> & { id: string }) => {
      const { data, error } = await supabase
        .from('drivers')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Motorista atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar motorista: ' + error.message);
    },
  });
};

export const useDeleteDriver = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Motorista excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir motorista: ' + error.message);
    },
  });
};
