import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DriverScore {
  id: string;
  driver_id: string;
  driver_name: string;
  period_start: string;
  period_end: string;
  fuel_efficiency_score: number;
  tire_care_score: number;
  maintenance_score: number;
  journey_compliance_score: number;
  speed_compliance_score: number;
  total_score: number;
  total_km: number;
  avg_consumption: number;
  tire_incidents: number;
  corrective_maintenances: number;
  journey_violations: number;
  speed_violations: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDriverScoreInput {
  driver_id: string;
  driver_name: string;
  period_start: string;
  period_end: string;
  fuel_efficiency_score?: number;
  tire_care_score?: number;
  maintenance_score?: number;
  journey_compliance_score?: number;
  speed_compliance_score?: number;
  total_score?: number;
  total_km?: number;
  avg_consumption?: number;
  tire_incidents?: number;
  corrective_maintenances?: number;
  journey_violations?: number;
  speed_violations?: number;
}

export const useDriverScores = () => {
  return useQuery({
    queryKey: ['driver_scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_scores')
        .select('*')
        .order('total_score', { ascending: false });
      
      if (error) throw error;
      return data as DriverScore[];
    },
  });
};

export const useCreateDriverScore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateDriverScoreInput) => {
      const { data, error } = await supabase
        .from('driver_scores')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver_scores'] });
      toast.success('Pontuação registrada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar pontuação: ' + error.message);
    },
  });
};

export const useUpdateDriverScore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<DriverScore> & { id: string }) => {
      const { data, error } = await supabase
        .from('driver_scores')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver_scores'] });
      toast.success('Pontuação atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar pontuação: ' + error.message);
    },
  });
};

export const useDeleteDriverScore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('driver_scores')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver_scores'] });
      toast.success('Pontuação excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir pontuação: ' + error.message);
    },
  });
};
