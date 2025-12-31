import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateVehicle } from '@/hooks/useVehicles';

export const VehicleForm = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<{
    plate: string;
    model: string;
    brand: string;
    year: number;
    mileage: number;
    status: 'active' | 'maintenance' | 'inactive';
    next_maintenance: string;
    fuel_type: 'diesel' | 'gasoline' | 'flex' | 'electric';
  }>({
    plate: '',
    model: '',
    brand: '',
    year: new Date().getFullYear(),
    mileage: 0,
    status: 'active',
    next_maintenance: '',
    fuel_type: 'diesel',
  });
  
  const createVehicle = useCreateVehicle();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createVehicle.mutateAsync(formData);
    setFormData({
      plate: '',
      model: '',
      brand: '',
      year: new Date().getFullYear(),
      mileage: 0,
      status: 'active',
      next_maintenance: '',
      fuel_type: 'diesel',
    });
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Veículo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Veículo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plate">Placa</Label>
              <Input
                id="plate"
                value={formData.plate}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                placeholder="ABC-1234"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Volvo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="FH 540"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mileage">Quilometragem</Label>
              <Input
                id="mileage"
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel_type">Combustível</Label>
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
          <div className="space-y-2">
            <Label htmlFor="next_maintenance">Próxima Manutenção</Label>
            <Input
              id="next_maintenance"
              type="date"
              value={formData.next_maintenance}
              onChange={(e) => setFormData({ ...formData, next_maintenance: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
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
          <Button type="submit" className="w-full" disabled={createVehicle.isPending}>
            {createVehicle.isPending ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
