import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Fuel } from 'lucide-react';
import { useCreateFuelEntry } from '@/hooks/useFuelEntries';
import { useVehicles } from '@/hooks/useVehicles';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export const FuelReportForm: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const createFuelEntry = useCreateFuelEntry();
  const { data: vehicles = [] } = useVehicles();

  const [formData, setFormData] = useState({
    vehicle_id: '',
    vehicle_plate: '',
    liters: '',
    price_per_liter: '',
    mileage: '',
    station: '',
    fuel_type: 'diesel',
    notes: '',
    entry_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setFormData(prev => ({
      ...prev,
      vehicle_id: vehicleId,
      vehicle_plate: vehicle?.plate || '',
      fuel_type: vehicle?.fuel_type || 'diesel',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const liters = parseFloat(formData.liters);
    const pricePerLiter = parseFloat(formData.price_per_liter);
    const totalCost = liters * pricePerLiter;

    await createFuelEntry.mutateAsync({
      driver_id: user.id,
      driver_name: user.email?.split('@')[0] || 'Motorista',
      vehicle_id: formData.vehicle_id,
      vehicle_plate: formData.vehicle_plate,
      liters,
      price_per_liter: pricePerLiter,
      total_cost: totalCost,
      mileage: parseInt(formData.mileage),
      station: formData.station || undefined,
      fuel_type: formData.fuel_type,
      notes: formData.notes || undefined,
      entry_date: new Date(formData.entry_date).toISOString(),
    });

    setFormData({
      vehicle_id: '',
      vehicle_plate: '',
      liters: '',
      price_per_liter: '',
      mileage: '',
      station: '',
      fuel_type: 'diesel',
      notes: '',
      entry_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    });
    setOpen(false);
  };

  const totalCost = formData.liters && formData.price_per_liter 
    ? (parseFloat(formData.liters) * parseFloat(formData.price_per_liter)).toFixed(2)
    : '0,00';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <Fuel className="h-4 w-4 mr-2" />
          Registrar Abastecimento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Abastecimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Veículo *</Label>
            <Select value={formData.vehicle_id} onValueChange={handleVehicleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o veículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Litros *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.liters}
                onChange={(e) => setFormData(prev => ({ ...prev, liters: e.target.value }))}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Preço/Litro (R$) *</Label>
              <Input
                type="number"
                step="0.001"
                value={formData.price_per_liter}
                onChange={(e) => setFormData(prev => ({ ...prev, price_per_liter: e.target.value }))}
                placeholder="0,000"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg text-center">
            <span className="text-sm text-muted-foreground">Total: </span>
            <span className="font-bold text-lg">R$ {totalCost}</span>
          </div>

          <div className="space-y-2">
            <Label>Quilometragem Atual *</Label>
            <Input
              type="number"
              value={formData.mileage}
              onChange={(e) => setFormData(prev => ({ ...prev, mileage: e.target.value }))}
              placeholder="Ex: 150000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Data/Hora *</Label>
            <Input
              type="datetime-local"
              value={formData.entry_date}
              onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Posto</Label>
            <Input
              value={formData.station}
              onChange={(e) => setFormData(prev => ({ ...prev, station: e.target.value }))}
              placeholder="Nome do posto"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Combustível</Label>
            <Select value={formData.fuel_type} onValueChange={(v) => setFormData(prev => ({ ...prev, fuel_type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="gasoline">Gasolina</SelectItem>
                <SelectItem value="flex">Flex</SelectItem>
                <SelectItem value="electric">Elétrico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={!formData.vehicle_id || !formData.liters || !formData.price_per_liter || !formData.mileage || createFuelEntry.isPending}
          >
            {createFuelEntry.isPending ? 'Salvando...' : 'Registrar Abastecimento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
