import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface VehicleType {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  type: 'FIXO' | 'VARIAVEL' | 'OUTROS';
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyCost {
  id: string;
  year: number;
  month: number;
  category_id: string | null;
  category_name: string;
  cost_type: 'FIXO' | 'VARIAVEL' | 'OUTROS';
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyPerformance {
  id: string;
  year: number;
  month: number;
  total_insourcing_cost: number;
  fixed_cost: number;
  variable_cost: number;
  external_freight_cost: number;
  cost_avoided: number;
  invoiced_weight: number;
  average_freight_per_ton: number;
  availability_percentage: number;
  target_compliance_percentage: number;
  result: number;
  accumulated_result: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperationalPhase {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  target_cost_per_ton: number | null;
  target_availability: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Vehicle Types Hook
export function useVehicleTypes() {
  return useQuery({
    queryKey: ['vehicle-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as VehicleType[];
    },
  });
}

// Expense Categories Hook
export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });
}

// Monthly Costs Hook
export function useMonthlyCosts(year?: number) {
  return useQuery({
    queryKey: ['monthly-costs', year],
    queryFn: async () => {
      let query = supabase
        .from('monthly_costs')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: true });
      
      if (year) {
        query = query.eq('year', year);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MonthlyCost[];
    },
  });
}

export function useCreateMonthlyCost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cost: Omit<MonthlyCost, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('monthly_costs')
        .insert(cost)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-costs'] });
      toast.success('Custo adicionado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar custo: ' + error.message);
    },
  });
}

export function useUpdateMonthlyCost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...cost }: Partial<MonthlyCost> & { id: string }) => {
      const { data, error } = await supabase
        .from('monthly_costs')
        .update(cost)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-costs'] });
      toast.success('Custo atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar custo: ' + error.message);
    },
  });
}

export function useDeleteMonthlyCost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('monthly_costs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-costs'] });
      toast.success('Custo removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover custo: ' + error.message);
    },
  });
}

// Monthly Performance Hook
export function useMonthlyPerformance(year?: number) {
  return useQuery({
    queryKey: ['monthly-performance', year],
    queryFn: async () => {
      let query = supabase
        .from('monthly_performance')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: true });
      
      if (year) {
        query = query.eq('year', year);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MonthlyPerformance[];
    },
  });
}

export function useUpsertMonthlyPerformance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (performance: Omit<MonthlyPerformance, 'id' | 'created_at' | 'updated_at'>) => {
      // Check if entry exists
      const { data: existing } = await supabase
        .from('monthly_performance')
        .select('id')
        .eq('year', performance.year)
        .eq('month', performance.month)
        .single();
      
      if (existing) {
        const { data, error } = await supabase
          .from('monthly_performance')
          .update(performance)
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('monthly_performance')
          .insert(performance)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-performance'] });
      toast.success('Performance atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar performance: ' + error.message);
    },
  });
}

// Operational Phases Hook
export function useOperationalPhases() {
  return useQuery({
    queryKey: ['operational-phases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_phases')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as OperationalPhase[];
    },
  });
}

export function useCreateOperationalPhase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (phase: Omit<OperationalPhase, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('operational_phases')
        .insert(phase)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-phases'] });
      toast.success('Fase operacional criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar fase: ' + error.message);
    },
  });
}

// Create Expense Category
export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Omit<ExpenseCategory, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Categoria criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar categoria: ' + error.message);
    },
  });
}

// Helper function to get month name
export function getMonthName(month: number): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month - 1] || '';
}

// Helper function to format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
