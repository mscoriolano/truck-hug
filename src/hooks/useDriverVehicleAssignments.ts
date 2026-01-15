import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DriverVehicleAssignment {
  id: string;
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  vehicle_plate: string;
  assignment_code?: string;
  start_time: string;
  end_time?: string;
  is_active: boolean;
  trip_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAssignmentInput {
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  vehicle_plate: string;
  trip_id?: string;
}

// Gera código único de 6 dígitos
function generateAssignmentCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const useDriverVehicleAssignments = (activeOnly = true) => {
  return useQuery({
    queryKey: ['driver_vehicle_assignments', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('driver_vehicle_assignments')
        .select('*')
        .order('start_time', { ascending: false });
      
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DriverVehicleAssignment[];
    },
  });
};

export const useActiveAssignmentByVehicle = (vehicleId: string) => {
  return useQuery({
    queryKey: ['driver_vehicle_assignment_by_vehicle', vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_vehicle_assignments')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as DriverVehicleAssignment | null;
    },
    enabled: !!vehicleId,
  });
};

export const useActiveAssignmentByDriver = (driverId: string) => {
  return useQuery({
    queryKey: ['driver_vehicle_assignment_by_driver', driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_vehicle_assignments')
        .select('*')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as DriverVehicleAssignment | null;
    },
    enabled: !!driverId,
  });
};

export const useAssignmentByCode = (code: string) => {
  return useQuery({
    queryKey: ['driver_vehicle_assignment_by_code', code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_vehicle_assignments')
        .select('*')
        .eq('assignment_code', code)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as DriverVehicleAssignment | null;
    },
    enabled: !!code && code.length >= 4,
  });
};

export const useCreateAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateAssignmentInput) => {
      // Primeiro, desativar qualquer vinculação ativa do motorista
      await supabase
        .from('driver_vehicle_assignments')
        .update({ 
          is_active: false, 
          end_time: new Date().toISOString() 
        })
        .eq('driver_id', input.driver_id)
        .eq('is_active', true);
      
      // Desativar qualquer vinculação ativa do veículo
      await supabase
        .from('driver_vehicle_assignments')
        .update({ 
          is_active: false, 
          end_time: new Date().toISOString() 
        })
        .eq('vehicle_id', input.vehicle_id)
        .eq('is_active', true);
      
      // Criar nova vinculação
      const { data, error } = await supabase
        .from('driver_vehicle_assignments')
        .insert({
          ...input,
          assignment_code: generateAssignmentCode(),
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driver_vehicle_assignments'] });
      toast.success(`Vinculação criada! Código: ${data.assignment_code}`);
    },
    onError: (error) => {
      toast.error('Erro ao criar vinculação: ' + error.message);
    },
  });
};

export const useEndAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data, error } = await supabase
        .from('driver_vehicle_assignments')
        .update({
          is_active: false,
          end_time: new Date().toISOString(),
        })
        .eq('id', assignmentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver_vehicle_assignments'] });
      toast.success('Vinculação encerrada!');
    },
    onError: (error) => {
      toast.error('Erro ao encerrar vinculação: ' + error.message);
    },
  });
};

export const useValidateAssignmentCode = () => {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase
        .from('driver_vehicle_assignments')
        .select('*, drivers:driver_id(*), vehicles:vehicle_id(*)')
        .eq('assignment_code', code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Código inválido ou expirado');
      
      return data;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
