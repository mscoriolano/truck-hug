import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCheck } from 'lucide-react';
import { useCreateDeliveryReceipt } from '@/hooks/useDriverReports';
import { useTrips } from '@/hooks/useTrips';
import { FileUpload } from './FileUpload';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export const DeliveryReceiptForm: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const createReceipt = useCreateDeliveryReceipt();
  const { data: trips = [] } = useTrips();

  const [formData, setFormData] = useState({
    trip_id: '',
    vehicle_plate: '',
    delivery_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    recipient_name: '',
    notes: '',
    files: [] as string[],
  });

  const handleTripChange = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    setFormData(prev => ({
      ...prev,
      trip_id: tripId,
      vehicle_plate: trip?.vehicle_plate || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    await createReceipt.mutateAsync({
      driver_id: user.id,
      driver_name: user.email?.split('@')[0] || 'Motorista',
      trip_id: formData.trip_id,
      vehicle_plate: formData.vehicle_plate,
      delivery_date: new Date(formData.delivery_date).toISOString(),
      recipient_name: formData.recipient_name || undefined,
      notes: formData.notes || undefined,
      files: formData.files.length > 0 ? formData.files : undefined,
    });

    setFormData({
      trip_id: '',
      vehicle_plate: '',
      delivery_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      recipient_name: '',
      notes: '',
      files: [],
    });
    setOpen(false);
  };

  // Filter trips that are "Escoamento" type (delivery)
  const deliveryTrips = trips.filter(t => t.trip_type === 'escoamento');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <FileCheck className="h-4 w-4 mr-2" />
          Comprovante de Entrega
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Anexar Comprovante de Entrega</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Viagem *</Label>
            <Select value={formData.trip_id} onValueChange={handleTripChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a viagem" />
              </SelectTrigger>
              <SelectContent>
                {deliveryTrips.slice(0, 20).map(trip => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {format(new Date(trip.departure_date), 'dd/MM/yyyy')} - {trip.vehicle_plate} ({trip.trip_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data/Hora da Entrega *</Label>
            <Input
              type="datetime-local"
              value={formData.delivery_date}
              onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Nome do Recebedor</Label>
            <Input
              value={formData.recipient_name}
              onChange={(e) => setFormData(prev => ({ ...prev, recipient_name: e.target.value }))}
              placeholder="Nome de quem recebeu a carga"
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações sobre a entrega..."
              rows={3}
            />
          </div>

          {user && (
            <div className="space-y-2">
              <Label>Comprovante (Foto/Arquivo) *</Label>
              <FileUpload
                userId={user.id}
                onFilesUploaded={(urls) => setFormData(prev => ({ ...prev, files: urls }))}
                existingFiles={formData.files}
              />
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={!formData.trip_id || formData.files.length === 0 || createReceipt.isPending}
          >
            {createReceipt.isPending ? 'Enviando...' : 'Enviar Comprovante'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
