import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateTrip } from '@/hooks/useTrips';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';

export const TripForm = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    vehicle_plate: '',
    driver_id: '',
    driver_name: '',
    trip_type: '' as 'escoamento' | 'abastecimento' | '',
    departure_date: '',
    weight: 0,
    notes: '',
  });
  
  const createTrip = useCreateTrip();
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles?.find(v => v.id === vehicleId);
    setFormData({
      ...formData,
      vehicle_id: vehicleId,
      vehicle_plate: vehicle?.plate || '',
    });
  };

  const handleDriverChange = (driverId: string) => {
    const driver = drivers?.find(d => d.id === driverId);
    setFormData({
      ...formData,
      driver_id: driverId,
      driver_name: driver?.name || '',
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trip_type) return;
    
    await createTrip.mutateAsync({
      vehicle_id: formData.vehicle_id,
      vehicle_plate: formData.vehicle_plate,
      driver_id: formData.driver_id,
      driver_name: formData.driver_name,
      trip_type: formData.trip_type,
      departure_date: formData.departure_date,
      weight: formData.weight,
      notes: formData.notes || undefined,
    });
    
    setFormData({
      vehicle_id: '',
      vehicle_plate: '',
      driver_id: '',
      driver_name: '',
      trip_type: '',
      departure_date: '',
      weight: 0,
      notes: '',
    });
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Viagem
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Viagem</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trip_type">Tipo de Viagem</Label>
            <Select
              value={formData.trip_type}
              onValueChange={(value: 'escoamento' | 'abastecimento') => 
                setFormData({ ...formData, trip_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="escoamento">Escoamento (Saída)</SelectItem>
                <SelectItem value="abastecimento">Abastecimento (Retorno)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle">Veículo</Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={handleVehicleChange}
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
                onValueChange={handleDriverChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {drivers?.filter(d => (d.status as string) !== 'terminated').map((driver) => (
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
              <Label htmlFor="departure_date">Data de Saída</Label>
              <Input
                id="departure_date"
                type="date"
                value={formData.departure_date}
                onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Peso Carregado (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                placeholder="0 = vazio"
              />
              <p className="text-xs text-muted-foreground">
                Peso 0 = 0 ciclo, Peso {'>'} 0 = 0.5 ciclo
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações opcionais..."
              rows={2}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={createTrip.isPending || !formData.trip_type || !formData.vehicle_id || !formData.driver_id}
          >
            {createTrip.isPending ? 'Salvando...' : 'Registrar Viagem'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
