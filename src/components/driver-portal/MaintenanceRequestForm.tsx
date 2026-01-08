import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wrench } from 'lucide-react';
import { useCreateDriverMaintenanceRequest } from '@/hooks/useDriverReports';
import { useVehicles } from '@/hooks/useVehicles';
import { FileUpload } from './FileUpload';
import { useAuth } from '@/hooks/useAuth';

export const MaintenanceRequestForm: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const createRequest = useCreateDriverMaintenanceRequest();
  const { data: vehicles = [] } = useVehicles();

  const [formData, setFormData] = useState({
    vehicle_id: '',
    vehicle_plate: '',
    urgency: 'normal' as 'low' | 'normal' | 'high' | 'critical',
    category: '',
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

    await createRequest.mutateAsync({
      driver_id: user.id,
      driver_name: user.email?.split('@')[0] || 'Motorista',
      vehicle_id: formData.vehicle_id,
      vehicle_plate: formData.vehicle_plate,
      urgency: formData.urgency,
      category: formData.category,
      description: formData.description,
      photos: formData.photos.length > 0 ? formData.photos : undefined,
    });

    setFormData({
      vehicle_id: '',
      vehicle_plate: '',
      urgency: 'normal',
      category: '',
      description: '',
      photos: [],
    });
    setOpen(false);
  };

  const categories = [
    { value: 'engine', label: 'Motor' },
    { value: 'tires', label: 'Pneus' },
    { value: 'brakes', label: 'Freios' },
    { value: 'suspension', label: 'Suspensão' },
    { value: 'electrical', label: 'Elétrica' },
    { value: 'general', label: 'Geral' },
  ];

  const urgencies = [
    { value: 'low', label: '🟢 Baixa', description: 'Pode aguardar' },
    { value: 'normal', label: '🟡 Normal', description: 'Agendar em breve' },
    { value: 'high', label: '🟠 Alta', description: 'Precisa de atenção' },
    { value: 'critical', label: '🔴 Crítica', description: 'Urgente!' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <Wrench className="h-4 w-4 mr-2" />
          Solicitar Manutenção
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Manutenção</DialogTitle>
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
            <Label>Categoria *</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Urgência *</Label>
            <Select value={formData.urgency} onValueChange={(v) => setFormData(prev => ({ ...prev, urgency: v as any }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a urgência" />
              </SelectTrigger>
              <SelectContent>
                {urgencies.map(urg => (
                  <SelectItem key={urg.value} value={urg.value}>
                    {urg.label} - {urg.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição do Problema *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva detalhadamente o problema..."
              rows={4}
              required
            />
          </div>

          {user && (
            <div className="space-y-2">
              <Label>Fotos do Problema</Label>
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
            disabled={!formData.vehicle_id || !formData.category || !formData.description || createRequest.isPending}
          >
            {createRequest.isPending ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
