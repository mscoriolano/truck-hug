import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateVehicle, Vehicle } from '@/hooks/useVehicles';

interface VehicleEditFormProps {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VehicleEditForm = ({ vehicle, open, onOpenChange }: VehicleEditFormProps) => {
  const [formData, setFormData] = useState<{
    plate: string;
    model: string;
    brand: string;
    year: number;
    mileage: number;
    status: 'active' | 'maintenance' | 'inactive';
    next_maintenance: string;
    fuel_type: 'diesel' | 'gasoline' | 'flex' | 'electric';
    consumption_target: number;
  }>({
    plate: '',
    model: '',
    brand: '',
    year: new Date().getFullYear(),
    mileage: 0,
    status: 'active',
    next_maintenance: '',
    fuel_type: 'diesel',
    consumption_target: 2.5,
  });
  
  const updateVehicle = useUpdateVehicle();

  useEffect(() => {
    if (vehicle) {
      setFormData({
        plate: vehicle.plate || '',
        model: vehicle.model || '',
        brand: vehicle.brand || '',
        year: vehicle.year || new Date().getFullYear(),
        mileage: vehicle.mileage || 0,
        status: vehicle.status || 'active',
        next_maintenance: vehicle.next_maintenance ? vehicle.next_maintenance.split('T')[0] : '',
        fuel_type: vehicle.fuel_type || 'diesel',
        consumption_target: vehicle.consumption_target || 2.5,
      });
    }
  }, [vehicle]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    
    await updateVehicle.mutateAsync({ id: vehicle.id, ...formData });
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Veículo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-plate">Placa</Label>
              <Input
                id="edit-plate"
                value={formData.plate}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                placeholder="ABC-1234"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-year">Ano</Label>
              <Input
                id="edit-year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-brand">Marca</Label>
              <Input
                id="edit-brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Volvo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model">Modelo</Label>
              <Input
                id="edit-model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="FH 540"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-mileage">Quilometragem</Label>
              <Input
                id="edit-mileage"
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fuel_type">Combustível</Label>
              <Select
                value={formData.fuel_type}
                onValueChange={(value: 'diesel' | 'gasoline' | 'flex' | 'electric') => 
                  setFormData({ ...formData, fuel_type: value })
                }
              >
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-consumption_target">Meta Consumo (km/L)</Label>
              <Input
                id="edit-consumption_target"
                type="number"
                step="0.1"
                value={formData.consumption_target}
                onChange={(e) => setFormData({ ...formData, consumption_target: parseFloat(e.target.value) })}
                placeholder="2.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-next_maintenance">Próxima Manutenção</Label>
              <Input
                id="edit-next_maintenance"
                type="date"
                value={formData.next_maintenance}
                onChange={(e) => setFormData({ ...formData, next_maintenance: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'active' | 'maintenance' | 'inactive') => 
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="maintenance">Em Manutenção</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={updateVehicle.isPending}>
            {updateVehicle.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
