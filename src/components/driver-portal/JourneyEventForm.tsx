import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { useCreateJourneyEvent } from '@/hooks/useJourneyCompliance';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Play, Pause, Square, Coffee, MapPin, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const eventTypes = [
  { value: 'journey_start', label: 'Início de Jornada', icon: Play, color: 'bg-success/20 text-success' },
  { value: 'break_start', label: 'Início de Pausa', icon: Pause, color: 'bg-warning/20 text-warning' },
  { value: 'break_end', label: 'Fim de Pausa', icon: Coffee, color: 'bg-info/20 text-info' },
  { value: 'journey_end', label: 'Fim de Jornada', icon: Square, color: 'bg-muted text-muted-foreground' },
];

export const JourneyEventForm: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [location, setLocation] = useState('');
  const [mileage, setMileage] = useState('');
  const [notes, setNotes] = useState('');

  const { user } = useAuth();
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();
  const createEvent = useCreateJourneyEvent();

  // Encontrar o motorista atual baseado no usuário logado
  const currentDriver = drivers.find(d => d.id === user?.id) || drivers[0];
  const selectedVehicle = vehicles.find(v => v.id === vehicleId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventType || !currentDriver) return;

    await createEvent.mutateAsync({
      driver_id: currentDriver.id,
      driver_name: currentDriver.name,
      vehicle_id: vehicleId || undefined,
      vehicle_plate: selectedVehicle?.plate || undefined,
      event_type: eventType as 'journey_start' | 'journey_end' | 'break_start' | 'break_end',
      location_name: location || undefined,
      mileage: mileage ? parseInt(mileage) : undefined,
      source: 'driver_portal',
    });

    // Reset form
    setEventType('');
    setVehicleId('');
    setLocation('');
    setMileage('');
    setNotes('');
    setOpen(false);
  };

  const handleQuickEvent = async (type: string) => {
    if (!currentDriver) return;

    // Para evento rápido, usar veículo atual do motorista se disponível
    const driverVehicle = currentDriver.current_vehicle 
      ? vehicles.find(v => v.plate === currentDriver.current_vehicle)
      : null;

    await createEvent.mutateAsync({
      driver_id: currentDriver.id,
      driver_name: currentDriver.name,
      vehicle_id: driverVehicle?.id || undefined,
      vehicle_plate: driverVehicle?.plate || undefined,
      event_type: type as 'journey_start' | 'journey_end' | 'break_start' | 'break_end',
      source: 'driver_portal',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Controle de Jornada
        </CardTitle>
        <CardDescription>
          Registre o início e fim da sua jornada de trabalho
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botões de ação rápida */}
        <div className="grid grid-cols-2 gap-2">
          {eventTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Button
                key={type.value}
                variant="outline"
                className={cn(
                  "h-16 flex flex-col items-center justify-center gap-1",
                  "hover:bg-accent transition-colors"
                )}
                onClick={() => handleQuickEvent(type.value)}
                disabled={createEvent.isPending}
              >
                <div className={cn("p-2 rounded-lg", type.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs">{type.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Formulário completo */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="w-full">
              <MapPin className="h-4 w-4 mr-2" />
              Registro Detalhado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registro de Jornada</DialogTitle>
              <DialogDescription>
                Preencha os detalhes do evento de jornada
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Evento *</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Veículo</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Local
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Pátio da empresa, Cliente ABC"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Quilometragem
                </Label>
                <Input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="KM atual do veículo"
                />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações adicionais..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!eventType || createEvent.isPending}>
                  {createEvent.isPending ? 'Registrando...' : 'Registrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Info atual */}
        {currentDriver && (
          <div className="p-3 rounded-lg bg-secondary/50 text-sm">
            <p className="text-muted-foreground">
              <strong>Motorista:</strong> {currentDriver.name}
            </p>
            <p className="text-muted-foreground">
              <strong>Horário:</strong> {format(new Date(), 'HH:mm')}
            </p>
            {currentDriver.journey_start && (
              <p className="text-muted-foreground">
                <strong>Jornada iniciada:</strong> {format(new Date(currentDriver.journey_start), 'HH:mm')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
