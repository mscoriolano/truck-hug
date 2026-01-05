import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateTire, Tire } from '@/hooks/useTires';
import { useVehicles } from '@/hooks/useVehicles';

interface TireEditFormProps {
  tire: Tire;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TireEditForm = ({ tire, open, onOpenChange }: TireEditFormProps) => {
  const [formData, setFormData] = useState({
    vehicle_id: '',
    vehicle_plate: '',
    position: '',
    brand: '',
    model: '',
    install_date: '',
    install_mileage: 0,
    current_mileage: 0,
    max_mileage: 80000,
    status: 'good' as 'good' | 'warning' | 'critical' | 'replaced',
  });
  
  const updateTire = useUpdateTire();
  const { data: vehicles } = useVehicles();

  useEffect(() => {
    if (tire) {
      setFormData({
        vehicle_id: tire.vehicle_id,
        vehicle_plate: tire.vehicle_plate,
        position: tire.position,
        brand: tire.brand,
        model: tire.model,
        install_date: tire.install_date.split('T')[0],
        install_mileage: tire.install_mileage,
        current_mileage: tire.current_mileage,
        max_mileage: tire.max_mileage,
        status: tire.status,
      });
    }
  }, [tire]);
  
  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles?.find(v => v.id === vehicleId);
    setFormData({ 
      ...formData, 
      vehicle_id: vehicleId, 
      vehicle_plate: vehicle?.plate || '',
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTire.mutateAsync({
      id: tire.id,
      ...formData,
    });
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Pneu</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                      {vehicle.plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Posição</Label>
              <Select
                value={formData.position}
                onValueChange={(value) => setFormData({ ...formData, position: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DE">Dianteiro Esquerdo</SelectItem>
                  <SelectItem value="DD">Dianteiro Direito</SelectItem>
                  <SelectItem value="TEE">Traseiro Ext. Esquerdo</SelectItem>
                  <SelectItem value="TED">Traseiro Ext. Direito</SelectItem>
                  <SelectItem value="TIE">Traseiro Int. Esquerdo</SelectItem>
                  <SelectItem value="TID">Traseiro Int. Direito</SelectItem>
                  <SelectItem value="ESTEPE">Estepe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Michelin"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="X Multi D"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="install_date">Data de Instalação</Label>
              <Input
                id="install_date"
                type="date"
                value={formData.install_date}
                onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'good' | 'warning' | 'critical' | 'replaced') => 
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Bom</SelectItem>
                  <SelectItem value="warning">Atenção</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="replaced">Substituído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="install_mileage">Km Instalação</Label>
              <Input
                id="install_mileage"
                type="number"
                value={formData.install_mileage}
                onChange={(e) => setFormData({ ...formData, install_mileage: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_mileage">Km Atual</Label>
              <Input
                id="current_mileage"
                type="number"
                value={formData.current_mileage}
                onChange={(e) => setFormData({ ...formData, current_mileage: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_mileage">Km Máximo</Label>
              <Input
                id="max_mileage"
                type="number"
                value={formData.max_mileage}
                onChange={(e) => setFormData({ ...formData, max_mileage: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={updateTire.isPending}>
            {updateTire.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
