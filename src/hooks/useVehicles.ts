import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Vehicle {
  id: string;
  plate: string;
  license_plate?: string; // Adicionado para compatibilidade com o Mapa
  model: string;
  brand: string;
  year: number;
  mileage: number;
  status: 'active' | 'maintenance' | 'inactive';
  next_maintenance: string;
  fuel_type: 'diesel' | 'gasoline' | 'flex' | 'electric';
  consumption_target?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateVehicleInput {
  plate: string;
  model: string;
  brand: string;
  year: number;
  mileage?: number;
  status?: 'active' | 'maintenance' | 'inactive';
  next_maintenance: string;
  fuel_type?: 'diesel' | 'gasoline' | 'flex' | 'electric';
  consumption_target?: number;
}

export const useVehicles = () => {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('plate');
      
      if (error) throw error;

      // --- TRUQUE DE COMPATIBILIDADE ---
      // Mapeamos os dados para garantir que o Mapa receba o que espera
      return data.map((v: any) => ({
        ...v,
        // O Mapa busca 'license_plate', mas o banco devolve 'plate'. Criamos o alias:
        license_plate: v.plate, 
        // Garantimos que nunca vá vazio para não dar "Não Especificado" sem querer
        model: v.model || 'Modelo N/I',
        brand: v.brand || 'Marca N/I'
      })) as Vehicle[];
    },
  });
};

export const useCreateVehicle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateVehicleInput) => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Veículo cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao cadastrar veículo: ' + error.message);
    },
  });
};

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Vehicle> & { id: string }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Veículo atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar veículo: ' + error.message);
    },
  });
};

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Veículo excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir veículo: ' + error.message);
    },
  });
};