import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateTire } from '@/hooks/useTires';
import { useVehicles } from '@/hooks/useVehicles';

export const TireForm = () => {
  const [open, setOpen] = useState(false);
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
    status: 'good' as const,
    tread_depth: null as number | null,
    min_tread_depth: 1.6,
    warning_tread_depth: 3.0,
    good_tread_depth: 5.0,
  });
  
  const createTire = useCreateTire();
  const { data: vehicles } = useVehicles();
  
  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles?.find(v => v.id === vehicleId);
    setFormData({ 
      ...formData, 
      vehicle_id: vehicleId, 
      vehicle_plate: vehicle?.plate || '',
      install_mileage: vehicle?.mileage || 0,
      current_mileage: vehicle?.mileage || 0,
    });
  };

  // Calcula status baseado no sulco
  const calculateStatusByTread = (depth: number | null): 'good' | 'warning' | 'critical' => {
    if (depth === null) return 'good';
    if (depth <= formData.min_tread_depth) return 'critical';
    if (depth <= formData.warning_tread_depth) return 'warning';
    return 'good';
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const status = formData.tread_depth !== null 
      ? calculateStatusByTread(formData.tread_depth) 
      : formData.status;
    
    await createTire.mutateAsync({ ...formData, status });
    setFormData({
      vehicle_id: '',
      vehicle_plate: '',
      position: '',
      brand: '',
      model: '',
      install_date: '',
      install_mileage: 0,
      current_mileage: 0,
      max_mileage: 80000,
      status: 'good',
      tread_depth: null,
      min_tread_depth: 1.6,
      warning_tread_depth: 3.0,
      good_tread_depth: 5.0,
    });
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Pneu
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Pneu</DialogTitle>
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
              <Label htmlFor="max_mileage">Km Máximo</Label>
              <Input
                id="max_mileage"
                type="number"
                value={formData.max_mileage}
                onChange={(e) => setFormData({ ...formData, max_mileage: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="install_mileage">Km na Instalação</Label>
              <Input
                id="install_mileage"
                type="number"
                value={formData.install_mileage}
                onChange={(e) => setFormData({ ...formData, install_mileage: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_mileage">Km Atual</Label>
              <Input
                id="current_mileage"
                type="number"
                value={formData.current_mileage}
                onChange={(e) => setFormData({ ...formData, current_mileage: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          {/* Seção de Sulco */}
          <div className="border-t border-border pt-4 mt-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Medição de Sulco (mm)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tread_depth">Sulco Atual (mm)</Label>
                <Input
                  id="tread_depth"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 8.0"
                  value={formData.tread_depth ?? ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    tread_depth: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="good_tread_depth">Limite Bom (≥mm)</Label>
                <Input
                  id="good_tread_depth"
                  type="number"
                  step="0.1"
                  value={formData.good_tread_depth}
                  onChange={(e) => setFormData({ ...formData, good_tread_depth: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="warning_tread_depth">Limite Atenção (≥mm)</Label>
                <Input
                  id="warning_tread_depth"
                  type="number"
                  step="0.1"
                  value={formData.warning_tread_depth}
                  onChange={(e) => setFormData({ ...formData, warning_tread_depth: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_tread_depth">Limite Crítico (≤mm)</Label>
                <Input
                  id="min_tread_depth"
                  type="number"
                  step="0.1"
                  value={formData.min_tread_depth}
                  onChange={(e) => setFormData({ ...formData, min_tread_depth: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              O status será calculado automaticamente com base no sulco informado.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={createTire.isPending}>
            {createTire.isPending ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
