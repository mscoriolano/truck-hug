import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DriverTireReport {
  id: string;
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  vehicle_plate: string;
  tire_position: string;
  condition: 'good' | 'warning' | 'critical';
  description?: string;
  photos?: string[];
  created_at: string;
  updated_at: string;
}

export interface DriverMaintenanceRequest {
  id: string;
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  vehicle_plate: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  category: string;
  description: string;
  photos?: string[];
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverExpenseClaim {
  id: string;
  driver_id: string;
  driver_name: string;
  vehicle_id?: string;
  vehicle_plate?: string;
  trip_id?: string;
  expense_type: 'fuel' | 'toll' | 'food' | 'lodging' | 'repair' | 'other';
  amount: number;
  description: string;
  expense_date: string;
  receipts?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryReceipt {
  id: string;
  driver_id: string;
  driver_name: string;
  trip_id: string;
  vehicle_plate: string;
  delivery_date: string;
  recipient_name?: string;
  notes?: string;
  files?: string[];
  created_at: string;
  updated_at: string;
}

// Tire Reports
export const useDriverTireReports = () => {
  return useQuery({
    queryKey: ['driver-tire-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_tire_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DriverTireReport[];
    },
  });
};

export const useCreateDriverTireReport = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (report: Omit<DriverTireReport, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('driver_tire_reports')
        .insert(report)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-tire-reports'] });
      toast({
        title: 'Sucesso',
        description: 'Relatório de pneu enviado com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Falha ao enviar relatório: ' + error.message,
        variant: 'destructive',
      });
    },
  });
};

// Maintenance Requests
export const useDriverMaintenanceRequests = () => {
  return useQuery({
    queryKey: ['driver-maintenance-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_maintenance_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DriverMaintenanceRequest[];
    },
  });
};

export const useCreateDriverMaintenanceRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: Omit<DriverMaintenanceRequest, 'id' | 'created_at' | 'updated_at' | 'status' | 'admin_notes'>) => {
      const { data, error } = await supabase
        .from('driver_maintenance_requests')
        .insert(request)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-maintenance-requests'] });
      toast({
        title: 'Sucesso',
        description: 'Solicitação de manutenção enviada com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Falha ao enviar solicitação: ' + error.message,
        variant: 'destructive',
      });
    },
  });
};

// Expense Claims
export const useDriverExpenseClaims = () => {
  return useQuery({
    queryKey: ['driver-expense-claims'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_expense_claims')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DriverExpenseClaim[];
    },
  });
};

export const useCreateDriverExpenseClaim = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (claim: Omit<DriverExpenseClaim, 'id' | 'created_at' | 'updated_at' | 'status' | 'admin_notes'>) => {
      const { data, error } = await supabase
        .from('driver_expense_claims')
        .insert(claim)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-expense-claims'] });
      toast({
        title: 'Sucesso',
        description: 'Pedido de reembolso enviado com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Falha ao enviar pedido: ' + error.message,
        variant: 'destructive',
      });
    },
  });
};

// Delivery Receipts
export const useDeliveryReceipts = () => {
  return useQuery({
    queryKey: ['delivery-receipts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_receipts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DeliveryReceipt[];
    },
  });
};

export const useCreateDeliveryReceipt = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (receipt: Omit<DeliveryReceipt, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('delivery_receipts')
        .insert(receipt)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-receipts'] });
      toast({
        title: 'Sucesso',
        description: 'Comprovante de entrega enviado com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Falha ao enviar comprovante: ' + error.message,
        variant: 'destructive',
      });
    },
  });
};

// File Upload
export const useUploadFile = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file, userId }: { file: File; userId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('driver-uploads')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('driver-uploads')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    },
    onError: (error) => {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
