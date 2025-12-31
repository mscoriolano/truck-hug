import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateMaintenance } from '@/hooks/useMaintenances';
import { useVehicles } from '@/hooks/useVehicles';

export const MaintenanceForm = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<{
    vehicle_id: string;
    vehicle_plate: string;
    type: 'preventive' | 'corrective';
    category: 'engine' | 'tires' | 'brakes' | 'suspension' | 'electrical' | 'general';
    description: string;
    scheduled_date: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
    cost: number | undefined;
    notes: string;
  }>({
    vehicle_id: '',
    vehicle_plate: '',
    type: 'preventive',
    category: 'general',
    description: '',
    scheduled_date: '',
    status: 'scheduled',
    cost: undefined,
    notes: '',
  });
  
  const createMaintenance = useCreateMaintenance();
  const { data: vehicles } = useVehicles();
  
  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles?.find(v => v.id === vehicleId);
    setFormData({ 
      ...formData, 
      vehicle_id: vehicleId, 
      vehicle_plate: vehicle?.plate || '' 
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMaintenance.mutateAsync(formData);
    setFormData({
      vehicle_id: '',
      vehicle_plate: '',
      type: 'preventive',
      category: 'general',
      description: '',
      scheduled_date: '',
      status: 'scheduled',
      cost: undefined,
      notes: '',
    });
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Manutenção
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Manutenção</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Veículo</Label>
            <Select
              value={formData.vehicle_id}
              onValueChange={handleVehicleChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o veículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicles?.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.brand} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'preventive' | 'corrective') => 
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventiva</SelectItem>
                  <SelectItem value="corrective">Corretiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value: 'engine' | 'tires' | 'brakes' | 'suspension' | 'electrical' | 'general') => 
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engine">Motor</SelectItem>
                  <SelectItem value="tires">Pneus</SelectItem>
                  <SelectItem value="brakes">Freios</SelectItem>
                  <SelectItem value="suspension">Suspensão</SelectItem>
                  <SelectItem value="electrical">Elétrica</SelectItem>
                  <SelectItem value="general">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Troca de óleo e filtros"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Data Agendada</Label>
              <Input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Custo Estimado (R$)</Label>
              <Input
                id="cost"
                type="number"
                value={formData.cost || ''}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Detalhes adicionais..."
            />
          </div>
          <Button type="submit" className="w-full" disabled={createMaintenance.isPending}>
            {createMaintenance.isPending ? 'Salvando...' : 'Registrar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
