import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt } from 'lucide-react';
import { useCreateDriverExpenseClaim } from '@/hooks/useDriverReports';
import { useVehicles } from '@/hooks/useVehicles';
import { useTrips } from '@/hooks/useTrips';
import { FileUpload } from './FileUpload';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export const ExpenseClaimForm: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const createClaim = useCreateDriverExpenseClaim();
  const { data: vehicles = [] } = useVehicles();
  const { data: trips = [] } = useTrips();

  const [formData, setFormData] = useState({
    vehicle_id: '',
    vehicle_plate: '',
    trip_id: '',
    expense_type: '' as 'fuel' | 'toll' | 'food' | 'lodging' | 'repair' | 'other',
    amount: '',
    description: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    receipts: [] as string[],
  });

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setFormData(prev => ({
      ...prev,
      vehicle_id: vehicleId,
      vehicle_plate: vehicle?.plate || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    await createClaim.mutateAsync({
      driver_id: user.id,
      driver_name: user.email?.split('@')[0] || 'Motorista',
      vehicle_id: formData.vehicle_id || undefined,
      vehicle_plate: formData.vehicle_plate || undefined,
      trip_id: formData.trip_id || undefined,
      expense_type: formData.expense_type,
      amount: parseFloat(formData.amount),
      description: formData.description,
      expense_date: formData.expense_date,
      receipts: formData.receipts.length > 0 ? formData.receipts : undefined,
    });

    setFormData({
      vehicle_id: '',
      vehicle_plate: '',
      trip_id: '',
      expense_type: '' as any,
      amount: '',
      description: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      receipts: [],
    });
    setOpen(false);
  };

  const expenseTypes = [
    { value: 'fuel', label: '⛽ Combustível' },
    { value: 'toll', label: '🛣️ Pedágio' },
    { value: 'food', label: '🍽️ Alimentação' },
    { value: 'lodging', label: '🏨 Hospedagem' },
    { value: 'repair', label: '🔧 Reparo' },
    { value: 'other', label: '📋 Outros' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <Receipt className="h-4 w-4 mr-2" />
          Solicitar Reembolso
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Reembolso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Despesa *</Label>
            <Select value={formData.expense_type} onValueChange={(v) => setFormData(prev => ({ ...prev, expense_type: v as any }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {expenseTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0,00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Data da Despesa *</Label>
            <Input
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Veículo (opcional)</Label>
            <Select value={formData.vehicle_id} onValueChange={handleVehicleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Viagem Relacionada (opcional)</Label>
            <Select value={formData.trip_id} onValueChange={(v) => setFormData(prev => ({ ...prev, trip_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a viagem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma</SelectItem>
                {trips.slice(0, 20).map(trip => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {format(new Date(trip.departure_date), 'dd/MM/yyyy')} - {trip.vehicle_plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o motivo da despesa..."
              rows={3}
              required
            />
          </div>

          {user && (
            <div className="space-y-2">
              <Label>Comprovantes</Label>
              <FileUpload
                userId={user.id}
                onFilesUploaded={(urls) => setFormData(prev => ({ ...prev, receipts: urls }))}
                existingFiles={formData.receipts}
              />
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={!formData.expense_type || !formData.amount || !formData.description || createClaim.isPending}
          >
            {createClaim.isPending ? 'Enviando...' : 'Enviar Pedido'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
