import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Fuel } from 'lucide-react';
import { useCreateFuelEntry } from '@/hooks/useFuelEntries';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';

export const FuelEntryForm = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    driver_id: '',
    liters: '',
    price_per_liter: '',
    mileage: '',
    fuel_type: 'diesel',
    station: '',
    notes: '',
    entry_date: new Date().toISOString().split('T')[0],
  });
  
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const createFuelEntry = useCreateFuelEntry();
  
  const selectedVehicle = vehicles?.find(v => v.id === formData.vehicle_id);
  const selectedDriver = drivers?.find(d => d.id === formData.driver_id);
  
  const liters = parseFloat(formData.liters) || 0;
  const pricePerLiter = parseFloat(formData.price_per_liter) || 0;
  const totalCost = liters * pricePerLiter;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVehicle || !selectedDriver) return;
    
    await createFuelEntry.mutateAsync({
      vehicle_id: formData.vehicle_id,
      vehicle_plate: selectedVehicle.plate,
      driver_id: formData.driver_id,
      driver_name: selectedDriver.name,
      liters,
      price_per_liter: pricePerLiter,
      total_cost: totalCost,
      mileage: parseInt(formData.mileage) || 0,
      fuel_type: formData.fuel_type,
      station: formData.station || undefined,
      notes: formData.notes || undefined,
      entry_date: formData.entry_date,
    });
    
    setFormData({
      vehicle_id: '',
      driver_id: '',
      liters: '',
      price_per_liter: '',
      mileage: '',
      fuel_type: 'diesel',
      station: '',
      notes: '',
      entry_date: new Date().toISOString().split('T')[0],
    });
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Abastecimento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-primary" />
            Registrar Abastecimento
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle">Veículo</Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate} - {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver">Motorista</Label>
              <Select
                value={formData.driver_id}
                onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {drivers?.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="liters">Litros</Label>
              <Input
                id="liters"
                type="number"
                step="0.01"
                value={formData.liters}
                onChange={(e) => setFormData({ ...formData, liters: e.target.value })}
                placeholder="150.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço/Litro (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.001"
                value={formData.price_per_liter}
                onChange={(e) => setFormData({ ...formData, price_per_liter: e.target.value })}
                placeholder="5.99"
                required
              />
            </div>
          </div>
          
          {totalCost > 0 && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-sm text-muted-foreground">Total do abastecimento</p>
              <p className="text-2xl font-bold text-primary">
                R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mileage">Quilometragem</Label>
              <Input
                id="mileage"
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                placeholder="150000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel_type">Combustível</Label>
              <Select
                value={formData.fuel_type}
                onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="diesel_s10">Diesel S10</SelectItem>
                  <SelectItem value="gasoline">Gasolina</SelectItem>
                  <SelectItem value="ethanol">Etanol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="station">Posto</Label>
              <Input
                id="station"
                value={formData.station}
                onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                placeholder="Nome do posto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={createFuelEntry.isPending || !formData.vehicle_id || !formData.driver_id}
          >
            {createFuelEntry.isPending ? 'Salvando...' : 'Registrar Abastecimento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
