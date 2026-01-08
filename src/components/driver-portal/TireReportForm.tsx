import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CircleDot, Plus } from 'lucide-react';
import { useCreateDriverTireReport } from '@/hooks/useDriverReports';
import { useVehicles } from '@/hooks/useVehicles';
import { FileUpload } from './FileUpload';
import { useAuth } from '@/hooks/useAuth';

export const TireReportForm: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const createReport = useCreateDriverTireReport();
  const { data: vehicles = [] } = useVehicles();

  const [formData, setFormData] = useState({
    vehicle_id: '',
    vehicle_plate: '',
    tire_position: '',
    condition: '' as 'good' | 'warning' | 'critical',
    description: '',
    photos: [] as string[],
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

    await createReport.mutateAsync({
      driver_id: user.id,
      driver_name: user.email?.split('@')[0] || 'Motorista',
      vehicle_id: formData.vehicle_id,
      vehicle_plate: formData.vehicle_plate,
      tire_position: formData.tire_position,
      condition: formData.condition,
      description: formData.description || undefined,
      photos: formData.photos.length > 0 ? formData.photos : undefined,
    });

    setFormData({
      vehicle_id: '',
      vehicle_plate: '',
      tire_position: '',
      condition: '' as 'good' | 'warning' | 'critical',
      description: '',
      photos: [],
    });
    setOpen(false);
  };

  const tirePositions = [
    'Dianteiro Esquerdo',
    'Dianteiro Direito',
    'Traseiro Esquerdo Externo',
    'Traseiro Esquerdo Interno',
    'Traseiro Direito Externo',
    'Traseiro Direito Interno',
    'Estepe',
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <CircleDot className="h-4 w-4 mr-2" />
          Reportar Estado de Pneu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reportar Estado de Pneu</DialogTitle>
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

          <div className="space-y-2">
            <Label>Posição do Pneu *</Label>
            <Select value={formData.tire_position} onValueChange={(v) => setFormData(prev => ({ ...prev, tire_position: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a posição" />
              </SelectTrigger>
              <SelectContent>
                {tirePositions.map(pos => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Condição *</Label>
            <Select value={formData.condition} onValueChange={(v) => setFormData(prev => ({ ...prev, condition: v as any }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a condição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">✅ Bom</SelectItem>
                <SelectItem value="warning">⚠️ Atenção</SelectItem>
                <SelectItem value="critical">🔴 Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o problema observado..."
              rows={3}
            />
          </div>

          {user && (
            <div className="space-y-2">
              <Label>Fotos</Label>
              <FileUpload
                userId={user.id}
                onFilesUploaded={(urls) => setFormData(prev => ({ ...prev, photos: urls }))}
                existingFiles={formData.photos}
                accept="image/*"
              />
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={!formData.vehicle_id || !formData.tire_position || !formData.condition || createReport.isPending}
          >
            {createReport.isPending ? 'Enviando...' : 'Enviar Relatório'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
